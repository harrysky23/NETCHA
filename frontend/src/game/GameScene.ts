import Phaser from 'phaser'
import type { PixelCharacter } from '../types/character'
import { createCharacterTexture } from './characterTexture'
import { createSchool, preloadSchool } from './drawSchool'
import { GAME_HEIGHT, GAME_WIDTH, VIEW_HEIGHT, VIEW_WIDTH } from './map'
import { getMovementVelocity, type MovementInput } from './movement'
import type { RoomSnapshot } from '../network/types'

type Controls = { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }
type SceneCallbacks = {
  onReady: () => void
  onError: (message: string) => void
  onInput: (keys: MovementInput) => void
  onShot: (point: { x: number; y: number }) => void
  onColorSample: (hex: string) => void
  onViewport: (width: number, height: number) => void
}

const emptyInput: MovementInput = { up: false, down: false, left: false, right: false }

export class GameScene extends Phaser.Scene {
  private readonly playerId: string
  private readonly callbacks: SceneCallbacks
  private player?: Phaser.Physics.Arcade.Image
  private controls?: Controls
  private room?: RoomSnapshot
  private walls?: Phaser.Physics.Arcade.StaticGroup
  private obstacles?: Phaser.Physics.Arcade.StaticGroup
  private readonly avatars = new Map<string, Phaser.GameObjects.Image>()
  private readonly names = new Map<string, Phaser.GameObjects.Text>()
  private textureSignatures = new Map<string, string>()
  private viewTargetId: string | null = null
  private sentInput = ''
  private sampling = false

  constructor(playerId: string, callbacks: SceneCallbacks) {
    super('netchacameleon-room')
    this.playerId = playerId
    this.callbacks = callbacks
  }

  preload() { preloadSchool(this) }

  setSampling(enabled: boolean) { this.sampling = enabled }

  private resizeViewport() {
    const width = this.scale.width
    const height = this.scale.height
    const zoom = Math.max(width / VIEW_WIDTH, height / VIEW_HEIGHT)
    this.cameras.main.setZoom(zoom)
    this.callbacks.onViewport(width / zoom, height / zoom)
  }

  create() {
    try {
      this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT)
      const { walls, obstacles } = createSchool(this)
      this.walls = walls
      this.obstacles = obstacles
      if (!this.input.keyboard) throw new Error('키보드 입력을 초기화하지 못했습니다.')
      this.controls = this.input.keyboard.addKeys('W,A,S,D') as Controls
      this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
        if (this.sampling && pointer.leftButtonDown()) {
          this.game.renderer.snapshotPixel(Math.floor(pointer.x), Math.floor(pointer.y), (sample) => {
            if (sample instanceof Phaser.Display.Color) this.callbacks.onColorSample(Phaser.Display.Color.RGBToString(sample.red, sample.green, sample.blue))
          })
          return
        }
        const self = this.room?.players.find((candidate) => candidate.id === this.playerId)
        if (!self || self.role !== 'hunter' || !self.alive || this.room?.phase !== 'hunting') return
        const target = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
        this.callbacks.onShot({ x: target.x, y: target.y })
      })
      this.cameras.main.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT)
      this.resizeViewport()
      this.scale.on(Phaser.Scale.Events.RESIZE, this.resizeViewport, this)
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.resizeViewport, this))
      if (this.room) this.syncRoom(this.room)
      this.callbacks.onReady()
    } catch (error) {
      this.callbacks.onError(error instanceof Error ? error.message : '맵을 불러오지 못했습니다.')
    }
  }

  syncRoom(room: RoomSnapshot) {
    this.room = room
    if (!this.sys.isActive()) return
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT)
    const visible = new Set<string>()
    const self = room.players.find((player) => player.id === this.playerId)
    if (!self) return

    for (const member of room.players) {
      if (member.x === null || member.y === null) {
        const hiddenSprite = this.avatars.get(member.id)
        const hiddenLabel = this.names.get(member.id)
        hiddenSprite?.setVisible(false)
        hiddenLabel?.setVisible(false)
        continue
      }
      visible.add(member.id)
      const textureKey = `player-${member.id}`
      const colorSignature = `${member.palette.join(',')}:${member.colors.join(',')}`
      if (this.textureSignatures.get(member.id) !== colorSignature) {
        createCharacterTexture(this, { width: 16, height: 16, colors: member.colors, palette: member.palette } as PixelCharacter, textureKey)
        this.textureSignatures.set(member.id, colorSignature)
        this.avatars.get(member.id)?.setTexture(textureKey)
      }
      let avatar = this.avatars.get(member.id)
      if (!avatar) {
        if (member.id === this.playerId) {
          const localPlayer = this.physics.add.image(member.x, member.y, textureKey).setCollideWorldBounds(true)
          localPlayer.body.setSize(12, 14)
          localPlayer.body.setOffset(2, 1)
          avatar = localPlayer
        } else {
          avatar = this.add.image(member.x, member.y, textureKey)
        }
        avatar.setDepth(101)
        this.avatars.set(member.id, avatar)
        if (member.id === this.playerId) {
          this.player = avatar as Phaser.Physics.Arcade.Image
          this.player.setCollideWorldBounds(true)
          this.player.setDisplaySize(16, 16)
          if (this.walls) this.physics.add.collider(this.player, this.walls)
          if (this.obstacles) this.physics.add.collider(this.player, this.obstacles)
        }
      }
      avatar.setVisible(true)
      const distance = Phaser.Math.Distance.Between(avatar.x, avatar.y, member.x, member.y)
      if (member.id !== this.playerId || distance > 70) {
        const followAmount = member.id === this.playerId ? 0.62 : 1
        avatar.setPosition(Phaser.Math.Linear(avatar.x, member.x, followAmount), Phaser.Math.Linear(avatar.y, member.y, followAmount))
      }
      avatar.setAlpha(member.alive ? 1 : 0.48)
      avatar.setDepth(101 + avatar.y / GAME_HEIGHT)
      const title = member.role === 'hunter' ? ' · 술래' : ''
      let label = this.names.get(member.id)
      if (!label) {
        label = this.add.text(member.x, member.y - 16, `${member.name}${title}`, {
          color: member.role === 'hunter' ? '#9f493d' : '#354f3e',
          fontFamily: 'monospace', fontSize: '9px',
          backgroundColor: '#f5f3ebd9', padding: { x: 2, y: 1 },
        }).setOrigin(0.5, 1).setDepth(150)
        this.names.set(member.id, label)
      }
      label.setText(`${member.name}${title}`).setPosition(avatar.x, avatar.y - 12).setVisible(true)
      label.setAlpha(member.alive ? 1 : 0.6)
    }
    for (const [id, avatar] of this.avatars) {
      if (!visible.has(id)) avatar.setVisible(false)
    }
    for (const [id, label] of this.names) {
      if (!visible.has(id)) label.setVisible(false)
    }

    const followed = self.spectatingId ?? self.id
    const target = this.avatars.get(followed)
    if (target && this.viewTargetId !== followed) {
      this.viewTargetId = followed
      this.cameras.main.startFollow(target, true, 1, 1)
    }
    if (this.player) {
      const allowedToMove = self.alive && !self.painting && !self.spectatingId && (room.phase === 'hiding' || room.phase === 'hunting')
      if (!allowedToMove) this.player.setVelocity(0, 0)
    }
  }

  resetInput() {
    this.input?.keyboard?.resetKeys()
    this.player?.setVelocity(0, 0)
    if (this.sentInput) {
      this.sentInput = ''
      this.callbacks.onInput(emptyInput)
    }
  }

  update() {
    const self = this.room?.players.find((candidate) => candidate.id === this.playerId)
    if (!self || !this.controls || !this.player) return
    const canMove = self.alive && !self.painting && !self.spectatingId && (this.room?.phase === 'hiding' || this.room?.phase === 'hunting')
    const input: MovementInput = canMove ? {
      up: this.controls.W.isDown,
      left: this.controls.A.isDown,
      down: this.controls.S.isDown,
      right: this.controls.D.isDown,
    } : emptyInput
    const signature = `${+input.up}${+input.down}${+input.left}${+input.right}`
    if (signature !== this.sentInput) {
      this.sentInput = signature
      this.callbacks.onInput(input)
    }
    const velocity = getMovementVelocity(input)
    this.player.setVelocity(velocity.x, velocity.y)
    const label = this.names.get(this.playerId)
    if (label?.visible) label.setPosition(this.player.x, this.player.y - 12)
  }
}

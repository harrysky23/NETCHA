import Phaser from 'phaser'
import type { PixelCharacter } from '../types/character'
import { createCharacterTexture } from './characterTexture'
import { createClassroom } from './drawClassroom'
import { GAME_HEIGHT, GAME_WIDTH, PLAYER_SPAWN } from './map'
import { getMovementVelocity } from './movement'

type Controls = {
  W: Phaser.Input.Keyboard.Key
  A: Phaser.Input.Keyboard.Key
  S: Phaser.Input.Keyboard.Key
  D: Phaser.Input.Keyboard.Key
}
type SceneCallbacks = {
  onReady: () => void
  onError: (message: string) => void
}

export class GameScene extends Phaser.Scene {
  private readonly character: PixelCharacter
  private readonly callbacks: SceneCallbacks
  private player?: Phaser.Physics.Arcade.Image
  private controls?: Controls

  constructor(character: PixelCharacter, callbacks: SceneCallbacks) {
    super('classroom')
    this.character = character
    this.callbacks = callbacks
  }

  create() {
    try {
      this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT)
      const { walls, obstacles } = createClassroom(this)
      const texture = createCharacterTexture(this, this.character)
      this.player = this.physics.add
        .image(PLAYER_SPAWN.x, PLAYER_SPAWN.y, texture)
        .setCollideWorldBounds(true)
        .setDepth(10)
      // 투명한 테두리를 제외한 12×14px 몸체. 가구와의 충돌은 Arcade가 해결한다.
      this.player.setBodySize(12, 14).setOffset(3, 1)
      this.physics.add.collider(this.player, walls)
      this.physics.add.collider(this.player, obstacles)
      if (!this.input.keyboard)
        throw new Error('키보드 입력을 초기화하지 못했습니다.')
      this.controls = this.input.keyboard.addKeys('W,A,S,D') as Controls
      this.callbacks.onReady()
    } catch (error) {
      this.callbacks.onError(
        error instanceof Error ? error.message : '게임을 시작하지 못했습니다.',
      )
    }
  }

  resetInput() {
    this.input?.keyboard?.resetKeys()
    this.player?.setVelocity(0, 0)
  }

  update() {
    if (!this.player || !this.controls) return
    const velocity = getMovementVelocity({
      up: this.controls.W.isDown,
      down: this.controls.S.isDown,
      left: this.controls.A.isDown,
      right: this.controls.D.isDown,
    })
    this.player.setVelocity(velocity.x, velocity.y)
  }
}

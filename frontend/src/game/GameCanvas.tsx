import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import Phaser from 'phaser'
import { CHARACTER_MASK, CHARACTER_SIZE } from '../data/characterMask'
import { PALETTE, type PaletteIndex } from '../data/palette'
import { createDefaultCharacter, paintLine, type PixelCharacter, type PixelPoint } from '../types/character'
import type { GameMessage, RoomSession, RoomSnapshot } from '../network/types'
import { GameScene } from './GameScene'

const EMPTY_KEYS = { up: false, down: false, left: false, right: false }

type Props = { room: RoomSnapshot; session: RoomSession; send: (message: GameMessage) => boolean }

export default function GameCanvas({ room, session, send }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<GameScene | null>(null)
  const roomRef = useRef(room)
  const [ready, setReady] = useState(false)
  const [notice, setNotice] = useState('')
  const [draft, setDraft] = useState<PixelCharacter>(() => {
    const self = room.players.find((player) => player.id === session.playerId)
    return self ? { width: 16, height: 16, colors: [...self.colors] } : createDefaultCharacter()
  })
  const draftRef = useRef(draft)
  const paintingRef = useRef(false)
  const paintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedColor, setSelectedColor] = useState<PaletteIndex>(1)
  roomRef.current = room
  draftRef.current = draft
  const me = room.players.find((player) => player.id === session.playerId)
  const isPainting = Boolean(me?.painting)
  const spectating = Boolean(me?.spectatingId)

  useEffect(() => { paintingRef.current = isPainting }, [isPainting])

  useEffect(() => {
    if (!isPainting && me) {
      const updated = { width: 16 as const, height: 16 as const, colors: [...me.colors] }
      draftRef.current = updated
      setDraft(updated)
    }
  }, [isPainting, me?.colors.join(',')])

  const flushPaint = useCallback(() => {
    if (paintTimer.current) clearTimeout(paintTimer.current)
    paintTimer.current = null
    send({ type: 'paint', colors: [...draftRef.current.colors] })
  }, [send])

  const updatePaint = useCallback((character: PixelCharacter) => {
    draftRef.current = character
    setDraft(character)
    if (paintTimer.current) clearTimeout(paintTimer.current)
    paintTimer.current = setTimeout(flushPaint, 180)
  }, [flushPaint])

  const togglePaint = useCallback(() => {
    const current = roomRef.current
    const player = current.players.find((entry) => entry.id === session.playerId)
    if (!player || player.role !== 'hider' || !player.alive || !['hiding', 'hunting'].includes(current.phase)) return
    const next = !player.painting
    if (next && player.spectatingId) send({ type: 'spectate', targetId: null })
    if (!next) flushPaint()
    send({ type: 'paint_mode', enabled: next })
  }, [flushPaint, send, session.playerId])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== 'KeyC' || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      const player = roomRef.current.players.find((entry) => entry.id === session.playerId)
      if (!player || player.role !== 'hider' || !player.alive || !['hiding', 'hunting'].includes(roomRef.current.phase)) return
      event.preventDefault()
      togglePaint()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [session.playerId, togglePaint])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let game: Phaser.Game | undefined
    let stopped = false
    const scene = new GameScene(session.playerId, {
      onReady: () => {
        if (stopped) return
        setReady(true)
        host.focus({ preventScroll: true })
        scene.syncRoom(roomRef.current)
      },
      onError: (message) => { if (!stopped) setNotice(message) },
      onInput: (keys) => { if (!stopped) send({ type: 'input', keys }) },
      onShot: (point) => { if (!stopped) send({ type: 'shoot', x: point.x, y: point.y }) },
    })
    sceneRef.current = scene
    const frame = requestAnimationFrame(() => {
      if (stopped) return
      try {
        game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: host,
          width: 640,
          height: 480,
          pixelArt: true,
          antialias: false,
          roundPixels: true,
          audio: { noAudio: true },
          scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
          input: { keyboard: { target: host } },
          physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
          scene,
        })
        game.events.on(Phaser.Core.Events.BLUR, resetInput)
      } catch (error) {
        setNotice(error instanceof Error ? error.message : '게임을 시작하지 못했습니다.')
      }
    })
    function resetInput() {
      scene.resetInput()
      if (paintingRef.current) return
      send({ type: 'input', keys: EMPTY_KEYS })
    }
    host.addEventListener('blur', resetInput)
    window.addEventListener('blur', resetInput)
    return () => {
      stopped = true
      cancelAnimationFrame(frame)
      host.removeEventListener('blur', resetInput)
      window.removeEventListener('blur', resetInput)
      game?.events.off(Phaser.Core.Events.BLUR, resetInput)
      game?.destroy(true)
      sceneRef.current = null
    }
  }, [session.playerId, send])

  useEffect(() => { sceneRef.current?.syncRoom(room) }, [room])
  useEffect(() => () => { if (paintTimer.current) clearTimeout(paintTimer.current) }, [])

  const visiblePlayers = useMemo(() => room.players.filter((player) => player.id !== session.playerId && player.x !== null), [room.players, session.playerId])
  const grid = useRef<HTMLDivElement>(null)
  const stroke = useRef<{ pointerId: number; previous: PixelPoint | null } | null>(null)

  function gridPoint(event: ReactPointerEvent<HTMLDivElement>): PixelPoint | null {
    const element = event.currentTarget
    const rect = element.getBoundingClientRect()
    const x = Math.floor(((event.clientX - rect.left - element.clientLeft) / element.clientWidth) * CHARACTER_SIZE)
    const y = Math.floor(((event.clientY - rect.top - element.clientTop) / element.clientHeight) * CHARACTER_SIZE)
    return x >= 0 && x < 16 && y >= 0 && y < 16 ? { x, y } : null
  }

  function draw(point: PixelPoint) {
    const previous = stroke.current?.previous ?? point
    updatePaint(paintLine(draftRef.current, previous, point, selectedColor))
    if (stroke.current) stroke.current.previous = point
  }

  function beginStroke(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !event.isPrimary) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    stroke.current = { pointerId: event.pointerId, previous: null }
    const point = gridPoint(event)
    if (point) draw(point)
  }

  function moveStroke(event: ReactPointerEvent<HTMLDivElement>) {
    if (stroke.current?.pointerId !== event.pointerId) return
    if ((event.buttons & 1) === 0) { stroke.current = null; return }
    const point = gridPoint(event)
    if (point) draw(point)
    else stroke.current.previous = null
  }

  function finishStroke(event: ReactPointerEvent<HTMLDivElement>) {
    if (stroke.current?.pointerId !== event.pointerId) return
    stroke.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <div className="game-stage" onPointerDown={() => hostRef.current?.focus({ preventScroll: true })}>
      <div className="game-mount" ref={hostRef} tabIndex={0} role="application" aria-label="온라인 숨바꼭질 게임, WASD 이동, 클릭 사격, C 키 색칠" />
      {!ready && !notice && <p className="game-status" role="status">큰 강의실을 불러오는 중…</p>}
      {notice && <p className="game-error" role="alert">{notice}</p>}
      {isPainting && me?.alive && <aside className="paint-overlay" aria-label="캐릭터 색칠 패널">
        <div className="panel-bar"><span>위장 색칠</span><span>C · 닫기</span></div>
        <p className="paint-caption">주변을 보며 빠르게 색을 바꿔요.</p>
        <div className="pixel-grid mini-grid" ref={grid} role="group" aria-label="16×16 게임 캐릭터 페인팅 그리드"
          onPointerDown={beginStroke} onPointerMove={moveStroke} onPointerUp={finishStroke} onPointerCancel={finishStroke}
          onLostPointerCapture={() => { stroke.current = null }}>
          {draft.colors.map((color, index) => <button key={index} type="button" disabled={!CHARACTER_MASK[index]}
            className={`pixel-cell ${CHARACTER_MASK[index] ? 'paintable' : ''}`}
            aria-label={`${Math.floor(index / 16) + 1}행 ${index % 16 + 1}열`}
            style={{ backgroundColor: CHARACTER_MASK[index] ? PALETTE[color].hex : undefined }}
            onClick={(event) => { if (event.detail === 0) draw({ x: index % 16, y: Math.floor(index / 16) }) }} />)}
        </div>
        <div className="mini-palette" role="group" aria-label="색상 선택">
          {PALETTE.map((color, index) => <button type="button" key={color.hex} style={{ backgroundColor: color.hex }}
            aria-label={color.name} aria-pressed={selectedColor === index}
            className={selectedColor === index ? 'selected' : ''} onClick={() => setSelectedColor(index as PaletteIndex)} />)}
        </div>
        <div className="paint-overlay-footer"><span>{PALETTE[selectedColor].name}</span>
          <button className="text-button" onClick={() => updatePaint(createDefaultCharacter())}>초기화</button>
          <button className="text-button" onClick={togglePaint}>이동으로 돌아가기</button>
        </div>
      </aside>}
      {room.phase === 'hiding' && me?.role === 'hunter' && <div className="hunter-wait-screen"><span className="live-dot" /> 도망자들이 숨고 있어요<h2>잠시 기다려 주세요.</h2><p>30초 뒤 강의실 수색이 시작됩니다.</p></div>}
      {spectating && <div className="spectating-banner">동료의 시점을 보고 있어요 <button className="text-button" onClick={() => send({ type: 'spectate', targetId: null })}>내 자리로 돌아오기</button></div>}
      {!isPainting && me?.role === 'hider' && visiblePlayers.length > 0 && <div className="spectator-strip" aria-label="관전할 도망자 선택">
        <span>동료 보기</span>{visiblePlayers.filter((player) => player.role === 'hider' && player.alive).map((player) => <button key={player.id} onClick={() => send({ type: 'spectate', targetId: player.id })}>{player.name} 보기</button>)}
      </div>}
    </div>
  )
}

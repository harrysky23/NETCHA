import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import Phaser from 'phaser'
import { CHARACTER_MASK, CHARACTER_SIZE } from '../data/characterMask'
import { DEFAULT_PALETTE, MAX_CHARACTER_COLORS, PALETTE, type PaletteIndex } from '../data/palette'
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
    return self ? { width: 16, height: 16, colors: [...self.colors], palette: [...self.palette] } : createDefaultCharacter()
  })
  const draftRef = useRef(draft)
  const paintingRef = useRef(false)
  const paintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedColor, setSelectedColor] = useState<PaletteIndex>(4)
  const [tool, setTool] = useState<'brush' | 'eyedropper'>('brush')
  const [paintHint, setPaintHint] = useState('')
  const me = room.players.find((player) => player.id === session.playerId)
  const isPainting = Boolean(me?.painting)
  const spectating = Boolean(me?.spectatingId)

  useEffect(() => { paintingRef.current = isPainting }, [isPainting])
  useEffect(() => { roomRef.current = room }, [room])

  const flushPaint = useCallback(() => {
    if (paintTimer.current) clearTimeout(paintTimer.current)
    paintTimer.current = null
    send({ type: 'paint', colors: [...draftRef.current.colors], palette: [...(draftRef.current.palette ?? DEFAULT_PALETTE)] })
  }, [send])

  const updatePaint = useCallback((character: PixelCharacter) => {
    draftRef.current = character
    setDraft(character)
    if (paintTimer.current) clearTimeout(paintTimer.current)
    paintTimer.current = setTimeout(flushPaint, 180)
  }, [flushPaint])

  const sampleColor = useCallback((hex: string) => {
    const color = hex.toLowerCase()
    const current = draftRef.current
    const palette = [...(current.palette ?? DEFAULT_PALETTE)]
    let index = palette.indexOf(color)
    if (index === -1) {
      if (palette.length >= MAX_CHARACTER_COLORS) {
        setPaintHint('저장할 수 있는 색상은 최대 64개입니다. 초기화하면 비울 수 있어요.')
        return
      }
      index = palette.length
      palette.push(color)
      updatePaint({ ...current, palette })
    }
    setSelectedColor(index)
    setTool('brush')
    setPaintHint(`${color} 색을 가져왔어요.`)
  }, [updatePaint])

  const togglePaint = useCallback(() => {
    const current = roomRef.current
    const player = current.players.find((entry) => entry.id === session.playerId)
    if (!player || player.role !== 'hider' || !player.alive || !['hiding', 'hunting'].includes(current.phase)) return
    const next = !player.painting
    if (next) {
      const character: PixelCharacter = { width: 16, height: 16, colors: [...player.colors], palette: [...player.palette] }
      draftRef.current = character
      setDraft(character)
      setSelectedColor((previous) => Math.min(previous, player.palette.length - 1))
    }
    if (next && player.spectatingId) send({ type: 'spectate', targetId: null })
    if (!next) flushPaint()
    send({ type: 'paint_mode', enabled: next })
  }, [flushPaint, send, session.playerId])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!['KeyC', 'KeyI'].includes(event.code) || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      const player = roomRef.current.players.find((entry) => entry.id === session.playerId)
      if (!player || player.role !== 'hider' || !player.alive || !['hiding', 'hunting'].includes(roomRef.current.phase)) return
      event.preventDefault()
      if (event.code === 'KeyI') {
        if (player.painting) setTool((current) => current === 'brush' ? 'eyedropper' : 'brush')
        return
      }
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
      onColorSample: (hex) => { if (!stopped) sampleColor(hex) },
      onViewport: (width, height) => { if (!stopped) send({ type: 'viewport', width, height }) },
    })
    sceneRef.current = scene
    const frame = requestAnimationFrame(() => {
      if (stopped) return
      try {
        game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: host,
          width: host.clientWidth,
          height: host.clientHeight,
          pixelArt: true,
          antialias: false,
          roundPixels: true,
          audio: { noAudio: true },
          scale: { mode: Phaser.Scale.RESIZE },
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
  }, [session.playerId, send, sampleColor])

  useEffect(() => { sceneRef.current?.syncRoom(room) }, [room])
  useEffect(() => { sceneRef.current?.setSampling(isPainting && tool === 'eyedropper') }, [ready, isPainting, tool])
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
    if (tool === 'eyedropper') {
      const index = point.y * 16 + point.x
      if (CHARACTER_MASK[index]) sampleColor((draftRef.current.palette ?? DEFAULT_PALETTE)[draftRef.current.colors[index]])
      return
    }
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
    if (point && (event.altKey || tool === 'eyedropper')) {
      const index = point.y * 16 + point.x
      if (CHARACTER_MASK[index]) sampleColor((draftRef.current.palette ?? DEFAULT_PALETTE)[draftRef.current.colors[index]])
      stroke.current = null
    } else if (point) draw(point)
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
    flushPaint()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <div className={`game-stage immersive-stage ${isPainting && tool === 'eyedropper' ? 'sampling-color' : ''}`} onPointerDown={() => hostRef.current?.focus({ preventScroll: true })}>
      <div className="game-mount" ref={hostRef} tabIndex={0} role="application" aria-label="온라인 숨바꼭질 게임, WASD 이동, 클릭 사격, C 키 색칠" />
      {!ready && !notice && <p className="game-status" role="status">학교를 불러오는 중…</p>}
      {notice && <p className="game-error" role="alert">{notice}</p>}
      {isPainting && me?.alive && <aside className="paint-overlay" aria-label="캐릭터 색칠 패널">
        <div className="panel-bar"><span>위장 색칠</span><button className="text-button" onClick={togglePaint}>C · 닫기</button></div>
        <div className="paint-tools"><button className={tool === 'brush' ? 'active' : ''} onClick={() => setTool('brush')}>▧ 붓</button><button className={tool === 'eyedropper' ? 'active' : ''} onClick={() => setTool('eyedropper')}>⌾ 스포이드 <kbd>I</kbd></button></div>
        <p className="paint-caption">{tool === 'eyedropper' ? '맵이나 캐릭터를 클릭해 색을 가져오세요.' : '클릭·드래그로 색칠 · Alt+클릭으로 색 추출'}</p>
        <div className="pixel-grid mini-grid" ref={grid} role="group" aria-label="16×16 게임 캐릭터 페인팅 그리드"
          onPointerDown={beginStroke} onPointerMove={moveStroke} onPointerUp={finishStroke} onPointerCancel={finishStroke}
          onLostPointerCapture={() => { stroke.current = null }}>
          {draft.colors.map((color, index) => <button key={index} type="button" disabled={!CHARACTER_MASK[index]}
            className={`pixel-cell ${CHARACTER_MASK[index] ? 'paintable' : ''}`}
            aria-label={`${Math.floor(index / 16) + 1}행 ${index % 16 + 1}열`}
            style={{ backgroundColor: CHARACTER_MASK[index] ? (draft.palette ?? DEFAULT_PALETTE)[color] : undefined }}
            onClick={(event) => { if (event.detail === 0) draw({ x: index % 16, y: Math.floor(index / 16) }) }} />)}
        </div>
        <div className="mini-palette" role="group" aria-label="색상 선택">
          {(draft.palette ?? DEFAULT_PALETTE).map((color, index) => <button type="button" key={`${index}-${color}`} style={{ backgroundColor: color }}
            aria-label={PALETTE[index]?.name ?? color} title={color} aria-pressed={selectedColor === index}
            className={selectedColor === index ? 'selected' : ''} onClick={() => { setSelectedColor(index); setTool('brush') }} />)}
        </div>
        <div className="paint-overlay-footer"><span><i style={{ background: (draft.palette ?? DEFAULT_PALETTE)[selectedColor] }} />{(draft.palette ?? DEFAULT_PALETTE)[selectedColor]}</span>
          <button className="text-button" onClick={() => { updatePaint(createDefaultCharacter()); setSelectedColor(4); setPaintHint('') }}>흰색 초기화</button>
          <button className="text-button" onClick={togglePaint}>이동으로 돌아가기</button>
        </div>
        {paintHint && <p className="paint-hint" role="status">{paintHint}</p>}
      </aside>}
      {room.phase === 'hiding' && me?.role === 'hunter' && <div className="hunter-wait-screen"><span className="live-dot" /> 도망자들이 숨고 있어요<h2>잠시 기다려 주세요.</h2><p>30초 뒤 학교 수색이 시작됩니다.</p></div>}
      {spectating && <div className="spectating-banner">동료의 시점을 보고 있어요 <button className="text-button" onClick={() => send({ type: 'spectate', targetId: null })}>내 자리로 돌아오기</button></div>}
      {!isPainting && me?.role === 'hider' && visiblePlayers.length > 0 && <div className="spectator-strip" aria-label="관전할 도망자 선택">
        <span>동료 보기</span>{visiblePlayers.filter((player) => player.role === 'hider' && player.alive).map((player) => <button key={player.id} onClick={() => send({ type: 'spectate', targetId: player.id })}>{player.name} 보기</button>)}
      </div>}
    </div>
  )
}

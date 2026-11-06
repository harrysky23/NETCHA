import { useState, type FormEvent } from 'react'
import { RoomChat } from './RoomChat'
import type { RoomSession, RoomSnapshot } from '../network/types'
import type { Connection } from '../network/useRoom'

const NAME_KEY = 'netchacameleon.name'
function savedName() {
  try { return localStorage.getItem(NAME_KEY) ?? '' } catch { return '' }
}

type Props = {
  session: RoomSession | null
  room: RoomSnapshot | null
  connection: Connection
  error: string
  onCreate: (name: string) => Promise<void>
  onJoin: (name: string, code: string) => Promise<void>
  onStart: () => void
  onLeave: () => void
  onChat: (text: string) => void
  onClearError: () => void
}

export function LobbyScreen({ session, room, connection, error, onCreate, onJoin, onStart, onLeave, onChat, onClearError }: Props) {
  const [name, setName] = useState(savedName)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const me = room?.players.find((player) => player.id === session?.playerId)

  function storeName(value: string) {
    const normalized = value.trim().slice(0, 18)
    try { localStorage.setItem(NAME_KEY, normalized) } catch { /* 브라우저 저장이 꺼져도 현재 세션은 계속 쓴다. */ }
    return normalized
  }

  async function submit(event: FormEvent, action: 'create' | 'join') {
    event.preventDefault()
    const normalized = storeName(name)
    if (normalized.length < 2) { onClearError(); return }
    setBusy(true)
    try {
      if (action === 'create') await onCreate(normalized)
      else await onJoin(normalized, code)
    } catch { /* 오류 문구는 부모가 함께 렌더링한다. */ }
    finally { setBusy(false) }
  }

  async function copyCode() {
    if (!room) return
    await navigator.clipboard?.writeText(room.code).catch(() => undefined)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <main className="workspace lobby-workspace">
      <div className="page-heading"><div><p className="eyebrow">ONLINE · ROOM / 001</p><h1>{room ? '함께 숨을 준비' : '한 판, 한 팀' }<span className="title-dot">.</span></h1></div><span className={`connection-badge ${connection}`}><i />{connection === 'connected' ? '서버 연결됨' : connection === 'connecting' ? '다시 연결 중' : '서버 대기 중'}</span></div>
      {error && <div className="notice error" role="alert">{error}<button onClick={onClearError}>확인</button></div>}
      {!room ? (
        <div className="lobby-entry-grid">
          <form className="panel lobby-action" onSubmit={(event) => submit(event, 'create')}>
            <span className="lobby-step">01 / HOST A GAME</span><h2>방 만들기</h2><p>방 코드가 생기면 친구에게 공유해요.</p>
            <label>플레이어 이름<input value={name} onChange={(event) => setName(event.target.value)} maxLength={18} minLength={2} required autoComplete="nickname" placeholder="두 글자 이상" /></label>
            <button className="button primary" disabled={busy || connection !== 'connected' || name.trim().length < 2}>방 만들고 대기하기 <span>→</span></button>
          </form>
          <form className="panel lobby-action" onSubmit={(event) => submit(event, 'join')}>
            <span className="lobby-step">02 / JOIN A GAME</span><h2>초대 코드 입력</h2><p>방장이 공유한 다섯 자리 코드를 입력해요.</p>
            <label>플레이어 이름<input value={name} onChange={(event) => setName(event.target.value)} maxLength={18} minLength={2} required autoComplete="nickname" placeholder="두 글자 이상" /></label>
            <label>방 코드<input className="room-code-field" value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))} minLength={5} maxLength={5} required placeholder="ABCDE" autoComplete="off" /></label>
            <button className="button secondary" disabled={busy || connection !== 'connected' || name.trim().length < 2 || code.length !== 5}>방 입장하기 <span>↗</span></button>
          </form>
          <div className="lobby-rule-note"><span className="live-dot" /><span>혼자 테스트 가능 · 2–8명 온라인 · 매 판 무작위 술래</span></div>
        </div>
      ) : (
        <div className="room-lobby-grid">
          <section className="panel room-waiting">
            <div className="section-label"><h2>대기 중인 친구</h2><span>{room.players.length} / 8 PLAYERS</span></div>
            <button className="room-code-card" onClick={() => void copyCode()} aria-label="방 코드를 복사">
              <span>FRIENDS ROOM CODE</span><strong>{room.code.split('').join(' ')}</strong><small>{copied ? '코드를 복사했어요' : '클릭해서 초대 코드 복사'}</small>
            </button>
            <div className="player-list">
              {room.players.map((player, index) => <div className="lobby-player" key={player.id}><span className="player-number">{String(index + 1).padStart(2, '0')}</span><strong>{player.name}{player.id === room.hostId && <em>HOST</em>}{player.id === session?.playerId && <em>YOU</em>}</strong><span className={`ready-indicator ${player.connected ? 'online' : ''}`} />{player.connected ? '온라인' : '연결 중'}</div>)}
              {Array.from({ length: Math.max(0, 2 - room.players.length) }, (_, i) => <div className="lobby-player waiting" key={`open-${i}`}><span className="player-number">··</span><span>초대를 기다리는 중</span></div>)}
            </div>
            <button className="button primary lobby-start" onClick={onStart} disabled={session?.playerId !== room.hostId || room.players.length > 8 || connection !== 'connected'}>{session?.playerId === room.hostId ? room.players.length === 1 ? '혼자 테스트 시작' : '무작위 술래로 시작' : '방장이 시작하기를 기다리는 중'} <span>→</span></button>
            <button className="text-button lobby-leave" onClick={onLeave}>← 대기실 나가기</button>
            {me && <p className="host-help">{room.players.length === 1 ? '혼자 시작하면 대기 시간 없이 이동과 색칠을 자유롭게 확인할 수 있어요.' : '방장이 시작하면 술래가 무작위로 선정됩니다.'}</p>}
          </section>
          <RoomChat messages={room.chat} currentPlayerId={session?.playerId ?? ''} onSend={onChat} disabled={connection !== 'connected'} />
        </div>
      )}
    </main>
  )
}

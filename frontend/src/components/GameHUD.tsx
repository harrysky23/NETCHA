import { useEffect, useRef, useState } from 'react'
import { CharacterPreview } from './CharacterPreview'
import { RoomChat } from './RoomChat'
import type { RoomSession, RoomSnapshot } from '../network/types'

const phaseLabel: Record<RoomSnapshot['phase'], string> = {
  lobby: '대기 중', hiding: '숨을 시간', hunting: '수색 중', results: '라운드 결과',
}

type Props = {
  room: RoomSnapshot
  session: RoomSession
  connected: boolean
  onStart: () => void
  onLeave: () => void
  onChat: (text: string) => void
  onReturn: () => void
}

export function GameHUD({ room, session, connected, onStart, onLeave, onChat, onReturn }: Props) {
  const me = room.players.find((player) => player.id === session.playerId)
  const [remaining, setRemaining] = useState(0)
  const serverOffset = useRef<number | null>(null)
  if (serverOffset.current === null) serverOffset.current = Date.now() / 1000 - room.serverTime
  const offset = serverOffset.current

  useEffect(() => {
    function tick() {
      setRemaining(room.phaseEndsAt ? Math.max(0, Math.ceil(room.phaseEndsAt - (Date.now() / 1000 - offset))) : 0)
    }
    tick()
    const timer = window.setInterval(tick, 200)
    return () => window.clearInterval(timer)
  }, [offset, room.phaseEndsAt])

  const hidersAlive = room.players.filter((player) => player.role === 'hider' && player.alive).length
  const timeLabel = `${Math.floor(remaining / 60).toString().padStart(2, '0')}:${(remaining % 60).toString().padStart(2, '0')}`

  return (
    <aside className="game-sidebar online-sidebar">
      <section className="panel round-card">
        <div className="section-label"><span className="round-live"><i /> ROUND {room.roundNumber || '—'}</span><span>{connected ? 'LIVE' : 'RECONNECTING'}</span></div>
        <h2>{phaseLabel[room.phase]}</h2>
        <div className={`round-clock ${remaining <= 20 && room.phase === 'hunting' ? 'urgent' : ''}`}>{room.phase === 'lobby' ? '대기 중' : timeLabel}</div>
        {room.phase === 'hiding' && <p>도망자는 움직이며 위장할 수 있어요.</p>}
        {room.phase === 'hunting' && <p>생존 {hidersAlive}명 · 가까울수록 점수가 크게 올라요.</p>}
        {room.phase === 'lobby' && <p>방장이 시작하면 술래가 무작위로 정해져요.</p>}
      </section>
      {me && <section className="panel local-player-card"><CharacterPreview character={{ width: 16, height: 16, colors: me.colors }} /><div><span>나 · {me.role === 'hunter' ? '술래' : '도망자'}{!me.alive && ' · 탈락'}</span><strong>{me.score.toFixed(1)}<small> PTS</small></strong></div></section>}
      <section className="panel scores-card">
        <div className="section-label"><h2>실시간 점수</h2><span>ALL PLAYERS</span></div>
        <div className="score-list">{room.scores.map((entry, index) => {
          const player = room.players.find((candidate) => candidate.id === entry.id)
          return <div className={`score-row ${entry.id === session.playerId ? 'me' : ''} ${!entry.alive ? 'eliminated' : ''}`} key={entry.id}>
            <span className="score-rank">{String(index + 1).padStart(2, '0')}</span><span className="score-player-name">{entry.name}{player?.role === 'hunter' && <em>술래</em>}{!entry.alive && <em>탈락</em>}</span><strong>{entry.score.toFixed(1)}</strong>
          </div>
        })}</div>
      </section>
      {room.phase === 'lobby' && <button className="button primary" disabled={!connected || session.playerId !== room.hostId || room.players.length < 2} onClick={onStart}>술래를 뽑고 시작 <span>→</span></button>}
      {room.phase === 'results' && <section className="panel results-inline"><span className="eyebrow">ROUND COMPLETE</span><strong>{room.winner === 'hunter' ? '술래 승리' : '도망자 팀 승리'}</strong><p>{room.resultReason === 'time_up' ? '시간을 버티며 강의실에 숨어 있었어요.' : '술래가 모든 도망자를 찾았어요.'}</p><button className="button primary" onClick={onReturn}>로비로 돌아가기 <span>↗</span></button></section>}
      <RoomChat messages={room.chat} currentPlayerId={session.playerId} onSend={onChat} disabled={!connected} />
      <div className="game-controls-note">{me?.role === 'hunter' ? '마우스를 움직여 방향을 정하고 클릭해 한 발 쏘세요. 1초 후 다시 발사할 수 있어요.' : 'WASD 이동 · C 색칠 모드 · 친구 이름을 눌러 시점을 바꿀 수 있어요.'}</div>
      <button className="text-button leave-game" onClick={onLeave}>← 방 나가기</button>
    </aside>
  )
}

export function ResultsScreen({ room, session, connected, onReturn, onChat }: {
  room: RoomSnapshot; session: RoomSession; connected: boolean; onReturn: () => void; onChat: (text: string) => void
}) {
  return (
    <main className="workspace results-workspace">
      <p className="eyebrow">ROUND {room.roundNumber} · RESULT</p>
      <h1>{room.winner === 'hunter' ? '술래가 모두 찾았어요.' : '도망자 팀이 버텼어요.'}<span className="title-dot">.</span></h1>
      <p className="results-copy">{room.resultReason === 'time_up' ? '수색 시간이 끝날 때까지 살아남았어요.' : '술래가 마지막 도망자를 찾아냈어요.'}</p>
      <div className="results-layout"><section className="panel results-board"><div className="section-label"><h2>이번 판 점수</h2><span>최종 순위</span></div>{room.scores.map((entry, index) => <div className={`result-row ${entry.id === session.playerId ? 'me' : ''}`} key={entry.id}><span>{String(index + 1).padStart(2, '0')}</span><strong>{entry.name}{room.players.find((p) => p.id === entry.id)?.role === 'hunter' && <em>술래</em>}{!entry.alive && <em>탈락</em>}</strong><b>{entry.score.toFixed(1)} <small>PTS</small></b></div>)}<button className="button primary" onClick={onReturn} disabled={!connected}>다음 판 준비 · 로비로 <span>↗</span></button><p className="results-auto-return">잠시 후 자동으로 로비로 돌아갑니다.</p></section><RoomChat messages={room.chat} currentPlayerId={session.playerId} onSend={onChat} disabled={!connected} /></div>
    </main>
  )
}

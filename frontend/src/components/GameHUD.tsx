import { useEffect, useState } from 'react'
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
  onLeave: () => void
  onChat: (text: string) => void
  onReturn: () => void
}

export function GameHUD({ room, session, connected, onLeave, onChat, onReturn }: Props) {
  const me = room.players.find((player) => player.id === session.playerId)
  const [remaining, setRemaining] = useState(0)
  const [offset] = useState(() => Date.now() / 1000 - room.serverTime)

  useEffect(() => {
    function tick() {
      setRemaining(room.phaseEndsAt ? Math.max(0, Math.ceil(room.phaseEndsAt - (Date.now() / 1000 - offset))) : 0)
    }
    tick()
    const timer = window.setInterval(tick, 200)
    return () => window.clearInterval(timer)
  }, [offset, room.phaseEndsAt])

  const timeLabel = `${Math.floor(remaining / 60).toString().padStart(2, '0')}:${(remaining % 60).toString().padStart(2, '0')}`
  const hidersAlive = room.players.filter((player) => player.role === 'hider' && player.alive).length

  return (
    <div className="game-hud">
      <section className="hud-status" aria-label="게임 진행 상태">
        <div className="hud-room"><span className="live-dot" /> {connected ? `ROOM ${room.code}` : '재연결 중…'}<span>학교 1층</span></div>
        <div className="hud-status-main">
          {me && <CharacterPreview character={{ width: 16, height: 16, colors: me.colors, palette: me.palette }} />}
          <div><span className="hud-role">{room.practice ? '혼자 테스트' : `${me?.role === 'hunter' ? '술래' : '도망자'} · ${phaseLabel[room.phase]}`}{me && !me.alive && ' · 탈락'}</span><strong className={remaining <= 20 && !room.practice ? 'urgent' : ''}>{room.practice ? '자유 연습' : timeLabel}</strong></div>
          <button className="hud-exit" onClick={onLeave} aria-label="방 나가기" title="방 나가기">×</button>
        </div>
        {room.practice ? <button className="hud-return" onClick={onReturn} disabled={!connected}>로비로 돌아가기 ↗</button> : <p className="hud-alive">생존 도망자 {hidersAlive}명 · ROUND {room.roundNumber}</p>}
      </section>

      <section className="hud-score" aria-label="실시간 점수판">
        <div className="hud-panel-title"><h2>점수판</h2><span>LIVE RANKING</span></div>
        <div className="hud-score-list">{room.scores.map((entry, index) => {
          const player = room.players.find((candidate) => candidate.id === entry.id)
          return <div className={`hud-score-row ${entry.id === session.playerId ? 'me' : ''} ${!entry.alive ? 'eliminated' : ''}`} key={entry.id}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <span>{entry.name}{player?.role === 'hunter' && <em>술래</em>}{!entry.alive && <em>탈락</em>}</span>
            <strong>{entry.score.toFixed(1)}</strong>
          </div>
        })}</div>
      </section>

      <div className="hud-chat"><RoomChat messages={room.chat} currentPlayerId={session.playerId} onSend={onChat} disabled={!connected} /></div>
      <div className="hud-help"><span><kbd>W A S D</kbd> 이동</span>{me?.role === 'hunter' ? <span><kbd>클릭</kbd> 단발 사격 · 1초 간격</span> : <><span><kbd>C</kbd> 색칠</span><span><kbd>I</kbd> 스포이드</span></>}</div>
    </div>
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

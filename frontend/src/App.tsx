import { lazy, Suspense, useState } from 'react'
import { GameHUD, ResultsScreen } from './components/GameHUD'
import { LobbyScreen } from './components/LobbyScreen'
import { StartScreen } from './components/StartScreen'
import { useRoom } from './network/useRoom'
import './App.css'

const GameCanvas = lazy(() => import('./game/GameCanvas'))

export default function App() {
  const roomState = useRoom()
  const [showLobby, setShowLobby] = useState(false)
  const { session, room } = roomState
  const page = !session || !room
    ? showLobby ? 'join' : 'start'
    : room.phase === 'lobby' ? 'lobby'
      : room.phase === 'results' ? 'results' : 'game'

  const onChat = (text: string) => roomState.send({ type: 'chat', text })
  const onStart = () => roomState.send({ type: 'start' })

  return (
    <div className="app-shell">
      <header className="site-header">
        <span className="brand"><span className="brand-mark" aria-hidden="true">▦</span> NETCHACAMELEON</span>
        <span className="version"><span className="live-dot" /> ONLINE HIDE & SEEK <span className="version-divider">/</span> 2–8 PLAYERS</span>
      </header>

      {page === 'start' && <StartScreen onStart={() => { roomState.clearError(); setShowLobby(true) }} />}
      {(page === 'join' || page === 'lobby') && (
        <LobbyScreen
          session={session}
          room={room}
          connection={roomState.connection}
          error={roomState.error}
          onCreate={roomState.createRoom}
          onJoin={roomState.joinRoom}
          onStart={onStart}
          onLeave={roomState.leaveRoom}
          onChat={onChat}
          onClearError={roomState.clearError}
        />
      )}

      {page === 'game' && session && room && (
        <main className="workspace online-room game-workspace">
          <div className="page-heading">
            <div>
              <p className="eyebrow">ROOM {room.code} · ROUND {room.roundNumber}</p>
              <h1>{room.phase === 'hiding' ? '위장을 준비해.' : '가까울수록 더 벌어요.'}<span className="title-dot">.</span></h1>
            </div>
            <span className="phase-pill"><i />{room.phase === 'hiding' ? '30초 준비' : '수색 시작'}</span>
          </div>
          <div className="game-layout online-game-layout">
            <section>
              <div className="game-frame">
                <div className="panel-bar"><span>CLASSROOM · 40 × 30 TILES</span><span>2–8 ONLINE</span></div>
                <Suspense fallback={<p className="loading">강의실을 불러오는 중…</p>}>
                  <GameCanvas room={room} session={session} send={roomState.send} />
                </Suspense>
              </div>
              <div className="room-caption"><span>1,280 × 960 WORLD</span><span>C · PAINT / WASD · MOVE</span></div>
            </section>
            <GameHUD
              room={room}
              session={session}
              connected={roomState.connection === 'connected'}
              onStart={onStart}
              onLeave={roomState.leaveRoom}
              onChat={onChat}
              onReturn={() => roomState.send({ type: 'return_lobby' })}
            />
          </div>
        </main>
      )}

      {page === 'results' && session && room && (
        <>
          <div className="page-heading results-heading">
            <div><p className="eyebrow">ROOM {room.code} · BACK TO LOBBY IN 12 SEC</p><span className="connection-badge">라운드 종료</span></div>
          </div>
          <ResultsScreen
            room={room}
            session={session}
            connected={roomState.connection === 'connected'}
            onReturn={() => roomState.send({ type: 'return_lobby' })}
            onChat={onChat}
          />
        </>
      )}

      <footer className="site-footer"><span>A STUDY IN COLOR & CAMOUFLAGE</span><span>칠하고, 숨고, 한 발에 승부를.</span></footer>
    </div>
  )
}

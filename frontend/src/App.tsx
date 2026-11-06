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
    <div className={`app-shell ${page === 'game' ? 'is-playing' : ''}`}>
      {page !== 'game' && <header className="site-header">
        <span className="brand"><span className="brand-mark" aria-hidden="true">▦</span> NETCHACAMELEON</span>
        <span className="version"><span className="live-dot" /> ONLINE HIDE & SEEK <span className="version-divider">/</span> 2–8 PLAYERS</span>
      </header>}

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
        <main className="immersive-game" aria-label="학교 숨바꼭질 게임">
            <Suspense fallback={<p className="game-status">학교를 불러오는 중…</p>}>
              <GameCanvas room={room} session={session} send={roomState.send} />
            </Suspense>
            <GameHUD
              room={room}
              session={session}
              connected={roomState.connection === 'connected'}
              onLeave={roomState.leaveRoom}
              onChat={onChat}
              onReturn={() => roomState.send({ type: 'return_lobby' })}
            />
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

      {page !== 'game' && <footer className="site-footer"><span>A STUDY IN COLOR & CAMOUFLAGE</span><span>칠하고, 숨고, 한 발에 승부를.</span></footer>}
    </div>
  )
}

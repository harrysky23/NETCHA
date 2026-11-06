import { lazy, Suspense, useState } from 'react'
import { StartScreen } from './components/StartScreen'
import { PixelEditor } from './components/PixelEditor'
import { CharacterPreview } from './components/CharacterPreview'

import { createDefaultCharacter, type PixelCharacter } from './types/character'
import './App.css'

const GameCanvas = lazy(() => import('./game/GameCanvas'))

type Screen = 'start' | 'editor' | 'game'

export default function App() {
  const [screen, setScreen] = useState<Screen>('start')
  const [character, setCharacter] = useState<PixelCharacter>(
    createDefaultCharacter,
  )
  return (
    <div className="app-shell">
      <header className="site-header">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true">
            ▦
          </span>{' '}
          NETCHACAMELEON
        </span>
        <span className="version">
          <span className="live-dot" /> PHASE 01{' '}
          <span className="version-divider">/</span> LOCAL PROTOTYPE
        </span>
      </header>
      {screen === 'start' && (
        <StartScreen
          character={character}
          onStart={() => setScreen('editor')}
        />
      )}
      {screen === 'editor' && (
        <PixelEditor
          initialCharacter={character}
          onBack={() => setScreen('start')}
          onComplete={(next) => {
            setCharacter(next)
            setScreen('game')
          }}
        />
      )}
      {screen === 'game' && (
        <main className="workspace">
          <div className="page-heading">
            <div>
              <p className="eyebrow">02 / EXPLORE THE CLASSROOM</p>
              <h1>
                강의실에 스며들기<span className="title-dot">.</span>
              </h1>
            </div>
            <button className="text-button" onClick={() => setScreen('editor')}>
              ← 다시 칠하기
            </button>
          </div>
          <div className="game-layout">
            <section>
              <div className="game-frame">
                <div className="panel-bar">
                  <span>THE CLASSROOM</span>
                  <span>LOCAL / 01</span>
                </div>
                <Suspense
                  fallback={<p className="loading">강의실 불러오는 중…</p>}
                >
                  <GameCanvas character={character} />
                </Suspense>
              </div>
              <div className="room-caption">
                <span>20 × 15 TILES</span>
                <span>640 × 480 PX</span>
              </div>
            </section>
            <aside className="game-sidebar">
              <section className="panel room-info">
                <p className="eyebrow">CLASSROOM / 001</p>
                <h2>오늘의 은신처</h2>
                <p>
                  책상 사이를 걸어 보세요.
                  <br />내 색이 가장 잘 어울리는 곳은 어디일까요?
                </p>
                <hr className="room-rule" />
                <div
                  className="keyboard"
                  aria-label="W 위, A 왼쪽, S 아래, D 오른쪽"
                >
                  <kbd>W</kbd>
                  <kbd>A</kbd>
                  <kbd>S</kbd>
                  <kbd>D</kbd>
                </div>
                <p className="control-label">WASD로 이동</p>
              </section>
              <div className="panel game-character">
                <CharacterPreview character={character} />
                <div>
                  <strong>나의 캐릭터</strong>
                  <p>16 × 16 / 8 COLORS</p>
                </div>
              </div>
              <button
                className="button primary"
                onClick={() => setScreen('editor')}
              >
                다시 칠하기 <span aria-hidden="true">↗</span>
              </button>
              <p className="game-help">
                이동이 안 되면 게임 화면을 클릭해 주세요. 벽과 가구는 통과할 수
                없어요.
              </p>
            </aside>
          </div>
        </main>
      )}
      <footer className="site-footer">
        <span>A STUDY IN COLOR & CAMOUFLAGE</span>
        <span>작게 칠하고, 자유롭게 탐험하세요.</span>
      </footer>
    </div>
  )
}

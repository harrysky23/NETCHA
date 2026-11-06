import type { PixelCharacter } from '../types/character'
import { CharacterPreview } from './CharacterPreview'

type Props = { character: PixelCharacter; onStart: () => void }

export function StartScreen({ character, onStart }: Props) {
  return (
    <main className="start-screen">
      <section className="start-copy">
        <p className="eyebrow">
          <span className="tiny-square" /> A LITTLE CAMOUFLAGE EXPERIMENT
        </p>
        <h1>
          CHROMIMIC<span className="title-dot">.</span>
        </h1>
        <h2>
          색을 입고,
          <br />
          배경 속으로.
        </h2>
        <p className="intro">
          열여섯 칸의 작은 가능성.
          <br />
          나만의 도트 캐릭터를 칠하고, 강의실을 탐험해 보세요.
        </p>
        <button className="button primary start-button" onClick={onStart}>
          게임 시작 <span aria-hidden="true">↗</span>
        </button>
        <p className="start-note">로컬 싱글플레이 · 키보드와 마우스로 플레이</p>
      </section>
      <section className="specimen" aria-label="캐릭터 소개">
        <div className="specimen-top">
          <span>SPECIMEN / 001</span>
          <span>16 × 16 PX</span>
        </div>
        <div className="specimen-grid">
          <span className="specimen-cross top-left">+</span>
          <span className="specimen-cross bottom-right">+</span>
          <CharacterPreview character={character} />
          <span className="specimen-label">작은 몸, 무한한 위장.</span>
        </div>
        <div className="specimen-bottom">
          <span className="live-dot" /> YOUR NEXT DISGUISE <span>↗</span>
        </div>
      </section>
      <div className="journey" aria-label="플레이 순서">
        <div>
          <span>01</span>
          <strong>색을 고르고</strong>
          <p>8가지 자연의 색</p>
        </div>
        <div>
          <span>02</span>
          <strong>나를 칠하고</strong>
          <p>고정된 실루엣, 자유로운 무늬</p>
        </div>
        <div>
          <span>03</span>
          <strong>공간을 탐험하기</strong>
          <p>WASD로 강의실 산책</p>
        </div>
      </div>
    </main>
  )
}

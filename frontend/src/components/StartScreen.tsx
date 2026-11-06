import { createDefaultCharacter } from '../types/character'
import { CharacterPreview } from './CharacterPreview'

type Props = { onStart: () => void }

export function StartScreen({ onStart }: Props) {
  return (
    <main className="start-screen">
      <section className="start-copy">
        <p className="eyebrow"><span className="tiny-square" /> A LITTLE CAMOUFLAGE EXPERIMENT</p>
        <h1>CHROMIMIC<span className="title-dot">.</span></h1>
        <h2>숨고, 칠하고,<br />들키지 마.</h2>
        <p className="intro">넓은 강의실에 숨어 나만의 무늬로 위장하세요.<br />가까이서 버틸수록 점수가 빠르게 올라갑니다.</p>
        <button className="button primary start-button" onClick={onStart}>온라인 로비 입장 <span aria-hidden="true">↗</span></button>
        <p className="start-note">2~8인 · WASD 이동 · C 키로 색칠 · 클릭으로 사격</p>
      </section>
      <section className="specimen" aria-label="고정 캐릭터 실루엣">
        <div className="specimen-top"><span>THE ONLY SHAPE</span><span>16 × 16 PX</span></div>
        <div className="specimen-grid">
          <span className="specimen-cross top-left">+</span><span className="specimen-cross bottom-right">+</span>
          <CharacterPreview character={createDefaultCharacter()} />
          <span className="specimen-label">같은 실루엣, 다른 위장.</span>
        </div>
        <div className="specimen-bottom"><span className="live-dot" /> HIDE IN PLAIN SIGHT <span>↗</span></div>
      </section>
      <div className="journey" aria-label="게임 진행">
        <div><span>01</span><strong>30초, 위장</strong><p>C 키로 색칠하고 숨을 곳을 찾기</p></div>
        <div><span>02</span><strong>3분, 수색</strong><p>단발총 한 발로 숨어 있는 플레이어 찾기</p></div>
        <div><span>03</span><strong>실시간, 점수</strong><p>술래와 가까울수록 점수 급상승</p></div>
      </div>
    </main>
  )
}

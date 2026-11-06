import { useRef, useState, type PointerEvent } from 'react'
import { CHARACTER_MASK, CHARACTER_SIZE } from '../data/characterMask'
import { PALETTE, type PaletteIndex } from '../data/palette'
import {
  createDefaultCharacter,
  paintLine,
  type PixelCharacter,
  type PixelPoint,
} from '../types/character'
import { CharacterPreview } from './CharacterPreview'

type Props = {
  initialCharacter: PixelCharacter
  onComplete: (character: PixelCharacter) => void
  onBack: () => void
}

export function PixelEditor({ initialCharacter, onComplete, onBack }: Props) {
  const [character, setCharacter] = useState<PixelCharacter>(() => ({
    ...initialCharacter,
    colors: [...initialCharacter.colors],
  }))
  const [selected, setSelected] = useState<PaletteIndex>(1)
  const stroke = useRef<{
    pointerId: number
    previous: PixelPoint | null
  } | null>(null)

  function pointAt(event: PointerEvent<HTMLDivElement>): PixelPoint | null {
    const grid = event.currentTarget
    const rect = grid.getBoundingClientRect()
    const x = Math.floor(
      ((event.clientX - rect.left - grid.clientLeft) / grid.clientWidth) *
        CHARACTER_SIZE,
    )
    const y = Math.floor(
      ((event.clientY - rect.top - grid.clientTop) / grid.clientHeight) *
        CHARACTER_SIZE,
    )
    return x >= 0 && x < 16 && y >= 0 && y < 16 ? { x, y } : null
  }

  function paint(point: PixelPoint) {
    const previous = stroke.current?.previous ?? point
    setCharacter((current) => paintLine(current, previous, point, selected))
    if (stroke.current) stroke.current.previous = point
  }

  function startStroke(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    stroke.current = { pointerId: event.pointerId, previous: null }
    const point = pointAt(event)
    if (point) paint(point)
  }

  function moveStroke(event: PointerEvent<HTMLDivElement>) {
    if (stroke.current?.pointerId !== event.pointerId) return
    if ((event.buttons & 1) === 0) {
      stroke.current = null
      return
    }
    const point = pointAt(event)
    if (point) paint(point)
    else stroke.current.previous = null
  }

  function endStroke(event: PointerEvent<HTMLDivElement>) {
    if (stroke.current?.pointerId !== event.pointerId) return
    stroke.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <main className="workspace">
      <div className="page-heading">
        <div>
          <p className="eyebrow">01 / PAINT YOUR DISGUISE</p>
          <h1>
            나만의 위장 만들기<span className="title-dot">.</span>
          </h1>
        </div>
        <button className="text-button" onClick={onBack}>
          ← 시작 화면
        </button>
      </div>
      <div className="editor-layout">
        <section className="panel paint-panel" aria-label="도트 페인팅 에디터">
          <div className="panel-bar">
            <span>PIXEL STUDIO</span>
            <span>16 × 16</span>
          </div>
          <div className="grid-surround">
            <div className="grid-axis">
              <span>00</span>
              <span>15</span>
            </div>
            <div
              className="pixel-grid"
              role="group"
              aria-label="16×16 캐릭터 페인팅 그리드"
              onPointerDown={startStroke}
              onPointerMove={moveStroke}
              onPointerUp={endStroke}
              onPointerCancel={endStroke}
              onLostPointerCapture={() => {
                stroke.current = null
              }}
            >
              {character.colors.map((color, index) => (
                <button
                  type="button"
                  className={`pixel-cell ${CHARACTER_MASK[index] ? 'paintable' : ''}`}
                  key={index}
                  disabled={!CHARACTER_MASK[index]}
                  aria-label={`${Math.floor(index / 16) + 1}행 ${(index % 16) + 1}열, ${PALETTE[color].name}`}
                  style={{
                    backgroundColor: CHARACTER_MASK[index]
                      ? PALETTE[color].hex
                      : undefined,
                  }}
                  onClick={(event) => {
                    if (event.detail === 0) {
                      const point = { x: index % 16, y: Math.floor(index / 16) }
                      setCharacter((current) =>
                        paintLine(current, point, point, selected),
                      )
                    }
                  }}
                />
              ))}
            </div>
            <div className="grid-caption">
              <span>고정 실루엣</span>
              <span>클릭하거나 드래그해서 칠하기</span>
            </div>
          </div>
          <div className="paint-footer">
            <span>
              <span className="tiny-square" /> 실루엣 안쪽만 칠할 수 있어요.
            </span>
            <button
              className="text-button"
              onClick={() => setCharacter(createDefaultCharacter())}
            >
              ↺ 초기화
            </button>
          </div>
        </section>
        <aside className="editor-sidebar">
          <section className="panel palette-panel">
            <div className="section-label">
              <h2>팔레트</h2>
              <span>8 COLORS</span>
            </div>
            <p>강의실에 스며들 색을 골라 보세요.</p>
            <div className="palette" role="group" aria-label="8색 팔레트">
              {PALETTE.map((color, index) => (
                <button
                  key={color.hex}
                  className={`swatch ${selected === index ? 'selected' : ''}`}
                  style={{ backgroundColor: color.hex }}
                  aria-label={`${color.name} ${color.hex}`}
                  aria-pressed={selected === index}
                  onClick={() => setSelected(index as PaletteIndex)}
                >
                  <span>{selected === index ? '✓' : ''}</span>
                </button>
              ))}
            </div>
            <div className="selected-color">
              <span style={{ backgroundColor: PALETTE[selected].hex }} />
              <strong>{PALETTE[selected].name}</strong>
              <code>{PALETTE[selected].hex.toUpperCase()}</code>
            </div>
          </section>
          <section className="panel preview-panel">
            <div className="section-label">
              <h2>미리보기</h2>
              <span>LIVE PREVIEW</span>
            </div>
            <div className="preview-stage">
              <CharacterPreview character={character} />
            </div>
            <p>이 모습 그대로 강의실에 등장해요.</p>
          </section>
          <button
            className="button primary complete-button"
            onClick={() =>
              onComplete({ ...character, colors: [...character.colors] })
            }
          >
            완성 · 강의실 입장 <span aria-hidden="true">→</span>
          </button>
          <p className="side-note">완성한 뒤에도 다시 칠할 수 있어요.</p>
        </aside>
      </div>
    </main>
  )
}

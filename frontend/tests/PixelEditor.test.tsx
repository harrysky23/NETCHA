// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { PixelEditor } from '../src/components/PixelEditor'
import { CHARACTER_MASK } from '../src/data/characterMask'
import { createDefaultCharacter } from '../src/types/character'

let root: Root
let host: HTMLDivElement
let grid: HTMLDivElement
const complete = vi.fn()

beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  complete.mockClear()
  await act(async () => {
    root.render(
      <PixelEditor
        initialCharacter={createDefaultCharacter()}
        onComplete={complete}
        onBack={() => {}}
      />,
    )
  })
  grid = host.querySelector<HTMLDivElement>('.pixel-grid')!
  // jsdom은 레이아웃/포인터 캡처를 제공하지 않는다. 이벤트 처리만 검증한다.
  vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 160,
    height: 160,
  } as DOMRect)
  Object.defineProperties(grid, {
    clientWidth: { value: 160 },
    clientHeight: { value: 160 },
    clientLeft: { value: 0 },
    clientTop: { value: 0 },
  })
  grid.setPointerCapture = vi.fn()
  grid.hasPointerCapture = vi.fn(() => true)
  grid.releasePointerCapture = vi.fn()
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

async function pointer(type: string, x: number, y: number, buttons = 1) {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: 0,
    buttons,
    clientX: x,
    clientY: y,
  })
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    isPrimary: { value: true },
  })
  await act(async () => {
    grid.dispatchEvent(event)
  })
}

async function click(selector: string) {
  await act(async () => {
    ;(host.querySelector(selector) as HTMLButtonElement).click()
  })
}

test('팔레트 선택 후 드래그하면 중간 픽셀까지 칠하고 완성 시 상위로 전달한다', async () => {
  await click('[aria-label="벽돌 #b66049"]')
  await pointer('pointerdown', 35, 45)
  await pointer('pointermove', 105, 45)
  await pointer('pointerup', 105, 45, 0)
  await click('.complete-button')
  const character = complete.mock.calls[0][0]
  for (let x = 3; x <= 10; x++) expect(character.colors[4 * 16 + x]).toBe(6)
  expect(character.colors.filter((color: number) => color === 6)).toHaveLength(
    8,
  )
  expect(grid.setPointerCapture).toHaveBeenCalledWith(1)
  expect(grid.releasePointerCapture).toHaveBeenCalledWith(1)
})

test('실루엣 밖 클릭은 무시하고 포인터를 놓으면 추가 이동으로 칠하지 않는다', async () => {
  await click('[aria-label="하늘 #7eaaa8"]')
  await pointer('pointerdown', 5, 5)
  await pointer('pointerup', 5, 5, 0)
  await pointer('pointermove', 75, 75, 0)
  await click('.complete-button')
  expect(complete.mock.calls[0][0]).toEqual(createDefaultCharacter())
  const cells = grid.querySelectorAll('button')
  expect(cells).toHaveLength(256)
  cells.forEach((cell, index) =>
    expect(cell.disabled).toBe(!CHARACTER_MASK[index]),
  )
})

test('캡처 손실 뒤에는 칠하지 않고 초기화는 기본 캐릭터를 복원한다', async () => {
  await click('[aria-label="벽돌 #b66049"]')
  await pointer('pointerdown', 65, 45)
  await pointer('lostpointercapture', 65, 45)
  await pointer('pointermove', 95, 45)
  await click('.complete-button')
  const character = complete.mock.calls[0][0]
  expect(character.colors.filter((color: number) => color === 6)).toHaveLength(
    1,
  )
  await click('.paint-footer button')
  await click('.complete-button')
  expect(complete.mock.calls[1][0]).toEqual(createDefaultCharacter())
})

test('키보드로 픽셀 버튼을 활성화해도 선택한 색으로 칠한다', async () => {
  await click('[aria-label="하늘 #7eaaa8"]')
  await click('[aria-label="5행 7열, 이끼"]')
  expect(host.querySelector('[aria-label="5행 7열, 하늘"]')).not.toBeNull()
  expect(
    host
      .querySelector('[aria-label="하늘 #7eaaa8"]')
      ?.getAttribute('aria-pressed'),
  ).toBe('true')
  await click('.complete-button')
  expect(complete.mock.calls[0][0].colors[4 * 16 + 6]).toBe(7)
})

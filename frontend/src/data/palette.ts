/** 순서가 저장/전송되는 인덱스다. 색을 바꿔도 순서는 유지한다. */
export const PALETTE = [
  { name: '먹색', hex: '#293c34' },
  { name: '숲', hex: '#4b6b50' },
  { name: '이끼', hex: '#84965b' },
  { name: '연두', hex: '#b8c580' },
  { name: '흰색', hex: '#ffffff' },
  { name: '나무', hex: '#ae8052' },
  { name: '벽돌', hex: '#b66049' },
  { name: '하늘', hex: '#7eaaa8' },
] as const

export type PaletteIndex = number
export const DEFAULT_PALETTE: readonly string[] = PALETTE.map((color) => color.hex)
export const MAX_CHARACTER_COLORS = 64

export function isPaletteIndex(value: unknown): value is PaletteIndex {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < PALETTE.length
  )
}

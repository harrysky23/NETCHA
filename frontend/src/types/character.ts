import { CHARACTER_MASK, CHARACTER_SIZE } from '../data/characterMask.ts'
import { DEFAULT_PALETTE, MAX_CHARACTER_COLORS, type PaletteIndex } from '../data/palette.ts'

export type PixelCharacter = {
  width: 16
  height: 16
  colors: number[]
  palette?: string[]
}

/** TypeScript 타입만으로는 배열 길이나 외부 JSON을 보장할 수 없다. */
export function isPixelCharacter(value: unknown): value is PixelCharacter {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<PixelCharacter>
  const palette = candidate.palette ?? DEFAULT_PALETTE
  return (
    candidate.width === 16 &&
    candidate.height === 16 &&
    Array.isArray(candidate.colors) &&
    candidate.colors.length === 256 &&
    Array.isArray(palette) && palette.length >= 8 && palette.length <= MAX_CHARACTER_COLORS &&
    Array.from(palette).every((color) => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) &&
    Array.from(candidate.colors).every((color) => Number.isInteger(color) && color >= 0 && color < palette.length)
  )
}

export function createDefaultCharacter(): PixelCharacter {
  const colors = CHARACTER_MASK.map((inside) => inside ? 4 : 0)
  return { width: 16, height: 16, colors, palette: [...DEFAULT_PALETTE] }
}

export function characterColor(character: PixelCharacter, index: number): string {
  return (character.palette ?? DEFAULT_PALETTE)[character.colors[index]] ?? '#ffffff'
}

export type PixelPoint = { x: number; y: number }

/** Bresenham 보간: 빠른 포인터 이동에서도 칸이 빠지지 않는다. */
export function paintLine(
  character: PixelCharacter,
  from: PixelPoint,
  to: PixelPoint,
  color: PaletteIndex,
): PixelCharacter {
  const colors = [...character.colors]
  let { x, y } = from
  const dx = Math.abs(to.x - x)
  const dy = -Math.abs(to.y - y)
  const sx = x < to.x ? 1 : -1
  const sy = y < to.y ? 1 : -1
  let error = dx + dy

  while (true) {
    const index = y * CHARACTER_SIZE + x
    if (
      x >= 0 &&
      x < CHARACTER_SIZE &&
      y >= 0 &&
      y < CHARACTER_SIZE &&
      CHARACTER_MASK[index]
    ) {
      colors[index] = color
    }
    if (x === to.x && y === to.y) break
    const doubleError = 2 * error
    if (doubleError >= dy) {
      error += dy
      x += sx
    }
    if (doubleError <= dx) {
      error += dx
      y += sy
    }
  }
  return { ...character, colors }
}

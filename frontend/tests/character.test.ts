import assert from 'node:assert/strict'
import { test } from 'vitest'
import { CHARACTER_MASK } from '../src/data/characterMask.ts'
import { PALETTE } from '../src/data/palette.ts'
import {
  createDefaultCharacter,
  isPixelCharacter,
  paintLine,
  characterColor,
} from '../src/types/character.ts'

test('실루엣과 기본 캐릭터는 정확히 16×16이고 생성 시 배열을 공유하지 않는다', () => {
  assert.equal(CHARACTER_MASK.length, 256)
  assert.equal(PALETTE.length, 8)
  assert.ok(
    CHARACTER_MASK.some(Boolean) && CHARACTER_MASK.some((value) => !value),
  )
  const first = createDefaultCharacter()
  const second = createDefaultCharacter()
  assert.ok(isPixelCharacter(first))
  first.colors[0] = 7
  assert.equal(second.colors[0], 0)
})

test('기본 캐릭터는 좌우 대칭인 흰색 사람 실루엣이다', () => {
  const character = createDefaultCharacter()
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    assert.equal(CHARACTER_MASK[y * 16 + x], CHARACTER_MASK[y * 16 + 15 - x])
    if (CHARACTER_MASK[y * 16 + x]) assert.equal(characterColor(character, y * 16 + x), '#ffffff')
  }
})

test('스포이드 색상을 팔레트에 추가해도 정확한 RGB와 마스크를 유지한다', () => {
  const character = createDefaultCharacter()
  character.palette!.push('#abc123')
  const painted = paintLine(character, { x: 5, y: 3 }, { x: 10, y: 3 }, 8)
  assert.ok(isPixelCharacter(painted))
  assert.equal(characterColor(painted, 3 * 16 + 7), '#abc123')
  assert.equal(isPixelCharacter({ ...painted, palette: Array(8) }), false)
  assert.equal(isPixelCharacter({ ...painted, palette: [...painted.palette!, 'red'] }), false)
  assert.equal(isPixelCharacter({ ...painted, palette: Array(65).fill('#ffffff') }), false)
})

test('외부 데이터의 크기, 배열 길이, 정수 인덱스, 희소 배열을 검증한다', () => {
  const valid = createDefaultCharacter()
  for (const invalid of [
    null,
    {},
    { ...valid, width: 32 },
    { ...valid, height: 15 },
    { ...valid, colors: valid.colors.slice(1) },
    { ...valid, colors: Array(256) },
    ...[-1, 8, 1.5, NaN, '2'].map((color) => ({
      ...valid,
      colors: Array(256).fill(color),
    })),
  ])
    assert.equal(isPixelCharacter(invalid), false)
})

test('빠른 드래그는 중간 픽셀까지 칠하고 원본과 마스크 바깥은 변경하지 않는다', () => {
  const original = createDefaultCharacter()
  const before = [...original.colors]
  const painted = paintLine(original, { x: 0, y: 4 }, { x: 15, y: 4 }, 6)
  assert.deepEqual(original.colors, before)
  for (let x = 0; x < 16; x++) {
    const index = 4 * 16 + x
    assert.equal(
      painted.colors[index],
      CHARACTER_MASK[index] ? 6 : before[index],
    )
  }
  assert.ok(isPixelCharacter(painted))
  const outside = paintLine(original, { x: 0, y: 0 }, { x: 0, y: 15 }, 7)
  assert.deepEqual(outside, original)
})

test('역방향/대각선 드래그도 끊기지 않고 마스크를 보호한다', () => {
  const original = createDefaultCharacter()
  const forward = paintLine(original, { x: 3, y: 3 }, { x: 12, y: 12 }, 7)
  const backward = paintLine(original, { x: 12, y: 12 }, { x: 3, y: 3 }, 7)
  assert.deepEqual(forward, backward)
  for (let p = 3; p <= 12; p++) {
    if (CHARACTER_MASK[p * 16 + p]) assert.equal(forward.colors[p * 16 + p], 7)
  }
  for (let i = 0; i < 256; i++)
    if (!CHARACTER_MASK[i]) assert.equal(forward.colors[i], original.colors[i])
})

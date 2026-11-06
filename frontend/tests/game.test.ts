import assert from 'node:assert/strict'
import { test } from 'vitest'
import { getMovementVelocity, PLAYER_SPEED } from '../src/game/movement.ts'
import {
  CLASSROOM_FURNITURE,
  CLASSROOM_TILES,
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_SPAWNS,
  SCHOOL_ROOMS,
  SCHOOL_WALLS,
  TILE_SIZE,
  WALL_TILE,
} from '../src/game/map.ts'

test('모든 키 조합에서 정지 또는 초당 100px이며 반대 입력은 상쇄된다', () => {
  for (let mask = 0; mask < 16; mask++) {
    const input = {
      up: Boolean(mask & 1),
      down: Boolean(mask & 2),
      left: Boolean(mask & 4),
      right: Boolean(mask & 8),
    }
    const velocity = getMovementVelocity(input)
    const idle = input.up === input.down && input.left === input.right
    assert.ok(
      Math.abs(Math.hypot(velocity.x, velocity.y) - (idle ? 0 : PLAYER_SPEED)) <
        1e-10,
    )
  }
  assert.deepEqual(
    getMovementVelocity({ up: true, down: false, left: false, right: false }),
    { x: 0, y: -100 },
  )
})

test('64×48 학교는 7개 공간으로 나뉘고 모든 가구가 외벽 안에 놓인다', () => {
  assert.equal(GAME_WIDTH, 2048)
  assert.equal(GAME_HEIGHT, 1536)
  assert.equal(CLASSROOM_TILES.length, 48)
  assert.equal(SCHOOL_ROOMS.length, 7)
  assert.ok(SCHOOL_ROOMS.some((room) => room.id === 'restroom'))
  CLASSROOM_TILES.forEach((row, y) => {
    assert.equal(row.length, 64)
    row.forEach((tile, x) => {
      if (x === 0 || x === 63 || y === 0 || y === 47)
        assert.equal(tile, WALL_TILE)
    })
  })
  for (const item of CLASSROOM_FURNITURE) {
    assert.ok(item.x >= TILE_SIZE && item.y >= TILE_SIZE)
    assert.ok(item.x + item.width <= GAME_WIDTH - TILE_SIZE)
    assert.ok(item.y + item.height <= GAME_HEIGHT - TILE_SIZE)
    assert.ok(item.width > 0 && item.height > 0)
  }
})

test('모든 생성 지점의 캐릭터가 실내 벽과 가구에 겹치지 않는다', () => {
  for (const { x, y } of PLAYER_SPAWNS) {
  assert.notEqual(
    CLASSROOM_TILES[Math.floor(y / TILE_SIZE)][Math.floor(x / TILE_SIZE)],
    WALL_TILE,
  )
  for (const item of [...CLASSROOM_FURNITURE.filter((item) => item.solid), ...SCHOOL_WALLS]) {
    assert.ok(
      x + 8 <= item.x ||
        x - 8 >= item.x + item.width ||
        y + 8 <= item.y ||
        y - 8 >= item.y + item.height,
    )
  }
  }
})

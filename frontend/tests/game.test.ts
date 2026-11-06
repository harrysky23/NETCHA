import assert from 'node:assert/strict'
import { test } from 'vitest'
import { getMovementVelocity, PLAYER_SPEED } from '../src/game/movement.ts'
import {
  CLASSROOM_FURNITURE,
  CLASSROOM_TILES,
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_SPAWN,
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

test('20×15 타일맵의 외곽은 모두 충돌 벽이며 가구는 맵 안에 놓인다', () => {
  assert.equal(GAME_WIDTH, 640)
  assert.equal(GAME_HEIGHT, 480)
  assert.equal(CLASSROOM_TILES.length, 15)
  CLASSROOM_TILES.forEach((row, y) => {
    assert.equal(row.length, 20)
    row.forEach((tile, x) => {
      if (x === 0 || x === 19 || y === 0 || y === 14)
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

test('생성 지점의 16×16 캐릭터는 벽과 가구에 겹치지 않는다', () => {
  const { x, y } = PLAYER_SPAWN
  assert.notEqual(
    CLASSROOM_TILES[Math.floor(y / TILE_SIZE)][Math.floor(x / TILE_SIZE)],
    WALL_TILE,
  )
  for (const item of CLASSROOM_FURNITURE) {
    assert.ok(
      x + 8 <= item.x ||
        x - 8 >= item.x + item.width ||
        y + 8 <= item.y ||
        y - 8 >= item.y + item.height,
    )
  }
})

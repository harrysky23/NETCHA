export const TILE_SIZE = 32
export const MAP_COLUMNS = 20
export const MAP_ROWS = 15
export const GAME_WIDTH = MAP_COLUMNS * TILE_SIZE
export const GAME_HEIGHT = MAP_ROWS * TILE_SIZE
export const WALL_TILE = 3
export const PLAYER_SPAWN = { x: 320, y: 416 } as const

/** 0〜2: 바닥, 3: 벽. 렌더링과 타일 충돌이 같은 데이터를 사용한다. */
export const CLASSROOM_TILES: number[][] = Array.from(
  { length: MAP_ROWS },
  (_, y) =>
    Array.from({ length: MAP_COLUMNS }, (_, x) =>
      x === 0 || y === 0 || x === MAP_COLUMNS - 1 || y === MAP_ROWS - 1
        ? WALL_TILE
        : (x + y) % 3,
    ),
)

export type Furniture = {
  kind: 'desk' | 'teacher' | 'bookcase' | 'plant'
  x: number
  y: number
  width: number
  height: number
}

/** 좌표는 좌상단 기준. 가구 그림과 정적 충돌체가 같은 사각형을 공유한다. */
export const CLASSROOM_FURNITURE: readonly Furniture[] = [
  { kind: 'teacher', x: 272, y: 64, width: 96, height: 40 },
  { kind: 'bookcase', x: 528, y: 48, width: 64, height: 48 },
  ...[128, 224, 320].flatMap((y): Furniture[] =>
    [112, 288, 464].map((x) => ({ kind: 'desk', x, y, width: 64, height: 56 })),
  ),
  { kind: 'plant', x: 48, y: 48, width: 32, height: 32 },
  { kind: 'plant', x: 48, y: 384, width: 32, height: 32 },
  { kind: 'plant', x: 560, y: 384, width: 32, height: 32 },
]

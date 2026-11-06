import mapData from '../../../shared/map.json'

export const TILE_SIZE = mapData.tileSize
export const MAP_COLUMNS = mapData.columns
export const MAP_ROWS = mapData.rows
export const GAME_WIDTH = MAP_COLUMNS * TILE_SIZE
export const GAME_HEIGHT = MAP_ROWS * TILE_SIZE
export const VIEW_WIDTH = 640
export const VIEW_HEIGHT = 480
export const WALL_TILE = 3
export const PLAYER_SPAWNS = [
  { x: 288, y: 288 },
  { x: 992, y: 272 },
  { x: 992, y: 688 },
  { x: 288, y: 688 },
  { x: 704, y: 272 },
  { x: 704, y: 688 },
  { x: 416, y: 464 },
] as const
export const CLASSROOM_TILES: number[][] = Array.from(
  { length: MAP_ROWS },
  (_, y) =>
    Array.from({ length: MAP_COLUMNS }, (_, x) =>
      x === 0 || y === 0 || x === MAP_COLUMNS - 1 || y === MAP_ROWS - 1
        ? WALL_TILE
        : (x + y) % 3,
    ),
)

export type Furniture = (typeof mapData.furniture)[number]
export const CLASSROOM_FURNITURE: readonly Furniture[] = mapData.furniture

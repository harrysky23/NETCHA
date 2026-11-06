import mapData from '../../../shared/map.json'

export const TILE_SIZE = mapData.tileSize
export const MAP_COLUMNS = mapData.columns
export const MAP_ROWS = mapData.rows
export const GAME_WIDTH = MAP_COLUMNS * TILE_SIZE
export const GAME_HEIGHT = MAP_ROWS * TILE_SIZE
export const VIEW_WIDTH = 800
export const VIEW_HEIGHT = 600
export const WALL_TILE = 8
export const PLAYER_SPAWNS = mapData.spawns
export const PLAYER_SPAWN = PLAYER_SPAWNS[0]
export const SCHOOL_ROOMS = mapData.rooms
export const SCHOOL_WALLS = mapData.walls
export const CLASSROOM_TILES: number[][] = Array.from(
  { length: MAP_ROWS },
  (_, y) =>
    Array.from({ length: MAP_COLUMNS }, (_, x) => {
      const px = x * TILE_SIZE + 16
      const py = y * TILE_SIZE + 16
      if (SCHOOL_WALLS.some((wall) => px >= wall.x && px < wall.x + wall.width && py >= wall.y && py < wall.y + wall.height)) return WALL_TILE
      return SCHOOL_ROOMS.find((room) => px >= room.x && px < room.x + room.width && py >= room.y && py < room.y + room.height)?.floor ?? 0
    }),
)

export type Furniture = (typeof mapData.furniture)[number]
export const CLASSROOM_FURNITURE: readonly Furniture[] = mapData.furniture

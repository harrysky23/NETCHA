import Phaser from 'phaser'
import {
  CLASSROOM_FURNITURE,
  CLASSROOM_TILES,
  TILE_SIZE,
  WALL_TILE,
  type Furniture,
} from './map'

/** 유료/외부 에셋 없이 정수 좌표의 사각형으로 만든 픽셀아트. */
function drawFurniture(g: Phaser.GameObjects.Graphics, item: Furniture) {
  const { x, y, width: w, height: h, kind } = item
  const rect = (
    color: number,
    dx: number,
    dy: number,
    width: number,
    height: number,
  ) => {
    g.fillStyle(color).fillRect(x + dx, y + dy, width, height)
  }
  if (kind === 'desk' || kind === 'teacher') {
    const deskHeight = kind === 'desk' ? 32 : h - 4
    rect(0x775636, 0, 0, w, deskHeight)
    rect(0xae8052, 2, 2, w - 4, deskHeight - 8)
    rect(0xc19c67, 4, 3, w - 8, 3)
    rect(0x956d43, 2, deskHeight - 7, w - 4, 5)
    rect(0x5d523a, 4, deskHeight, 5, 4)
    rect(0x5d523a, w - 9, deskHeight, 5, 4)
    // 종이, 연필, 노트도 작은 사각형으로 직접 그린다.
    rect(0xede3c5, 12, 9, 15, 11)
    rect(0xccc4a6, 14, 12, 10, 1)
    rect(0xccc4a6, 14, 15, 8, 1)
    rect(0xb66049, 32, 10, 8, 12)
    rect(0xd49b72, 33, 10, 1, 12)
    rect(0x293c34, 45, 11, 2, 10)
    if (kind === 'desk') {
      rect(0x4c5f46, 23, 40, 20, 12)
      rect(0x84965b, 25, 39, 16, 9)
      rect(0xa3ad70, 26, 39, 14, 2)
      rect(0x3e503a, 24, 52, 3, 4)
      rect(0x3e503a, 39, 52, 3, 4)
    } else {
      rect(0x4b6b50, w - 28, 10, 17, 15)
      rect(0xb8c580, w - 26, 12, 13, 2)
    }
  } else if (kind === 'bookcase') {
    rect(0x6e533a, 0, 0, w, h)
    rect(0x8f704b, 3, 3, w - 6, h - 6)
    for (let row = 0; row < 2; row++) {
      for (let book = 0; book < 8; book++) {
        const height = 11 + (book % 3) * 2
        const colors = [0x4b6b50, 0xb66049, 0x7eaaa8, 0xede3c5]
        rect(
          colors[(book + row) % colors.length],
          6 + book * 6,
          20 + row * 20 - height,
          4,
          height,
        )
      }
      rect(0x513f2f, 3, 21 + row * 20, w - 6, 3)
    }
    rect(0xb18b56, 0, 0, w, 3)
  } else {
    rect(0x936442, 9, 19, 16, 12)
    rect(0xb66049, 7, 18, 20, 5)
    rect(0xcf9270, 10, 19, 13, 2)
    rect(0x293c34, 12, 15, 10, 3)
    rect(0x4b6b50, 13, 3, 6, 16)
    rect(0x4b6b50, 4, 8, 10, 7)
    rect(0x84965b, 18, 7, 10, 8)
    rect(0x84965b, 10, 1, 7, 8)
    rect(0xb8c580, 11, 2, 3, 4)
    rect(0xb8c580, 22, 7, 4, 3)
  }
}

export function createClassroom(scene: Phaser.Scene) {
  const tiles = scene.add.graphics()
  for (let i = 0; i < 4; i++) {
    const x = i * TILE_SIZE
    if (i === WALL_TILE) {
      tiles.fillStyle(0x4b6b50).fillRect(x, 0, 32, 32)
      tiles.fillStyle(0x84907a).fillRect(x, 0, 32, 4)
      tiles.fillStyle(0x3a523d).fillRect(x, 27, 32, 5)
      tiles.fillStyle(0x5e7858).fillRect(x + 2, 7, 28, 1)
    } else {
      tiles.fillStyle([0xd9c9a6, 0xd4c4a1, 0xdecead][i]).fillRect(x, 0, 32, 32)
      tiles.fillStyle(0xbcae8e).fillRect(x, 31, 32, 1)
      tiles.fillStyle(0xc7b996).fillRect(x + 31, 0, 1, 32)
      tiles.fillStyle(0xe7d9b9).fillRect(x + 2, 1, 27, 1)
      tiles.fillStyle(0xc9ba97).fillRect(x + 9 + i * 4, 13, 8, 1)
    }
  }
  tiles.generateTexture('classroom-tiles', 128, 32)
  tiles.destroy()
  const map = scene.make.tilemap({
    data: CLASSROOM_TILES.map((row) => [...row]),
    tileWidth: TILE_SIZE,
    tileHeight: TILE_SIZE,
  })
  const tileset = map.addTilesetImage(
    'classroom-tiles',
    'classroom-tiles',
    TILE_SIZE,
    TILE_SIZE,
  )
  if (!tileset) throw new Error('강의실 타일셋을 생성하지 못했습니다.')
  const walls = map.createLayer(0, tileset, 0, 0)
  if (!walls) throw new Error('강의실 타일 레이어를 생성하지 못했습니다.')
  walls.setCollision(WALL_TILE)

  const decoration = scene.add.graphics()
  // 벽에 붙어 있는 칠판과 창문: 별도 충돌체 없이 벽 타일의 충돌을 사용한다.
  decoration.fillStyle(0x8f704b).fillRect(544, 3, 192, 26)
  decoration.fillStyle(0x293c34).fillRect(548, 5, 184, 20)
  decoration
    .fillStyle(0xede3c5)
    .fillRect(560, 13, 30, 2)
    .fillRect(560, 18, 18, 1)
  decoration.fillStyle(0xb8c580).fillRect(656, 10, 6, 6).fillRect(664, 16, 6, 6)
  decoration.fillStyle(0xede3c5).fillRect(700, 24, 8, 2)
  for (const y of [96, 256, 416, 576, 736]) {
    decoration.fillStyle(0xede3c5).fillRect(5, y, 22, 64)
    decoration.fillStyle(0x7eaaa8).fillRect(8, y + 3, 16, 58)
    decoration.fillStyle(0xb4ccbb).fillRect(9, y + 4, 6, 56)
    decoration.fillStyle(0xede3c5).fillRect(6, y + 30, 20, 3)
  }
  const obstacles = scene.physics.add.staticGroup()
  for (const furniture of CLASSROOM_FURNITURE) {
    drawFurniture(decoration, furniture)
    const zone = scene.add.zone(
      furniture.x + furniture.width / 2,
      furniture.y + furniture.height / 2,
      furniture.width,
      furniture.height,
    )
    obstacles.add(zone)
  }
  return { walls, obstacles, decoration }
}

import Phaser from 'phaser'
import { CLASSROOM_FURNITURE, CLASSROOM_TILES, SCHOOL_ROOMS, SCHOOL_WALLS, TILE_SIZE, type Furniture } from './map'

export const INTERIOR_TEXTURE = 'kenney-school-interiors'

/** The original CC0 sheet uses 16px tiles separated by one transparent pixel. */
export function preloadSchool(scene: Phaser.Scene) {
  scene.load.image('school-interior-source', '/assets/kenney/indoors.png')
}

function drawProp(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, item: Furniture) {
  const { x, y, width: w, height: h, kind } = item
  const rect = (color: number, dx: number, dy: number, width: number, height: number) => {
    g.fillStyle(color).fillRect(x + dx, y + dy, width, height)
  }
  const stamp = (column: number, row: number, columns = 1, rows = 1, dx = 0, dy = 0) => {
    for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) {
      scene.add.image(x + dx + c * 32, y + dy + r * 32, INTERIOR_TEXTURE, (row + r) * 27 + column + c)
        .setOrigin(0).setScale(2).setDepth(20)
    }
  }
  if (item.solid) {
    scene.add.rectangle(x + w / 2 + 2, y + h - 2, w + 4, 9, 0x29363c, 0.17).setDepth(9)
  }

  switch (kind) {
    case 'studentDesk':
      stamp(0, 2, 1, 1, 16, 32)
      rect(0x8d6849, 0, 0, 64, 30); rect(0xc9a977, 2, 2, 60, 23)
      rect(0xe0c99c, 4, 3, 56, 2); rect(0x6d6654, 4, 30, 4, 10); rect(0x6d6654, 56, 30, 4, 10)
      rect(0xf0ecda, 34, 8, 16, 12); rect(0x8b9ba2, 37, 11, 10, 1)
      break
    case 'teacherDesk':
      stamp(0, 0, 3, 2); stamp(0, 3, 1, 1, 32, 32)
      rect(0x3e6260, 10, 15, 20, 12); rect(0xe1dbbd, 63, 12, 20, 14)
      break
    case 'readingTable': stamp(0, 0, 3, 2); rect(0x527f75, 26, 15, 22, 20); rect(0xd0d7bb, 28, 17, 8, 16); break
    case 'computerDesk':
      stamp(0, 8, 1, 1, 32, 32)
      rect(0x667d81, 4, 40, 5, 18); rect(0x667d81, 87, 40, 5, 18)
      rect(0x8d7b64, 0, 16, 96, 26); rect(0xcbbda2, 2, 18, 92, 19)
      rect(0x394751, 24, 1, 40, 28); rect(0x7eaaa8, 28, 5, 32, 19)
      rect(0xb0dad4, 30, 7, 13, 2); rect(0x394751, 41, 29, 6, 5)
      rect(0xd3d5cb, 29, 35, 30, 7); rect(0x717e80, 32, 37, 23, 2)
      break
    case 'bookcase': stamp(25, 15, 2, 3); break
    case 'cupboard': stamp(0, 12, 2, 2); break
    case 'labShelf': stamp(0, 14, 6, 2); break
    case 'bench':
      rect(0x657c70, 6, 15, 5, 17); rect(0x657c70, w - 11, 15, 5, 17)
      rect(0x896747, 0, 0, w, 9); rect(0xb89567, 2, 2, w - 4, 4)
      rect(0x896747, 0, 11, w, 12); rect(0xc4a375, 2, 12, w - 4, 7)
      break
    case 'sofa': stamp(8, 2, 3, 2); break
    case 'plant': stamp(16, 0); break
    case 'sink':
      stamp(8, 12, 2, 1, 0, 8)
      rect(0x899eaa, 16, 3, 4, 10); rect(0xbed7dc, 20, 3, 9, 4)
      break
    case 'labBench':
      rect(0x7c9588, 0, 12, w, 34); rect(0xe1e7d5, 2, 8, w - 4, 27)
      rect(0x657b75, 8, 46, 8, 18); rect(0x657b75, w - 16, 46, 8, 18)
      for (const [dx, color] of [[16, 0x79bdb2], [54, 0xd6ac72], [102, 0x8aacc5]]) {
        rect(0xdee9e5, dx + 3, 0, 6, 8); rect(0xdee9e5, dx, 7, 12, 16)
        rect(color, dx + 2, 14, 8, 7)
      }
      break
    case 'locker':
      rect(0x607c89, 0, 0, w, h); rect(0x8ba2a8, 2, 2, w - 4, h - 5)
      rect(0xb4c6c5, 3, 2, w - 6, 2); rect(0x455f6d, w - 7, 19, 2, 8)
      for (const dy of [7, 10, 13]) rect(0x65848f, 8, dy, 15, 1)
      break
    case 'toilet':
      rect(0x9fb6b9, 1, 1, 30, 15); rect(0xf4f7ef, 3, 0, 26, 14)
      rect(0xbbcecb, 22, 4, 4, 2); rect(0xe8eeea, 5, 15, 22, 25)
      rect(0xffffff, 3, 19, 26, 15); rect(0xb4d0d1, 8, 20, 16, 10)
      rect(0x779b9e, 10, 22, 12, 6); rect(0xc1d1cb, 9, 39, 14, 6)
      break
    case 'partition': rect(0x718d8b, 0, 0, w, h); rect(0xa2b9ae, 1, 1, w - 2, h - 4); break
    case 'stallDoor': rect(0x8ca9a6, 0, 0, w, h); rect(0xcedcd2, 3, 1, w - 6, 2); break
    case 'vending':
      rect(0x567e88, 0, 0, w, h); rect(0xa9c3bf, 3, 3, w - 6, 5)
      rect(0x263e4d, 4, 11, 28, 39); rect(0xd3d9bc, 36, 17, 7, 13)
      for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) rect([0xb5c17a, 0xbf7d66, 0x7eaaa8][col], 7 + col * 8, 15 + row * 11, 5, 8)
      rect(0x293c45, 7, 55, 31, 5)
      break
    case 'waterCooler': rect(0x8ebbc3, 4, 0, 16, 18); rect(0xc5dbdc, 7, 2, 4, 13); rect(0xe4e7dc, 0, 19, w, h - 19); rect(0x607c89, 5, 27, 14, 9); break
    case 'bin': rect(0x547e73, 2, 5, w - 4, h - 6); rect(0x84a495, 0, 3, w, 5); rect(0x3c605b, 6, 10, 2, h - 15); break
    case 'photocopier': rect(0x778c93, 0, 8, w, h - 8); rect(0xc1ccca, 3, 1, w - 6, h - 12); rect(0x435c61, 10, 6, w - 20, 22); rect(0x9fc1bf, 13, 9, w - 26, 16); rect(0x4d696d, 13, 41, 38, 6); break
    case 'chalkboard':
      rect(0x976e4e, 0, 0, w, h); rect(0x3f6760, 3, 3, w - 6, h - 7)
      rect(0xd8e3c4, 13, 12, 42, 2); rect(0xa8bc9c, 13, 18, 65, 1); rect(0xe7d9b7, w - 21, h - 4, 12, 2)
      break
    case 'screen': rect(0x728a8e, 0, 0, w, h); rect(0xd9e7e4, 3, 3, w - 6, h - 6); rect(0x9bbdba, 14, 13, 57, 2); break
    case 'noticeboard': rect(0x8b694b, 0, 0, w, h); rect(0xbda37b, 3, 3, w - 6, h - 6); rect(0xf2ecda, 11, 8, 19, 24); rect(0xb6c9bb, 36, 12, 25, 18); rect(0xe4c290, 68, 7, 16, 27); break
    case 'clock': rect(0x53666b, 2, 0, w - 4, h); rect(0x53666b, 0, 2, w, h - 4); rect(0xeeeee0, 3, 3, w - 6, h - 6); rect(0x53666b, 11, 5, 2, 8); rect(0x53666b, 11, 12, 7, 2); break
    case 'mirror': rect(0x78999e, 0, 0, w, h); rect(0xb8d8dc, 2, 2, w - 4, h - 4); rect(0xe2f0e5, 4, 4, 20, 2); break
    case 'window': rect(0x7297a0, 0, 0, w, h); rect(0xb6d6d6, 2, 2, w - 4, h - 4); rect(0xeff1dd, 7, 1, 2, h - 2); rect(0xeff1dd, 1, h / 2, w - 2, 2); break
  }
}

export function createSchool(scene: Phaser.Scene) {
  // This release is 457px wide: one pixel short of the 27-column grid.
  // Pad the edge before assigning frames so Phaser cannot infer 26 columns.
  const atlas = scene.textures.createCanvas(INTERIOR_TEXTURE, 458, 305)
  if (!atlas) throw new Error('학교 가구 텍스처를 생성하지 못했습니다.')
  const source = scene.textures.get('school-interior-source').getSourceImage() as HTMLImageElement
  atlas.getContext().drawImage(source, 0, 0)
  for (let row = 0; row < 18; row++) for (let column = 0; column < 27; column++) {
    atlas.add(row * 27 + column, 0, column * 17, row * 17, 16, 16)
  }
  atlas.refresh()
  atlas.setFilter(Phaser.Textures.FilterMode.NEAREST)

  const floorColors = [0xd4c8a8, 0xcbb18c, 0xd2bd9e, 0xab8669, 0xb9c7ca, 0xbfccb6, 0xc7dddd, 0xbfa68e, 0x617983]
  const tiles = scene.add.graphics()
  floorColors.forEach((color, index) => {
    const x = index * TILE_SIZE
    tiles.fillStyle(color).fillRect(x, 0, 32, 32)
    if (index === 8) {
      tiles.fillStyle(0xd7dfd0).fillRect(x, 0, 32, 7)
      tiles.fillStyle(0x829b9e).fillRect(x, 8, 32, 17)
      tiles.fillStyle(0x3d5863).fillRect(x, 27, 32, 5)
    } else if ([0, 4, 5, 6].includes(index)) {
      tiles.fillStyle(0xffffff, 0.13).fillRect(x + 1, 1, 30, 1)
      tiles.fillStyle(0x475e61, 0.14).fillRect(x, 31, 32, 1).fillRect(x + 31, 0, 1, 32)
      tiles.fillStyle(0xffffff, 0.06).fillRect(x + 1, 1, 15, 15)
      if (index === 6) tiles.fillStyle(0x8cb5ba, 0.22).fillRect(x + 16, 1, 15, 15).fillRect(x + 1, 16, 15, 15)
    } else {
      tiles.fillStyle(0x6d523d, 0.15).fillRect(x, 15, 32, 1).fillRect(x, 31, 32, 1).fillRect(x + 10, 0, 1, 15).fillRect(x + 24, 16, 1, 15)
      tiles.fillStyle(0xf9e5bf, 0.13).fillRect(x + 2, 3, 18, 1).fillRect(x + 7, 23, 18, 1)
    }
  })
  tiles.generateTexture('school-floor', floorColors.length * 32, 32)
  tiles.destroy()
  const tilemap = scene.make.tilemap({ data: CLASSROOM_TILES.map((row) => [...row]), tileWidth: 32, tileHeight: 32 })
  const tileset = tilemap.addTilesetImage('school-floor', 'school-floor', 32, 32)
  if (!tileset || !tilemap.createLayer(0, tileset)) throw new Error('학교 타일맵을 생성하지 못했습니다.')

  const walls = scene.physics.add.staticGroup()
  const obstacles = scene.physics.add.staticGroup()
  const addBody = (group: Phaser.Physics.Arcade.StaticGroup, item: { x: number; y: number; width: number; height: number }) => {
    group.add(scene.add.zone(item.x + item.width / 2, item.y + item.height / 2, item.width, item.height))
  }
  for (const wall of SCHOOL_WALLS) addBody(walls, wall)

  const decoration = scene.add.graphics().setDepth(21)
  for (const prop of CLASSROOM_FURNITURE) {
    drawProp(scene, decoration, prop)
    if (prop.solid) addBody(obstacles, prop)
  }
  for (const room of SCHOOL_ROOMS) {
    scene.add.text(room.x + 20, room.y + 24, room.name, {
      fontFamily: 'monospace', fontSize: '13px', color: '#e8eddb', backgroundColor: '#476368', padding: { x: 9, y: 5 },
    }).setDepth(23)
  }
  scene.add.text(900, 754, '1F  /  학교 복도', { fontFamily: 'monospace', fontSize: '14px', color: '#8e9278' }).setDepth(3)
  return { walls, obstacles }
}

import Phaser from 'phaser'
import { CHARACTER_MASK } from '../data/characterMask'
import { PALETTE } from '../data/palette'
import { isPixelCharacter, type PixelCharacter } from '../types/character'

export const CHARACTER_TEXTURE_KEY = 'painted-character'

export function createCharacterTexture(
  scene: Phaser.Scene,
  character: PixelCharacter,
  textureKey = CHARACTER_TEXTURE_KEY,
): string {
  if (!isPixelCharacter(character))
    throw new Error('유효하지 않은 16×16 캐릭터 데이터입니다.')
  if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey)
  const texture = scene.textures.createCanvas(textureKey, 16, 16)
  if (!texture) throw new Error('캐릭터 텍스처를 생성하지 못했습니다.')
  const context = texture.getContext()
  context.imageSmoothingEnabled = false
  context.clearRect(0, 0, 16, 16)
  character.colors.forEach((color, index) => {
    if (!CHARACTER_MASK[index]) return
    context.fillStyle = PALETTE[color].hex
    context.fillRect(index % 16, Math.floor(index / 16), 1, 1)
  })
  texture.refresh()
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST)
  return textureKey
}

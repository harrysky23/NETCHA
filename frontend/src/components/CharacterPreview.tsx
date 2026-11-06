import { CHARACTER_MASK } from '../data/characterMask'
import { characterColor, type PixelCharacter } from '../types/character'

export function CharacterPreview({
  character,
  className = '',
}: {
  character: PixelCharacter
  className?: string
}) {
  return (
    <div
      className={`character-preview ${className}`}
      role="img"
      aria-label="현재 캐릭터 미리보기"
    >
      {character.colors.map((_, index) => (
        <span
          key={index}
          style={{
            backgroundColor: CHARACTER_MASK[index]
              ? characterColor(character, index)
              : 'transparent',
          }}
        />
      ))}
    </div>
  )
}

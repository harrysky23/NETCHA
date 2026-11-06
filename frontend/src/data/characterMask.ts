import definition from '../../../shared/character.json'

export const CHARACTER_SIZE = 16

/** 길이 256의 고정 실루엣. 색상 0도 투명이 아닌 유효한 색이다. */
export const CHARACTER_MASK: readonly boolean[] = Object.freeze(
  definition.mask.flatMap((row) => [...row].map((pixel) => pixel === '1')),
)

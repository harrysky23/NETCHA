export const PLAYER_SPEED = 100

export type MovementInput = {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
}
export type Velocity = { x: number; y: number }

/** 입력과 속도 계산은 엔진에 의존하지 않으므로 이후 네트워크 입력에 재사용할 수 있다. */
export function getMovementVelocity(input: MovementInput): Velocity {
  const x = Number(input.right) - Number(input.left)
  const y = Number(input.down) - Number(input.up)
  const length = Math.hypot(x, y)
  return length === 0
    ? { x: 0, y: 0 }
    : { x: (x / length) * PLAYER_SPEED, y: (y / length) * PLAYER_SPEED }
}

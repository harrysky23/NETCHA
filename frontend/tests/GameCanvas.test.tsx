// @vitest-environment jsdom
import { act, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, test, vi } from 'vitest'
import GameCanvas from '../src/game/GameCanvas'
import { createDefaultCharacter } from '../src/types/character'
import type { RoomSession, RoomSnapshot } from '../src/network/types'

const mocks = vi.hoisted(() => ({
  construct: vi.fn(),
  destroy: vi.fn(),
  resetInput: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  syncRoom: vi.fn(),
  setSampling: vi.fn(),
}))

vi.mock('phaser', () => ({
  default: {
    AUTO: 0,
    Scale: { RESIZE: 3 },
    Core: { Events: { BLUR: 'blur' } },
    Game: class {
      events = { on: mocks.on, off: mocks.off }
      destroy = mocks.destroy
      constructor(config: unknown) {
        mocks.construct(config)
      }
    },
  },
}))

vi.mock('../src/game/GameScene', () => ({
  GameScene: class {
    resetInput = mocks.resetInput
    syncRoom = mocks.syncRoom
    setSampling = mocks.setSampling
  },
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

test('StrictMode에서도 한 번 생성하고 부모 리렌더에는 유지하며 해제 시 파괴한다', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const frames = new Map<number, FrameRequestCallback>()
  let id = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (key: number) => frames.delete(key))
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const character = createDefaultCharacter()
  const room: RoomSnapshot = {
    code: 'TEST1', hostId: 'me', phase: 'hunting', phaseStartedAt: 0, phaseEndsAt: 0,
    roundNumber: 1, practice: true, winner: null, resultReason: null, spectatingId: null,
    players: [{ id: 'me', name: '테스트', role: 'hider', x: 1024, y: 784, alive: true, score: 0,
      colors: character.colors, palette: character.palette!, painting: false, connected: true, spectatingId: null }],
    scores: [], chat: [], serverTime: Date.now() / 1000,
  }
  const session: RoomSession = { roomCode: room.code, playerId: 'me', token: 'test-token', room }
  const send = vi.fn(() => true)
  try {
    await act(async () =>
      root.render(
        <StrictMode>
          <GameCanvas room={room} session={session} send={send} />
        </StrictMode>,
      ),
    )
    expect(frames.size).toBe(1)
    await act(async () => {
      const pending = [...frames.values()]
      frames.clear()
      pending.forEach((callback) => callback(0))
    })
    expect(mocks.construct).toHaveBeenCalledTimes(1)
    expect(mocks.construct.mock.calls[0][0]).toMatchObject({
      pixelArt: true,
      antialias: false,
      scale: { mode: 3 },
    })
    await act(async () =>
      root.render(
        <StrictMode>
          <GameCanvas
            room={{ ...room, serverTime: room.serverTime + 0.1 }} session={session} send={send}
          />
        </StrictMode>,
      ),
    )
    expect(mocks.construct).toHaveBeenCalledTimes(1)
    expect(mocks.destroy).not.toHaveBeenCalled()
    await act(async () => {
      host.querySelector('.game-mount')!.dispatchEvent(new Event('blur'))
    })
    expect(mocks.resetInput).toHaveBeenCalledTimes(1)
  } finally {
    await act(async () => root.unmount())
    host.remove()
  }
  expect(mocks.destroy).toHaveBeenCalledExactlyOnceWith(true)
  expect(mocks.off).toHaveBeenCalledWith('blur', expect.any(Function))
})

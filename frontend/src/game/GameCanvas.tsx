import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import type { PixelCharacter } from '../types/character'
import { GameScene } from './GameScene'
import { GAME_HEIGHT, GAME_WIDTH } from './map'

type Props = { character: PixelCharacter }

export default function GameCanvas({ character }: Props) {
  const container = useRef<HTMLDivElement>(null)
  // 입장 시점의 스냅샷. 부모의 일반적인 리렌더로 게임 인스턴스를 재생성하지 않는다.
  const [initialCharacter] = useState<PixelCharacter>(() => ({
    ...character,
    colors: [...character.colors],
  }))
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    const host = container.current
    if (!host) return
    let game: Phaser.Game | undefined
    let disposed = false
    const scene = new GameScene(initialCharacter, {
      onReady: () => {
        if (!disposed) {
          setStatus('ready')
          host.focus({ preventScroll: true })
        }
      },
      onError: (message) => {
        if (!disposed) {
          setError(message)
          setStatus('error')
        }
      },
    })
    // StrictMode의 개발용 setup → cleanup → setup에서도 첫 예약은 취소된다.
    const frame = requestAnimationFrame(() => {
      if (disposed) return
      try {
        game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: host,
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
          backgroundColor: '#d4c4a1',
          pixelArt: true,
          antialias: false,
          roundPixels: true,
          audio: { noAudio: true },
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
          },
          input: { keyboard: { target: host } },
          physics: {
            default: 'arcade',
            arcade: { gravity: { x: 0, y: 0 }, debug: false },
          },
          scene,
        })
        game.events.on(Phaser.Core.Events.BLUR, resetInput)
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : '게임을 생성하지 못했습니다.',
        )
        setStatus('error')
      }
    })
    function resetInput() {
      scene.resetInput()
    }
    host.addEventListener('blur', resetInput)
    window.addEventListener('blur', resetInput)
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      host.removeEventListener('blur', resetInput)
      window.removeEventListener('blur', resetInput)
      game?.events.off(Phaser.Core.Events.BLUR, resetInput)
      game?.destroy(true)
    }
  }, [initialCharacter])

  return (
    <>
      <div
        className="game-mount"
        ref={container}
        tabIndex={0}
        role="group"
        aria-label="강의실 게임 화면. WASD 키로 이동합니다."
        onPointerDown={() => container.current?.focus({ preventScroll: true })}
      />
      {status === 'loading' && (
        <p className="game-status" role="status">
          강의실을 준비하고 있어요…
        </p>
      )}
      {status === 'error' && (
        <p className="game-error" role="alert">
          {error}
          <br />
          에디터로 돌아간 뒤 다시 입장해 주세요.
        </p>
      )}
    </>
  )
}

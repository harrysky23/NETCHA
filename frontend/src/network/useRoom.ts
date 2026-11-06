import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameMessage, RoomSession, RoomSnapshot } from './types'

export type Connection = 'offline' | 'connecting' | 'connected'
const SESSION_KEY = 'netchacameleon.session'

type RoomHook = {
  session: RoomSession | null
  room: RoomSnapshot | null
  connection: Connection
  error: string
  createRoom: (name: string) => Promise<void>
  joinRoom: (name: string, code: string) => Promise<void>
  send: (message: GameMessage) => boolean
  leaveRoom: () => void
  clearError: () => void
}

async function parseResponse(response: Response) {
  const result = await response.json()
  if (!response.ok) throw new Error(result.detail ?? '서버와 연결하지 못했습니다.')
  return result
}

export function useRoom(): RoomHook {
  const [session, setSession] = useState<RoomSession | null>(null)
  const [room, setRoom] = useState<RoomSnapshot | null>(null)
  const [connection, setConnection] = useState<Connection>('connecting')
  const [error, setError] = useState('')
  const socket = useRef<WebSocket | null>(null)
  const playerId = session?.playerId
  const roomCode = session?.roomCode
  const token = session?.token

  useEffect(() => {
    let alive = true
    try {
      const saved = sessionStorage.getItem(SESSION_KEY)
      if (saved) {
        const previous = JSON.parse(saved) as Pick<RoomSession, 'roomCode' | 'playerId' | 'token'>
        fetch(`/api/rooms/${encodeURIComponent(previous.roomCode)}/session?player_id=${encodeURIComponent(previous.playerId)}&token=${encodeURIComponent(previous.token)}`)
          .then(parseResponse)
          .then(({ room: restored }: { room: RoomSnapshot }) => {
            if (!alive) return
            const restoredSession = { ...previous, room: restored }
            setSession(restoredSession)
            setRoom(restored)
            setError('')
          })
          .catch(() => {
            if (alive) sessionStorage.removeItem(SESSION_KEY)
          })
      } else {
        // 새 방문 세션은 방에 들어가기 전까지 lobby 화면으로 시작한다.
      }
    } catch {
      sessionStorage.removeItem(SESSION_KEY)
    }
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (session) return
    let active = true
    let retry: ReturnType<typeof setTimeout> | undefined
    async function checkServer() {
      try {
        await parseResponse(await fetch('/api/health'))
        if (active) { setConnection('connected'); setError('') }
      } catch {
        if (active) {
          setConnection('offline')
          retry = setTimeout(checkServer, 2000)
        }
      }
    }
    void checkServer()
    return () => { active = false; if (retry) clearTimeout(retry) }
  }, [session])

  useEffect(() => {
    if (!playerId || !roomCode || !token) {
      socket.current?.close()
      socket.current = null
      return
    }
    let active = true
    let retry: ReturnType<typeof setTimeout> | undefined
    let delay = 500

    function connect() {
      if (!active) return
      setConnection('connecting')
      const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:'
      const nextSocket = new WebSocket(
        `${scheme}//${location.host}/ws/${encodeURIComponent(roomCode!)}/${encodeURIComponent(playerId!)}?token=${encodeURIComponent(token!)}`,
      )
      socket.current = nextSocket
      nextSocket.onopen = () => {
        delay = 500
        setConnection('connected')
        setError('')
      }
      nextSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message.type === 'snapshot') setRoom(message.room as RoomSnapshot)
          if (message.type === 'notice') setError(message.message as string)
        } catch {
          setError('서버 메시지를 읽지 못했습니다.')
        }
      }
      nextSocket.onclose = () => {
        if (!active) return
        setConnection('connecting')
        retry = setTimeout(connect, delay)
        delay = Math.min(delay * 1.7, 5000)
      }
      nextSocket.onerror = () => nextSocket.close()
    }

    connect()
    return () => {
      active = false
      if (retry) clearTimeout(retry)
      socket.current?.close()
      socket.current = null
    }
  }, [playerId, roomCode, token])

  const attach = useCallback((next: RoomSession) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode: next.roomCode, playerId: next.playerId, token: next.token }))
    setRoom(next.room)
    setError('')
    setSession(next)
  }, [])

  const createRoom = useCallback(async (name: string) => {
    setError('')
    try {
      const result = await parseResponse(await fetch('/api/rooms', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
      }))
      attach(result as RoomSession)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '방을 만들지 못했습니다.'
      setError(message)
      throw cause
    }
  }, [attach])

  const joinRoom = useCallback(async (name: string, code: string) => {
    setError('')
    try {
      const result = await parseResponse(await fetch(`/api/rooms/${encodeURIComponent(code)}/join`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
      }))
      attach(result as RoomSession)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '방에 입장하지 못했습니다.'
      setError(message)
      throw cause
    }
  }, [attach])

  const send = useCallback((message: GameMessage) => {
    if (socket.current?.readyState !== WebSocket.OPEN) return false
    socket.current.send(JSON.stringify(message))
    return true
  }, [])

  const leaveRoom = useCallback(() => {
    if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify({ type: 'leave' }))
    sessionStorage.removeItem(SESSION_KEY)
    setSession(null)
    setRoom(null)
    setError('')
  }, [])

  const clearError = useCallback(() => setError(''), [])
  return { session, room, connection, error, createRoom, joinRoom, send, leaveRoom, clearError }
}

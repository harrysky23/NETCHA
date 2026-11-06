export type GamePhase = 'lobby' | 'hiding' | 'hunting' | 'results'
export type Role = 'hunter' | 'hider'

export type RoomPlayer = {
  id: string
  name: string
  role: Role
  x: number | null
  y: number | null
  alive: boolean
  score: number
  colors: number[]
  palette: string[]
  painting: boolean
  connected: boolean
  spectatingId: string | null
}

export type ScoreEntry = { id: string; name: string; score: number; alive: boolean }
export type ChatMessage = { id: string; playerId: string; name: string; text: string; sentAt: number }

export type RoomSnapshot = {
  code: string
  hostId: string
  phase: GamePhase
  phaseStartedAt: number
  phaseEndsAt: number
  roundNumber: number
  practice: boolean
  winner: Role | null
  resultReason: 'all_hiders_caught' | 'time_up' | null
  spectatingId: string | null
  players: RoomPlayer[]
  scores: ScoreEntry[]
  chat: ChatMessage[]
  serverTime: number
}

export type RoomSession = {
  roomCode: string
  playerId: string
  token: string
  room: RoomSnapshot
}

export type GameMessage =
  | { type: 'start' }
  | { type: 'return_lobby' }
  | { type: 'input'; keys: { up: boolean; down: boolean; left: boolean; right: boolean } }
  | { type: 'paint_mode'; enabled: boolean }
  | { type: 'paint'; colors: number[]; palette: string[] }
  | { type: 'viewport'; width: number; height: number }
  | { type: 'shoot'; x: number; y: number }
  | { type: 'spectate'; targetId: string | null }
  | { type: 'chat'; text: string }
  | { type: 'leave' }

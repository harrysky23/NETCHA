import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ChatMessage } from '../network/types'

type Props = { messages: ChatMessage[]; currentPlayerId: string; onSend: (text: string) => void; disabled?: boolean }

export function RoomChat({ messages, currentPlayerId, onSend, disabled = false }: Props) {
  const [draft, setDraft] = useState('')
  const bottom = useRef<HTMLDivElement>(null)
  useEffect(() => bottom.current?.scrollIntoView({ block: 'end' }), [messages.length])
  function submit(event: FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || disabled) return
    onSend(text.slice(0, 160))
    setDraft('')
  }

  return (
    <section className="panel room-chat" aria-label="전체 채팅">
      <div className="section-label"><h2>전체 채팅</h2><span>LIVE · 160자</span></div>
      <div className="chat-log" aria-live="polite">
        {messages.length === 0 && <p className="chat-empty">먼저 인사하거나 술래를 놀려 보세요.</p>}
        {messages.map((message) => (
          <p className={`chat-line ${message.playerId === currentPlayerId ? 'mine' : ''}`} key={message.id}>
            <strong>{message.name}</strong><span>{message.text}</span>
          </p>
        ))}
        <div ref={bottom} />
      </div>
      <form className="chat-compose" onSubmit={submit}>
        <input aria-label="채팅 메시지" value={draft} maxLength={160} placeholder={disabled ? '서버 연결 중…' : 'Enter로 메시지 보내기'} onChange={(event) => setDraft(event.target.value)} disabled={disabled} />
        <button aria-label="채팅 보내기" disabled={disabled || !draft.trim()}>↗</button>
      </form>
      <p className="chat-hint">탈락 후에도 생존자와 대화할 수 있어요.</p>
    </section>
  )
}

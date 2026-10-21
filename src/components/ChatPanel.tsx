import { useEffect, useRef, useState } from 'react'
import type { ChatMessage, ChatSide, Stance } from '@/lib/personas'

const SIDE_THEME: Record<
  ChatSide,
  { name: string; color: string; dim: string; motto: string }
> = {
  red: {
    name: 'VERMELHO',
    color: '#ff0040',
    dim: 'rgba(255,0,64,0.12)',
    motto: 'ataque · agressividade 10/10',
  },
  blue: {
    name: 'AZUL',
    color: '#00aaff',
    dim: 'rgba(0,170,255,0.12)',
    motto: 'defesa · aprende a cada derrota',
  },
}

interface Props {
  chat: Record<ChatSide, ChatMessage[]>
  typing: Record<ChatSide, boolean>
  redStance: Stance
  onSend: (side: ChatSide, text: string) => void
  onStance: (s: Stance) => void
}

export default function ChatPanel({ chat, typing, redStance, onSend, onStance }: Props) {
  const [side, setSide] = useState<ChatSide>('red')
  const [input, setInput] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)

  const t = SIDE_THEME[side]
  const messages = chat[side]

  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, typing, side])

  const submit = () => {
    const v = input.trim()
    if (!v) return
    onSend(side, v)
    setInput('')
  }

  return (
    <section className="flex min-h-0 flex-col border border-[#1a1a1e] bg-[#111114]">
      <div className="flex items-center justify-between border-b border-[#1a1a1e] bg-[#0d0d10] px-3 py-1.5">
        <span className="text-[10px] uppercase tracking-[0.25em] text-[#8a877e]">
          CHAT :: falar com os perfis
        </span>
        {side === 'red' && (
          <button
            onClick={() => onStance(redStance === 'ofensivo' ? 'contido' : 'ofensivo')}
            className="min-h-[32px] border px-2 text-[9px] uppercase tracking-[0.2em] transition-colors"
            style={{
              borderColor: redStance === 'ofensivo' ? '#ff0040' : '#8a877e',
              color: redStance === 'ofensivo' ? '#ff0040' : '#8a877e',
            }}
            title="postura do vermelho no chat"
          >
            postura: {redStance}
          </button>
        )}
      </div>

      {/* abas dos agentes */}
      <div className="flex border-b border-[#1a1a1e]">
        {(['red', 'blue'] as ChatSide[]).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={`min-h-[44px] flex-1 font-display text-sm uppercase tracking-[0.15em] transition-colors ${
              side === s ? '' : 'text-[#8a877e] hover:text-[#c8c4ba]'
            }`}
            style={
              side === s
                ? { color: SIDE_THEME[s].color, background: SIDE_THEME[s].dim }
                : undefined
            }
          >
            {s === 'red' ? '▸ vermelho' : '◂ azul'}
          </button>
        ))}
      </div>

      {/* mensagens */}
      <div ref={bodyRef} className="scroll-slim h-[280px] overflow-y-auto px-3 py-2">
        <p className="mb-2 text-center text-[9px] uppercase tracking-[0.25em] text-[#8a877e]/60">
          {t.name} — {t.motto}
        </p>
        {messages.map((m) => (
          <div key={m.id} className="log-line mb-2">
            <div
              className="inline-block max-w-[92%] border px-2.5 py-1.5"
              style={{
                borderColor: m.text.startsWith('»') ? '#2a2a2e' : `${t.color}55`,
                background: m.text.startsWith('»') ? '#0d0d10' : t.dim,
              }}
            >
              <span
                className="font-display break-words text-sm leading-snug"
                style={{ color: m.text.startsWith('»') ? '#c8c4ba' : '#e0ddd5' }}
              >
                {m.text.startsWith('»') ? m.text.slice(2) : m.text}
              </span>
              {!m.text.startsWith('»') && (
                <span
                  className="mt-0.5 block text-[8px] uppercase tracking-[0.25em]"
                  style={{ color: t.color }}
                >
                  {t.name}
                </span>
              )}
            </div>
          </div>
        ))}
        {typing[side] && (
          <p className="font-display text-sm" style={{ color: t.color }}>
            {t.name.toLowerCase()} digitando<span className="blink-rec">▌</span>
          </p>
        )}
      </div>

      {/* entrada */}
      <div className="border-t border-[#1a1a1e] bg-[#0d0d10] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="font-display shrink-0 text-lg" style={{ color: t.color }}>
            »
          </span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={`falar com o ${t.name.toLowerCase()}…`}
            spellCheck={false}
            autoComplete="off"
            className="min-h-[44px] w-full bg-transparent font-display text-lg text-[#e0ddd5] caret-[#00ff40] outline-none placeholder:text-[#8a877e]/50"
          />
          <button
            onClick={submit}
            className="min-h-[44px] shrink-0 border px-4 font-display text-base uppercase tracking-[0.12em] transition-colors"
            style={{ borderColor: `${t.color}80`, color: t.color }}
          >
            ENVIAR
          </button>
        </div>
        {side === 'red' && redStance === 'ofensivo' && (
          <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-[#ff0040]/70">
            ⚠ postura ofensiva: o vermelho pode atacar de verdade a partir da conversa
          </p>
        )}
      </div>
    </section>
  )
}

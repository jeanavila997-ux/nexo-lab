import { useEffect, useMemo, useRef, useState } from 'react'
import type { LlmProvider } from '@/lib/backend'
import type { ChatMessage, ChatSide, Stance } from '@/lib/personas'

const SIDE_THEME: Record<ChatSide, { name: string; color: string; dim: string; motto: string }> = {
  red: { name: 'VERMELHO', color: '#ff0040', dim: 'rgba(255,0,64,0.12)', motto: 'ataque · agressividade 10/10' },
  blue: { name: 'AZUL', color: '#00aaff', dim: 'rgba(0,170,255,0.12)', motto: 'defesa · aprende a cada derrota' },
}

interface Props {
  chat: Record<ChatSide, ChatMessage[]>
  typing: Record<ChatSide, boolean>
  redStance: Stance
  providers: LlmProvider[]
  models: string[]
  selection: { provider: string; model: string }
  gatewayError: string
  onSend: (side: ChatSide, text: string) => void
  onStop: (side: ChatSide) => void
  onClear: (side: ChatSide) => void
  onStance: (s: Stance) => void
  onProvider: (provider: string) => void
  onModel: (model: string) => void
  onRefresh: () => void
}

function messageRole(message: ChatMessage) {
  return message.role || (message.text.startsWith('»') ? 'user' : 'assistant')
}

export default function ChatPanel({
  chat,
  typing,
  redStance,
  providers,
  models,
  selection,
  gatewayError,
  onSend,
  onStop,
  onClear,
  onStance,
  onProvider,
  onModel,
  onRefresh,
}: Props) {
  const [side, setSide] = useState<ChatSide>('red')
  const [input, setInput] = useState('')
  const [copied, setCopied] = useState<number | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const t = SIDE_THEME[side]
  const messages = chat[side]
  const selected = useMemo(
    () => providers.find((provider) => provider.id === selection.provider),
    [providers, selection.provider],
  )
  const canSend = Boolean(input.trim()) && !typing[side] && (/^\/skills(?:\s|$)/i.test(input.trim()) || (selected?.available ?? selection.provider === 'simulation'))

  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, typing, side])

  const submit = () => {
    const value = input.trim()
    if (!value || !canSend) return
    onSend(side, value)
    setInput('')
  }

  const copy = async (message: ChatMessage) => {
    await navigator.clipboard.writeText(message.text)
    setCopied(message.id)
    window.setTimeout(() => setCopied(null), 1_200)
  }

  return (
    <section className="flex min-h-0 flex-col border border-[#1a1a1e] bg-[#111114]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1a1a1e] bg-[#0d0d10] px-3 py-2">
        <div>
          <span className="block text-[10px] uppercase tracking-[0.25em] text-[#8a877e]">CHAT :: gateway multi-LLM</span>
          <span className="mt-0.5 block text-[8px] uppercase tracking-[0.18em] text-[#8a877e]/60">API SSE · histórico local · MCP stdio</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onSend(side, '/skills')} disabled={typing[side]} className="min-h-[30px] border border-[#00ff40]/40 px-2 text-[9px] uppercase tracking-[0.16em] text-[#00ff40] hover:bg-[#00ff40]/10 disabled:opacity-40">/skills</button>
          {side === 'red' && (
            <button
              onClick={() => onStance(redStance === 'ofensivo' ? 'contido' : 'ofensivo')}
              className="min-h-[30px] border px-2 text-[9px] uppercase tracking-[0.16em] transition-colors"
              style={{ borderColor: redStance === 'ofensivo' ? '#ff0040' : '#8a877e', color: redStance === 'ofensivo' ? '#ff0040' : '#8a877e' }}
            >
              {redStance}
            </button>
          )}
          <button onClick={() => onClear(side)} className="min-h-[30px] border border-[#2a2a2e] px-2 text-[9px] uppercase tracking-[0.16em] text-[#8a877e] hover:text-[#e0ddd5]">limpar</button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-[#1a1a1e] bg-[#0a0a0c] p-2 sm:grid-cols-[minmax(130px,0.8fr)_minmax(150px,1.2fr)_auto]">
        <label className="min-w-0">
          <span className="mb-1 block text-[8px] uppercase tracking-[0.2em] text-[#8a877e]">provedor</span>
          <select
            value={selection.provider}
            onChange={(event) => onProvider(event.target.value)}
            disabled={typing[side]}
            className="h-9 w-full border border-[#2a2a2e] bg-[#111114] px-2 text-[11px] uppercase text-[#e0ddd5] outline-none focus:border-[#00ff40]"
          >
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>{provider.available ? '●' : '○'} {provider.label}</option>
            ))}
          </select>
        </label>
        <label className="col-span-2 min-w-0 sm:col-span-1">
          <span className="mb-1 block text-[8px] uppercase tracking-[0.2em] text-[#8a877e]">modelo</span>
          <input
            value={selection.model}
            onChange={(event) => onModel(event.target.value)}
            list="nexo-llm-models"
            disabled={typing[side] || selection.provider === 'simulation'}
            placeholder={models.length ? 'selecione ou digite' : 'padrão do provedor'}
            className="h-9 w-full border border-[#2a2a2e] bg-[#111114] px-2 font-mono text-[11px] text-[#e0ddd5] outline-none placeholder:text-[#8a877e]/50 focus:border-[#00ff40] disabled:text-[#8a877e]"
          />
          <datalist id="nexo-llm-models">{models.map((model) => <option key={model} value={model} />)}</datalist>
        </label>
        <button onClick={onRefresh} title="testar conexões novamente" className="mt-[17px] h-9 border border-[#2a2a2e] px-3 text-sm text-[#8a877e] hover:border-[#00ff40]/50 hover:text-[#00ff40]">↻</button>
      </div>

      <div className="flex items-center justify-between border-b border-[#1a1a1e] px-3 py-1.5 text-[8px] uppercase tracking-[0.16em]">
        <span className={selected?.available ? 'text-[#00ff40]' : 'text-[#ff0040]'}>
          {selected?.available ? '● pronto' : `○ ${selected?.status || 'indisponível'}`}
        </span>
        <span className="max-w-[70%] truncate text-right text-[#8a877e]" title={selected?.hint}>{selected?.detail || gatewayError || 'verificando gateway…'}</span>
      </div>
      {gatewayError && selection.provider !== 'simulation' && (
        <div className="border-b border-[#ff0040]/30 bg-[#ff0040]/5 px-3 py-1.5 text-[9px] text-[#ff668d]">{gatewayError}</div>
      )}

      <div className="flex border-b border-[#1a1a1e]">
        {(['red', 'blue'] as ChatSide[]).map((item) => (
          <button
            key={item}
            onClick={() => setSide(item)}
            className={`min-h-[42px] flex-1 font-display text-sm uppercase tracking-[0.15em] transition-colors ${side === item ? '' : 'text-[#8a877e] hover:text-[#c8c4ba]'}`}
            style={side === item ? { color: SIDE_THEME[item].color, background: SIDE_THEME[item].dim } : undefined}
          >
            {item === 'red' ? '▸ vermelho' : '◂ azul'}{typing[item] ? ' ···' : ''}
          </button>
        ))}
      </div>

      <div ref={bodyRef} className="scroll-slim h-[340px] space-y-3 overflow-y-auto px-3 py-3" aria-live="polite">
        <p className="text-center text-[9px] uppercase tracking-[0.25em] text-[#8a877e]/60">{t.name} — {t.motto}</p>
        {messages.length === 0 && <p className="py-10 text-center text-xs text-[#8a877e]">Canal limpo. Envie uma mensagem para iniciar.</p>}
        {messages.map((message) => {
          const role = messageRole(message)
          const isUser = role === 'user'
          return (
            <div key={message.id} className={`group log-line flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[92%] border px-3 py-2"
                style={{
                  borderColor: message.error ? '#ff0040' : isUser ? '#2a2a2e' : `${t.color}55`,
                  background: message.error ? 'rgba(255,0,64,0.08)' : isUser ? '#0d0d10' : t.dim,
                }}
              >
                <p className="whitespace-pre-wrap break-words font-display text-[15px] leading-snug text-[#e0ddd5]">{message.text || (typing[side] ? '▌' : '')}</p>
                {message.skills && message.skills.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.skills.map((skill) => (
                      <div key={skill.package} className="border border-[#2a2a2e] bg-[#0a0a0c] p-2 font-sans text-[11px]">
                        <a href={skill.url} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-[#00aaff] hover:underline">{skill.name} ↗</a>
                        <p className="mt-1 text-[#8a877e]">{skill.owner}/{skill.repo} · {skill.installs} instalações</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <code className="break-all text-[10px] text-[#c8c4ba]">{skill.installCommand}</code>
                          <button onClick={() => onSend(side, `/skills instalar ${skill.package}`)} disabled={typing[side]} className="border border-[#00ff40]/50 px-2 py-1 text-[9px] uppercase text-[#00ff40] hover:bg-[#00ff40]/10 disabled:opacity-40">instalar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {message.installedSkills && message.installedSkills.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.installedSkills.map((skill, index) => {
                      const name = skill.name || skill.skill || ''
                      return (
                        <div key={`${name}-${index}`} className="flex flex-wrap items-center justify-between gap-2 border border-[#2a2a2e] bg-[#0a0a0c] p-2 font-sans text-[11px]">
                          <span className="break-all text-[#c8c4ba]">{name || String(skill.package || skill.source || 'skill')}</span>
                          {name && <button onClick={() => onSend(side, `/skills desinstalar ${name}`)} disabled={typing[side]} className="border border-[#ff0040]/50 px-2 py-1 text-[9px] uppercase text-[#ff668d] hover:bg-[#ff0040]/10 disabled:opacity-40">desinstalar</button>}
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="mt-1.5 flex items-center gap-2 text-[8px] uppercase tracking-[0.14em] text-[#8a877e]">
                  <span style={{ color: isUser ? '#8a877e' : t.color }}>{isUser ? 'você' : message.provider || t.name}</span>
                  {message.model && <span className="max-w-[120px] truncate" title={message.model}>{message.model}</span>}
                  {message.durationMs != null && <span>{(message.durationMs / 1000).toFixed(1)}s</span>}
                  {message.t > 0 && <span>{new Date(message.t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
                  {message.text && (
                    <button onClick={() => void copy(message)} className="ml-auto opacity-0 transition-opacity hover:text-[#e0ddd5] group-hover:opacity-100">
                      {copied === message.id ? 'copiado' : 'copiar'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {typing[side] && <p className="font-display text-sm" style={{ color: t.color }}>{selected?.label || t.name} gerando<span className="blink-rec">▌</span></p>}
      </div>

      <div className="border-t border-[#1a1a1e] bg-[#0d0d10] px-3 py-2">
        <div className="flex items-end gap-2">
          <span className="pb-2 font-display text-lg" style={{ color: t.color }}>»</span>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value.slice(0, 12_000))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                submit()
              }
            }}
            placeholder={`falar com o ${t.name.toLowerCase()} ou digite /skills…`}
            spellCheck
            rows={2}
            className="scroll-slim min-h-[52px] flex-1 resize-none bg-transparent font-display text-[17px] leading-snug text-[#e0ddd5] caret-[#00ff40] outline-none placeholder:text-[#8a877e]/50"
          />
          {typing[side] ? (
            <button onClick={() => onStop(side)} className="min-h-[44px] border border-[#ff0040]/70 px-4 font-display text-sm uppercase text-[#ff0040]">PARAR</button>
          ) : (
            <button disabled={!canSend} onClick={submit} className="min-h-[44px] border px-4 font-display text-sm uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-30" style={{ borderColor: `${t.color}80`, color: t.color }}>ENVIAR</button>
          )}
        </div>
        <div className="mt-1 flex justify-between text-[8px] uppercase tracking-[0.16em] text-[#8a877e]/60">
          <span>{side === 'red' && redStance === 'ofensivo' ? '⚠ conversa pode afetar a arena' : 'contexto da arena anexado automaticamente'}</span>
          <span>{input.length}/12000</span>
        </div>
      </div>
    </section>
  )
}

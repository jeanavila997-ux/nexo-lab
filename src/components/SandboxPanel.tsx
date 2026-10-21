import { useEffect, useRef, useState } from 'react'
import type { Explanation } from '@/lib/explainer'

const RISK_COLOR = {
  baixo: '#00ff40',
  medio: '#ffaa00',
  alto: '#ff5c85',
  extremo: '#ff0040',
} as const

interface Line {
  id: number
  kind: 'in' | 'out' | 'err'
  text: string
}

interface Props {
  onRun: (raw: string) => void
  onExplain: (raw: string) => Explanation
}

// sessão isolada: não afeta a arena nem o placar — playground de comandos
export default function SandboxPanel({ onRun, onExplain }: Props) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [lines, setLines] = useState<Line[]>([
    { id: 0, kind: 'out', text: 'SANDBOX :: sessão isolada — nada aqui afeta a arena, o placar ou o sistema' },
    { id: 1, kind: 'out', text: '· digite um comando para testar, ou cole com o botão COLAR+EXPLICAR' },
  ])
  const [explanation, setExplanation] = useState<Explanation | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(2)

  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  const run = () => {
    const v = input.trim()
    if (!v) return
    setLines((l) => [...l, { id: idRef.current++, kind: 'in' as const, text: `$ ${v}` }].slice(-200))
    setExplanation(onExplain(v))
    onRun(v)
    setInput('')
  }

  const pasteAndExplain = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const v = text.trim()
      if (!v) return
      const firstLine = v.split('\n')[0].trim()
      setInput(firstLine)
      setExplanation(onExplain(firstLine))
      setLines((l) => [...l, { id: idRef.current++, kind: 'out' as const, text: `· comando colado: ${firstLine}` }].slice(-200))
    } catch {
      setLines((l) => [...l, { id: idRef.current++, kind: 'err' as const, text: '· acesso à área de transferência negado — cole manualmente no campo' }].slice(-200))
    }
  }

  return (
    <section className="border border-[#1a1a1e] bg-[#111114]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[44px] w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-[10px] uppercase tracking-[0.25em] text-[#8a877e]">
          SANDBOX :: teste isolado de comandos + explicador
        </span>
        <span className="font-display text-lg text-[#00ff40]">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="border-t border-[#1a1a1e]">
          <div ref={bodyRef} className="scroll-slim h-[160px] overflow-y-auto bg-[#0d0d10] px-3 py-2">
            {lines.map((l) => (
              <div key={l.id} className="log-line">
                <span className={`font-display break-all text-sm leading-snug ${
                  l.kind === 'in' ? 'text-[#e0ddd5]' : l.kind === 'err' ? 'text-[#ff5c85]' : 'text-[#8a877e]'
                }`}>
                  {l.text}
                </span>
              </div>
            ))}
          </div>

          {/* explicação do comando */}
          {explanation && (
            <div className="border-t border-[#1a1a1e] px-3 py-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-display text-sm text-[#e0ddd5]">{explanation.summary}</span>
                <span
                  className="border px-2 py-0.5 text-[9px] uppercase tracking-[0.2em]"
                  style={{ color: RISK_COLOR[explanation.risk], borderColor: RISK_COLOR[explanation.risk] }}
                >
                  risco: {explanation.risk}
                </span>
              </div>
              <p className="mb-2 text-[11px] text-[#8a877e]">{explanation.riskWhy}</p>
              <div className="scroll-slim max-h-[140px] overflow-y-auto">
                {explanation.parts.map((p, i) => (
                  <div key={i} className="flex gap-3 py-px">
                    <code className="shrink-0 font-mono text-xs text-[#ffaa00]">{p.token}</code>
                    <span className="text-xs text-[#c8c4ba]">{p.meaning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* entrada */}
          <div className="flex flex-col gap-2 border-t border-[#1a1a1e] bg-[#0d0d10] px-3 py-2 sm:flex-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && run()}
              placeholder="cole ou digite um comando — ex: iptables -A INPUT -j DROP"
              spellCheck={false}
              autoComplete="off"
              className="min-h-[44px] flex-1 border border-[#1a1a1e] bg-[#0a0a0c] px-3 font-mono text-sm text-[#e0ddd5] outline-none placeholder:text-[#8a877e]/50 focus:border-[#00ff40]/50"
            />
            <div className="flex gap-2">
              <button
                onClick={pasteAndExplain}
                className="min-h-[44px] flex-1 border border-[#ffaa00]/60 px-3 font-display text-sm uppercase tracking-[0.12em] text-[#ffaa00] sm:flex-none"
              >
                colar + explicar
              </button>
              <button
                onClick={run}
                className="min-h-[44px] flex-1 border border-[#00ff40]/60 px-4 font-display text-sm uppercase tracking-[0.12em] text-[#00ff40] sm:flex-none"
              >
                testar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

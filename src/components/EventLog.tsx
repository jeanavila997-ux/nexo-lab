import { useEffect, useMemo, useRef, useState } from 'react'
import type { LogEvent } from '@/lib/engine'
import { formatClock } from '@/lib/engine'

const KIND_STYLE: Record<LogEvent['kind'], string> = {
  red: 'text-[#ff5c85]',
  blue: 'text-[#6ecfff]',
  sys: 'text-[#8a877e]',
  alert: 'text-[#ffaa00]',
  cmd: 'text-[#e0ddd5]',
  in: 'text-[#e0ddd5]',
}

type ConsoleSide = 'blue' | 'red'
type ChannelFilter = 'all' | 'red' | 'blue' | 'sys'

const CONSOLE_THEME: Record<
  ConsoleSide,
  { label: string; color: string; hint: string; placeholder: string }
> = {
  blue: {
    label: 'CONSOLE DO AZUL — defesa (help)',
    color: '#00aaff',
    hint: 'doutrina: detectar · conter · endurecer',
    placeholder: 'scan, patch, block, explain, instalar…',
  },
  red: {
    label: 'CONSOLE DO VERMELHO — ofensiva (arsenal)',
    color: '#ff0040',
    hint: 'doutrina: pressionar · explorar · romper',
    placeholder: 'recon, arsenal, ataque inj, nmap…',
  },
}

const FILTER_TABS: { id: ChannelFilter; label: string; color: string }[] = [
  { id: 'all', label: 'TUDO', color: '#8a877e' },
  { id: 'red', label: '▸ ATAQUE', color: '#ff0040' },
  { id: 'blue', label: '◂ DEFESA', color: '#00aaff' },
  { id: 'sys', label: 'SISTEMA', color: '#ffaa00' },
]

interface Props {
  log: LogEvent[]
  onCommand: (raw: string, side: ConsoleSide) => void
}

export default function EventLog({ log, onCommand }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [side, setSide] = useState<ConsoleSide>('blue')
  const [filter, setFilter] = useState<ChannelFilter>('all')
  const [input, setInput] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [history, setHistory] = useState<Record<ConsoleSide, string[]>>({ blue: [], red: [] })
  const [histIdx, setHistIdx] = useState(-1)

  const theme = CONSOLE_THEME[side]

  const visible = useMemo(
    () => (filter === 'all' ? log : log.filter((e) => (e.ch ?? 'sys') === filter)),
    [log, filter],
  )

  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [visible])

  const flash = (tag: string) => {
    setCopied(tag)
    setTimeout(() => setCopied(null), 1400)
  }

  const copyText = async (text: string, tag: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    flash(tag)
  }

  const lineText = (e: LogEvent) => `T+${formatClock(e.t)} ${e.text}`

  const copyAll = () => copyText(visible.map(lineText).join('\n'), 'all')
  const copySide = (ch: ChannelFilter) =>
    copyText(log.filter((e) => (e.ch ?? 'sys') === ch).map(lineText).join('\n'), ch)
  const downloadLog = () => {
    const blob = new Blob([visible.map(lineText).join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nexo-log-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    flash('dl')
  }

  const submit = () => {
    const v = input.trim()
    if (!v) return
    onCommand(v, side)
    setHistory((h) => ({ ...h, [side]: [...h[side], v] }))
    setHistIdx(-1)
    setInput('')
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const hist = history[side]
    if (e.key === 'Enter') submit()
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (hist.length === 0) return
      const idx = histIdx === -1 ? hist.length - 1 : Math.max(0, histIdx - 1)
      setHistIdx(idx)
      setInput(hist[idx])
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histIdx === -1) return
      const idx = histIdx + 1
      if (idx >= hist.length) {
        setHistIdx(-1)
        setInput('')
      } else {
        setHistIdx(idx)
        setInput(hist[idx])
      }
    }
  }

  const copyBtn = (label: string, tag: string, fn: () => void) => (
    <button
      key={tag}
      onClick={fn}
      className="min-h-[32px] border border-[#2a2a2e] px-2 text-[9px] uppercase tracking-[0.15em] text-[#8a877e] transition-colors hover:border-[#00aaff]/60 hover:text-[#00aaff]"
    >
      {copied === tag ? '✔ copiado' : label}
    </button>
  )

  return (
    <section className="flex min-h-0 flex-col border border-[#1a1a1e] bg-[#111114]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1a1a1e] bg-[#0d0d10] px-3 py-1.5">
        <span className="text-[10px] uppercase tracking-[0.25em] text-[#8a877e]">
          TERMINAL :: bash · audit.jsonl
        </span>
        <div className="flex items-center gap-1.5">
          {copyBtn('copiar visível', 'all', copyAll)}
          {copyBtn('▸ ataque', 'red', () => copySide('red'))}
          {copyBtn('◂ defesa', 'blue', () => copySide('blue'))}
          {copyBtn('⭳ .txt', 'dl', downloadLog)}
          <span className="font-display ml-1 text-sm text-[#ffaa00]">{visible.length} regs</span>
        </div>
      </div>

      {/* filtro por lado */}
      <div className="flex border-b border-[#1a1a1e]">
        {FILTER_TABS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`min-h-[36px] flex-1 font-display text-xs uppercase tracking-[0.15em] transition-colors ${
              filter === f.id ? '' : 'text-[#8a877e]/70 hover:text-[#c8c4ba]'
            }`}
            style={filter === f.id ? { color: f.color, background: `${f.color}14` } : undefined}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div
        ref={bodyRef}
        className="scroll-slim h-[240px] overflow-y-auto px-3 py-2 lg:h-[300px]"
      >
        {visible.map((e) => (
          <div key={e.id} className="log-line group flex items-start gap-2 py-[1px]">
            <span className="font-display shrink-0 text-sm text-[#ffaa00]/70">
              T+{formatClock(e.t)}
            </span>
            <span
              className={`font-display break-all text-sm leading-snug ${KIND_STYLE[e.kind]} ${
                e.kind === 'cmd' ? 'opacity-80' : ''
              }`}
            >
              {e.kind === 'red' ? '▸ ' : e.kind === 'blue' ? '◂ ' : e.kind === 'cmd' || e.kind === 'in' ? '' : '· '}
              {e.text}
            </span>
            <button
              onClick={() => copyText(e.text, `l${e.id}`)}
              title="copiar esta linha"
              className="ml-auto min-h-[28px] shrink-0 px-1.5 text-[10px] text-[#8a877e]/0 transition-colors group-hover:text-[#8a877e] hover:!text-[#00aaff]"
            >
              {copied === `l${e.id}` ? '✔' : '⧉'}
            </button>
          </div>
        ))}
      </div>

      {/* abas dos consoles */}
      <div className="flex border-t border-[#1a1a1e]">
        {(['blue', 'red'] as ConsoleSide[]).map((s) => (
          <button
            key={s}
            onClick={() => {
              setSide(s)
              setHistIdx(-1)
              setInput('')
            }}
            className={`min-h-[44px] flex-1 font-display text-sm uppercase tracking-[0.15em] transition-colors ${
              side === s
                ? s === 'blue'
                  ? 'bg-[#00aaff]/10 text-[#00aaff]'
                  : 'bg-[#ff0040]/10 text-[#ff0040]'
                : 'text-[#8a877e] hover:text-[#c8c4ba]'
            }`}
          >
            {s === 'blue' ? '◂ azul' : 'vermelho ▸'}
          </button>
        ))}
      </div>

      {/* console ativo */}
      <div className="border-t border-[#1a1a1e] bg-[#0d0d10] px-3 py-2">
        <label
          className="mb-1 block text-[9px] uppercase tracking-[0.25em]"
          style={{ color: theme.color }}
        >
          {theme.label} <span className="text-[#8a877e]">· {theme.hint}</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="font-display shrink-0 text-lg" style={{ color: theme.color }}>
            $
          </span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder={theme.placeholder}
            spellCheck={false}
            autoComplete="off"
            className="min-h-[44px] w-full bg-transparent font-display text-lg text-[#e0ddd5] caret-[#00ff40] outline-none placeholder:text-[#8a877e]/50"
          />
          <button
            onClick={submit}
            className="min-h-[44px] shrink-0 border px-4 font-display text-base uppercase tracking-[0.12em] transition-colors"
            style={{ borderColor: `${theme.color}80`, color: theme.color }}
          >
            EXEC
          </button>
        </div>
      </div>
    </section>
  )
}

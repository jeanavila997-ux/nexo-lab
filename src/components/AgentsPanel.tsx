import { useRef, useState } from 'react'
import type { AgentConfig, AgentProfile } from '@/lib/agents'

interface Props {
  agents: AgentConfig[]
  activeIds: { red: string; blue: string }
  installAllowed: boolean
  onToggleInstall: (v: boolean) => void
  onSelectActive: (side: 'red' | 'blue', id: string) => void
  onUpdate: (id: string, patch: Partial<AgentConfig>) => void
  onAdd: (input: { codinome: string; profile: AgentProfile; agressividade?: number; systemPrompt?: string }) => AgentConfig
  onRemove: (id: string) => void
  onExport: () => void
  onImport: (file: File) => Promise<string>
}

const CLR = { vermelho: '#ff0040', azul: '#00aaff' }

export default function AgentsPanel({
  agents, activeIds, installAllowed, onToggleInstall,
  onSelectActive, onUpdate, onAdd, onRemove, onExport, onImport,
}: Props) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [nome, setNome] = useState('')
  const [perfil, setPerfil] = useState<AgentProfile>('vermelho')
  const [agress, setAgress] = useState(8)
  const [prompt, setPrompt] = useState('')
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2200) }

  return (
    <section className="border border-[#1a1a1e] bg-[#111114]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[44px] w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-[10px] uppercase tracking-[0.25em] text-[#8a877e]">
          AGENTES :: system prompts · criação · permissões · backup
        </span>
        <span className="font-display text-lg text-[#ffaa00]">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-[#1a1a1e] px-3 py-3">
          {/* permissão de instalação + backup */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onToggleInstall(!installAllowed)}
              className="min-h-[44px] border px-3 text-[10px] uppercase tracking-[0.15em] transition-colors"
              style={{
                borderColor: installAllowed ? '#00ff40' : '#2a2a2e',
                color: installAllowed ? '#00ff40' : '#8a877e',
              }}
            >
              {installAllowed ? '● INSTALAR: permitido' : '○ INSTALAR: bloqueado'}
            </button>
            <button onClick={onExport} className="min-h-[44px] border border-[#2a2a2e] px-3 text-[10px] uppercase tracking-[0.15em] text-[#8a877e] hover:border-[#ffaa00] hover:text-[#ffaa00]">
              ⭳ exportar config
            </button>
            <button onClick={() => fileRef.current?.click()} className="min-h-[44px] border border-[#2a2a2e] px-3 text-[10px] uppercase tracking-[0.15em] text-[#8a877e] hover:border-[#ffaa00] hover:text-[#ffaa00]">
              ⭱ importar config
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (f) flash(await onImport(f))
                e.target.value = ''
              }}
            />
            {msg && <span className="text-[10px] uppercase tracking-[0.15em] text-[#00ff40]">{msg}</span>}
          </div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-[#8a877e]/70">
            instalar linguagens e bibliotecas (instalar linguagem/pip/npm) exige a chave acima · no navegador tudo é simulado · no Termux executa de verdade
          </p>

          {/* lista de agentes */}
          <div className="grid gap-3 md:grid-cols-2">
            {agents.map((a) => {
              const color = CLR[a.profile]
              const isActive = activeIds[a.profile === 'vermelho' ? 'red' : 'blue'] === a.id
              const isEditing = editing === a.id
              return (
                <div key={a.id} className="border bg-[#0d0d10]" style={{ borderColor: isActive ? color : '#1a1a1e' }}>
                  <div className="flex items-center justify-between gap-2 border-b border-[#1a1a1e] px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="inline-block h-2 w-2 shrink-0" style={{ background: color }} />
                      <span className="font-display truncate text-base" style={{ color }}>{a.codinome}</span>
                      <span className="shrink-0 text-[9px] uppercase tracking-[0.2em] text-[#8a877e]">
                        {a.profile} · agr {a.agressividade}/10 {a.custom ? '· custom' : ''}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => onSelectActive(a.profile === 'vermelho' ? 'red' : 'blue', a.id)}
                        className="min-h-[32px] border px-2 text-[9px] uppercase tracking-[0.15em]"
                        style={{ borderColor: isActive ? color : '#2a2a2e', color: isActive ? color : '#8a877e' }}
                      >
                        {isActive ? 'em cena' : 'assumir'}
                      </button>
                      <button
                        onClick={() => setEditing(isEditing ? null : a.id)}
                        className="min-h-[32px] border border-[#2a2a2e] px-2 text-[9px] uppercase tracking-[0.15em] text-[#8a877e] hover:text-[#ffaa00]"
                      >
                        prompt
                      </button>
                      {a.custom && (
                        <button
                          onClick={() => onRemove(a.id)}
                          className="min-h-[32px] border border-[#2a2a2e] px-2 text-[9px] uppercase tracking-[0.15em] text-[#8a877e] hover:text-[#ff0040]"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  {isEditing ? (
                    <div className="px-3 py-2">
                      <textarea
                        value={a.systemPrompt}
                        onChange={(e) => onUpdate(a.id, { systemPrompt: e.target.value })}
                        rows={7}
                        spellCheck={false}
                        className="w-full resize-y border border-[#1a1a1e] bg-[#0a0a0c] p-2 font-mono text-xs leading-relaxed text-[#c8c4ba] outline-none focus:border-[#00aaff]/50"
                      />
                      <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-[#8a877e]/70">
                        system prompt de {a.codinome} · salvo automaticamente
                      </p>
                    </div>
                  ) : (
                    <p className="line-clamp-2 px-3 py-2 font-mono text-[11px] leading-snug text-[#8a877e]">
                      {a.systemPrompt.split('\n')[0]}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* criar agente */}
          {creating ? (
            <div className="space-y-2 border border-[#ffaa00]/40 bg-[#0d0d10] px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#ffaa00]">novo agente</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="codinome — ex: FANTASMA"
                  className="min-h-[44px] border border-[#1a1a1e] bg-[#0a0a0c] px-3 font-display text-base text-[#e0ddd5] outline-none placeholder:text-[#8a877e]/50 focus:border-[#ffaa00]/50"
                />
                <div className="flex">
                  {(['vermelho', 'azul'] as AgentProfile[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPerfil(p)}
                      className={`min-h-[44px] flex-1 border font-display text-sm uppercase tracking-[0.15em] ${p === 'vermelho' ? 'border-r-0' : ''}`}
                      style={perfil === p ? { color: CLR[p], borderColor: CLR[p], background: `${CLR[p]}14` } : { color: '#8a877e', borderColor: '#1a1a1e' }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block text-[9px] uppercase tracking-[0.2em] text-[#8a877e]">
                agressividade: {agress}/10
                <input type="range" min={1} max={10} value={agress} onChange={(e) => setAgress(Number(e.target.value))} className="mt-1 w-full accent-[#ff0040]" />
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="system prompt (vazio = usa o padrão do perfil)"
                rows={5}
                spellCheck={false}
                className="w-full resize-y border border-[#1a1a1e] bg-[#0a0a0c] p-2 font-mono text-xs leading-relaxed text-[#c8c4ba] outline-none placeholder:text-[#8a877e]/50 focus:border-[#ffaa00]/50"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!nome.trim()) { flash('dê um codinome ao agente'); return }
                    onAdd({ codinome: nome.trim(), profile: perfil, agressividade: agress, systemPrompt: prompt.trim() || undefined })
                    setNome(''); setPrompt(''); setCreating(false)
                    flash('agente criado e em cena ✔')
                  }}
                  className="min-h-[44px] border border-[#00ff40] px-4 font-display text-sm uppercase tracking-[0.15em] text-[#00ff40]"
                >
                  criar
                </button>
                <button
                  onClick={() => setCreating(false)}
                  className="min-h-[44px] border border-[#2a2a2e] px-4 font-display text-sm uppercase tracking-[0.15em] text-[#8a877e]"
                >
                  cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="min-h-[44px] w-full border border-dashed border-[#2a2a2e] font-display text-sm uppercase tracking-[0.2em] text-[#8a877e] hover:border-[#ffaa00] hover:text-[#ffaa00]"
            >
              + criar novo agente
            </button>
          )}
        </div>
      )}
    </section>
  )
}

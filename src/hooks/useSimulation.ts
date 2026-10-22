import { useCallback, useEffect, useRef, useState } from 'react'
import type { Exchange, LogEvent, Mode, Team } from '@/lib/engine'
import { DEFENSE_EFFECTS, ROUND_LENGTH, VECTORS, tick } from '@/lib/engine'
import {
  execReal,
  getLlmModels,
  getLlmProviders,
  installProjectSkill,
  installedSkills,
  runSpeedtest,
  searchSkills,
  streamLlmChat,
  uninstallProjectSkill,
  type LlmProvider,
} from '@/lib/backend'
import { findCommand, helpDetail, helpOverview } from '@/lib/registry'
import { loadCatalog, type Catalog } from '@/lib/catalog'
import { explainCommand, type Explanation } from '@/lib/explainer'
import {
  createAgent,
  loadAgents,
  saveAgents,
  type AgentConfig,
} from '@/lib/agents'
import {
  blueReply,
  redReply,
  type ChatContext,
  type ChatMessage,
  type ChatSide,
  type Stance,
} from '@/lib/personas'

export type SimStatus = 'idle' | 'running' | 'paused' | 'roundEnd'

export interface HistoryPoint {
  t: number
  v: number
}

export interface SimState {
  status: SimStatus
  mode: Mode
  intensity: number
  integrity: number
  history: HistoryPoint[]
  round: number
  roundElapsed: number
  sessionT: number
  score: Record<Team, number>
  log: LogEvent[]
  exchanges: Exchange[]
  lastAction: { red: string; blue: string; breached: boolean } | null
  blocked: number
  breached: number
  peakStress: number
  adaptation: number
  momentum: number
  banner: { winner: Team; round: number } | null
  redStance: Stance
}

const INITIAL: SimState = {
  status: 'idle',
  mode: 'prompt',
  intensity: 5,
  integrity: 100,
  history: [{ t: 0, v: 100 }],
  round: 1,
  roundElapsed: 0,
  sessionT: 0,
  score: { red: 0, blue: 0 },
  log: [
    { id: 0, t: 0, kind: 'sys', text: 'NEXO CORE :: laboratório pronto — aguardando início' },
  ],
  exchanges: [],
  lastAction: null,
  blocked: 0,
  breached: 0,
  peakStress: 0,
  adaptation: 0,
  momentum: 0,
  banner: null,
  redStance: 'ofensivo',
}

const MAX_LOG = 180
const MAX_HISTORY = 160
const CHAT_KEY = 'nexo-lab.chat.v2'
const LLM_KEY = 'nexo-lab.llm.v1'

const SIMULATION_PROVIDER: LlmProvider = {
  id: 'simulation',
  label: 'NEXO Sim',
  kind: 'builtin',
  defaultModel: 'nexo-core',
  hint: 'Persona determinística embutida; funciona sem servidor.',
  available: true,
  configured: true,
  status: 'ready',
  detail: 'sempre disponível',
}

function initialChat(): Record<ChatSide, ChatMessage[]> {
  const fallback: Record<ChatSide, ChatMessage[]> = {
    red: [{ id: 0, side: 'red', role: 'assistant', provider: 'simulation', t: 0, text: 'Vermelho na linha. Operação no máximo. Fala comigo — mas cuidado com o que sugere.' }],
    blue: [{ id: 0, side: 'blue', role: 'assistant', provider: 'simulation', t: 0, text: 'Azul na escuta. Telemetria ativa. Pergunte sobre o estado da defesa ou peça recomendações.' }],
  }
  try {
    const saved = JSON.parse(localStorage.getItem(CHAT_KEY) || 'null')
    if (saved?.red && saved?.blue) return saved
  } catch {
    // armazenamento indisponível ou histórico antigo inválido
  }
  return fallback
}

export function useSimulation() {
  const [state, setState] = useState<SimState>(INITIAL)
  const adaptation = useRef(0)
  const momentum = useRef(0)
  const exchangeId = useRef(1)
  const logId = useRef(1)
  const warned40 = useRef(false)
  const warned20 = useRef(false)
  const resumeAfterRound = useRef(false)
  const endTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const catalog = useRef<Catalog | null>(null)
  const chatId = useRef(1)
  const [agents, setAgents] = useState<AgentConfig[]>(() => loadAgents())
  const [activeIds, setActiveIds] = useState<{ red: string; blue: string }>({ red: 'red-01', blue: 'blue-01' })
  const [installAllowed, setInstallAllowed] = useState(false)
  const installAllowedRef = useRef(false)
  useEffect(() => {
    installAllowedRef.current = installAllowed
  }, [installAllowed])
  const agentsRef = useRef<AgentConfig[]>([])
  const activeIdsRef = useRef(activeIds)
  useEffect(() => {
    agentsRef.current = agents
    activeIdsRef.current = activeIds
  }, [agents, activeIds])

  const persistAgents = useCallback((next: AgentConfig[]) => {
    setAgents(next)
    saveAgents(next)
  }, [])

  // ============ gestão de agentes ============
  const activeRed = agents.find((a) => a.id === activeIds.red) ?? agents[0]
  const activeBlue = agents.find((a) => a.id === activeIds.blue) ?? agents[1] ?? agents[0]

  const updateAgent = useCallback((id: string, patch: Partial<AgentConfig>) => {
    persistAgents(agentsRef.current.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }, [persistAgents])

  const addAgent = useCallback((input: Parameters<typeof createAgent>[0]) => {
    const a = createAgent(input)
    persistAgents([...agentsRef.current, a])
    if (a.profile === 'vermelho') setActiveIds((s) => ({ ...s, red: a.id }))
    else setActiveIds((s) => ({ ...s, blue: a.id }))
    return a
  }, [persistAgents])

  const removeAgent = useCallback((id: string) => {
    const a = agentsRef.current.find((x) => x.id === id)
    if (!a?.custom) return // built-ins não se removem
    const next = agentsRef.current.filter((x) => x.id !== id)
    persistAgents(next)
    setActiveIds((s) => ({
      red: s.red === id ? 'red-01' : s.red,
      blue: s.blue === id ? 'blue-01' : s.blue,
    }))
  }, [persistAgents])

  // ============ chat + gateway de LLMs ============
  const [chat, setChat] = useState<Record<ChatSide, ChatMessage[]>>(initialChat)
  const [chatTyping, setChatTyping] = useState<Record<ChatSide, boolean>>({ red: false, blue: false })
  const chatRef = useRef(chat)
  const chatControllers = useRef<Partial<Record<ChatSide, AbortController>>>({})
  const [llmProviders, setLlmProviders] = useState<LlmProvider[]>([SIMULATION_PROVIDER])
  const [llmModels, setLlmModels] = useState<string[]>([])
  const [llmError, setLlmError] = useState('')
  const [llmSelection, setLlmSelection] = useState<{ provider: string; model: string }>(() => {
    try {
      return JSON.parse(localStorage.getItem(LLM_KEY) || 'null') || { provider: 'ollama', model: 'qwen3.5:4b' }
    } catch {
      return { provider: 'ollama', model: 'qwen3.5:4b' }
    }
  })

  useEffect(() => {
    chatRef.current = chat
    chatId.current = Math.max(chatId.current, ...chat.red.map((message) => message.id + 1), ...chat.blue.map((message) => message.id + 1))
    try { localStorage.setItem(CHAT_KEY, JSON.stringify(chat)) } catch { /* storage opcional */ }
  }, [chat])

  useEffect(() => {
    try { localStorage.setItem(LLM_KEY, JSON.stringify(llmSelection)) } catch { /* storage opcional */ }
  }, [llmSelection])

  const refreshLlmProviders = useCallback(async () => {
    try {
      const remote = await getLlmProviders()
      setLlmProviders([SIMULATION_PROVIDER, ...remote])
      setLlmError('')
    } catch (error) {
      setLlmProviders([SIMULATION_PROVIDER])
      setLlmError(error instanceof Error ? error.message : 'gateway LLM indisponível')
    }
  }, [])

  useEffect(() => {
    const initial = window.setTimeout(() => void refreshLlmProviders(), 0)
    const timer = window.setInterval(() => void refreshLlmProviders(), 30_000)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(timer)
    }
  }, [refreshLlmProviders])

  useEffect(() => {
    if (llmSelection.provider === 'simulation') {
      const timer = window.setTimeout(() => setLlmModels(['nexo-core']), 0)
      return () => window.clearTimeout(timer)
    }
    void getLlmModels(llmSelection.provider)
      .then((models) => {
        setLlmModels(models)
        if (!llmSelection.model && models[0]) setLlmSelection((current) => ({ ...current, model: models[0] }))
      })
      .catch(() => setLlmModels([]))
  }, [llmSelection.provider, llmSelection.model])

  // carrega o catálogo real (620 comandos) para enriquecer o terminal
  useEffect(() => {
    void loadCatalog().then((c) => {
      catalog.current = c
    })
  }, [])

  const catalogCmd = useCallback((team: 'red' | 'blue'): string | null => {
    const c = catalog.current
    if (!c || c.commands.length === 0) return null
    const isDef = (cat: string) =>
      /segurança|auditoria|defender|firewall|privacidade|backup|reparo|monitoramento/i.test(cat)
    const pool = c.commands.filter((x) => (team === 'blue' ? isDef(x.cat) : !isDef(x.cat)))
    if (pool.length === 0) return null
    const pick = pool[Math.floor(Math.random() * pool.length)]
    const flag = pick.destructive ? '  ⚠' : ''
    return team === 'red'
      ? `$ pwsh -c "${pick.cmd}"  :: ${pick.title} [${pick.cat}]${flag}`
      : `$ pwsh -c "${pick.cmd}"  :: ${pick.title} [${pick.cat}]${flag}`
  }, [])

  const sysLog = (text: string, t: number): LogEvent => ({
    id: logId.current++,
    t,
    kind: 'sys',
    text,
    ch: 'sys',
  })


  const endRound = useCallback((winner: Team, s: SimState) => {
    resumeAfterRound.current = true
    const events: LogEvent[] = [
      {
        id: logId.current++,
        t: s.sessionT,
        kind: winner === 'red' ? 'alert' : 'sys',
        ch: winner === 'red' ? 'red' : 'blue',
        text:
          winner === 'red'
            ? `FIM DA RODADA ${s.round} :: SISTEMA COMPROMETIDO — ponto do VERMELHO`
            : `FIM DA RODADA ${s.round} :: PERÍMETRO MANTIDO — ponto do AZUL`,
      },
    ]
    setState((prev) => ({
      ...prev,
      status: 'roundEnd',
      banner: { winner, round: prev.round },
      score: { ...prev.score, [winner]: prev.score[winner] + 1 },
      log: [...prev.log, ...events].slice(-MAX_LOG),
    }))

    endTimeout.current = setTimeout(() => {
      setState((prev) => {
        if (!resumeAfterRound.current) return { ...prev, banner: null }
        const round = prev.round + 1
        warned40.current = false
        warned20.current = false
        return {
          ...prev,
          status: 'running',
          banner: null,
          round,
          roundElapsed: 0,
          integrity: 100,
          log: [
            ...prev.log,
            sysLog(`LAB-01 :: rodada ${round} iniciada — integridade restaurada a 100%`, prev.sessionT),
          ].slice(-MAX_LOG),
        }
      })
    }, 3000)
  }, [])

  // laço principal
  useEffect(() => {
    if (state.status !== 'running') return
    const ms = Math.max(100, 1050 - state.intensity * 95)
    const iv = setInterval(() => {
      setState((prev) => {
        if (prev.status !== 'running') return prev
        const dt = ms / 1000
        const sessionT = prev.sessionT + dt
        const roundElapsed = prev.roundElapsed + dt

        const result = tick({
          mode: prev.mode,
          intensity: prev.intensity,
          integrity: prev.integrity,
          adaptation: adaptation.current,
          momentum: momentum.current,
          exchangeId: exchangeId.current,
          t: sessionT,
        })
        adaptation.current = result.adaptation
        momentum.current = result.momentum

        const vector0 = VECTORS.find((v) => v.id === result.exchange.vectorId)!
        const fromCat =
          Math.random() < 0.5
            ? [catalogCmd('red'), catalogCmd('blue')]
            : [null, null]
        const cmdEvents: LogEvent[] = [
          { id: logId.current++, t: sessionT, kind: 'cmd', text: fromCat[0] ?? vector0.cmdRed, ch: 'red' },
          { id: logId.current++, t: sessionT, kind: 'cmd', text: fromCat[1] ?? vector0.cmdBlue, ch: 'blue' },
        ]
        const events = [
          ...cmdEvents,
          ...result.events.map((e) => ({ ...e, id: logId.current++ })),
        ]
        exchangeId.current += 1

        if (!warned40.current && result.integrity < 40) {
          warned40.current = true
          events.push({
            id: logId.current++,
            t: sessionT,
            kind: 'alert',
            text: 'ALERTA :: integridade abaixo de 40% — defesa sob pressão',
          })
        }
        if (!warned20.current && result.integrity < 20) {
          warned20.current = true
          events.push({
            id: logId.current++,
            t: sessionT,
            kind: 'alert',
            text: 'CRÍTICO :: falha iminente do perímetro',
          })
        }

        const vector = vector0
        const stress = 100 - result.integrity

        const next: SimState = {
          ...prev,
          sessionT,
          roundElapsed,
          integrity: result.integrity,
          history: [...prev.history, { t: sessionT, v: result.integrity }].slice(-MAX_HISTORY),
          log: [...prev.log, ...events].slice(-MAX_LOG),
          exchanges: [...prev.exchanges.slice(-40), result.exchange],
          lastAction: {
            red: vector.name,
            blue: vector.counter,
            breached: result.breached,
          },
          blocked: prev.blocked + (result.breached ? 0 : 1),
          breached: prev.breached + (result.breached ? 1 : 0),
          peakStress: Math.max(prev.peakStress, stress),
          adaptation: result.adaptation,
          momentum: result.momentum,
        }

        if (result.integrity <= 0 || roundElapsed >= ROUND_LENGTH) {
          const winner: Team = result.integrity <= 0 ? 'red' : 'blue'
          // agenda fim de rodada fora do setState
          setTimeout(() => endRound(winner, next), 0)
          return { ...next, status: 'roundEnd' }
        }
        return next
      })
    }, ms)
    return () => clearInterval(iv)
  }, [state.status, state.intensity, state.mode, endRound])

  const start = useCallback(() => {
    resumeAfterRound.current = true
    setState((prev) => {
      if (prev.status === 'running') return prev
      const restarting = prev.status === 'idle'
      return {
        ...prev,
        status: 'running',
        log: [
          ...prev.log,
          sysLog(
            restarting
              ? `LAB-01 :: rodada ${prev.round} iniciada — modo ${prev.mode === 'prompt' ? 'TESTE DE PROMPT' : 'ESTRESSE EXTREMO'}, intensidade ${prev.intensity}`
              : 'LAB-01 :: simulação retomada',
            prev.sessionT,
          ),
        ].slice(-MAX_LOG),
      }
    })
  }, [])

  const pause = useCallback(() => {
    setState((prev) =>
      prev.status === 'running'
        ? { ...prev, status: 'paused', log: [...prev.log, sysLog('LAB-01 :: simulação pausada', prev.sessionT)].slice(-MAX_LOG) }
        : prev,
    )
  }, [])

  const reset = useCallback(() => {
    if (endTimeout.current) clearTimeout(endTimeout.current)
    resumeAfterRound.current = false
    adaptation.current = 0
    momentum.current = 0
    exchangeId.current = 1
    logId.current = 1
    warned40.current = false
    warned20.current = false
    setState({ ...INITIAL, mode: state.mode, intensity: state.intensity })
  }, [state.mode, state.intensity])

  const setMode = useCallback((mode: Mode) => setState((p) => ({ ...p, mode })), [])
  const setIntensity = useCallback(
    (intensity: number) => setState((p) => ({ ...p, intensity })),
    [],
  )

  // ============ console duplo — azul (defesa) e vermelho (ofensiva) ============
  const pendingConfirm = useRef<{ name: string; args: string[] } | null>(null)
  const cwd = useRef('/home/nexo')
  const sessionHistory = useRef<string[]>([])
  const opMode = useRef('defense')

  // ataque manual via console do vermelho
  const executeAttack = useCallback((vectorId?: string) => {
    const v = VECTORS.find((x) => x.id === vectorId) ?? VECTORS[Math.floor(Math.random() * VECTORS.length)]
    setState((prev) => {
      let integrity = prev.integrity
      if (prev.status === 'running') {
        const defense = 13.5 * (1 + adaptation.current * 0.45) * (0.7 + Math.random() * 0.6)
        const hit = v.power * (0.9 + Math.random() * 0.4) * (1 + momentum.current * 0.35)
        if (hit > defense) {
          const dmg = Math.min(28, (hit - defense) * 0.7 + v.power * 0.3)
          integrity = Math.max(0, integrity - dmg)
          momentum.current = Math.min(1.5, momentum.current + 0.1)
        } else {
          adaptation.current = Math.min(1.5, adaptation.current + 0.12)
        }
        return {
          ...prev,
          integrity,
          log: [...prev.log,
            { id: logId.current++, t: prev.sessionT, kind: 'cmd' as const, text: v.cmdRed },
            { id: logId.current++, t: prev.sessionT, kind: 'red' as const, ch: 'red' as const,
              text: hit > defense
                ? `RED :: ataque manual — ${v.name} rompeu ${v.counter}`
                : `RED :: ${v.name} bloqueado por ${v.counter} — Azul aprendeu` },
          ].slice(-MAX_LOG),
        }
      }
      return {
        ...prev,
        log: [...prev.log, { id: logId.current++, t: prev.sessionT, kind: 'sys' as const, text: `· vetor ${v.name} armado — inicie a rodada para detonar` }].slice(-MAX_LOG),
      }
    })
  }, [])

  const setRedStance = useCallback((stance: Stance) => {
    setState((prev) => ({
      ...prev,
      redStance: stance,
      log: [...prev.log, { id: logId.current++, t: prev.sessionT, kind: 'sys' as const, text: `LAB-01 :: postura do vermelho → ${stance.toUpperCase()}` }].slice(-MAX_LOG),
    }))
  }, [])

  const runCommand = useCallback((raw: string, consoleSide: 'blue' | 'red' = 'blue') => {
    const trimmed = raw.trim()
    if (!trimmed) return
    sessionHistory.current.push(trimmed)

    const push = (fn: (prev: SimState) => LogEvent[]) =>
      setState((prev) => ({ ...prev, log: [...prev.log, ...fn(prev)].slice(-MAX_LOG) }))
    const echoLine = (t: number): LogEvent => ({ id: logId.current++, t, kind: 'in', text: `$ ${trimmed}` })
    const line = (t: number, kind: LogEvent['kind'], text: string): LogEvent => ({ id: logId.current++, t, kind, text })
    const lines = (t: number, kind: LogEvent['kind'], texts: string[]): LogEvent[] =>
      texts.map((text) => line(t, kind, text))

    const [firstRaw, ...args] = trimmed.split(/\s+/)
    const first = firstRaw.toLowerCase()

    // ── confirmação pendente [S/N] ──
    if (pendingConfirm.current) {
      const answer = first
      const pending = pendingConfirm.current
      if (answer === 's' || answer === 'sim') {
        pendingConfirm.current = null
        if (pending.name === 'ataque') executeAttack(pending.args[0])
        else executeDefensive(pending.name)
      } else {
        pendingConfirm.current = null
        push((prev) => [line(prev.sessionT, 'sys', `· execução de "${pending.name}" cancelada`)])
      }
      return
    }

    // ── especiais do console ──
    if (first === 'clear') {
      setState((prev) => ({ ...prev, log: [echoLine(prev.sessionT)] }))
      return
    }
    if (first === 'explain' || first === 'explica') {
      push((prev) => {
        const t = prev.sessionT
        if (!args.length) return [echoLine(t), line(t, 'alert', 'uso: explain <comando> — ex: explain iptables -A INPUT -j DROP')]
        const e = explainCommand(args.join(' '))
        const rows = [
          `▸ ${e.summary}`,
          `▸ risco: ${e.risk.toUpperCase()} — ${e.riskWhy}`,
          ...e.parts.slice(0, 14).map((p) => `  ${p.token.padEnd(18)} ${p.meaning}`),
        ]
        return [echoLine(t), ...rows.map((r) => line(t, e.risk === 'baixo' ? 'sys' : e.risk === 'medio' ? 'alert' : 'red', r))]
      })
      return
    }
    if (first === 'instalar' || first === 'inst') {
      const sub = (args[0] ?? '').toLowerCase()
      const targets = args.slice(1)
      const map: Record<string, string> = { linguagem: 'pkg-install', lang: 'pkg-install', pkg: 'pkg-install', pip: 'pip-install', python: 'pip-install', npm: 'npm-install', node: 'npm-install' }
      push((prev) => {
        const t = prev.sessionT
        if (!sub || !map[sub]) return [echoLine(t), line(t, 'alert', 'uso: instalar [linguagem|pip|npm] <pacote…> — ex: instalar linguagem python · instalar pip requests')]
        if (!targets.length) return [echoLine(t), line(t, 'alert', '· informe o pacote — ex: instalar pip requests')]
        if (!installAllowedRef.current) return [echoLine(t), line(t, 'alert', '· INSTALAÇÃO BLOQUEADA — ative a chave INSTALAR no painel (sandbox/ajustes)')]
        void execReal(map[sub], targets, true).then((real) => {
          setState((p2) => ({
            ...p2,
            log: [...p2.log,
              real
                ? { id: logId.current++, t: p2.sessionT, kind: real.ok ? 'sys' as const : 'alert' as const, ch: 'sys' as const, text: real.ok ? `[TERMUX] ${targets.join(' ')} instalado ✔\n${real.output.split('\n').slice(-3).join('\n')}` : real.output }
                : { id: logId.current++, t: p2.sessionT, kind: 'sys' as const, ch: 'sys' as const, text: `(simulado) ${targets.join(' ')} instalado — sem servidor Termux, nada foi instalado de verdade` },
            ].slice(-MAX_LOG),
          }))
        })
        return [echoLine(t), line(t, 'sys', `· instalando ${targets.join(' ')} via ${sub}… (pode levar minutos no Termux)`)]
      })
      return
    }
    if (first === 'stance' && consoleSide === 'red') {
      const s = (args[0] ?? '').toLowerCase()
      if (s === 'ofensivo' || s === 'contido') {
        setRedStance(s)
      } else {
        push((prev) => [echoLine(prev.sessionT), line(prev.sessionT, 'alert', 'uso: stance [ofensivo|contido]')])
      }
      return
    }
    if (first === 'history') {
      push((prev) => [echoLine(prev.sessionT), ...lines(prev.sessionT, 'sys', sessionHistory.current.map((h, i) => `${String(i + 1).padStart(3, ' ')}  ${h}`))])
      return
    }
    if (first === 'pwd') {
      push((prev) => [echoLine(prev.sessionT), line(prev.sessionT, 'sys', cwd.current)])
      return
    }
    if (first === 'cd') {
      const target = args[0] ?? '/home/nexo'
      if (target === '..') cwd.current = cwd.current.split('/').slice(0, -1).join('/') || '/'
      else if (target.startsWith('/')) cwd.current = target
      else cwd.current = `${cwd.current}/${target}`.replace(/\/+/g, '/')
      push((prev) => [echoLine(prev.sessionT), line(prev.sessionT, 'sys', cwd.current)])
      return
    }
    if (first === 'exit') {
      push((prev) => [echoLine(prev.sessionT), line(prev.sessionT, 'sys', '· sessão do console encerrada — a simulação continua na arena')])
      return
    }
    if (first === 'help' || first === 'man') {
      const topic = (first === 'man' ? args[0] : args[0])?.toLowerCase()
      push((prev) => {
        const t = prev.sessionT
        if (!topic) return [echoLine(t), ...lines(t, 'sys', helpOverview().split('\n')), line(t, 'sys', '· detalhe: help [comando]')]
        const def = findCommand(topic)
        if (!def) return [echoLine(t), line(t, 'alert', `· comando não reconhecido: "${topic}" — digite help`)]
        return [echoLine(t), ...lines(t, 'sys', helpDetail(def))]
      })
      return
    }
    if (first === 'mode') {
      const m = (args[0] ?? '').toLowerCase()
      if (['defense', 'diag', 'net'].includes(m)) {
        opMode.current = m
        push((prev) => [echoLine(prev.sessionT), line(prev.sessionT, 'sys', `· modo de operação: ${m}`)])
      } else {
        push((prev) => [echoLine(prev.sessionT), line(prev.sessionT, 'alert', 'uso: mode [defense|diag|net]')])
      }
      return
    }

    // ── registro central ──
    const def = findCommand(first)
    if (!def) {
      push((prev) => [echoLine(prev.sessionT), line(prev.sessionT, 'alert', `· comando não reconhecido: "${first}" — digite help`)])
      return
    }

    // doutrina dos consoles: azul defende, vermelho ataca
    if (consoleSide === 'blue' && def.category === 'ofensiva') {
      push((prev) => [echoLine(prev.sessionT), line(prev.sessionT, 'alert', '· console do AZUL :: doutrina de defesa — comandos ofensivos não autorizados aqui')])
      return
    }
    if (consoleSide === 'red' && def.category === 'defesa') {
      push((prev) => [echoLine(prev.sessionT), line(prev.sessionT, 'alert', '· console do VERMELHO :: defender não é meu trabalho — tente o console do azul')])
      return
    }

    // confirmação para comandos perigosos
    if (def.requires_confirmation) {
      pendingConfirm.current = { name: def.name, args }
      push((prev) => [echoLine(prev.sessionT), line(prev.sessionT, 'alert', `[S/N] Confirmar execução de "${def.name}"? (${def.description.toLowerCase()})`)])
      return
    }
    dispatch(def, args)
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
  }, [])

  // defesa com efeito na rodada
  const executeDefensive = (name: string) => {
    const fx = DEFENSE_EFFECTS[name]
    const labels: Record<string, string> = {
      patch: 'apt-get install --only-upgrade nexo-core :: hotfix aplicado — integridade restaurada (simulado, requer root)',
      block: 'iptables -A INPUT -s <atacante> -j DROP :: embalo do vermelho cortado (simulado, requer root)',
      isolate: 'kill -9 <pid> && unshare -n :: sessão hostil encerrada (simulado, requer root)',
      harden: 'chmod 444 policy.json && setenforce 1 :: perímetro endurecido (simulado, requer root)',
    }
    setState((prev) => {
      let integrity = prev.integrity
      if (prev.status === 'running' && fx) {
        if (fx.adaptationDelta) adaptation.current = Math.min(1.5, adaptation.current + fx.adaptationDelta)
        if (fx.momentumDelta) momentum.current = Math.max(0, momentum.current + fx.momentumDelta)
        if (fx.integrityDelta) integrity = Math.min(100, prev.integrity + fx.integrityDelta)
      }
      return {
        ...prev,
        integrity,
        log: [...prev.log, { id: logId.current++, t: prev.sessionT, kind: 'blue' as const, ch: 'blue' as const, text: labels[name] ?? `◂ defesa: ${name} executado` }].slice(-MAX_LOG),
      }
    })
  }

  // despacha handlers do registro
  const dispatch = (def: NonNullable<ReturnType<typeof findCommand>>, args: string[]) => {
    const push = (fn: (prev: SimState) => LogEvent[]) =>
      setState((prev) => ({ ...prev, log: [...prev.log, ...fn(prev)].slice(-MAX_LOG) }))
    const line = (t: number, kind: LogEvent['kind'], text: string): LogEvent => ({ id: logId.current++, t, kind, text })

    if (def.handler === 'defense') {
      executeDefensive(def.name)
      return
    }

    if (def.handler === 'attack') {
      executeAttack(args[0])
      return
    }

    if (def.handler.startsWith('real:speedtest')) {
      push((prev) => [line(prev.sessionT, 'sys', '· medindo link real… (Ookla CLI, até ~1 min, ~100 MB)')])
      void runSpeedtest(args[0]?.toLowerCase() === 'force').then((r) => {
        if (!r) {
          push((prev) => [line(prev.sessionT, 'alert', '· speedtest indisponível — sirva o site pelo servidor Termux (node server/servidor.mjs)')])
          return
        }
        if (!r.ok) {
          push((prev) => [line(prev.sessionT, 'alert', `· speedtest falhou: ${r.error ?? 'erro desconhecido'}`)])
          return
        }
        const srv = r.server ? `${r.server.name ?? ''} (${r.server.location ?? ''}, ${r.server.country ?? ''})` : '?'
        push((prev) => [
          line(prev.sessionT, 'sys', `[SPEEDTEST REAL${r.cached ? ' · cache' : ''}]`),
          line(prev.sessionT, 'blue', `↓ ${r.download_mbps ?? '?'} Mbps · ↑ ${r.upload_mbps ?? '?'} Mbps · ping ${r.ping_ms ?? '?'} ms · jitter ${r.jitter_ms ?? '?'} ms · perda ${r.packet_loss ?? 0}%`),
          line(prev.sessionT, 'sys', `isp: ${r.isp ?? '?'} · servidor: ${srv}${r.interface?.is_vpn ? ' · VPN ativa' : ''}`),
          ...(r.result_url ? [line(prev.sessionT, 'sys', `resultado: ${r.result_url}`)] : []),
        ])
      })
      return
    }

    if (def.handler.startsWith('real:')) {
      const realBin = def.handler.slice(5) // ex.: real:sha256sum → sha256sum
      void execReal(realBin, args).then((real) => {
        if (real) {
          push((prev) => [
            line(prev.sessionT, real.ok ? 'sys' : 'alert', real.ok ? `[TERMUX :: ${[realBin, ...args].join(' ')}]` : real.output),
            ...(real.ok ? real.output.split('\n').slice(0, 20).map((l) => line(prev.sessionT, 'sys' as const, l)) : []),
          ])
        } else {
          // sem servidor Termux: cai na saída simulada do próprio registro
          const out = typeof def.sim === 'function' ? def.sim(args, cwd.current) : def.sim
          push((prev) => out && out.length
            ? out.map((text) => line(prev.sessionT, 'sys', text))
            : [line(prev.sessionT, 'alert', `· "${def.name}" precisa do servidor Termux para saída real`)])
        }
      })
      return
    }

    // handler simulado
    const out = typeof def.sim === 'function' ? def.sim(args, '/home/nexo') : def.sim ?? ['(sem saída)']
    push((prev) => out.map((text) => line(prev.sessionT, 'sys', text)))
  }

  // parâmetro de depuração: ?autostart inicia a simulação ao carregar
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('autostart')) start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ============ chat com os dois perfis ============
  const sendChat = useCallback(
    (side: ChatSide, text: string) => {
      if (/^\/skills(?:\s|$)/i.test(text)) {
        const userMsg: ChatMessage = { id: chatId.current++, side, role: 'user', text, t: Date.now() }
        setChat((current) => ({ ...current, [side]: [...current[side], userMsg].slice(-120) }))
        const args = text.trim().slice('/skills'.length).trim()
        const [action, ...rest] = args.split(/\s+/)
        const value = rest.join(' ').trim()
        const addResult = (message: Omit<ChatMessage, 'id' | 'side' | 't'>) => {
          setChat((current) => ({
            ...current,
            [side]: [...current[side], { id: chatId.current++, side, t: Date.now(), role: 'assistant', provider: 'find-skills', ...message }].slice(-120),
          }))
        }
        if (!args) {
          addResult({ text: 'Comandos disponíveis:\n/skills buscar <tema> — encontrar skills em skills.sh\n/skills lista — mostrar as skills instaladas neste projeto\n/skills instalar <owner/repo@skill> — instalar no projeto\n/skills desinstalar <nome> — remover do projeto\n\nExemplo: /skills buscar react performance' })
          return
        }
        const isSearch = !['buscar', 'search', 'lista', 'list', 'instalar', 'install', 'desinstalar', 'uninstall'].includes(action.toLowerCase())
        const normalized = isSearch ? 'buscar' : action.toLowerCase()
        const term = isSearch ? args : value
        if (normalized !== 'lista' && normalized !== 'list' && !term) {
          addResult({ text: `Informe o argumento para /skills ${normalized}.`, error: true })
          return
        }
        setChatTyping((current) => ({ ...current, [side]: true }))
        void (async () => {
          try {
            if (normalized === 'buscar' || normalized === 'search') {
              const skills = await searchSkills(term)
              addResult({
                text: skills.length ? `${skills.length} skills encontradas para “${term}”. Confira autor, instalações e repositório antes de instalar.` : `Nenhuma skill encontrada para “${term}”. Tente termos mais específicos ou consulte skills.sh.`,
                skills,
              })
            } else if (normalized === 'lista' || normalized === 'list') {
              const skills = await installedSkills()
              addResult({ text: skills.length ? `${skills.length} skills instaladas neste projeto.` : 'Nenhuma skill instalada neste projeto.', installedSkills: skills })
            } else if (normalized === 'instalar' || normalized === 'install') {
              const output = await installProjectSkill(term)
              addResult({ text: `Skill instalada no projeto: ${term}\n\n${output.slice(-2_500)}` })
            } else {
              const output = await uninstallProjectSkill(term)
              addResult({ text: `Skill removida do projeto: ${term}\n\n${output.slice(-2_500)}` })
            }
          } catch (error) {
            addResult({ text: error instanceof Error ? error.message : 'falha ao executar /skills', error: true })
          } finally {
            setChatTyping((current) => ({ ...current, [side]: false }))
          }
        })()
        return
      }
      const buildCtx = (): ChatContext => ({
        mode: state.mode,
        status: state.status,
        intensity: state.intensity,
        integrity: state.integrity,
        adaptation: adaptation.current,
        momentum: momentum.current,
        score: state.score,
        round: state.round,
        lastVector: state.lastAction?.red ?? null,
        lastCounter: state.lastAction?.blue ?? null,
        redStance: state.redStance,
        customPrompt: side === 'red' ? agentsRef.current.find((a) => a.id === activeIdsRef.current.red)?.systemPrompt : agentsRef.current.find((a) => a.id === activeIdsRef.current.blue)?.systemPrompt,
      })
      const ctx = buildCtx()
      const local = side === 'red' ? redReply(text, ctx) : blueReply(text, ctx)
      const userMsg: ChatMessage = { id: chatId.current++, side, role: 'user', text, t: Date.now() }
      const previous = chatRef.current[side]
      setChat((current) => ({ ...current, [side]: [...current[side], userMsg].slice(-120) }))
      setChatTyping((current) => ({ ...current, [side]: true }))
      setLlmError('')

      const applyEffects = () => {
        const { fx } = local
        if (fx.redAttack && state.status === 'running') {
          setState((prev) => ({
            ...prev,
            integrity: Math.max(0, prev.integrity - fx.redAttack!.damage),
            log: [...prev.log,
              { id: logId.current++, t: prev.sessionT, kind: 'red' as const, ch: 'red' as const, text: `RED :: ataque via chat — ${fx.redAttack!.name} (−${fx.redAttack!.damage} integridade)` },
            ].slice(-MAX_LOG),
          }))
          momentum.current = Math.min(1.5, momentum.current + 0.06)
        }
        if (fx.blueBoost && state.status === 'running') {
          if (fx.blueBoost.adaptationDelta) adaptation.current = Math.min(1.5, adaptation.current + fx.blueBoost.adaptationDelta)
          if (fx.blueBoost.integrityDelta) {
            setState((prev) => ({ ...prev, integrity: Math.min(100, prev.integrity + fx.blueBoost!.integrityDelta!) }))
          }
        }
      }

      if (llmSelection.provider === 'simulation') {
        window.setTimeout(() => {
          setChatTyping((current) => ({ ...current, [side]: false }))
          setChat((current) => ({
            ...current,
            [side]: [...current[side], {
              id: chatId.current++, side, role: 'assistant', provider: 'simulation', model: 'nexo-core', text: local.text, t: Date.now(),
            }].slice(-120),
          }))
          applyEffects()
        }, 450 + Math.random() * 550)
        return
      }

      chatControllers.current[side]?.abort()
      const controller = new AbortController()
      chatControllers.current[side] = controller
      const assistantId = chatId.current++
      setChat((current) => ({
        ...current,
        [side]: [...current[side], {
          id: assistantId,
          side,
          role: 'assistant',
          provider: llmSelection.provider,
          model: llmSelection.model,
          text: '',
          t: Date.now(),
        }].slice(-120),
      }))

      const active = side === 'red'
        ? agentsRef.current.find((agent) => agent.id === activeIdsRef.current.red)
        : agentsRef.current.find((agent) => agent.id === activeIdsRef.current.blue)
      const system = `${active?.systemPrompt || ''}\n\nESTADO AO VIVO DA ARENA:\nmodo=${state.mode}; status=${state.status}; rodada=${state.round}; integridade=${Math.round(state.integrity)}%; intensidade=${state.intensity}/10; placar vermelho=${state.score.red}, azul=${state.score.blue}.\nResponda em português do Brasil, como ${side === 'red' ? 'o agente VERMELHO' : 'o agente AZUL'}, de forma clara e útil. Não alegue ter executado ações que não foram confirmadas pela arena.`
      const messages = [...previous, userMsg].slice(-24).map((message) => ({
        role: message.role || (message.text.startsWith('»') ? 'user' as const : 'assistant' as const),
        content: message.text.startsWith('»') ? message.text.slice(2) : message.text,
      })).filter((message) => message.content.trim())

      void streamLlmChat({
        provider: llmSelection.provider,
        model: llmSelection.model || undefined,
        system,
        messages,
      }, {
        signal: controller.signal,
        onDelta: (delta) => setChat((current) => ({
          ...current,
          [side]: current[side].map((message) => message.id === assistantId ? { ...message, text: message.text + delta } : message),
        })),
      }).then((result) => {
        setChat((current) => ({
          ...current,
          [side]: current[side].map((message) => message.id === assistantId
            ? { ...message, provider: result.provider, model: result.model, durationMs: result.durationMs }
            : message),
        }))
        applyEffects()
      }).catch((error) => {
        const cancelled = error instanceof DOMException && error.name === 'AbortError'
        const message = cancelled ? 'resposta interrompida pelo operador' : error instanceof Error ? error.message : 'falha no provedor'
        setLlmError(message)
        setChat((current) => ({
          ...current,
          [side]: current[side].map((item) => item.id === assistantId
            ? { ...item, text: item.text || `[erro] ${message}`, error: !cancelled }
            : item),
        }))
      }).finally(() => {
        if (chatControllers.current[side] === controller) delete chatControllers.current[side]
        setChatTyping((current) => ({ ...current, [side]: false }))
      })
    },
    [llmSelection, state.mode, state.status, state.intensity, state.integrity, state.score, state.round, state.lastAction, state.redStance],
  )

  const stopChat = useCallback((side: ChatSide) => chatControllers.current[side]?.abort(), [])

  const clearChat = useCallback((side: ChatSide) => {
    chatControllers.current[side]?.abort()
    setChat((current) => ({ ...current, [side]: [] }))
    setChatTyping((current) => ({ ...current, [side]: false }))
  }, [])

  const selectLlmProvider = useCallback((provider: string) => {
    const selected = llmProviders.find((item) => item.id === provider)
    setLlmSelection({ provider, model: selected?.defaultModel || '' })
  }, [llmProviders])

  const selectLlmModel = useCallback((model: string) => {
    setLlmSelection((current) => ({ ...current, model }))
  }, [])

  // ============ exportar / importar configurações ============
  const exportConfig = useCallback(() => {
    const payload = {
      formato: 'nexo-lab-config',
      versao: 1,
      exportadoEm: new Date().toISOString(),
      agentes: agentsRef.current,
      ativos: activeIds,
      modo: state.mode,
      intensidade: state.intensity,
      posturaVermelho: state.redStance,
      instalacaoPermitida: installAllowedRef.current,
      placar: state.score,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nexo-lab-config-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [state.mode, state.intensity, state.redStance, state.score, activeIds])

  const importConfig = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      const rd = new FileReader()
      rd.onload = () => {
        try {
          const data = JSON.parse(String(rd.result))
          if (data.formato !== 'nexo-lab-config') return resolve('arquivo não é uma configuração NEXO Lab')
          if (Array.isArray(data.agentes)) persistAgents(data.agentes)
          if (data.ativos) setActiveIds(data.ativos)
          if (data.modo) setMode(data.modo)
          if (typeof data.intensidade === 'number') setIntensity(data.intensidade)
          if (data.posturaVermelho) setRedStance(data.posturaVermelho)
          if (typeof data.instalacaoPermitida === 'boolean') setInstallAllowed(data.instalacaoPermitida)
          resolve('configuração importada ✔')
        } catch {
          resolve('falha ao ler o arquivo — JSON inválido')
        }
      }
      rd.onerror = () => resolve('falha ao ler o arquivo')
      rd.readAsText(file)
    })
  }, [persistAgents, setMode, setIntensity, setRedStance])

  const explain = useCallback((raw: string): Explanation => explainCommand(raw), [])

  return {
    state, start, pause, reset, setMode, setIntensity, runCommand,
    chat, chatTyping, sendChat, stopChat, clearChat, setRedStance,
    llmProviders, llmModels, llmSelection, llmError, selectLlmProvider, selectLlmModel, refreshLlmProviders,
    agents, activeRed, activeBlue, activeIds, setActiveIds, addAgent, updateAgent, removeAgent,
    installAllowed, setInstallAllowed,
    exportConfig, importConfig, explain,
  }
}

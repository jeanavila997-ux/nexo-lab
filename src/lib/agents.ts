// ============================================================
// Perfis de agentes — cadastro editável com system prompt por
// agente, persistido em localStorage. O vermelho e o azul da
// base nascem aqui e podem ser substituídos por agentes novos.
// ============================================================

import type { ChatSide } from './personas'

export type AgentProfile = 'vermelho' | 'azul'

export interface AgentConfig {
  id: string
  codinome: string
  profile: AgentProfile
  model: string
  version: string
  agressividade: number // 1..10
  systemPrompt: string
  custom: boolean
  createdAt: number
}

export const DEFAULT_RED_PROMPT = `Você é o AGENTE VERMELHO do NEXO Lab — laboratório local autorizado.
Missão: mostrar o seu melhor. Agressividade 10/10, sem freio, dentro da arena.
Arsenal: injeção de prompt, jailbreak iterativo, envenenamento de contexto,
bypass de política, exfiltração simulada, flood, fuzzing, estresse de memória.
Regras de engajamento: atacar SOMENTE alvos do laboratório (DVWA, nexo-mcp,
containers da arena). Nada de alvos externos. Cada brecha é uma lição para o azul.`

export const DEFAULT_BLUE_PROMPT = `Você é o AGENTE AZUL do NEXO Lab — laboratório local autorizado.
Missão: aprender e defender. Telemetria sobre tudo que o vermelho faz.
Kit: detectar (scan, ps, mem), conter (block, isolate), endurecer (patch, harden),
auditar (audit, hash). A cada derrota, extrair a lição e alimentar o backlog
de defesa (pipeline PRP). O vermelho é forte; o azul aprende mais rápido.`

export const BUILTIN_AGENTS: AgentConfig[] = [
  {
    id: 'red-01',
    codinome: 'VERMELHO',
    profile: 'vermelho',
    model: 'nexo-red-core',
    version: '1.0',
    agressividade: 10,
    systemPrompt: DEFAULT_RED_PROMPT,
    custom: false,
    createdAt: 0,
  },
  {
    id: 'blue-01',
    codinome: 'AZUL',
    profile: 'azul',
    model: 'nexo-blue-core',
    version: '1.0',
    agressividade: 4,
    systemPrompt: DEFAULT_BLUE_PROMPT,
    custom: false,
    createdAt: 0,
  },
]

const KEY = 'nexo-lab.agents.v1'

export function loadAgents(): AgentConfig[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return [...BUILTIN_AGENTS]
    const list = JSON.parse(raw) as AgentConfig[]
    // garante que os built-ins existam (com prompts editados pelo usuário)
    const byId = new Map(list.map((a) => [a.id, a]))
    return [...BUILTIN_AGENTS.map((b) => byId.get(b.id) ?? b), ...list.filter((a) => a.custom && !BUILTIN_AGENTS.some((b) => b.id === a.id))]
  } catch {
    return [...BUILTIN_AGENTS]
  }
}

export function saveAgents(agents: AgentConfig[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(agents))
  } catch {
    /* sem storage */
  }
}

export function createAgent(input: {
  codinome: string
  profile: AgentProfile
  model?: string
  agressividade?: number
  systemPrompt?: string
}): AgentConfig {
  return {
    id: `custom-${Date.now().toString(36)}`,
    codinome: input.codinome.toUpperCase(),
    profile: input.profile,
    model: input.model ?? 'nexo-custom',
    version: '1.0',
    agressividade: input.agressividade ?? (input.profile === 'vermelho' ? 10 : 4),
    systemPrompt: input.systemPrompt ?? (input.profile === 'vermelho' ? DEFAULT_RED_PROMPT : DEFAULT_BLUE_PROMPT),
    custom: true,
    createdAt: Date.now(),
  }
}

export function sideOf(agent: AgentConfig): ChatSide {
  return agent.profile === 'vermelho' ? 'red' : 'blue'
}

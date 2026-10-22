// Ponte com o servidor Termux (server/servidor.mjs).
// Quando o site é servido por ele, os comandos do console
// executam DE VERDADE no Linux do Android. Sem servidor,
// retorna null e o frontend cai na simulação local.

export interface RealResult {
  ok: boolean
  cmd: string
  desc?: string
  output: string
}

let cached: { value: boolean; at: number } | null = null

export async function backendAvailable(): Promise<boolean> {
  if (cached && Date.now() - cached.at < 5_000) return cached.value
  try {
    const ctrl = new AbortController()
    const to = setTimeout(() => ctrl.abort(), 1500)
    const res = await fetch('/api/health', { signal: ctrl.signal })
    clearTimeout(to)
    cached = { value: res.ok, at: Date.now() }
  } catch {
    cached = { value: false, at: Date.now() }
  }
  return cached.value
}

export type LlmProviderStatus = 'ready' | 'missing' | 'missing_key' | 'offline' | 'error'

export interface LlmProvider {
  id: string
  label: string
  kind: 'builtin' | 'cli' | 'ollama' | 'openai'
  defaultModel: string
  hint: string
  available: boolean
  configured: boolean
  status: LlmProviderStatus
  detail: string
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmChatRequest {
  provider: string
  model?: string
  system?: string
  messages: LlmMessage[]
  temperature?: number
  maxTokens?: number
}

export interface LlmChatResult {
  text: string
  provider: string
  model: string
  durationMs: number
}

export interface SkillSearchResult {
  name: string
  owner: string
  repo: string
  installs: string
  package: string
  url: string
  installCommand: string
}

export interface InstalledSkill {
  name?: string
  skill?: string
  source?: string
  package?: string
  scope?: string
  [key: string]: unknown
}

async function skillRequest<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(`/api/skills${path}`, body ? {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  } : undefined)
  const data = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(data.error || `skills respondeu HTTP ${response.status}`)
  return data
}

export async function searchSkills(query: string): Promise<SkillSearchResult[]> {
  const data = await skillRequest<{ skills: SkillSearchResult[] }>('/search', { query })
  return data.skills
}

export async function installedSkills(): Promise<InstalledSkill[]> {
  const data = await skillRequest<{ skills: InstalledSkill[] }>('')
  return data.skills
}

export async function installProjectSkill(packageId: string): Promise<string> {
  const data = await skillRequest<{ output: string }>('/install', { package: packageId })
  return data.output
}

export async function uninstallProjectSkill(name: string): Promise<string> {
  const data = await skillRequest<{ output: string }>('/uninstall', { name })
  return data.output
}

export async function getLlmProviders(): Promise<LlmProvider[]> {
  const response = await fetch('/api/llm/providers')
  if (!response.ok) throw new Error(`gateway indisponível (HTTP ${response.status})`)
  const data = await response.json() as { providers?: LlmProvider[] }
  return data.providers ?? []
}

export async function getLlmModels(provider: string): Promise<string[]> {
  const response = await fetch(`/api/llm/models?provider=${encodeURIComponent(provider)}`)
  const data = await response.json() as { models?: string[]; error?: string }
  if (!response.ok) throw new Error(data.error || `falha ao listar modelos (HTTP ${response.status})`)
  return data.models ?? []
}

export async function streamLlmChat(
  request: LlmChatRequest,
  options: { signal?: AbortSignal; onDelta: (delta: string) => void },
): Promise<LlmChatResult> {
  const response = await fetch('/api/llm/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify(request),
    signal: options.signal,
  })
  if (!response.ok || !response.body) {
    let error = `gateway respondeu HTTP ${response.status}`
    try {
      const data = await response.json() as { error?: string }
      if (data.error) error = data.error
    } catch {
      // resposta sem JSON
    }
    throw new Error(error)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result: LlmChatResult | null = null
  let streamedText = ''

  const consume = (block: string) => {
    let event = 'message'
    let payload = ''
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      if (line.startsWith('data:')) payload += line.slice(5).trim()
    }
    if (!payload) return
    const data = JSON.parse(payload) as { delta?: string; error?: string } & Partial<LlmChatResult>
    if (event === 'delta' && data.delta) {
      streamedText += data.delta
      options.onDelta(data.delta)
    } else if (event === 'error') {
      throw new Error(data.error || 'erro desconhecido no provedor')
    } else if (event === 'done') {
      result = {
        text: streamedText || data.text || '',
        provider: data.provider || request.provider,
        model: data.model || request.model || '',
        durationMs: data.durationMs || 0,
      }
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split(/\r?\n\r?\n/)
    buffer = blocks.pop() || ''
    for (const block of blocks) consume(block)
  }
  buffer += decoder.decode()
  if (buffer.trim()) consume(buffer)
  if (!result) throw new Error('o provedor encerrou sem concluir a resposta')
  return result
}

export interface SpeedtestResult {
  ok: boolean
  error?: string
  cached?: boolean
  age_ms?: number
  ping_ms?: number | null
  jitter_ms?: number | null
  packet_loss?: number | null
  download_mbps?: number | null
  upload_mbps?: number | null
  isp?: string | null
  server?: { name?: string; location?: string; country?: string } | null
  interface?: { external_ip?: string; is_vpn?: boolean } | null
  result_url?: string | null
  timestamp?: string
}

export async function runSpeedtest(force = false): Promise<SpeedtestResult | null> {
  if (!(await backendAvailable())) return null
  try {
    // speedtest real pode levar até ~90s
    const ctrl = new AbortController()
    const to = setTimeout(() => ctrl.abort(), 95_000)
    const res = await fetch('/api/speedtest', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ force }),
      signal: ctrl.signal,
    })
    clearTimeout(to)
    if (!res.ok) return null
    return (await res.json()) as SpeedtestResult
  } catch {
    return null
  }
}

export async function execReal(cmd: string, args: string[] = [], allowInstall = false): Promise<RealResult | null> {
  if (!(await backendAvailable())) return null
  try {
    const ctrl = new AbortController()
    const to = setTimeout(() => ctrl.abort(), 250000)
    const res = await fetch('/api/exec', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cmd: [cmd, ...args].join(' '), allowInstall }),
      signal: ctrl.signal,
    })
    clearTimeout(to)
    if (!res.ok) return null
    return (await res.json()) as RealResult
  } catch {
    return null
  }
}

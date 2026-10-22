import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { delimiter, join } from 'node:path'

const PROJECT_ROOT = new URL('..', import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1')
const DEFAULT_TIMEOUT = 5 * 60_000
const MAX_MESSAGES = 80
const MAX_INPUT_CHARS = 120_000
const SAFE_MODEL = /^[\w./:@+-]{0,160}$/

const env = (name, fallback = '') => String(process.env[name] || fallback).trim()
const trimSlash = (value) => value.replace(/\/+$/, '')

export const PROVIDERS = Object.freeze({
  codex: {
    id: 'codex',
    label: 'Codex CLI',
    kind: 'cli',
    command: 'codex',
    hint: 'Usa a sessão autenticada do Codex CLI em sandbox somente leitura.',
  },
  hermes: {
    id: 'hermes',
    label: 'Hermes CLI',
    kind: 'cli',
    command: 'hermes',
    hint: 'Usa o provedor e a autenticação configurados no Hermes.',
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama',
    kind: 'ollama',
    baseUrl: trimSlash(env('OLLAMA_BASE_URL', 'http://127.0.0.1:11434')),
    defaultModel: env('OLLAMA_MODEL', 'qwen3.5:4b'),
    hint: 'Inferência local pela API nativa do Ollama.',
  },
  llamacpp: {
    id: 'llamacpp',
    label: 'llama.cpp',
    kind: 'openai',
    baseUrl: trimSlash(env('LLAMA_CPP_BASE_URL', 'http://127.0.0.1:8081/v1')),
    defaultModel: env('LLAMA_CPP_MODEL'),
    hint: 'Servidor llama.cpp compatível com OpenAI; padrão: porta 8081.',
  },
  gemini: {
    id: 'gemini',
    label: 'Gemini CLI',
    kind: 'cli',
    command: 'gemini',
    defaultModel: env('GEMINI_MODEL'),
    hint: 'Modo headless do Gemini CLI, sem aprovação automática de ferramentas.',
  },
  antigravity: {
    id: 'antigravity',
    label: 'Antigravity CLI',
    kind: 'cli',
    command: 'agy',
    defaultModel: env('ANTIGRAVITY_MODEL'),
    hint: 'Modo headless do Antigravity CLI com sandbox habilitado.',
  },
  '9router': {
    id: '9router',
    label: '9Router API',
    kind: 'openai',
    baseUrl: trimSlash(env('NINEROUTER_BASE_URL', env('9ROUTER_BASE_URL', 'http://127.0.0.1:20128/v1'))),
    apiKeyEnv: ['NINEROUTER_API_KEY', '9ROUTER_API_KEY'],
    defaultModel: env('NINEROUTER_MODEL', env('9ROUTER_MODEL')),
    hint: 'Gateway local OpenAI-compatible do 9Router.',
  },
  nvidia: {
    id: 'nvidia',
    label: 'NVIDIA API',
    kind: 'openai',
    baseUrl: trimSlash(env('NVIDIA_BASE_URL', 'https://integrate.api.nvidia.com/v1')),
    apiKeyEnv: ['NVIDIA_API_KEY', 'NVIDIA_NIM_API_KEY'],
    defaultModel: env('NVIDIA_MODEL'),
    requiresKey: true,
    hint: 'NVIDIA NIM/OpenAI-compatible; a chave permanece somente no servidor.',
  },
})

function firstKey(names = []) {
  for (const name of names) {
    const value = env(name)
    if (value) return value
  }
  return ''
}

function executableCandidates(command) {
  if (process.platform !== 'win32') return [command]
  return [`${command}.exe`, `${command}.cmd`, `${command}.com`, command]
}

export function findExecutable(command) {
  const pathEntries = String(process.env.PATH || '').split(delimiter).filter(Boolean)
  for (const name of executableCandidates(command)) {
    if (name.includes('/') || name.includes('\\')) {
      if (existsSync(name)) return name
      continue
    }
    for (const dir of pathEntries) {
      const candidate = join(dir.replace(/^"|"$/g, ''), name)
      if (existsSync(candidate)) return candidate
    }
  }
  return null
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 2_500) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const external = options.signal
  const abort = () => ctrl.abort()
  external?.addEventListener('abort', abort, { once: true })
  try {
    return await fetch(url, { ...options, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
    external?.removeEventListener('abort', abort)
  }
}

function authHeaders(provider) {
  const key = firstKey(provider.apiKeyEnv)
  return key ? { authorization: `Bearer ${key}` } : {}
}

export async function providerStatus(providerId) {
  const provider = PROVIDERS[providerId]
  if (!provider) throw new Error(`provedor desconhecido: ${providerId}`)

  if (provider.kind === 'cli') {
    const executable = findExecutable(provider.command)
    return {
      ...publicProvider(provider),
      available: Boolean(executable),
      configured: Boolean(executable),
      status: executable ? 'ready' : 'missing',
      detail: executable ? 'CLI encontrado no PATH' : `comando “${provider.command}” não encontrado`,
    }
  }

  if (provider.requiresKey && !firstKey(provider.apiKeyEnv)) {
    return {
      ...publicProvider(provider),
      available: false,
      configured: false,
      status: 'missing_key',
      detail: `configure ${provider.apiKeyEnv.join(' ou ')}`,
    }
  }

  const url = provider.kind === 'ollama' ? `${provider.baseUrl}/api/tags` : `${provider.baseUrl}/models`
  try {
    const response = await fetchWithTimeout(url, { headers: authHeaders(provider) })
    return {
      ...publicProvider(provider),
      available: response.ok,
      configured: true,
      status: response.ok ? 'ready' : 'error',
      detail: response.ok ? `conectado em ${provider.baseUrl}` : `endpoint respondeu HTTP ${response.status}`,
    }
  } catch (error) {
    return {
      ...publicProvider(provider),
      available: false,
      configured: !provider.requiresKey || Boolean(firstKey(provider.apiKeyEnv)),
      status: 'offline',
      detail: error?.name === 'AbortError' ? 'tempo de conexão esgotado' : 'serviço não respondeu',
    }
  }
}

function publicProvider(provider) {
  return {
    id: provider.id,
    label: provider.label,
    kind: provider.kind,
    defaultModel: provider.defaultModel || '',
    hint: provider.hint,
  }
}

export async function listProviderStatuses() {
  return Promise.all(Object.keys(PROVIDERS).map((id) => providerStatus(id)))
}

export async function listModels(providerId) {
  const provider = PROVIDERS[providerId]
  if (!provider) throw new Error(`provedor desconhecido: ${providerId}`)
  if (provider.kind === 'cli') {
    return provider.defaultModel ? [provider.defaultModel] : []
  }
  if (provider.requiresKey && !firstKey(provider.apiKeyEnv)) return []

  const url = provider.kind === 'ollama' ? `${provider.baseUrl}/api/tags` : `${provider.baseUrl}/models`
  const response = await fetchWithTimeout(url, { headers: authHeaders(provider) }, 8_000)
  if (!response.ok) throw new Error(`falha ao listar modelos: HTTP ${response.status}`)
  const data = await response.json()
  const models = provider.kind === 'ollama'
    ? (data.models || []).map((item) => item.name || item.model)
    : (data.data || []).map((item) => item.id)
  return [...new Set(models.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

function normalizeRequest(input) {
  const provider = PROVIDERS[String(input?.provider || '')]
  if (!provider) throw new Error('provedor inválido')
  const model = String(input?.model || provider.defaultModel || '').trim()
  if (!SAFE_MODEL.test(model)) throw new Error('identificador de modelo inválido')

  const messages = Array.isArray(input?.messages) ? input.messages.slice(-MAX_MESSAGES) : []
  const clean = messages.map((message) => ({
    role: ['system', 'user', 'assistant'].includes(message?.role) ? message.role : 'user',
    content: String(message?.content || '').slice(0, 24_000),
  })).filter((message) => message.content.trim())
  const system = String(input?.system || '').slice(0, 24_000)
  const charCount = system.length + clean.reduce((sum, message) => sum + message.content.length, 0)
  if (!clean.length) throw new Error('a conversa está vazia')
  if (charCount > MAX_INPUT_CHARS) throw new Error('contexto excede o limite de 120 mil caracteres')
  if ((provider.kind === 'ollama' || provider.kind === 'openai') && !model) {
    throw new Error(`selecione um modelo para ${provider.label}`)
  }

  return {
    provider,
    model,
    messages: system ? [{ role: 'system', content: system }, ...clean] : clean,
    temperature: Number.isFinite(input?.temperature) ? Math.max(0, Math.min(2, input.temperature)) : 0.6,
    maxTokens: Number.isFinite(input?.maxTokens) ? Math.max(64, Math.min(16_384, input.maxTokens)) : 2_048,
  }
}

function transcript(messages) {
  return messages.map((message) => `${message.role.toUpperCase()}:\n${message.content}`).join('\n\n') + '\n\nASSISTANT:\n'
}

async function streamLines(readable, onLine) {
  if (!readable) return
  const reader = readable.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() || ''
    for (const line of lines) await onLine(line)
  }
  buffer += decoder.decode()
  if (buffer) await onLine(buffer)
}

async function streamOpenAI(request, onDelta, signal) {
  const { provider, model, messages, temperature, maxTokens } = request
  const response = await fetchWithTimeout(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream', ...authHeaders(provider) },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, stream: true }),
    signal,
  }, DEFAULT_TIMEOUT)
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1_500)
    throw new Error(`${provider.label} respondeu HTTP ${response.status}${detail ? `: ${detail}` : ''}`)
  }

  let output = ''
  await streamLines(response.body, (line) => {
    if (!line.startsWith('data:')) return
    const raw = line.slice(5).trim()
    if (!raw || raw === '[DONE]') return
    try {
      const data = JSON.parse(raw)
      const content = data.choices?.[0]?.delta?.content ?? data.choices?.[0]?.message?.content ?? ''
      const delta = Array.isArray(content)
        ? content.map((part) => typeof part === 'string' ? part : part?.text || '').join('')
        : String(content || '')
      if (delta) {
        output += delta
        onDelta(delta)
      }
    } catch {
      // Eventos auxiliares do provedor são ignorados; nunca enviamos a chave ao cliente.
    }
  })
  return output
}

async function streamOllama(request, onDelta, signal) {
  const { provider, model, messages, temperature, maxTokens } = request
  const response = await fetchWithTimeout(`${provider.baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true, options: { temperature, num_predict: maxTokens } }),
    signal,
  }, DEFAULT_TIMEOUT)
  if (!response.ok) throw new Error(`Ollama respondeu HTTP ${response.status}: ${(await response.text()).slice(0, 1_000)}`)

  let output = ''
  await streamLines(response.body, (line) => {
    if (!line.trim()) return
    const data = JSON.parse(line)
    if (data.error) throw new Error(String(data.error))
    const delta = String(data.message?.content || data.response || '')
    if (delta) {
      output += delta
      onDelta(delta)
    }
  })
  return output
}

function cliSpec(request) {
  const prompt = transcript(request.messages)
  const modelArgs = request.model ? ['--model', request.model] : []
  switch (request.provider.id) {
    case 'codex':
      return {
        args: ['exec', '--json', '--ephemeral', '--sandbox', 'read-only', '--skip-git-repo-check', ...modelArgs, '-'],
        stdin: prompt,
        format: 'codex-jsonl',
      }
    case 'hermes':
      return {
        args: ['chat', '--query-file', '-', '--oneshot', '--quiet', '--format', 'text', '--source', 'tool', '--max-turns', '1', ...modelArgs],
        stdin: prompt,
        format: 'text',
      }
    case 'gemini':
      return {
        args: ['--output-format', 'text', '--approval-mode', 'plan', ...modelArgs],
        stdin: prompt,
        format: 'text',
      }
    case 'antigravity':
      return {
        args: ['-p', prompt.slice(0, 28_000), '--output-format', 'text', '--sandbox', ...modelArgs],
        stdin: '',
        format: 'text',
      }
    default:
      throw new Error(`CLI não suportado: ${request.provider.id}`)
  }
}

function stripAnsi(value) {
  return value.replace(/[\u001B\u009B][[\]()#;?]*(?:(?:(?:;[-a-zA-Z\d/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d/#&.:=?%@~_]*)*)?\u0007|(?:(?:\d{1,4}(?:[;:]\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g, '')
}

async function streamCli(request, onDelta, signal) {
  const executable = findExecutable(request.provider.command)
  if (!executable) throw new Error(`comando “${request.provider.command}” não encontrado no PATH`)
  const spec = cliSpec(request)
  const usesCmdShim = process.platform === 'win32' && executable.toLowerCase().endsWith('.cmd')
  const child = spawn(executable, spec.args, {
    cwd: PROJECT_ROOT,
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
    windowsHide: true,
    shell: usesCmdShim,
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  const stop = () => child.kill()
  signal?.addEventListener('abort', stop, { once: true })
  const timer = setTimeout(stop, DEFAULT_TIMEOUT)
  let stderr = ''
  let output = ''
  let lineBuffer = ''

  child.stderr.on('data', (chunk) => {
    stderr = (stderr + stripAnsi(chunk.toString())).slice(-4_000)
  })

  const finished = new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(stderr.trim() || `${request.provider.label} encerrou com código ${code}`)))
  })

  child.stdout.on('data', (chunk) => {
    const text = stripAnsi(chunk.toString())
    if (spec.format === 'text') {
      output += text
      onDelta(text)
      return
    }
    lineBuffer += text
    const lines = lineBuffer.split(/\r?\n/)
    lineBuffer = lines.pop() || ''
    for (const line of lines) {
      try {
        const event = JSON.parse(line)
        const item = event.item || event.data?.item
        if ((event.type === 'item.completed' || event.type === 'item.updated') && item?.type === 'agent_message') {
          const value = String(item.text || item.content || '')
          if (value && !output.endsWith(value)) {
            output += value
            onDelta(value)
          }
        }
      } catch {
        // O stdout do Codex também pode conter avisos; somente eventos JSON válidos viram resposta.
      }
    }
  })

  if (spec.stdin) child.stdin.end(spec.stdin)
  else child.stdin.end()

  try {
    await finished
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', stop)
  }
  if (!output.trim()) throw new Error(stderr.trim() || `${request.provider.label} não retornou texto`)
  return output
}

export async function streamChat(input, { onDelta = () => {}, signal } = {}) {
  const request = normalizeRequest(input)
  const startedAt = Date.now()
  let text
  if (request.provider.kind === 'ollama') text = await streamOllama(request, onDelta, signal)
  else if (request.provider.kind === 'openai') text = await streamOpenAI(request, onDelta, signal)
  else text = await streamCli(request, onDelta, signal)
  return {
    text,
    provider: request.provider.id,
    model: request.model,
    durationMs: Date.now() - startedAt,
  }
}

export async function chatOnce(input, { signal } = {}) {
  let text = ''
  const result = await streamChat(input, { signal, onDelta: (delta) => { text += delta } })
  return { ...result, text: text || result.text }
}

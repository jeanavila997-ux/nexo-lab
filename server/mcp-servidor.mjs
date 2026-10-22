#!/usr/bin/env node
// NEXO Lab MCP — transporte stdio JSON-RPC, sem dependências externas.
// Expõe o mesmo gateway de LLMs usado pela interface web.

import readline from 'node:readline'
import { chatOnce, listModels, listProviderStatuses, PROVIDERS } from './llm-gateway.mjs'

const PROTOCOL_VERSION = '2025-06-18'

const tools = [
  {
    name: 'nexo_providers',
    description: 'Lista provedores LLM do NEXO Lab e informa se cada CLI/API está pronta, offline ou sem credencial.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'nexo_models',
    description: 'Lista os modelos disponíveis em um provedor conectado.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: Object.keys(PROVIDERS) },
      },
      required: ['provider'],
      additionalProperties: false,
    },
  },
  {
    name: 'nexo_chat',
    description: 'Envia uma conversa a Codex CLI, Hermes CLI, Ollama, llama.cpp, Gemini CLI, Antigravity, 9Router ou NVIDIA.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: Object.keys(PROVIDERS) },
        model: { type: 'string', description: 'Modelo opcional para CLIs e obrigatório para APIs sem modelo padrão.' },
        system: { type: 'string', description: 'Instrução de sistema opcional.' },
        prompt: { type: 'string', description: 'Mensagem do usuário.' },
        temperature: { type: 'number', minimum: 0, maximum: 2 },
        maxTokens: { type: 'integer', minimum: 64, maximum: 16384 },
      },
      required: ['provider', 'prompt'],
      additionalProperties: false,
    },
  },
]

function resultText(value, isError = false) {
  return {
    content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
    ...(isError ? { isError: true } : {}),
  }
}

async function callTool(name, args = {}) {
  if (name === 'nexo_providers') return resultText(await listProviderStatuses())
  if (name === 'nexo_models') return resultText({ provider: args.provider, models: await listModels(args.provider) })
  if (name === 'nexo_chat') {
    const response = await chatOnce({
      provider: args.provider,
      model: args.model,
      system: args.system,
      messages: [{ role: 'user', content: args.prompt }],
      temperature: args.temperature,
      maxTokens: args.maxTokens,
    })
    return resultText(response)
  }
  throw new Error(`ferramenta desconhecida: ${name}`)
}

async function handle(message) {
  const { id, method, params } = message
  if (method === 'notifications/initialized' || method === 'notifications/cancelled') return null
  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: params?.protocolVersion || PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'nexo-lab', version: '1.5.0' },
        instructions: 'Gateway local de LLMs do NEXO Lab. Use nexo_providers antes de escolher um provedor.',
      },
    }
  }
  if (method === 'ping') return { jsonrpc: '2.0', id, result: {} }
  if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools } }
  if (method === 'tools/call') {
    try {
      return { jsonrpc: '2.0', id, result: await callTool(params?.name, params?.arguments) }
    } catch (error) {
      return { jsonrpc: '2.0', id, result: resultText(error?.message || String(error), true) }
    }
  }
  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `método não suportado: ${method}` },
  }
}

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity })
input.on('line', async (line) => {
  if (!line.trim()) return
  let message
  try {
    message = JSON.parse(line)
  } catch {
    process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido' } })}\n`)
    return
  }
  try {
    const response = await handle(message)
    if (response) process.stdout.write(`${JSON.stringify(response)}\n`)
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: message.id ?? null, error: { code: -32603, message: error?.message || String(error) } })}\n`)
  }
})

process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))

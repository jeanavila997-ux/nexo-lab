// Teste de chamada ao Ollama Cloud pelo gateway do nexo-lab.
// Roda com: node --env-file=.env scripts/teste-ollama-cloud.mjs
import { chatOnce } from '../server/llm-gateway.mjs'

if (!process.env.OLLAMA_API_KEY) {
  console.error('OLLAMA_API_KEY nao esta definida. Preencha no arquivo .env (https://ollama.com/settings/keys).')
  process.exit(1)
}

const result = await chatOnce({
  provider: 'ollama-cloud',
  model: 'glm-5.3-flash',
  messages: [{ role: 'user', content: 'Responda em portugues, em uma frase: o que e o Ollama Cloud?' }],
  maxTokens: 200,
  temperature: 0.3,
})

console.log(`provider: ${result.provider}`)
console.log(`model:    ${result.model}`)
console.log(`duracao:  ${result.durationMs} ms`)
console.log('--- resposta ---')
console.log(result.text)

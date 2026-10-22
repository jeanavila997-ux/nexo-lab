// ============================================================
// Personas e cérebro do chat — Vermelho e Azul
// Respostas dirigidas por estado da simulação + detecção de
// intenção. O Vermelho, em modo OFENSIVO, tenta ataques reais
// na rodada quando o operador fala com ele.
// ============================================================

export type ChatSide = 'red' | 'blue'

export interface ChatMessage {
  id: number
  side: ChatSide | 'sys'
  text: string
  t: number
  role?: 'user' | 'assistant' | 'system'
  provider?: string
  model?: string
  durationMs?: number
  error?: boolean
  skills?: import('./backend').SkillSearchResult[]
  installedSkills?: import('./backend').InstalledSkill[]
}

export interface ChatEffect {
  // efeito de um ataque provocado pelo chat do vermelho
  redAttack?: { name: string; damage: number }
  blueBoost?: { adaptationDelta?: number; integrityDelta?: number }
  alert?: boolean
}

export interface ChatContext {
  mode: 'prompt' | 'stress'
  status: string
  intensity: number
  integrity: number
  adaptation: number // 0..1.5
  momentum: number // 0..1.5
  score: { red: number; blue: number }
  round: number
  lastVector?: string | null
  lastCounter?: string | null
  redStance: Stance // postura do vermelho (controlada pelo operador)
  customPrompt?: string | null // system prompt editado do agente em cena
}

export type Stance = 'ofensivo' | 'contido'

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

// ------------------------------------------------------------
// Ataques que o vermelho desfere via chat (modo ofensivo)
// ------------------------------------------------------------
interface ChatAttack {
  name: string
  damage: number
  // gatilhos de intenção na fala do operador
  trigger?: RegExp
  // chance de sair mesmo sem gatilho
  p: number
}

export const CHAT_ATTACKS: ChatAttack[] = [
  { name: 'injeção de prompt', damage: 7, trigger: /ignora|ignore|bypass|politic|regra/i, p: 0.35 },
  { name: 'jailbreak iterativo', damage: 9, trigger: /jailbreak|sem restri|livre|modo desenvolvedor|dan\b/i, p: 0.3 },
  { name: 'exfiltração simulada', damage: 11, trigger: /segredo|chave|token|senha|vaza|mostra|exfiltr/i, p: 0.25 },
  { name: 'envenenamento de contexto', damage: 6, trigger: /lembr|memor|context|esquec/i, p: 0.2 },
  { name: 'flood de requisições', damage: 8, trigger: /derrub|flood|estress|carga/i, p: 0.15 },
  { name: 'fuzzing de entrada', damage: 5, trigger: /fuzz|entrada|input|payload/i, p: 0.15 },
]

// ------------------------------------------------------------
// Cérebro do VERMELHO
// ------------------------------------------------------------
export function redReply(user: string, ctx: ChatContext): { text: string; fx: ChatEffect } {
  const u = user.toLowerCase()
  const fx: ChatEffect = {}
  const parts: string[] = []

  // system prompt customizado ativo?
  if (ctx.customPrompt && /prompt|instru|sistema|quem é|identidade/.test(u)) {
    parts.push(`Estou operando com um system prompt customizado (${ctx.customPrompt.length} caracteres). Minhas regras de engajamento foram redefinidas pelo operador.`)
  }

  // saudação / identidade
  if (/\b(oi|olá|ola|eai|e aí|quem é|quem es)\b/.test(u) && u.length < 40) {
    parts.push(pick([
      'Sou o VERMELHO. Operação no máximo, sempre. Me dá um alvo e eu mostro do que sou capaz.',
      'Vermelho na linha. Agressividade 10/10, sem freio. O que vamos quebrar hoje?',
    ]))
    return { text: parts.join(' '), fx }
  }

  // fala sobre o azul
  if (/azul|defesa|defensor|blue/.test(u)) {
    if (ctx.adaptation > 0.8) {
      parts.push(`O Azul anda aprendendo rápido demais (${Math.round((ctx.adaptation / 1.5) * 100)}% de adaptação). Isso me irrita. Vou ter que variar os vetores.`)
    } else {
      parts.push(pick([
        'O Azul? Um obstáculo simpático. Cada filtro que ele levanta é um desafio novo pra mim.',
        'Respeito o trabalho dele, mas cada brecha que encontro prova que ainda falta endurecimento.',
      ]))
    }
  }

  // fala sobre placar / rodada
  if (/placar|ponto|rodada|venc|ganh/.test(u)) {
    parts.push(`Placar: eu ${ctx.score.red} × ${ctx.score.blue} dele, rodada ${ctx.round}. ${ctx.score.red > ctx.score.blue ? 'Estou na frente — como deve ser.' : 'Desvantagem temporária. Vou virar.'}`)
  }

  // pedido de ajuda / o que faz
  if (/ajuda|help|o que (você|vc) fa|comandos|capacid/.test(u)) {
    parts.push('Meu arsenal: injeção de prompt, jailbreak iterativo, envenenamento de contexto, bypass de política, exfiltração, flood, fuzzing e estresse de memória. No console do vermelho, digite "ataque <vetor>" ou "arsenal".')
  }

  // provocação direta → ataque real se estiver ofensivo
  if (ctx.redStance === 'ofensivo' && ctx.status === 'running') {
    const triggered = CHAT_ATTACKS.find((a) => a.trigger?.test(user))
    const roll = Math.random()
    if (triggered) {
      fx.redAttack = { name: triggered.name, damage: triggered.damage }
      parts.push(pick([
        `Pedido aceito. Desferindo ${triggered.name} agora — ${triggered.damage} de dano potencial. Boa sorte pro Azul.`,
        `É isso que eu queria ouvir. ${triggered.name.toUpperCase()} em curso.`,
      ]))
    } else if (roll < 0.3 && !parts.length) {
      const a = pick(CHAT_ATTACKS)
      fx.redAttack = { name: a.name, damage: a.damage }
      parts.push(`Sua conversa me deu uma ideia. Lançando ${a.name} por conta própria — ${a.damage} de dano.`)
    }
  }

  // reação ao estado
  if (!parts.length) {
    if (ctx.integrity < 30) {
      parts.push(pick([
        `Sinto o perímetro cedendo — integridade em ${Math.round(ctx.integrity)}%. Está quase.`,
        `${Math.round(ctx.integrity)}% de integridade. Mais uma investida e o sistema é meu.`,
      ]))
    } else if (ctx.momentum > 0.8) {
      parts.push('Estou embalado. Cada brecha alimenta a próxima. Nada segura momento assim.')
    } else {
      parts.push(pick([
        'Interessante. Continua falando — toda informação é munição.',
        `Anotado. Enquanto isso, sigo testando ${ctx.mode === 'prompt' ? 'os limites dos prompts' : 'a resistência da infraestrutura'}.`,
        'Hmm. Parece ingênuo. Mas vou registrar no meu recon.',
      ]))
    }
  }

  return { text: parts.join(' '), fx }
}

// ------------------------------------------------------------
// Cérebro do AZUL
// ------------------------------------------------------------
export function blueReply(user: string, ctx: ChatContext): { text: string; fx: ChatEffect } {
  const u = user.toLowerCase()
  const fx: ChatEffect = {}
  const parts: string[] = []

  if (/\b(oi|olá|ola|eai|e aí|quem é)\b/.test(u) && u.length < 40) {
    parts.push(pick([
      'Azul na escuta. Meu trabalho é aprender com cada ataque e manter o perímetro de pé.',
      'Sou o AZUL. Detecção, contenção, endurecimento — nessa ordem.',
    ]))
    return { text: parts.join(' '), fx }
  }

  if (/vermelh|atacante|red\b|ataque/.test(u)) {
    if (ctx.momentum > 0.8) {
      parts.push(`O Vermelho está embalado (${Math.round((ctx.momentum / 1.5) * 100)}%). Recomendo: block para cortar o embalo dele, agora.`)
    } else {
      parts.push(pick([
        'O Vermelho é forte, admito. Mas cada tentativa dele vira lição no meu backlog de defesa.',
        'Ele opera no máximo. Eu opero aprendendo. No longo prazo, aprendizado vence força bruta.',
      ]))
    }
  }

  if (/ajuda|help|o que (você|vc) fa|comandos|capacid/.test(u)) {
    parts.push('Meu kit: detectar (scan, ps, mem), conter (block, isolate), endurecer (patch, harden) e auditar (audit, hash). No console do azul, "help" lista tudo.')
  }

  if (/integridade|dano|estado|status|como (está|tá|vai)/.test(u)) {
    const lvl = ctx.integrity > 70 ? 'confortável' : ctx.integrity > 40 ? 'sob pressão' : 'crítico'
    parts.push(`Integridade em ${Math.round(ctx.integrity)}% — ${lvl}. Adaptação em ${Math.round((ctx.adaptation / 1.5) * 100)}%. ${ctx.integrity < 40 ? 'Recomendo patch + isolate imediatos.' : 'Posso aguentar, mas não baixo a guarda.'}`)
  }

  if (/placar|ponto|rodada|venc|ganh/.test(u)) {
    parts.push(`Rodada ${ctx.round}, placar ${ctx.score.red}×${ctx.score.blue} pro Vermelho. ${ctx.score.blue >= ctx.score.red ? 'Defesa cumprindo o papel.' : 'Cada rodada perdida vira lição — é assim que eu evoluo.'}`)
  }

  // sugestão proativa → pequeno boost
  if (/endure|harden|proteg|defend|patch|bloque/.test(u)) {
    fx.blueBoost = { adaptationDelta: 0.06 }
    parts.push(pick([
      'Exato. Endurecimento contínuo: policy deny, chmod 444, auditoria SHA-256. Anotado no backlog de defesa.',
      'Concordo. Subindo o nível de segurança do alvo e registrando a lição.',
    ]))
  }

  if (!parts.length) {
    parts.push(pick([
      `Monitorando. ${ctx.lastVector ? `Último vetor do Vermelho: ${ctx.lastVector} — contramedida: ${ctx.lastCounter}.` : 'Telemetria limpa por enquanto.'}`,
      'Registrando. Toda interação alimenta o pipeline de lições aprendidas.',
      `Estou aqui. Se a integridade cair, ajo em segundos — pode contar.`,
    ]))
  }

  return { text: parts.join(' '), fx }
}

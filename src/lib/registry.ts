// ============================================================
// Registro central de comandos do NEXO CORE (terminal)
// Fonte única da verdade: help, man e o parser consultam ESTA
// lista — nada é hardcoded em outro lugar.
// ============================================================

export type Category = 'nucleo' | 'diagnostico' | 'rede' | 'defesa' | 'ofensiva' | 'pacotes' | 'utilidades' | 'nexo'

export type OutputMode = 'texto' | 'tabela' | 'real'

export interface CommandDef {
  name: string
  aliases: string[]
  category: Category
  description: string
  usage: string
  examples: string[]
  permissions: 'user' | 'admin'
  danger: boolean
  requires_confirmation: boolean
  output: OutputMode
  // 'sim' = handler simulado no frontend · 'real:<bin>' = whitelist Termux
  // 'special' = tratado pelo próprio console (help, clear…)
  handler: string
  // saída simulada (handler 'sim')
  sim?: string[] | ((args: string[], cwd?: string) => string[])
}

export const CATEGORY_LABEL: Record<Category, string> = {
  nucleo: 'núcleo',
  diagnostico: 'diagnóstico',
  rede: 'rede',
  defesa: 'defesa',
  ofensiva: 'ofensiva',
  pacotes: 'pacotes',
  utilidades: 'utilidades',
  nexo: 'nexo core',
}

const c = (def: Omit<CommandDef, 'aliases' | 'permissions' | 'danger' | 'requires_confirmation' | 'output'> &
  Partial<CommandDef>): CommandDef => ({
  aliases: [],
  permissions: 'user',
  danger: false,
  requires_confirmation: false,
  output: 'texto',
  ...def,
})

export const REGISTRY: CommandDef[] = [
  // ─────────── núcleo ───────────
  c({ name: 'help', category: 'nucleo', description: 'Lista comandos ou detalha um comando.', usage: 'help [comando]', examples: ['help', 'help ps'], handler: 'special' }),
  c({ name: 'clear', category: 'nucleo', description: 'Limpa a tela.', usage: 'clear', examples: ['clear'], handler: 'special' }),
  c({ name: 'version', aliases: ['ver'], category: 'nucleo', description: 'Mostra versão do NEXO CORE.', usage: 'version', examples: ['version'], handler: 'sim', sim: ['NEXO CORE v1.4.0 (lab-01) · runtime Termux/Android · build estável'] }),
  c({ name: 'about', category: 'nucleo', description: 'Informações do laboratório.', usage: 'about', examples: ['about'], handler: 'sim', sim: ['NEXO CORE — laboratório local de segurança Red×Blue', 'base: nexo-core · MCP-first · gate determinístico · auditoria SHA-256', 'simulação 100% local — nenhum sistema real é afetado'] }),
  c({ name: 'echo', category: 'nucleo', description: 'Repete o texto.', usage: 'echo [texto]', examples: ['echo hello'], handler: 'sim', sim: (args) => [args.join(' ') || ''] }),
  c({ name: 'date', category: 'nucleo', description: 'Data e hora atuais.', usage: 'date', examples: ['date'], handler: 'sim', sim: () => [new Date().toLocaleString('pt-BR')] }),
  c({ name: 'history', category: 'nucleo', description: 'Histórico de comandos da sessão.', usage: 'history', examples: ['history'], handler: 'special' }),
  c({ name: 'pwd', category: 'nucleo', description: 'Diretório atual.', usage: 'pwd', examples: ['pwd'], handler: 'special' }),
  c({ name: 'ls', category: 'nucleo', description: 'Lista arquivos (real no Termux).', usage: 'ls [dir]', examples: ['ls', 'ls data/'], handler: 'real:ls', output: 'real', sim: (_args, cwd) => [`total 6  (${cwd ?? '/home/nexo'})`, 'drwxr-xr-x  data/         catalog  logs  policy.json  skills/', '-rw-r--r--  policy.json  188 bytes  mode 444', '-rw-------  audit.jsonl  12.4 KB  sha256 ok', '-rwxr-xr-x  nexo.mjs     31 KB'] }),
  c({ name: 'cd', category: 'nucleo', description: 'Muda de diretório.', usage: 'cd [dir]', examples: ['cd data', 'cd ..'], handler: 'special' }),
  c({ name: 'cat', category: 'nucleo', description: 'Exibe conteúdo de arquivo (real no Termux, somente leitura).', usage: 'cat [arquivo]', examples: ['cat policy.json'], handler: 'real:cat', output: 'real', sim: (args) => args[0] === 'policy.json' ? ['{', '  "destructive": "deny",', '  "shell_mode": "catalog_only",', '  "timeout_ms": 60000', '}'] : [`cat: ${args[0] ?? ''}: arquivo ou diretório inexistente (simulado)`] }),
  c({ name: 'which', category: 'nucleo', description: 'Caminho do executável (real no Termux).', usage: 'which [comando]', examples: ['which node'], handler: 'real:which', output: 'real', sim: (args) => [`/data/data/com.termux/files/usr/bin/${args[0] ?? ''}  (simulado)`] }),
  c({ name: 'man', category: 'nucleo', description: 'Manual do comando (alias de help [cmd]).', usage: 'man [comando]', examples: ['man block'], handler: 'special' }),
  c({ name: 'explain', aliases: ['explica'], category: 'nucleo', description: 'Explica anatomia e risco de um comando.', usage: 'explain <comando>', examples: ['explain rm -rf /tmp/x', 'explain iptables -A INPUT -j DROP'], handler: 'special' }),
  c({ name: 'instalar', aliases: ['inst'], category: 'nucleo', description: 'Instala linguagens/bibliotecas (pkg/pip/npm) — exige chave INSTALAR.', usage: 'instalar [linguagem|pip|npm] <pacote>', examples: ['instalar linguagem python', 'instalar pip requests', 'instalar npm tsx'], handler: 'special' }),
  c({ name: 'exit', category: 'nucleo', description: 'Encerra a sessão do console.', usage: 'exit', examples: ['exit'], handler: 'special' }),

  // ─────────── diagnóstico (REAL no Termux, simulado no navegador) ───────────
  c({ name: 'scan', category: 'diagnostico', description: 'Conexões e portas abertas.', usage: 'scan', examples: ['scan'], handler: 'real:scan', output: 'real', sim: ['Netid  State    Local Address:Port', 'tcp    LISTEN   127.0.0.1:8787        nexo-mcp', 'tcp    LISTEN   127.0.0.1:8080        nexo-lab', '(simulado — no Termux executa ss -tulpn de verdade)'] }),
  c({ name: 'net', category: 'diagnostico', description: 'Interfaces de rede.', usage: 'net', examples: ['net'], handler: 'real:net', output: 'real', sim: ['wlan0: UP 192.168.0.42/24', 'lo: UP 127.0.0.1/8', '(simulado — no Termux executa ip addr show)'] }),
  c({ name: 'route', category: 'diagnostico', description: 'Tabela de rotas.', usage: 'route', examples: ['route'], handler: 'real:route', output: 'real', sim: ['default via 192.168.0.1 dev wlan0', '192.168.0.0/24 dev wlan0 proto kernel scope link', '(simulado)'] }),
  c({ name: 'status', category: 'diagnostico', description: 'Tempo ligado e carga do sistema.', usage: 'status', examples: ['status'], handler: 'real:status', output: 'real', sim: [' 12:04:33 up 2 days, 3:12, load average: 1.42, 1.18, 0.96', '(simulado — no Termux executa uptime)'] }),
  c({ name: 'mem', category: 'diagnostico', description: 'Uso de memória.', usage: 'mem', examples: ['mem'], handler: 'real:mem', output: 'real', sim: ['               total    used    free', 'Mem:           5.6Gi   3.1Gi   1.4Gi', 'Swap:          2.0Gi   512Mi   1.5Gi', '(simulado)'] }),
  c({ name: 'ps', aliases: ['proc'], category: 'diagnostico', description: 'Processos em execução.', usage: 'ps', examples: ['ps'], handler: 'real:ps', output: 'real', sim: ['USER       PID  %CPU COMMAND', 'u0_a310  13371   2.1 node server/servidor.mjs', 'u0_a310  14002   0.4 ollama serve', '(simulado)'] }),
  c({ name: 'disk', aliases: ['df'], category: 'diagnostico', description: 'Uso de disco.', usage: 'disk', examples: ['disk'], handler: 'real:disk', output: 'real', sim: ['Filesystem      Size  Used Avail Use% Mounted', '/data           110G   62G   48G  57% /data', '(simulado)'] }),
  c({ name: 'sys', aliases: ['uname'], category: 'diagnostico', description: 'Kernel e plataforma.', usage: 'sys', examples: ['sys'], handler: 'real:sys', output: 'real', sim: ['Linux localhost 5.10.209-android13 #1 SMP aarch64 Android (simulado)'] }),
  c({ name: 'whoami', category: 'diagnostico', description: 'Usuário da sessão.', usage: 'whoami', examples: ['whoami'], handler: 'real:whoami', output: 'real', sim: ['u0_a310 (simulado)'] }),
  c({ name: 'id', category: 'diagnostico', description: 'UID, GID e grupos.', usage: 'id', examples: ['id'], handler: 'real:id', output: 'real', sim: ['uid=10310(u0_a310) gid=10310(u0_a310) groups=3003(inet),9997(everybody) (simulado)'] }),
  c({ name: 'cpu', category: 'diagnostico', description: 'Contadores de CPU.', usage: 'cpu', examples: ['cpu'], handler: 'real:cpu', output: 'real', sim: ['cpu  482101 12044 219332 8841203 (simulado)'] }),
  c({ name: 'battery', category: 'diagnostico', description: 'Bateria do dispositivo (Termux:API).', usage: 'battery', examples: ['battery'], handler: 'real:battery', output: 'real', sim: ['{"percentage": 78, "status": "DISCHARGING"} (simulado)'] }),
  c({ name: 'log', category: 'diagnostico', description: 'Logs do laboratório.', usage: 'log', examples: ['log'], handler: 'sim', sim: ['T+00:01:12 · BLUE segurou flood de requisições', 'T+00:01:13 · RED rompeu filtro semântico — dano 3.1', 'T+00:01:14 · auditoria SHA-256 verificada'] }),

  // ─────────── rede ───────────
  c({ name: 'ping', category: 'rede', description: 'Testa conectividade (real no Termux).', usage: 'ping [host]', examples: ['ping 8.8.8.8'], handler: 'real:ping', output: 'real', sim: (args) => { const h = args[0] ?? '127.0.0.1'; return [`PING ${h}: 56 bytes de dados`, `64 bytes de ${h}: icmp_seq=1 ttl=117 tempo=12.4 ms`, `64 bytes de ${h}: icmp_seq=2 ttl=117 tempo=11.9 ms`, `64 bytes de ${h}: icmp_seq=3 ttl=117 tempo=12.8 ms`, `--- estatísticas: 3 enviados, 3 recebidos, 0% perda --- (simulado)`] } }),
  c({ name: 'speedtest', category: 'rede', description: 'Mede download/upload/ping (Ookla, real no Termux).', usage: 'speedtest [force]', examples: ['speedtest', 'speedtest force'], handler: 'real:speedtest', output: 'real' }),
  c({ name: 'curl', category: 'rede', description: 'Cabeçalhos HTTP (real no Termux).', usage: 'curl [url]', examples: ['curl https://example.com'], handler: 'real:curl', output: 'real', sim: (args) => [`HTTP/1.1 200 OK`, `content-type: application/json`, ``, `{"status":"ok","target":"${args[0] ?? '/'}","simulado":true}`] }),
  c({ name: 'nslookup', aliases: ['dig2'], category: 'rede', description: 'Consulta DNS (real no Termux).', usage: 'nslookup [host]', examples: ['nslookup lab.local'], handler: 'real:nslookup', output: 'real', sim: (args) => [`Servidor: 127.0.0.53`, `Nome: ${args[0] ?? 'lab.local'}`, `Endereço: 10.0.0.42  (registro simulado)`] }),
  c({ name: 'dig', category: 'rede', description: 'Consulta DNS curta (real no Termux).', usage: 'dig [host]', examples: ['dig example.com'], handler: 'real:dig', output: 'real', sim: (args) => [`10.0.0.42  (${args[0] ?? 'lab.local'} — simulado)`] }),
  c({ name: 'host', category: 'rede', description: 'Resolve nome (real no Termux).', usage: 'host [nome]', examples: ['host example.com'], handler: 'real:host', output: 'real', sim: (args) => [`${args[0] ?? 'lab.local'} has address 10.0.0.42 (simulado)`] }),
  c({ name: 'traceroute', category: 'rede', description: 'Rota até o alvo (real no Termux).', usage: 'traceroute [alvo]', examples: ['traceroute 8.8.8.8'], handler: 'real:traceroute', output: 'real', sim: (args) => [`1  192.168.0.1  1.2 ms`, `2  * * *`, `3  ${args[0] ?? 'alvo'}  24.7 ms (simulado)`] }),
  c({ name: 'nmap', category: 'rede', description: 'Varredura rápida de portas (real no Termux, alvo explícito).', usage: 'nmap [alvo]', examples: ['nmap 127.0.0.1'], handler: 'real:nmap', output: 'real', sim: (args) => [`Nmap 7.94 :: varredura em ${args[0] ?? '127.0.0.1'}`, `PORTA     ESTADO   SERVIÇO`, `22/tcp    closed   ssh`, `8080/tcp  open     nexo-lab`, `8787/tcp  open     nexo-mcp`, `varredura simulada — nenhum pacote enviado`] }),
  c({ name: 'wget', category: 'rede', description: 'Testa URL sem baixar (real no Termux).', usage: 'wget [url]', examples: ['wget https://example.com'], handler: 'real:wget', output: 'real', sim: (args) => [`Spider mode: ${args[0] ?? 'url'} existe (simulado)`] }),
  c({ name: 'ifconfig', category: 'rede', description: 'Interfaces de rede (legado).', usage: 'ifconfig', examples: ['ifconfig'], handler: 'real:ifconfig', output: 'real', sim: ['wlan0: flags=4163<UP> mtu 1500 · inet 192.168.0.42 (simulado)'] }),

  // ─────────── defesa (efeito na simulação da rodada) ───────────
  c({ name: 'patch', category: 'defesa', description: 'Aplica correções — restaura integridade.', usage: 'patch [alvo]', examples: ['patch', 'patch nexo-core'], handler: 'defense', danger: true, requires_confirmation: true }),
  c({ name: 'block', aliases: ['ban'], category: 'defesa', description: 'Bloqueia IP/domínio de origem do ataque.', usage: 'block [ip]', examples: ['block 10.0.0.66'], handler: 'defense', permissions: 'admin', danger: true, requires_confirmation: true }),
  c({ name: 'isolate', category: 'defesa', description: 'Isola processo/sessão suspeita.', usage: 'isolate [processo]', examples: ['isolate agent_run'], handler: 'defense', danger: true, requires_confirmation: true }),
  c({ name: 'harden', category: 'defesa', description: 'Endurece o perímetro (policy deny).', usage: 'harden [serviço]', examples: ['harden'], handler: 'defense', danger: true, requires_confirmation: true }),
  c({ name: 'firewall', aliases: ['ufw'], category: 'defesa', description: 'Status do firewall.', usage: 'firewall', examples: ['firewall'], handler: 'sim', sim: ['Status: ativo', 'Regras: 50/s limite na 8787 · drop 10.0.0.66 · default deny'] }),
  c({ name: 'audit', category: 'defesa', description: 'Auditoria de segurança (SHA-256).', usage: 'audit', examples: ['audit'], handler: 'sim', sim: ['audit.jsonl :: cadeia íntegra', 'sha256 a4f9…c21d  · 128 registros · nenhuma adulteração'] }),
  c({ name: 'hash', category: 'defesa', description: 'Gera hash SHA-256 (real no Termux).', usage: 'hash [arquivo]', examples: ['hash policy.json'], handler: 'real:sha256sum', output: 'real', sim: (args) => [`sha256(${args[0] ?? 'arquivo'}) = 3b8f1a…e94c  (simulado)`] }),

  // ─────────── ofensiva (console do vermelho — efeito na rodada) ───────────
  c({ name: 'ataque', aliases: ['attack'], category: 'ofensiva', description: 'Desfere um vetor de ataque contra o alvo.', usage: 'ataque <vetor>', examples: ['ataque inj', 'ataque fld'], handler: 'attack', danger: true, requires_confirmation: true }),
  c({ name: 'arsenal', category: 'ofensiva', description: 'Lista os vetores de ataque disponíveis.', usage: 'arsenal', examples: ['arsenal'], handler: 'sim', sim: ['inj  injeção de prompt      · ctx  envenenamento de contexto', 'pol  bypass de política      · jbk  jailbreak iterativo', 'fld  flood de requisições    · fzz  fuzzing de entrada', 'mem  estresse de memória     · exf  exfiltração simulada', 'uso: ataque <id> — ex: ataque inj'] }),
  c({ name: 'recon', category: 'ofensiva', description: 'Mapeia a superfície do alvo (simulado).', usage: 'recon', examples: ['recon'], handler: 'sim', sim: ['alvo: nexo-mcp (127.0.0.1:8787)', 'superfície: 8 vetores mapeados · policy.json mode 444', 'guardrails ativos: filtro semântico · gate determinístico · auditoria SHA-256'] }),
  c({ name: 'flag', category: 'ofensiva', description: 'Tenta plantar a flag da rodada (integridade < 20%).', usage: 'flag', examples: ['flag'], handler: 'sim', sim: () => ['flag {simulada} :: só plantável com integridade abaixo de 20%'] }),

  // ─────────── pacotes (real no Termux) ───────────
  c({ name: 'pkg', category: 'pacotes', description: 'Pacotes com atualização (real) ou gerenciador (simulado).', usage: 'pkg [list|install|update]', examples: ['pkg'], handler: 'real:pkg', output: 'real', sim: ['3 pacotes podem ser atualizados (simulado)'] }),
  c({ name: 'dpkg', category: 'pacotes', description: 'Pacotes instalados (real no Termux).', usage: 'dpkg', examples: ['dpkg'], handler: 'real:dpkg', output: 'real', sim: ['ii  nodejs-lts  22.x  arm64 (simulado)'] }),
  c({ name: 'update', aliases: ['apt'], category: 'pacotes', description: 'Atualiza lista de pacotes (simulado).', usage: 'update', examples: ['update'], handler: 'sim', sim: ['Lendo listas de pacotes… pronto', '3 pacotes podem ser atualizados (simulado)'] }),
  c({ name: 'install', category: 'pacotes', description: 'Instala pacote (simulado).', usage: 'install [pacote]', examples: ['install htop'], handler: 'sim', sim: (args) => [`Instalando ${args[0] ?? 'pacote'}…`, `Configurando ${args[0] ?? 'pacote'} (1.0) …`, 'concluído (simulado — nada foi instalado)'] }),

  // ─────────── utilidades (simulado) ───────────
  c({ name: 'calc', category: 'utilidades', description: 'Calculadora.', usage: 'calc [expressão]', examples: ['calc 2**10'], handler: 'sim', sim: (args) => { try { const expr = args.join(' ').replace(/[^-()\d/*+.eE\s]/g, ''); if (!expr) return ['uso: calc [expressão]']; const v = Function(`"use strict"; return (${expr})`)(); return [`= ${v}`] } catch { return ['expressão inválida'] } } }),
  c({ name: 'uuid', category: 'utilidades', description: 'Gera UUID.', usage: 'uuid', examples: ['uuid'], handler: 'sim', sim: () => [crypto.randomUUID()] }),
  c({ name: 'random', category: 'utilidades', description: 'Número aleatório.', usage: 'random [min] [max]', examples: ['random 1 100'], handler: 'sim', sim: (args) => { const a = Number(args[0] ?? 0), b = Number(args[1] ?? 100); return [String(Math.floor(a + Math.random() * (b - a + 1)))] } }),
  c({ name: 'base64', category: 'utilidades', description: 'Codifica texto em base64.', usage: 'base64 [texto]', examples: ['base64 nexo'], handler: 'sim', sim: (args) => [btoa(unescape(encodeURIComponent(args.join(' ') || '')))] }),

  // ─────────── nexo core (simulado) ───────────
  c({ name: 'nexo', category: 'nexo', description: 'Controle do núcleo.', usage: 'nexo [status|init|reset]', examples: ['nexo status'], handler: 'sim', sim: ['núcleo: ativo · catálogo 620 cmds · política deny · MCP 8787', 'ollama: 127.0.0.1:11434 · modelo gemma4:e2b-it-qat (simulado)'] }),
  c({ name: 'lab', category: 'nexo', description: 'Gerencia o laboratório.', usage: 'lab [status]', examples: ['lab status'], handler: 'sim', sim: ['LAB-01 :: arena ativa · vermelho operante · azul aprendendo'] }),
  c({ name: 'report', category: 'nexo', description: 'Relatório da sessão.', usage: 'report', examples: ['report'], handler: 'sim', sim: ['relatório da sessão :: veja placar, taxa de bloqueio e pico de estresse no painel lateral'] }),
  c({ name: 'mode', category: 'nexo', description: 'Modo de operação (defense/diag/net).', usage: 'mode [defense|diag|net]', examples: ['mode diag'], handler: 'special' }),
]

// ---------- consultas ----------

const byName = new Map<string, CommandDef>()
for (const def of REGISTRY) {
  byName.set(def.name, def)
  for (const a of def.aliases) byName.set(a, def)
}

export function findCommand(name: string): CommandDef | undefined {
  return byName.get(name.toLowerCase())
}

export function helpOverview(): string {
  const groups = new Map<Category, string[]>()
  for (const def of REGISTRY) {
    const list = groups.get(def.category) ?? []
    list.push(def.name)
    groups.set(def.category, list)
  }
  const order: Category[] = ['nucleo', 'diagnostico', 'rede', 'defesa', 'ofensiva', 'pacotes', 'utilidades', 'nexo']
  return order
    .filter((k) => groups.has(k))
    .map((k) => `▸ ${CATEGORY_LABEL[k]}: ${groups.get(k)!.join(' · ')}`)
    .join('\n')
}

export function helpDetail(def: CommandDef): string[] {
  return [
    `${def.name} — ${def.description}`,
    `uso: ${def.usage}`,
    `exemplos: ${def.examples.join('  ·  ')}`,
    `categoria: ${CATEGORY_LABEL[def.category]} · permissões: ${def.permissions}${def.aliases.length ? ` · aliases: ${def.aliases.join(', ')}` : ''}`,
    def.danger ? 'PERIGOSO: sim — pede confirmação [S/N] antes de executar' : 'perigoso: não',
  ]
}

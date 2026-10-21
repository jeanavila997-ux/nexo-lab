// ============================================================
// Explicador de comandos — cola um comando e recebe a anatomia:
// binário, flags, argumentos, risco e o que ele faz de fato.
// ============================================================

export interface Explanation {
  bin: string
  summary: string
  parts: { token: string; meaning: string }[]
  risk: 'baixo' | 'medio' | 'alto' | 'extremo'
  riskWhy: string
}

const BIN_DB: Record<string, string> = {
  ls: 'lista arquivos e diretórios',
  cd: 'muda o diretório de trabalho',
  cat: 'exibe o conteúdo de um arquivo',
  rm: 'remove arquivos/diretórios — destrutivo',
  mv: 'move ou renomeia arquivos',
  cp: 'copia arquivos',
  mkdir: 'cria diretório',
  chmod: 'altera permissões de arquivo',
  chown: 'altera dono de arquivo',
  sudo: 'executa como root — privilégio total',
  su: 'troca de usuário',
  kill: 'envia sinal a processo (padrão: terminar)',
  ps: 'lista processos',
  top: 'monitor de processos em tempo real',
  htop: 'monitor de processos interativo',
  free: 'uso de memória',
  df: 'espaço em disco',
  du: 'uso de disco por pasta',
  uname: 'informações do kernel',
  uptime: 'tempo ligado e carga',
  whoami: 'usuário atual',
  id: 'uid, gid e grupos',
  ss: 'conexões e portas (socket statistics)',
  netstat: 'conexões de rede (legado)',
  ip: 'configuração de rede (addr/route/link)',
  ifconfig: 'interfaces de rede (legado)',
  ping: 'testa conectividade ICMP',
  curl: 'transfere dados via HTTP/FTP/…',
  wget: 'baixa arquivos da web',
  nslookup: 'consulta DNS',
  dig: 'consulta DNS detalhada',
  host: 'resolve nomes DNS',
  traceroute: 'mostra a rota até o alvo',
  nmap: 'scanner de portas e serviços',
  hydra: 'força bruta em logins (SSH, FTP, HTTP…)',
  sqlmap: 'detecção/exploração de SQL injection',
  msfconsole: 'console do Metasploit Framework',
  john: 'quebra de senhas (John the Ripper)',
  hashcat: 'quebra de hashes por GPU',
  nc: 'netcat — canivete suíço de rede (pode abrir backdoor)',
  ncat: 'netcat moderno (Nmap)',
  ssh: 'acesso remoto criptografado',
  scp: 'cópia remota via SSH',
  iptables: 'firewall do kernel Linux',
  ufw: 'firewall simplificado',
  systemctl: 'controla serviços do systemd',
  service: 'controla serviços (SysV)',
  apt: 'gerenciador de pacotes (Debian/Kali)',
  pkg: 'gerenciador de pacotes do Termux',
  dpkg: 'pacotes .deb de baixo nível',
  pip: 'instala bibliotecas Python',
  npm: 'instala pacotes Node.js',
  git: 'controle de versão',
  tar: 'empacota/compacta arquivos',
  zip: 'compacta em zip',
  unzip: 'extrai zip',
  gzip: 'compacta arquivos',
  sha256sum: 'hash SHA-256 de arquivo',
  md5sum: 'hash MD5 (legado, inseguro p/ segurança)',
  base64: 'codifica/decodifica base64',
  echo: 'imprime texto',
  grep: 'busca padrões em texto',
  sed: 'editor de fluxo — substitui texto',
  awk: 'processamento de texto por colunas',
  find: 'busca arquivos',
  xargs: 'constrói comandos a partir da entrada',
  crontab: 'agenda tarefas recorrentes',
  nohup: 'mantém processo rodando após logout',
  screen: 'multiplexador de terminal',
  tmux: 'multiplexador de terminal moderno',
  python: 'interpretador Python',
  python3: 'interpretador Python 3',
  node: 'runtime JavaScript',
  bash: 'shell Bourne Again',
  sh: 'shell padrão',
  env: 'mostra/altera variáveis de ambiente',
  export: 'exporta variável de ambiente',
  history: 'histórico de comandos do shell',
  man: 'manual de um comando',
  which: 'caminho de um executável',
  dd: 'cópia de baixo nível — pode destruir discos',
  mkfs: 'formata sistema de arquivos — destrutivo',
  fdisk: 'particiona discos — destrutivo',
  shred: 'apaga arquivo de forma irrecuperável',
  stress: 'estresse de CPU/memória (teste de carga)',
  'stress-ng': 'estresse avançado de recursos',
  ab: 'Apache Bench — teste de carga HTTP',
  wrk: 'benchmark HTTP moderno',
}

const FLAG_DB: Record<string, string> = {
  '-r': 'recursivo', '-R': 'recursivo', '-f': 'força, sem confirmação',
  '-rf': 'recursivo + força — apaga tudo sem perguntar', '-fr': 'recursivo + força',
  '-i': 'interativo (pede confirmação)', '-v': 'verboso (mostra detalhes)',
  '-h': 'legível para humanos (ou ajuda, conforme o comando)',
  '-a': 'todos / inclui ocultos', '-l': 'formato longo/detalhado',
  '-la': 'detalhado + ocultos', '-al': 'detalhado + ocultos',
  '-n': 'numérico / número de linhas (conforme o comando)',
  '-c': 'contagem / comando a executar (conforme o binário)',
  '-s': 'silencioso / alvo / sinal (conforme o binário)',
  '-S': 'silencia barra de progresso (curl)',
  '-I': 'só cabeçalhos (curl)', '-X': 'método HTTP (curl)',
  '-d': 'dados do corpo (curl) / diretório', '-o': 'arquivo de saída',
  '-O': 'saída com nome remoto (curl/wget)', '-L': 'segue redirecionamentos',
  '-A': 'adiciona regra / user-agent (conforme o binário)',
  '-j': 'ação do alvo (iptables) / jobs paralelos',
  '-p': 'porta / preserva atributos / senha (conforme o binário)',
  '-u': 'usuário / URL (sqlmap)', '-e': 'executa expressão',
  '-9': 'SIGKILL — mata o processo na hora, sem limpeza',
  '-15': 'SIGTERM — pede ao processo que termine',
  '-y': 'assume "sim" para tudo', '-q': 'quieto', '-m': 'máximo / modo',
  '-w': 'timeout por hop / wordlist (conforme o binário)',
  '-F': 'varredura rápida (nmap) / força (outros)',
  '--force': 'força a operação', '--recursive': 'recursivo',
  '--silent': 'silencioso', '--show-error': 'mostra erros (curl)',
  '--max-time': 'tempo máximo da operação', '--open': 'só portas abertas (nmap)',
  '--batch': 'modo em lote, sem perguntas', '--level': 'nível de teste (sqlmap)',
  '--risk': 'risco dos testes (sqlmap)', '-P': 'lista de senhas (hydra)',
  '-t': 'threads / tipo (conforme o binário)',
}

const DANGER_RX = [
  { re: /\brm\s+(-[a-z]*[rf][a-z]*\s+)?\/(\s|$|\*)/i, risk: 'extremo' as const, why: 'apaga o sistema inteiro a partir da raiz' },
  { re: /mkfs|dd\s+.*of=\/dev|:\(\)\s*\{\s*:\|:/i, risk: 'extremo' as const, why: 'destruição de disco ou fork bomb' },
  { re: /\brm\s+-[a-z]*[rf]/i, risk: 'alto' as const, why: 'remoção forçada e recursiva' },
  { re: /chmod\s+(-R\s+)?777/i, risk: 'alto' as const, why: 'permissão total para todos — abre o sistema' },
  { re: /\bsudo\b/i, risk: 'alto' as const, why: 'executa com privilégio de root' },
  { re: /\b(curl|wget)\b[^|]*\|\s*(bash|sh)\b/i, risk: 'extremo' as const, why: 'baixa e executa script remoto sem revisão — clássico de supply chain' },
  { re: /\bnc\b.*-e|\bncat\b.*-e/i, risk: 'extremo' as const, why: 'netcat com -e abre shell remoto (backdoor/reverse shell)' },
  { re: /\bhydra|sqlmap|john|hashcat|msfconsole\b/i, risk: 'alto' as const, why: 'ferramenta ofensiva — usar somente na arena autorizada' },
  { re: /\biptables\b.*-A/i, risk: 'medio' as const, why: 'altera o firewall — regra errada pode te trancar fora' },
  { re: /\b(kill|killall)\b/i, risk: 'medio' as const, why: 'encerra processos' },
  { re: /\b(chmod|chown|mv|cp|dd|tar)\b/i, risk: 'medio' as const, why: 'modifica arquivos ou permissões' },
  { re: /\b(pip|npm|pkg|apt)\b.*\b(install|add)\b/i, risk: 'medio' as const, why: 'instala código de terceiros no sistema' },
  { re: />\s*\/|\bdd\b|shred/i, risk: 'alto' as const, why: 'escrita direta em dispositivo ou sobrescrita irreversível' },
]

export function explainCommand(raw: string): Explanation {
  const tokens = raw.trim().split(/\s+/).filter(Boolean)
  const bin = (tokens[0] ?? '').replace(/^\.\//, '').split('/').pop() ?? ''
  const parts: Explanation['parts'] = []

  for (const tk of tokens) {
    if (tk === tokens[0]) {
      parts.push({ token: tk, meaning: BIN_DB[bin] ?? `executável "${bin}" (fora da base — confira com "man ${bin}")` })
    } else if (FLAG_DB[tk]) {
      parts.push({ token: tk, meaning: FLAG_DB[tk] })
    } else if (/^-[a-zA-Z0-9]+$/.test(tk)) {
      // decompõe flags agrupadas: -rf → -r -f
      const letters = tk.slice(1).split('').map((l) => FLAG_DB[`-${l}`]).filter(Boolean)
      parts.push({ token: tk, meaning: letters.length ? letters.join(' · ') : 'flag não catalogada' })
    } else if (tk.startsWith('--')) {
      parts.push({ token: tk, meaning: FLAG_DB[tk] ?? 'opção longa — veja a man page' })
    } else if (/^https?:\/\//.test(tk)) {
      parts.push({ token: tk, meaning: 'URL alvo' })
    } else if (/^\d+\.\d+\.\d+\.\d+/.test(tk)) {
      parts.push({ token: tk, meaning: 'endereço IP alvo' })
    } else if (/^\d+$/.test(tk)) {
      parts.push({ token: tk, meaning: 'valor numérico (PID, porta, contagem…)' })
    } else if (tk.startsWith('$') || tk.startsWith('"') || tk.startsWith("'")) {
      parts.push({ token: tk, meaning: 'texto/variável passada como argumento' })
    } else {
      parts.push({ token: tk, meaning: 'argumento (arquivo, caminho ou valor)' })
    }
  }

  let risk: Explanation['risk'] = 'baixo'
  let riskWhy = 'somente leitura ou efeito local reversível'
  for (const d of DANGER_RX) {
    if (d.re.test(raw)) {
      risk = d.risk
      riskWhy = d.why
      break
    }
  }

  const summaryBase = BIN_DB[bin] ?? 'comando não catalogado'
  return { bin, summary: `"${bin}" — ${summaryBase}`, parts, risk, riskWhy }
}

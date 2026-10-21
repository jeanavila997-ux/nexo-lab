#!/data/data/com.termux/files/usr/bin/node
// ============================================================
// NEXO Lab — servidor Termux (Node, zero dependências)
//
// Serve o dashboard (./dist) e expõe POST /api/exec, que roda
// comandos REAIS no Linux do Android (Termux), com whitelist
// estrita — nada destrutivo passa. Os comandos suportam
// argumentos seguros (somente [a-z0-9._:/-]), sem shell.
//
// Uso:  node server/servidor.mjs [porta]     (padrão 8080)
// ============================================================
import http from 'node:http'
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { listServers, speedtest } from './speedtest.mjs'

const ROOT = fileURLToPath(new URL('.', import.meta.url))
const DIST = join(ROOT, '..', 'dist')
const PORT = Number(process.argv[2] || process.env.PORT || 8080)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
}

// ---------- whitelist: o que o terminal pode executar de verdade ----------
// Cada chave é o comando digitado no console.
// Valor:
//   bin:   executável (sem shell — execFile direto)
//   args:  args fixos
//   desc:  descrição mostrada no terminal
//   argsPos: posições onde argumentos do usuário podem entrar ('append' = no fim)
//   argRe: regex de validação por argumento (padrão: seguro)
//   timeout: ms (padrão 5000)
const SAFE_ARG = /^[a-zA-Z0-9._:/+-]{1,120}$/

const WHITELIST = {
  // diagnóstico
  scan: { bin: 'ss', args: ['-tulpn'], desc: 'conexões e portas abertas' },
  net: { bin: 'ip', args: ['addr', 'show'], desc: 'interfaces de rede' },
  route: { bin: 'ip', args: ['route', 'show'], desc: 'tabela de rotas' },
  status: { bin: 'uptime', args: [], desc: 'tempo ligado + carga' },
  mem: { bin: 'free', args: ['-h'], desc: 'memória do dispositivo' },
  ps: { bin: 'ps', args: ['aux'], desc: 'processos em execução' },
  disk: { bin: 'df', args: ['-h'], desc: 'uso de disco' },
  sys: { bin: 'uname', args: ['-a'], desc: 'kernel do Android/Linux' },
  whoami: { bin: 'whoami', args: [], desc: 'usuário da sessão Termux' },
  id: { bin: 'id', args: [], desc: 'uid, gid e grupos' },
  cpu: { bin: 'cat', args: ['/proc/stat'], desc: 'contadores de CPU' },
  battery: { bin: 'termux-battery-status', args: [], desc: 'bateria (Termux:API)' },
  storage: { bin: 'termux-storage-get', args: [], desc: 'acesso ao storage (Termux:API)' },

  // pacotes
  pkg: { bin: 'pkg', args: ['list-upgradable'], desc: 'pacotes com atualização disponível' },
  dpkg: { bin: 'dpkg', args: ['-l'], desc: 'pacotes instalados' },

  // rede
  ping: { bin: 'ping', args: ['-c', '3'], argsPos: 'append', desc: 'conectividade ICMP' },
  curl: { bin: 'curl', args: ['-sS', '-I', '--max-time', '5'], argsPos: 'append', desc: 'cabeçalhos HTTP' },
  wget: { bin: 'wget', args: ['--spider', '-T', '5'], argsPos: 'append', desc: 'testa URL (spider)' },
  nslookup: { bin: 'nslookup', args: [], argsPos: 'append', desc: 'consulta DNS' },
  dig: { bin: 'dig', args: ['+short'], argsPos: 'append', desc: 'DNS (dig)' },
  host: { bin: 'host', args: [], argsPos: 'append', desc: 'DNS (host)' },
  traceroute: { bin: 'traceroute', args: ['-m', '10', '-w', '2'], argsPos: 'append', desc: 'rota até o alvo', timeout: 20000 },
  nmap: { bin: 'nmap', args: ['-F', '--open'], argsPos: 'append', desc: 'varredura rápida de portas', timeout: 30000 },
  ifconfig: { bin: 'ifconfig', args: [], desc: 'interfaces (legado)' },
  iw: { bin: 'iw', args: ['dev'], desc: 'dispositivos wireless' },

  // utilidades
  date: { bin: 'date', args: [], desc: 'data e hora' },
  cal: { bin: 'cal', args: [], desc: 'calendário' },
  which: { bin: 'which', args: [], argsPos: 'append', desc: 'caminho do executável' },
  ls: { bin: 'ls', args: ['-la'], argsPos: 'append', desc: 'lista diretório' },
  cat: { bin: 'cat', args: [], argsPos: 'append', desc: 'exibe arquivo (somente leitura)' },
  head: { bin: 'head', args: ['-n', '30'], argsPos: 'append', desc: 'primeiras linhas' },
  tail: { bin: 'tail', args: ['-n', '30'], argsPos: 'append', desc: 'últimas linhas' },
  sha256sum: { bin: 'sha256sum', args: [], argsPos: 'append', desc: 'hash SHA-256 real' },
  md5sum: { bin: 'md5sum', args: [], argsPos: 'append', desc: 'hash MD5 real' },
  env: { bin: 'env', args: [], desc: 'variáveis de ambiente' },
  printenv: { bin: 'printenv', args: [], argsPos: 'append', desc: 'variável de ambiente' },

  // ── instalação de linguagens e bibliotecas (requer permissão do operador) ──
  // Só rodam quando /api/exec recebe allowInstall:true vindo da UI
  'pkg-install': { bin: 'pkg', args: ['install', '-y'], argsPos: 'append', desc: 'instala linguagem/pacote no Termux', timeout: 240000, install: true },
  'pip-install': { bin: 'pip', args: ['install', '--quiet'], argsPos: 'append', desc: 'instala biblioteca Python', timeout: 240000, install: true },
  'npm-install': { bin: 'npm', args: ['install', '-g'], argsPos: 'append', desc: 'instala pacote Node global', timeout: 240000, install: true },
}

const TIMEOUT_MS = 5000
const MAX_OUT = 6000

function runReal(name, userArgs = []) {
  return new Promise((resolve) => {
    const entry = WHITELIST[name]
    if (!entry) return resolve(null)

    // valida argumentos do usuário (nunca passam por shell)
    const safe = []
    for (const a of userArgs.slice(0, 4)) {
      const re = entry.argRe ?? SAFE_ARG
      if (!re.test(a)) {
        return resolve({ ok: false, desc: entry.desc, output: `argumento bloqueado pelo gate: "${a}"` })
      }
      safe.push(a)
    }
    const args = entry.argsPos === 'append' ? [...entry.args, ...safe] : entry.args

    execFile(entry.bin, args, { timeout: entry.timeout ?? TIMEOUT_MS, maxBuffer: 256 * 1024 }, (err, stdout, stderr) => {
      const out = (stdout || stderr || '').toString().slice(0, MAX_OUT)
      if (err && !out) {
        return resolve({
          ok: false,
          desc: entry.desc,
          output: `ERRO :: "${entry.bin}" falhou neste dispositivo (${err.code ?? err.message})`,
        })
      }
      resolve({ ok: true, desc: entry.desc, output: out.trim() || '(sem saída)' })
    })
  })
}

function json(res, code, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
  })
  res.end(body)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')

  // ---------- API ----------
  if (url.pathname === '/api/exec' && req.method === 'POST') {
    let raw = ''
    req.on('data', (c) => {
      raw += c
      if (raw.length > 2048) req.destroy()
    })
    req.on('end', async () => {
      let cmd = ''
      let args = []
      let allowInstall = false
      try {
        const body = JSON.parse(raw)
        const parts = String(body.cmd ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean)
        cmd = parts[0] ?? ''
        args = parts.slice(1)
        allowInstall = Boolean(body.allowInstall)
      } catch {
        return json(res, 400, { ok: false, output: 'JSON inválido' })
      }
      if (!cmd || !(cmd in WHITELIST)) {
        return json(res, 200, {
          ok: false,
          whitelisted: false,
          output: `comando fora da whitelist: "${cmd || '(vazio)'}"\npermitidos: ${Object.keys(WHITELIST).join(' · ')}`,
        })
      }
      const entry = WHITELIST[cmd]
      if (entry.install && !allowInstall) {
        return json(res, 200, {
          ok: false,
          installDenied: true,
          output: `instalação bloqueada :: "${cmd}" exige a permissão do operador (chave INSTALAR na interface)`,
        })
      }
      const result = await runReal(cmd, args)
      json(res, 200, { cmd, ...result })
    })
    return
  }

  if (url.pathname === '/api/health') {
    return json(res, 200, { ok: true, env: 'termux', whitelist: Object.keys(WHITELIST) })
  }

  // ---------- speedtest (Ookla CLI) ----------
  if (url.pathname === '/api/speedtest' && req.method === 'POST') {
    let raw = ''
    req.on('data', (c) => {
      raw += c
      if (raw.length > 2048) req.destroy()
    })
    req.on('end', async () => {
      let serverId
      let force = false
      try {
        const body = JSON.parse(raw || '{}')
        serverId = body.server_id ?? body.serverId
        force = Boolean(body.force)
      } catch {
        /* body opcional */
      }
      const result = await speedtest({ serverId, force })
      json(res, 200, result)
    })
    return
  }

  if (url.pathname === '/api/speedtest/servers') {
    const result = await listServers()
    return json(res, 200, result)
  }

  // ---------- estático ----------
  let path = normalize(decodeURIComponent(url.pathname))
  if (path === '/' || path === '\\') path = '/index.html'
  const file = join(DIST, path)
  if (!file.startsWith(DIST)) {
    res.writeHead(403).end('forbidden')
    return
  }
  try {
    const data = await readFile(file)
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
    res.end(data)
  } catch {
    // SPA fallback
    try {
      const data = await readFile(join(DIST, 'index.html'))
      res.writeHead(200, { 'content-type': MIME['.html'] })
      res.end(data)
    } catch {
      res.writeHead(404).end('dist/index.html não encontrado — rode o build ou o install-termux.sh')
    }
  }
})

server.listen(PORT, () => {
  console.log('============================================================')
  console.log(` NEXO Lab :: servidor Termux ativo em http://localhost:${PORT}`)
  console.log(` API real: POST /api/exec  (${Object.keys(WHITELIST).length} comandos na whitelist)`)
  console.log('============================================================')
})

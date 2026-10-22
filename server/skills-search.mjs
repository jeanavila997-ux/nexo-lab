import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MAX_QUERY = 120
const MAX_OUTPUT = 80_000
const TIMEOUT_MS = 25_000
const ANSI = /\u001b\[[0-?]*[ -/]*[@-~]/g
const PACKAGE = /^([\w.-]+)\/([\w.-]+)@([\w.-]+)\s+([\d.,]+[KMB]?) installs$/i
const LINK = /^└\s+(https:\/\/skills\.sh\/[\w.-]+\/[\w.-]+\/[\w.-]+)\s*$/i
const PACKAGE_ID = /^[\w.-]+\/[\w.-]+@[\w.-]+$/
const SKILL_NAME = /^[\w.-]+$/
const PROJECT_ROOT = process.env.NEXO_SKILLS_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..')

function cliCommand() {
  if (process.platform !== 'win32') return { file: 'npx', prefix: [] }
  const nodeExecutable = process.env.NEXO_NODE_PATH || process.execPath
  const bundled = join(dirname(nodeExecutable), 'node_modules', 'npm', 'bin', 'npx-cli.js')
  if (!existsSync(bundled)) throw new Error('npm/npx não encontrado junto ao Node.js')
  return { file: nodeExecutable, prefix: [bundled] }
}

async function runSkills(args, { signal, timeoutMs = TIMEOUT_MS } = {}) {
  const { file, prefix } = cliCommand()
  const child = spawn(file, [...prefix, '--yes', 'skills', ...args], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', CI: '1' },
    shell: false,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  let exceeded = false
  let timedOut = false
  const stop = () => child.kill()
  const timer = setTimeout(() => { timedOut = true; stop() }, timeoutMs)
  signal?.addEventListener('abort', stop, { once: true })
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString()
    if (stdout.length > MAX_OUTPUT) { exceeded = true; stop() }
  })
  child.stderr.on('data', (chunk) => { stderr = (stderr + chunk.toString()).slice(-4_000) })
  try {
    await new Promise((resolve, reject) => {
      child.on('error', reject)
      child.on('close', (code) => code === 0 ? resolve() : reject(new Error(
        signal?.aborted ? 'operação cancelada' : timedOut ? 'tempo limite da operação esgotado' : exceeded ? 'resposta excedeu o limite' : stderr.trim() || stdout.trim().slice(-1_000) || `skills encerrou com código ${code}`,
      )))
    })
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', stop)
  }
  return stdout.replace(ANSI, '').trim()
}

export function parseSkillResults(output) {
  const lines = output.replace(ANSI, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const results = []
  for (let index = 0; index < lines.length; index++) {
    const match = lines[index].match(PACKAGE)
    if (!match) continue
    const next = lines[index + 1]?.match(LINK)
    if (!next) continue
    const [, owner, repo, name, installs] = match
    const expected = `https://skills.sh/${owner}/${repo}/${name}`.toLowerCase()
    if (next[1].toLowerCase() !== expected) continue
    results.push({
      name,
      owner,
      repo,
      installs,
      package: `${owner}/${repo}@${name}`,
      url: next[1],
      installCommand: `npx skills add ${owner}/${repo}@${name}`,
    })
    if (results.length >= 10) break
  }
  return results
}

export async function findSkills(query, { signal } = {}) {
  const term = String(query || '').trim().replace(/\s+/g, ' ')
  if (!term || term.length > MAX_QUERY || /[\p{C}]/u.test(term)) {
    throw new Error(`informe uma busca de 1 a ${MAX_QUERY} caracteres`)
  }
  const stdout = await runSkills(['find', term], { signal })
  return { query: term, skills: parseSkillResults(stdout) }
}

export async function listInstalledSkills({ signal } = {}) {
  const stdout = await runSkills(['list', '--json'], { signal })
  try {
    const value = JSON.parse(stdout)
    return Array.isArray(value) ? value : []
  } catch {
    throw new Error('a CLI skills retornou uma lista inválida')
  }
}

export async function installSkill(packageId, { signal } = {}) {
  if (!PACKAGE_ID.test(String(packageId || ''))) throw new Error('pacote inválido; use owner/repo@skill')
  await runSkills(['add', packageId, '-y', '-a', 'codex', '--copy'], { signal, timeoutMs: 120_000 })
  return { package: packageId, output: 'Instalação concluída.' }
}

export async function uninstallSkill(skillName, { signal } = {}) {
  if (!SKILL_NAME.test(String(skillName || ''))) throw new Error('nome de skill inválido')
  const installed = await listInstalledSkills({ signal })
  const match = installed.find((item) => item?.name === skillName || item?.skill === skillName)
  if (!match) throw new Error(`skill “${skillName}” não está instalada neste projeto`)
  await runSkills(['remove', skillName, '-y'], { signal, timeoutMs: 60_000 })
  const remaining = await listInstalledSkills({ signal })
  if (remaining.some((item) => item?.name === skillName || item?.skill === skillName)) {
    throw new Error(`a CLI não removeu “${skillName}”; confira as instalações no projeto`)
  }
  return { name: skillName, output: 'Desinstalação concluída.' }
}

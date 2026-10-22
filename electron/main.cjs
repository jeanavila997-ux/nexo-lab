const { app, BrowserWindow, dialog, shell, session } = require('electron')
const { spawn } = require('node:child_process')
const { existsSync, mkdirSync, writeFileSync } = require('node:fs')
const { dirname, join, delimiter } = require('node:path')

let apiProcess = null
let mainWindow = null

function nodeOnPath() {
  const names = process.platform === 'win32' ? ['node.exe'] : ['node']
  for (const dir of String(process.env.PATH || '').split(delimiter)) {
    for (const name of names) {
      const candidate = join(dir.replace(/^"|"$/g, ''), name)
      if (existsSync(candidate)) return candidate
    }
  }
  return ''
}

function resources() {
  const base = app.isPackaged ? process.resourcesPath : join(__dirname, '..')
  return {
    server: join(base, 'server', 'servidor.mjs'),
    dist: join(base, 'dist'),
  }
}

function startServer() {
  return new Promise((resolve, reject) => {
    const paths = resources()
    if (!existsSync(paths.server) || !existsSync(join(paths.dist, 'index.html'))) {
      reject(new Error('Arquivos web não encontrados. Execute npm run build na raiz do projeto.'))
      return
    }
    const env = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NEXO_DIST: paths.dist,
      NEXO_HOST: '127.0.0.1',
      NEXO_NODE_PATH: nodeOnPath(),
      NEXO_SKILLS_ROOT: app.isPackaged ? join(app.getPath('userData'), 'skills-workspace') : join(__dirname, '..'),
    }
    if (app.isPackaged) {
      mkdirSync(env.NEXO_SKILLS_ROOT, { recursive: true })
      const marker = join(env.NEXO_SKILLS_ROOT, 'package.json')
      if (!existsSync(marker)) writeFileSync(marker, '{"name":"nexo-lab-desktop-skills","private":true}\n')
    }
    apiProcess = spawn(process.execPath, [paths.server, '0'], {
      cwd: dirname(paths.server),
      env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let ready = false
    let buffer = ''
    let errorOutput = ''
    const timeout = setTimeout(() => {
      if (!ready) {
        apiProcess?.kill()
        reject(new Error('O servidor local não iniciou em 15 segundos.'))
      }
    }, 15_000)
    apiProcess.stdout.on('data', (chunk) => {
      buffer += chunk.toString()
      const match = buffer.match(/NEXO_READY (\d+)/)
      if (match && !ready) {
        ready = true
        clearTimeout(timeout)
        resolve(Number(match[1]))
      }
      buffer = buffer.slice(-4_000)
    })
    apiProcess.stderr.on('data', (chunk) => { errorOutput = (errorOutput + chunk.toString()).slice(-2_000) })
    apiProcess.on('error', (error) => {
      clearTimeout(timeout)
      if (!ready) reject(error)
    })
    apiProcess.on('exit', (code) => {
      clearTimeout(timeout)
      if (!ready) reject(new Error(errorOutput || `servidor encerrou com código ${code}`))
      if (ready && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('nexo-server-stopped')
      }
    })
  })
}

function createWindow(port) {
  const origin = `http://127.0.0.1:${port}`
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 650,
    backgroundColor: '#0a0a0c',
    title: 'NEXO Lab Desktop',
    icon: join(__dirname, 'assets', 'nexo-icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${origin}/`)) event.preventDefault()
  })
  void mainWindow.loadURL(`${origin}/`)
  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  try {
    const port = await startServer()
    createWindow(port)
  } catch (error) {
    dialog.showErrorBox('NEXO Lab Desktop', error?.message || String(error))
    app.quit()
  }
})

app.on('before-quit', () => { apiProcess?.kill() })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

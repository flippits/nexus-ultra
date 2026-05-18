const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const http = require('http')
const fs = require('fs')
const crypto = require('crypto')
const { spawn } = require('child_process')

let mainWindow
let backendProcess

// ── Find Python ───────────────────────────────────────────────────────────────

function findPython() {
  const { execSync } = require('child_process')
  const isWin = process.platform === 'win32'

  const candidates = isWin ? [
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python313', 'python.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'python.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python311', 'python.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python310', 'python.exe'),
    'C:\\ProgramData\\miniconda3\\python.exe',
    'C:\\ProgramData\\anaconda3\\python.exe',
    'C:\\Python312\\python.exe',
    'C:\\Python311\\python.exe',
    'python',
  ] : [
    '/opt/miniconda3/bin/python3',
    '/opt/anaconda3/bin/python3',
    '/opt/homebrew/bin/python3',
    '/usr/local/bin/python3',
    '/usr/bin/python3',
  ]

  if (!isWin) {
    for (const sh of ['/bin/zsh', '/bin/bash']) {
      try {
        const p = execSync(`${sh} -l -c "which python3 2>/dev/null"`, {
          encoding: 'utf8', timeout: 3000,
          env: { HOME: process.env.HOME, PATH: process.env.PATH || '' },
        }).trim()
        if (p && !candidates.includes(p)) candidates.unshift(p)
      } catch {}
    }
  }

  for (const p of candidates) {
    try {
      if (p !== 'python' && p !== 'python3' && !fs.existsSync(p)) continue
      execSync(`"${p}" -c "import uvicorn"`, { timeout: 3000, stdio: 'ignore' })
      console.log('[NEXUS] Using Python:', p)
      return p
    } catch {}
  }

  console.log('[NEXUS] Warning: no Python with uvicorn found')
  return isWin ? 'python' : 'python3'
}

// ── Backend path (dev vs packaged) ────────────────────────────────────────────

function getBackendPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'backend')
    : path.join(__dirname, '..', 'backend')
}

// ── Detect whether we have a PyInstaller-compiled backend binary ───────────────

function getBundledBinary(backendPath) {
  const isWin = process.platform === 'win32'
  const candidates = [
    // PyInstaller one-folder layout
    path.join(backendPath, 'nexus_backend', isWin ? 'nexus_backend.exe' : 'nexus_backend'),
    // flat layout fallback
    path.join(backendPath, isWin ? 'nexus_backend.exe' : 'nexus_backend'),
  ]
  return candidates.find(p => fs.existsSync(p)) || null
}

// ── Install Python deps (cached by requirements.txt hash) ─────────────────────
// Only called when no bundled binary is present.

async function installDeps(backendPath, python) {
  const reqFile = path.join(backendPath, 'requirements.txt')
  if (!fs.existsSync(reqFile)) return

  const hash = crypto.createHash('md5')
    .update(fs.readFileSync(reqFile))
    .digest('hex')

  const flagFile = path.join(app.getPath('userData'), 'deps_hash')
  const prevHash = fs.existsSync(flagFile) ? fs.readFileSync(flagFile, 'utf8').trim() : ''
  if (hash === prevHash) return

  console.log('[NEXUS] Installing Python dependencies...')
  await new Promise((resolve) => {
    const pip = spawn(python, ['-m', 'pip', 'install', '--user', '-q', '-r', reqFile], {
      cwd: backendPath,
      stdio: 'pipe',
    })
    pip.on('close', (code) => {
      if (code === 0) {
        fs.writeFileSync(flagFile, hash)
        console.log('[NEXUS] Dependencies installed.')
      } else {
        console.log('[NEXUS] pip install exited with code', code, '— continuing anyway')
      }
      resolve()
    })
    pip.on('error', (e) => {
      console.log('[NEXUS] pip error:', e.message, '— continuing anyway')
      resolve()
    })
  })
}

// ── Start backend ─────────────────────────────────────────────────────────────

async function startBackend() {
  const backendPath = getBackendPath()
  const bundled = getBundledBinary(backendPath)

  let cmd, args, cwd

  if (bundled) {
    // Bundled PyInstaller binary — no Python needed
    console.log('[NEXUS] Using bundled backend:', bundled)
    cmd = bundled
    args = []
    cwd = path.dirname(bundled)
  } else {
    // Fall back to system Python + uvicorn
    const python = findPython()
    await installDeps(backendPath, python)
    cmd = python
    args = ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8765']
    cwd = backendPath
    console.log('[NEXUS] Using system Python:', python)
  }

  backendProcess = spawn(cmd, args, {
    cwd,
    stdio: 'pipe',
    env: {
      ...process.env,
      PYTHONPATH: backendPath,
      NEXUS_DATA_DIR: app.getPath('userData'),
    },
  })
  backendProcess.stdout.on('data', d => console.log('[BACKEND]', d.toString().trim()))
  backendProcess.stderr.on('data', d => {
    const msg = d.toString()
    if (!msg.includes('Address already in use')) console.log('[BACKEND]', msg.trim())
  })
  backendProcess.on('error', () => {})
}

// ── Health-check polling ──────────────────────────────────────────────────────

function pollBackend(onReady, attempt = 0) {
  const req = http.get('http://127.0.0.1:8765/health', (res) => {
    res.resume()
    if (res.statusCode === 200) return onReady()
    retry()
  })
  req.on('error', retry)
  req.setTimeout(500, () => { req.destroy(); retry() })

  function retry() {
    if (attempt < 60) setTimeout(() => pollBackend(onReady, attempt + 1), 500)
    else onReady() // give up after 30 s — let React handle it
  }
}

// ── Loading splash ────────────────────────────────────────────────────────────

const LOADING_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a0f;color:#00f5ff;font-family:'Courier New',monospace;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  height:100vh;user-select:none;-webkit-app-region:drag}
.logo{font-size:38px;font-weight:900;letter-spacing:10px;
  text-shadow:0 0 30px #00f5ff88,0 0 60px #00f5ff44}
.sub{font-size:11px;letter-spacing:6px;color:#00f5ff55;margin-top:6px}
.bar-wrap{width:260px;height:1px;background:#1a1a2e;margin-top:48px;overflow:hidden}
.bar{height:100%;background:#00f5ff;animation:s 1.4s ease-in-out infinite;
  box-shadow:0 0 10px #00f5ff}
@keyframes s{0%{width:0%;margin-left:0}50%{width:55%}100%{width:0%;margin-left:100%}}
.status{font-size:10px;letter-spacing:2px;color:#00f5ff33;margin-top:20px;
  animation:blink 1.2s step-end infinite}
@keyframes blink{50%{opacity:0}}
</style></head><body>
<div class="logo">NEXUS</div>
<div class="sub">U L T R A</div>
<div class="bar-wrap"><div class="bar"></div></div>
<div class="status">INITIALIZING ENGINE...</div>
</body></html>`

// ── Window ────────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#0a0a0f',
    titleBarStyle: 'hiddenInset',
    frame: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  // Show the loading splash immediately, then switch to the real app once the
  // backend health-check passes.
  mainWindow.loadURL('data:text/html,' + encodeURIComponent(LOADING_HTML))
  mainWindow.once('ready-to-show', () => mainWindow.show())

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

  pollBackend(() => {
    if (!mainWindow) return
    if (isDev) {
      mainWindow.loadURL('http://localhost:5173')
      mainWindow.webContents.openDevTools()
    } else {
      mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))
    }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  await startBackend()
  createWindow()
})

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})

ipcMain.handle('open-external', (_, url) => shell.openExternal(url))

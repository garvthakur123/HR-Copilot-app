const { app, BrowserWindow, globalShortcut, ipcMain, screen, desktopCapturer, session, systemPreferences, dialog } = require('electron')
const path = require('path')
const https = require('https')

const isDev = process.env.NODE_ENV === 'development'
const STEP = 60

let mainWindow = null
let overlayWindow = null
let overlayVisible = false
let overlayX = 0
let overlayY = 80
let overlayOpacity = 0.95

// ── Main window ──────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#020617',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  if (isDev) mainWindow.loadURL('http://localhost:5173')
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  mainWindow.on('closed', () => {
    mainWindow = null
    if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.close()
    app.quit()
  })
}

// ── Overlay window ───────────────────────────────────────────
function createOverlayWindow() {
  const { width } = screen.getPrimaryDisplay().workAreaSize
  overlayX = width - 450
  overlayY = 80

  overlayWindow = new BrowserWindow({
    width: 430,
    height: 680,
    x: overlayX,
    y: overlayY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    fullscreenable: false,
    movable: true,
    resizable: false,
    focusable: true,
    show: false,
    // 'panel' lets window float above full-screen apps on macOS
    type: process.platform === 'linux' ? 'dock' : 'panel',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // allows fetch to OpenAI from file:// in production builds
      preload: path.join(__dirname, 'overlay-preload.cjs'),
    },
  })

  overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1)
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  // Click-through transparent areas by default
  overlayWindow.setIgnoreMouseEvents(true, { forward: true })

  if (isDev) {
    overlayWindow.loadURL('http://localhost:5173/?overlay=true')
  } else {
    overlayWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), {
      query: { overlay: 'true' },
    })
  }

  overlayWindow.on('move', () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return
    const [x, y] = overlayWindow.getPosition()
    overlayX = x
    overlayY = y
  })

  overlayWindow.on('closed', () => { overlayWindow = null })

  overlayWindow.webContents.on('did-finish-load', () => {
    overlayWindow?.webContents.send('shortcuts-info', {
      toggle: process.platform === 'darwin' ? '⌘⇧H' : 'Ctrl+Shift+H',
      move: process.platform === 'darwin' ? '⌘ Arrow keys' : 'Ctrl + Arrow keys',
      opacity: process.platform === 'darwin' ? '⌘[ / ⌘]' : 'Ctrl+[ / Ctrl+]',
    })
  })
}

// ── Overlay show / hide / toggle ─────────────────────────────
function showOverlay() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  overlayWindow.setOpacity(overlayOpacity)
  overlayWindow.showInactive()
  overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1)
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  overlayVisible = true
}

function hideOverlay() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  overlayWindow.setIgnoreMouseEvents(true, { forward: true })
  overlayWindow.setOpacity(0)
  overlayVisible = false
}

function toggleOverlay() {
  overlayVisible ? hideOverlay() : showOverlay()
}

// ── Move overlay ──────────────────────────────────────────────
function moveOverlay(dx, dy) {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  overlayX = Math.max(-380, Math.min(width - 50, overlayX + dx))
  overlayY = Math.max(-50, Math.min(height - 50, overlayY + dy))
  overlayWindow.setPosition(Math.round(overlayX), Math.round(overlayY))
}

// ── Opacity ───────────────────────────────────────────────────
function adjustOpacity(delta) {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  overlayOpacity = Math.max(0.15, Math.min(1.0, overlayOpacity + delta))
  if (overlayVisible) overlayWindow.setOpacity(overlayOpacity)
}

// ── App ready ─────────────────────────────────────────────────
app.whenReady().then(() => {
  createMainWindow()
  createOverlayWindow()

  globalShortcut.register('CommandOrControl+Shift+H', toggleOverlay)
  globalShortcut.register('CommandOrControl+Left', () => moveOverlay(-STEP, 0))
  globalShortcut.register('CommandOrControl+Right', () => moveOverlay(STEP, 0))
  globalShortcut.register('CommandOrControl+Up', () => moveOverlay(0, -STEP))
  globalShortcut.register('CommandOrControl+Down', () => moveOverlay(0, STEP))
  globalShortcut.register('CommandOrControl+]', () => adjustOpacity(0.1))
  globalShortcut.register('CommandOrControl+[', () => adjustOpacity(-0.1))
  globalShortcut.register('CommandOrControl+Shift+Q', () => app.quit())

  app.on('activate', () => {
    if (!mainWindow) createMainWindow()
  })
})

app.on('will-quit', () => globalShortcut.unregisterAll())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC: main window triggers overlay ────────────────────────
ipcMain.on('overlay-show', showOverlay)
ipcMain.on('overlay-hide', hideOverlay)
ipcMain.on('overlay-toggle', toggleOverlay)

// ── IPC: overlay window self-controls ────────────────────────
ipcMain.on('overlay-click-through', (_, passThrough) => {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  if (passThrough) {
    overlayWindow.setIgnoreMouseEvents(true, { forward: true })
  } else {
    overlayWindow.setIgnoreMouseEvents(false)
  }
})

ipcMain.on('overlay-set-opacity', (_, val) => {
  overlayOpacity = Math.max(0.15, Math.min(1.0, val))
  if (overlayVisible) overlayWindow?.setOpacity(overlayOpacity)
})

ipcMain.handle('overlay-get-opacity', () => overlayOpacity)

// ── IPC: system audio & permissions ───────────────────────────
ipcMain.handle('select-file', async (event) => {
  // Use a slight delay to ensure click events are settled
  await new Promise(r => setTimeout(r, 100))
  
  const win = mainWindow || BrowserWindow.fromWebContents(event.sender)
  if (!win) return null

  const result = await dialog.showOpenDialog(win, {
    title: 'Select Resume',
    properties: ['openFile'],
    filters: [
      { name: 'Documents', extensions: ['pdf', 'doc', 'docx'] }
    ]
  })
  
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('get-desktop-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({ 
      types: ['screen', 'window'],
      thumbnailSize: { width: 0, height: 0 } // optimization: we don't need thumbnails
    })
    return sources.map(s => ({ id: s.id, name: s.name }))
  } catch (err) {
    console.error('Error getting desktop sources:', err)
    return []
  }
})

ipcMain.handle('check-permissions', async () => {
  if (process.platform !== 'darwin') {
    return { microphone: 'granted', screen: 'granted' }
  }

  const micStatus = systemPreferences.getMediaAccessStatus('microphone')
  let screenStatus = 'unknown'
  
  // systemPreferences.getMediaAccessStatus('screen') is available in Electron 16+
  try {
    screenStatus = systemPreferences.getMediaAccessStatus('screen')
  } catch (e) {
    // Fallback if not available
  }

  return { microphone: micStatus, screen: screenStatus }
})

ipcMain.handle('request-mic-access', async () => {
  if (process.platform !== 'darwin') return true
  
  const status = systemPreferences.getMediaAccessStatus('microphone')
  if (status === 'granted') return true
  if (status === 'denied') return false
  
  return await systemPreferences.askForMediaAccess('microphone')
})

// ── IPC: Deepgram transcription via Node https ────────────────
// POST raw audio bytes — much simpler than Whisper multipart
ipcMain.handle('deepgram-transcribe', async (_, { audioData, mimeType, dgKey }) => {
  return new Promise((resolve, reject) => {
    const buf = Buffer.from(audioData) // Uint8Array from renderer
    const contentType = mimeType.split(';')[0] // strip codec params e.g. audio/webm

    const req = https.request({
      hostname: 'api.deepgram.com',
      path: '/v1/listen?model=nova-2&smart_format=true&language=en&diarize=true',
      method: 'POST',
      headers: {
        Authorization: `Token ${dgKey}`,
        'Content-Type': contentType,
        'Content-Length': buf.length,
      },
    }, (res) => {
      let raw = ''
      res.on('data', c => { raw += c })
      res.on('end', () => {
        try {
          const json = JSON.parse(raw)
          if (json.err_msg) reject(new Error(`Deepgram: ${json.err_msg}`))
          else {
            const words = json.results?.channels?.[0]?.alternatives?.[0]?.words || []
            resolve(words)
          }
        } catch {
          reject(new Error(`Deepgram parse error: ${raw.slice(0, 200)}`))
        }
      })
    })
    req.on('error', reject)
    req.write(buf)
    req.end()
  })
})


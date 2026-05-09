const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('overlayAPI', {
  // Hide this overlay window
  hide: () => ipcRenderer.send('overlay-hide'),

  // Toggle mouse click-through: false = card is interactive, true = clicks pass through
  setClickThrough: (passThrough) => ipcRenderer.send('overlay-click-through', passThrough),

  // Opacity
  getOpacity: () => ipcRenderer.invoke('overlay-get-opacity'),
  setOpacity: (val) => ipcRenderer.send('overlay-set-opacity', val),

  // Desktop/screen sources for system audio capture
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),

  // Deepgram via Node https — no CORS, no web security restrictions
  // audioData: Uint8Array, mimeType: string, dgKey: string → Promise<string>
  transcribe: (audioData, mimeType, dgKey) =>
    ipcRenderer.invoke('deepgram-transcribe', { audioData, mimeType, dgKey }),


  // Shortcut info from main process
  onShortcutsInfo: (cb) => {
    ipcRenderer.on('shortcuts-info', (_, data) => cb(data))
  },

  platform: process.platform,
})

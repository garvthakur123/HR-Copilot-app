const { contextBridge, ipcRenderer, webUtils } = require('electron')

contextBridge.exposeInMainWorld('copilotAPI', {
  // Trigger the overlay window from the main app
  openOverlay:   () => ipcRenderer.send('overlay-show'),
  closeOverlay:  () => ipcRenderer.send('overlay-hide'),
  toggleOverlay: () => ipcRenderer.send('overlay-toggle'),

  // Platform
  platform: process.platform,

  // Get full file system path from a File object (Electron 29+)
  getFilePath: (file) => webUtils.getPathForFile(file),

  // File picker via native dialog
  selectFile: () => ipcRenderer.invoke('select-file'),

  // Shortcut info (sent from main after load)
  onShortcutsInfo: (cb) => {
    ipcRenderer.on('shortcuts-info', (_, data) => cb(data))
  },
})

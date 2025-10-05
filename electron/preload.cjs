const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  platform: process.platform,
});

contextBridge.exposeInMainWorld('electronAPI', {
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  installUpdate: () => ipcRenderer.send('install-update'),
  setAutoLaunch: (enabled) => ipcRenderer.send('set-auto-launch', enabled),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_, version) => callback(version)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (_, percent) => callback(percent)),
  onCheckingForUpdate: (callback) => ipcRenderer.on('checking-for-update', callback),
  onShowAbout: (callback) => ipcRenderer.on('show-about', callback)
});

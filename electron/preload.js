const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  scanDirectory: (path) => ipcRenderer.invoke('scan-directory', path),
  readFileContent: (path) => ipcRenderer.invoke('read-file-content', path),
  getFilePreview: (path) => ipcRenderer.invoke('get-file-preview', path),
  exportImage: (dataUrl, filename) => ipcRenderer.invoke('export-image', dataUrl, filename),
  exportFile: (content, filename, extension) => ipcRenderer.invoke('export-file', content, filename, extension),
});

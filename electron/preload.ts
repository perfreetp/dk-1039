import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  scanDirectory: (path: string) => ipcRenderer.invoke('scan-directory', path),
  readFileContent: (path: string) => ipcRenderer.invoke('read-file-content', path),
  getFilePreview: (path: string) => ipcRenderer.invoke('get-file-preview', path),
  exportImage: (dataUrl: string, filename: string) => ipcRenderer.invoke('export-image', dataUrl, filename),
  exportFile: (content: string, filename: string, extension: string) => ipcRenderer.invoke('export-file', content, filename, extension),
});

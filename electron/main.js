const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    title: '文件关系图分析器',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#1a1a2e',
    show: false,
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: '选择文件夹',
  });
  
  if (result.canceled) {
    return null;
  }
  
  return result.filePaths[0];
});

ipcMain.handle('scan-directory', async (event, dirPath) => {
  const files = [];
  
  async function scanDir(currentPath) {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          const documentExts = ['.txt', '.md', '.doc', '.docx', '.pdf', '.ppt', '.pptx', '.xls', '.xlsx', '.csv', '.json', '.xml', '.html', '.css', '.js', '.ts', '.tsx', '.jsx'];
          const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico'];
          const shortcutExts = ['.lnk'];
          
          if (documentExts.includes(ext) || imageExts.includes(ext) || shortcutExts.includes(ext)) {
            const stats = fs.statSync(fullPath);
            
            let type = 'document';
            if (imageExts.includes(ext)) type = 'image';
            if (shortcutExts.includes(ext)) type = 'shortcut';
            
            const relativePath = path.relative(dirPath, fullPath);
            
            files.push({
              id: `file-${Buffer.from(relativePath).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`,
              name: entry.name,
              path: relativePath,
              type: type,
              size: stats.size,
              createdAt: stats.birthtime.toISOString(),
              modifiedAt: stats.mtime.toISOString(),
              fullPath: fullPath,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning ${currentPath}:`, error);
    }
  }
  
  await scanDir(dirPath);
  return files;
});

ipcMain.handle('read-file-content', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return '';
  }
});

ipcMain.handle('get-file-preview', async (event, filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.ico'];
    
    if (imageExts.includes(ext)) {
      const buffer = fs.readFileSync(filePath);
      const base64 = buffer.toString('base64');
      const mimeType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
      return `data:${mimeType};base64,${base64}`;
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting preview for ${filePath}:`, error);
    return null;
  }
});

ipcMain.handle('export-image', async (event, dataUrl, filename) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: filename,
    filters: [{ name: 'Images', extensions: ['png'] }],
  });
  
  if (result.canceled) {
    return false;
  }
  
  try {
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(result.filePath, base64Data, 'base64');
    return true;
  } catch (error) {
    console.error('Error exporting image:', error);
    return false;
  }
});

ipcMain.handle('export-file', async (event, content, filename, extension) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: filename,
    filters: [{ name: 'Files', extensions: [extension] }],
  });
  
  if (result.canceled) {
    return false;
  }
  
  try {
    fs.writeFileSync(result.filePath, content);
    return true;
  } catch (error) {
    console.error('Error exporting file:', error);
    return false;
  }
});

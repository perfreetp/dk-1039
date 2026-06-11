const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

let mainWindow;
let devServerPort = 5174;
let devServerReady = false;

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

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    waitForDevServer().then(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(`http://localhost:${devServerPort}`).catch((err) => {
          console.error('Failed to load dev server:', err.message);
        });
        mainWindow.webContents.openDevTools();
      }
    }).catch(() => {
      console.error('Dev server not available. Please run "npm run dev" first.');
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html')).catch((err) => {
      console.error('Failed to load production build:', err);
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function waitForDevServer(maxAttempts = 60, interval = 1000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const http = require('http');
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${devServerPort}`, (res) => {
          if (res.statusCode === 200) {
            resolve(true);
          } else {
            reject(new Error(`Status: ${res.statusCode}`));
          }
        });
        req.on('error', reject);
        req.setTimeout(1000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
      console.log('Dev server ready');
      devServerReady = true;
      return true;
    } catch (err) {
      if (i < maxAttempts - 1) {
        console.log(`Waiting for dev server... (${i + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
  }
  throw new Error('Dev server not available');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function parseShortcut(targetPath) {
  try {
    const psScript = `
      $shell = New-Object -ComObject WScript.Shell
      $shortcut = $shell.CreateShortcut('${targetPath.replace(/'/g, "''")}')
      Write-Output $shortcut.TargetPath
    `;
    const result = execSync(`powershell -Command "${psScript.replace(/\n/g, ' ')}"`, {
      encoding: 'utf-8',
      timeout: 5000,
    });
    return result.trim();
  } catch (error) {
    return null;
  }
}

ipcMain.handle('select-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '选择文件夹',
    });
    
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    
    return result.filePaths[0];
  } catch (error) {
    console.error('Error selecting folder:', error);
    return null;
  }
});

ipcMain.handle('scan-directory', async (event, dirPath) => {
  const files = [];
  const shortcutTargets = new Map();
  
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
            let shortcutTarget = undefined;
            
            if (imageExts.includes(ext)) {
              type = 'image';
            } else if (shortcutExts.includes(ext)) {
              type = 'shortcut';
              shortcutTarget = parseShortcut(fullPath);
              if (shortcutTarget) {
                const targetRelative = path.relative(dirPath, shortcutTarget);
                if (!targetRelative.startsWith('..')) {
                  shortcutTargets.set(fullPath, targetRelative);
                }
              }
            }
            
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
              shortcutTarget: shortcutTarget,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning ${currentPath}:`, error);
    }
  }
  
  await scanDir(dirPath);
  
  files.forEach(file => {
    if (file.type === 'shortcut' && file.shortcutTarget) {
      const relativeTarget = shortcutTargets.get(file.fullPath);
      if (relativeTarget) {
        file.shortcutTarget = relativeTarget;
      } else {
        const targetFile = files.find(f => f.fullPath === file.shortcutTarget || f.path === path.basename(file.shortcutTarget));
        if (targetFile) {
          file.shortcutTarget = targetFile.path;
        }
      }
    }
  });
  
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
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: filename,
      filters: [{ name: 'Images', extensions: ['png'] }],
    });
    
    if (result.canceled || !result.filePath) {
      return false;
    }
    
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(result.filePath, base64Data, 'base64');
    return true;
  } catch (error) {
    console.error('Error exporting image:', error);
    return false;
  }
});

ipcMain.handle('export-file', async (event, content, filename, extension) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: filename,
      filters: [{ name: 'Files', extensions: [extension] }],
    });
    
    if (result.canceled || !result.filePath) {
      return false;
    }
    
    fs.writeFileSync(result.filePath, content);
    return true;
  } catch (error) {
    console.error('Error exporting file:', error);
    return false;
  }
});

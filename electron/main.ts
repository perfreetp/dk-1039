import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

let mainWindow: BrowserWindow | null = null;

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

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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

function parseShortcut(targetPath: string): string | null {
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

interface ScannedFile {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
  fullPath: string;
  shortcutTarget?: string;
}

ipcMain.handle('select-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
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

ipcMain.handle('scan-directory', async (_event, dirPath: string) => {
  const files: ScannedFile[] = [];
  const shortcutTargets = new Map<string, string>();
  
  async function scanDir(currentPath: string) {
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
            let shortcutTarget: string | undefined;
            
            if (imageExts.includes(ext)) {
              type = 'image';
            } else if (shortcutExts.includes(ext)) {
              type = 'shortcut';
              const target = parseShortcut(fullPath);
              if (target) {
                shortcutTarget = target;
                const targetRelative = path.relative(dirPath, target);
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
              type,
              size: stats.size,
              createdAt: stats.birthtime.toISOString(),
              modifiedAt: stats.mtime.toISOString(),
              fullPath,
              shortcutTarget,
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
        const targetFile = files.find(f => f.fullPath === file.shortcutTarget || f.path === path.basename(file.shortcutTarget!));
        if (targetFile) {
          file.shortcutTarget = targetFile.path;
        }
      }
    }
  });
  
  return files;
});

ipcMain.handle('read-file-content', async (_event, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return '';
  }
});

ipcMain.handle('get-file-preview', async (_event, filePath: string) => {
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

ipcMain.handle('export-image', async (_event, dataUrl: string, filename: string) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow!, {
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

ipcMain.handle('export-file', async (_event, content: string, filename: string, extension: string) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow!, {
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

import { useCallback, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { FileNode } from '../types/file';
import { RelationshipEdge } from '../types/relationship';
import { generateMockData, detectFileMentions } from '../services/fileScanner';
import { createRelationship } from '../services/relationshipEngine';

declare global {
  interface Window {
    electronAPI?: {
      selectFolder: () => Promise<string | null>;
      scanDirectory: (path: string) => Promise<any[]>;
      readFileContent: (path: string) => Promise<string>;
      getFilePreview: (path: string) => Promise<string | null>;
      exportImage: (dataUrl: string, filename: string) => Promise<boolean>;
      exportFile: (content: string, filename: string, extension: string) => Promise<boolean>;
    };
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
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
  fullPath?: string;
  shortcutTarget?: string;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function useFileScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const {
    setFiles,
    setRelationships,
    setCurrentProject,
    setIsScanning: setStoreScanning,
    setScanProgress,
  } = useAppStore();

  const scanDirectory = useCallback(async () => {
    try {
      let dirPath: string | null = null;

      if (window.electronAPI) {
        dirPath = await window.electronAPI.selectFolder();
      } else if (window.showDirectoryPicker) {
        const dirHandle = await window.showDirectoryPicker();
        dirPath = dirHandle.name;
      } else {
        alert('您的环境不支持文件夹选择。请使用 Electron 桌面版本或 Chrome/Edge 浏览器。');
        return;
      }

      if (!dirPath) return;

      setIsScanning(true);
      setStoreScanning(true);
      setProgress(0);

      let scanResults: ScannedFile[] = [];

      if (window.electronAPI) {
        scanResults = await window.electronAPI.scanDirectory(dirPath);
      }

      setProgress(30);

      const files: FileNode[] = scanResults.map((item: ScannedFile) => ({
        id: item.id,
        name: item.name,
        path: item.path,
        type: item.type as 'document' | 'image' | 'shortcut',
        size: item.size,
        createdAt: item.createdAt,
        modifiedAt: item.modifiedAt,
        shortcutTarget: item.shortcutTarget,
      }));

      setProgress(40);

      const contentMap = new Map<string, string>();
      const fileNameMap = new Map<string, FileNode[]>();

      files.forEach(file => {
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        if (!fileNameMap.has(baseName)) {
          fileNameMap.set(baseName, []);
        }
        fileNameMap.get(baseName)!.push(file);
      });

      if (window.electronAPI) {
        const documentFiles = files.filter(f => f.type === 'document');
        for (let i = 0; i < documentFiles.length; i++) {
          const file = documentFiles[i];
          const scannedFile = scanResults.find(sf => sf.id === file.id);
          if (scannedFile?.fullPath) {
            try {
              const content = await window.electronAPI.readFileContent(scannedFile.fullPath);
              contentMap.set(file.id, content);
            } catch (error) {
              console.error(`Error reading file content: ${file.name}`, error);
            }
          }
          setProgress(40 + ((i + 1) / documentFiles.length) * 30);
        }
      }

      setProgress(70);

      const relationships: RelationshipEdge[] = [];
      const addedRelations = new Set<string>();

      files.forEach(sourceFile => {
        if (sourceFile.type !== 'document') return;

        const content = contentMap.get(sourceFile.id) || '';

        fileNameMap.forEach((targetFiles, baseName) => {
          if (targetFiles[0].id === sourceFile.id) return;

          const patterns = [
            baseName,
            baseName.replace(/\s+/g, ''),
            baseName.replace(/[_\-]+/g, ''),
          ];

          for (const pattern of patterns) {
            if (pattern.length < 2) continue;

            const regex = new RegExp(`\\b${escapeRegExp(pattern)}\\b`, 'i');
            if (regex.test(content)) {
              targetFiles.forEach(targetFile => {
                const relKey = `${sourceFile.id}->${targetFile.id}`;
                if (!addedRelations.has(relKey)) {
                  addedRelations.add(relKey);
                  relationships.push(
                    createRelationship(
                      sourceFile.id,
                      targetFile.id,
                      'mention',
                      `在 "${sourceFile.name}" 中提及 "${targetFile.name}"`
                    )
                  );
                }
              });
              break;
            }
          }
        });
      });

      files.forEach(file => {
        if (file.type === 'shortcut' && file.shortcutTarget) {
          const targetFile = files.find(f => 
            f.path === file.shortcutTarget || 
            f.name === file.shortcutTarget ||
            f.fullPath === file.shortcutTarget
          );

          if (targetFile) {
            const relKey = `${file.id}->${targetFile.id}`;
            if (!addedRelations.has(relKey)) {
              addedRelations.add(relKey);
              relationships.push(
                createRelationship(
                  file.id,
                  targetFile.id,
                  'shortcut',
                  `快捷方式指向 "${targetFile.name}"`
                )
              );
            }
          }
        }
      });

      setFiles(files);
      setRelationships(relationships);
      setCurrentProject({
        path: dirPath,
        name: dirPath.split(/[/\\]/).pop() || '项目',
      });

      setProgress(100);

      return { files, relationships };
    } catch (error) {
      console.error('Error scanning directory:', error);
      return null;
    } finally {
      setIsScanning(false);
      setStoreScanning(false);
      setProgress(0);
    }
  }, [setFiles, setRelationships, setCurrentProject, setIsScanning, setScanProgress]);

  const loadMockData = useCallback(() => {
    const files = generateMockData();

    const mentions = detectFileMentions(files, new Map());
    const relationships: RelationshipEdge[] = mentions.map((m) =>
      createRelationship(m.sourceId, m.targetId, 'mention', undefined, 5)
    );

    const sourceToTargets: Record<string, string[]> = {
      'file-001': ['file-002', 'file-003'],
      'file-002': ['file-005'],
      'file-004': ['file-001', 'file-011'],
      'file-006': ['file-001'],
      'file-007': ['file-006'],
      'file-008': ['file-006'],
      'file-009': ['file-010'],
    };

    Object.entries(sourceToTargets).forEach(([sourceId, targetIds]) => {
      targetIds.forEach((targetId) => {
        if (!relationships.find((r) => r.sourceId === sourceId && r.targetId === targetId)) {
          relationships.push(createRelationship(sourceId, targetId, 'mention'));
        }
      });
    });

    setFiles(files);
    setRelationships(relationships);
    setCurrentProject({ path: '/项目资料', name: '示例项目' });
  }, [setFiles, setRelationships, setCurrentProject]);

  return {
    isScanning,
    progress,
    scanDirectory,
    loadMockData,
  };
}

export function useFileFilter() {
  const { files, filters } = useAppStore();

  const filteredFiles = useCallback(() => {
    return files.filter((file) => {
      if (!filters.fileTypes.includes(file.type)) return false;

      if (filters.searchKeyword) {
        const keyword = filters.searchKeyword.toLowerCase();
        const nameMatch = file.name.toLowerCase().includes(keyword);
        const pathMatch = file.path.toLowerCase().includes(keyword);
        if (!nameMatch && !pathMatch) return false;
      }

      if (filters.dateRange) {
        const fileDate = new Date(file.modifiedAt);
        const start = new Date(filters.dateRange.start);
        const end = new Date(filters.dateRange.end);
        if (fileDate < start || fileDate > end) return false;
      }

      return true;
    });
  }, [files, filters]);

  return { filteredFiles };
}

export function useSelectedFile(): FileNode | null {
  const { files, selectedFileId } = useAppStore();
  return files.find((f) => f.id === selectedFileId) || null;
}

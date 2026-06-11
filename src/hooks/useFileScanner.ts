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

      setProgress(50);

      const files: FileNode[] = scanResults.map((item: ScannedFile) => ({
        id: item.id,
        name: item.name,
        path: item.path,
        type: item.type as 'document' | 'image' | 'shortcut',
        size: item.size,
        createdAt: item.createdAt,
        modifiedAt: item.modifiedAt,
      }));

      setProgress(70);

      const contentMap = new Map<string, string>();
      if (window.electronAPI) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const scannedFile = scanResults.find(sf => sf.id === file.id);
          if (file.type === 'document' && scannedFile?.fullPath) {
            try {
              const content = await window.electronAPI.readFileContent(scannedFile.fullPath);
              contentMap.set(file.id, content);
            } catch (error) {
              console.error(`Error reading file content: ${file.name}`, error);
            }
          }
          setProgress(70 + ((i + 1) / files.length) * 20);
        }
      }

      setProgress(90);

      const mentions = detectFileMentions(files, contentMap);
      const relationships: RelationshipEdge[] = mentions.map((m) =>
        createRelationship(m.sourceId, m.targetId, 'mention', undefined, 5)
      );

      const documentFiles = files.filter(f => f.type === 'document');
      for (let i = 0; i < documentFiles.length; i++) {
        const file1 = documentFiles[i];
        for (let j = i + 1; j < documentFiles.length; j++) {
          const file2 = documentFiles[j];
          const content = contentMap.get(file1.id) || '';
          const file2Name = file2.name.replace(/\.[^/.]+$/, '');
          const patterns = [
            file2Name,
            file2Name.replace(/\s+/g, ''),
            file2Name.replace(/[_-]/g, ''),
          ];

          for (const pattern of patterns) {
            const regex = new RegExp(`\\b${pattern}\\b`, 'i');
            if (regex.test(content)) {
              const exists = relationships.find(
                r => r.sourceId === file1.id && r.targetId === file2.id
              );
              if (!exists) {
                relationships.push(
                  createRelationship(file1.id, file2.id, 'mention', `在 "${file1.name}" 中提及`)
                );
              }
              break;
            }
          }
        }
        setProgress(90 + (i / documentFiles.length) * 10);
      }

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

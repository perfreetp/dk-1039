import { useCallback, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { FileNode } from '../types/file';
import { RelationshipEdge } from '../types/relationship';
import {
  scanDirectoryWithFileSystemAPI,
  generateMockData,
  detectFileMentions,
} from '../services/fileScanner';
import { createRelationship } from '../services/relationshipEngine';

declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
  }
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
      if (!window.showDirectoryPicker) {
        alert('您的浏览器不支持 File System Access API。请使用 Chrome/Edge 浏览器或加载示例数据。');
        return;
      }

      const dirHandle = await window.showDirectoryPicker();
      if (!dirHandle) return;

      setIsScanning(true);
      setStoreScanning(true);
      setProgress(0);

      const files = await scanDirectoryWithFileSystemAPI(
        dirHandle,
        (p) => {
          setProgress(p);
          setScanProgress(p);
        }
      );

      const mentions = detectFileMentions(files, new Map());
      const relationships: RelationshipEdge[] = mentions.map((m) =>
        createRelationship(m.sourceId, m.targetId, 'mention', undefined, 5)
      );

      setFiles(files);
      setRelationships(relationships);
      setCurrentProject({
        path: dirHandle.name,
        name: dirHandle.name,
      });

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

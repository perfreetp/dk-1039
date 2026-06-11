import { create } from 'zustand';
import { FileNode, FilterOptions } from '../types/file';
import { RelationshipEdge } from '../types/relationship';

interface AppState {
  files: FileNode[];
  relationships: RelationshipEdge[];
  filters: FilterOptions;
  selectedFileId: string | null;
  selectedEdgeId: string | null;
  sidebarOpen: boolean;
  searchPanelOpen: boolean;
  exportPanelOpen: boolean;
  editorOpen: boolean;
  currentProject: { path: string; name: string } | null;
  isScanning: boolean;
  scanProgress: number;

  setFiles: (files: FileNode[]) => void;
  setRelationships: (relationships: RelationshipEdge[]) => void;
  addFile: (file: FileNode) => void;
  removeFile: (fileId: string) => void;
  addRelationship: (relationship: RelationshipEdge) => void;
  removeRelationship: (relationshipId: string) => void;
  updateRelationship: (relationshipId: string, updates: Partial<RelationshipEdge>) => void;
  mergeRelationships: (sourceIds: string[], targetId: string, note?: string) => void;
  setSelectedFileId: (fileId: string | null) => void;
  setSelectedEdgeId: (edgeId: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchPanelOpen: (open: boolean) => void;
  setExportPanelOpen: (open: boolean) => void;
  setEditorOpen: (open: boolean) => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
  setCurrentProject: (project: { path: string; name: string } | null) => void;
  setIsScanning: (scanning: boolean) => void;
  setScanProgress: (progress: number) => void;
  updateFilePosition: (fileId: string, position: { x: number; y: number }) => void;
  clearAll: () => void;
}

const defaultFilters: FilterOptions = {
  fileTypes: ['document', 'image', 'shortcut'],
  dateRange: null,
  searchKeyword: '',
  showOrphan: true,
  minRelations: 0,
};

export const useAppStore = create<AppState>((set) => ({
  files: [],
  relationships: [],
  filters: defaultFilters,
  selectedFileId: null,
  selectedEdgeId: null,
  sidebarOpen: false,
  searchPanelOpen: false,
  exportPanelOpen: false,
  editorOpen: false,
  currentProject: null,
  isScanning: false,
  scanProgress: 0,

  setFiles: (files) => set({ files }),
  setRelationships: (relationships) => set({ relationships }),

  addFile: (file) => set((state) => ({ files: [...state.files, file] })),

  removeFile: (fileId) => set((state) => ({
    files: state.files.filter((f) => f.id !== fileId),
    relationships: state.relationships.filter(
      (r) => r.sourceId !== fileId && r.targetId !== fileId
    ),
    selectedFileId: state.selectedFileId === fileId ? null : state.selectedFileId,
  })),

  addRelationship: (relationship) =>
    set((state) => ({ relationships: [...state.relationships, relationship] })),

  removeRelationship: (relationshipId) =>
    set((state) => ({
      relationships: state.relationships.filter((r) => r.id !== relationshipId),
      selectedEdgeId: state.selectedEdgeId === relationshipId ? null : state.selectedEdgeId,
    })),

  updateRelationship: (relationshipId, updates) =>
    set((state) => ({
      relationships: state.relationships.map((r) =>
        r.id === relationshipId ? { ...r, ...updates } : r
      ),
    })),

  mergeRelationships: (sourceIds, targetId, note) =>
    set((state) => {
      const relationshipsToMerge = state.relationships.filter((r) =>
        sourceIds.includes(r.id)
      );
      if (relationshipsToMerge.length === 0) return state;

      const firstRel = relationshipsToMerge[0];
      const mergedRelationship: RelationshipEdge = {
        id: `merged-${Date.now()}`,
        sourceId: firstRel.sourceId,
        targetId: firstRel.targetId,
        type: 'manual',
        note: note || relationshipsToMerge.map((r) => r.note).filter(Boolean).join('; '),
        weight: Math.max(...relationshipsToMerge.map((r) => r.weight)),
        createdAt: new Date().toISOString(),
      };

      return {
        relationships: [
          ...state.relationships.filter((r) => !sourceIds.includes(r.id)),
          mergedRelationship,
        ],
      };
    }),

  setSelectedFileId: (fileId) => set({ selectedFileId: fileId }),
  setSelectedEdgeId: (edgeId) => set({ selectedEdgeId: edgeId }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSearchPanelOpen: (open) => set({ searchPanelOpen: open }),
  setExportPanelOpen: (open) => set({ exportPanelOpen: open }),
  setEditorOpen: (open) => set({ editorOpen: open }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  setCurrentProject: (project) => set({ currentProject: project }),
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  setScanProgress: (progress) => set({ scanProgress: progress }),

  updateFilePosition: (fileId, position) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === fileId ? { ...f, position } : f
      ),
    })),

  clearAll: () =>
    set({
      files: [],
      relationships: [],
      filters: defaultFilters,
      selectedFileId: null,
      selectedEdgeId: null,
      currentProject: null,
    }),
}));

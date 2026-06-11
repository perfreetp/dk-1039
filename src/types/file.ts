export type FileType = 'document' | 'image' | 'shortcut';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: FileType;
  size: number;
  createdAt: string;
  modifiedAt: string;
  preview?: string;
  position?: { x: number; y: number };
}

export interface FilterOptions {
  fileTypes: FileType[];
  dateRange: { start: string; end: string } | null;
  searchKeyword: string;
  showOrphan: boolean;
  minRelations: number;
}

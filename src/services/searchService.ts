import { FileNode } from '../types/file';
import { RelationshipEdge } from '../types/relationship';

export function findOrphanFiles(
  files: FileNode[],
  relationships: RelationshipEdge[]
): FileNode[] {
  const connectedIds = new Set<string>();

  relationships.forEach((rel) => {
    connectedIds.add(rel.sourceId);
    connectedIds.add(rel.targetId);
  });

  return files.filter((file) => !connectedIds.has(file.id));
}

export function findDuplicateFiles(
  files: FileNode[]
): FileNode[][] {
  const groups: Map<string, FileNode[]> = new Map();

  files.forEach((file) => {
    const normalizedName = file.name
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[._-]+/g, '_')
      .replace(/\.[^/.]+$/, '');

    if (!groups.has(normalizedName)) {
      groups.set(normalizedName, []);
    }
    groups.get(normalizedName)!.push(file);
  });

  return Array.from(groups.values()).filter((group) => group.length > 1);
}

export function findHighAssociationFiles(
  files: FileNode[],
  relationships: RelationshipEdge[],
  threshold: number = 3
): { file: FileNode; connectionCount: number }[] {
  const connectionCounts = new Map<string, number>();

  relationships.forEach((rel) => {
    connectionCounts.set(rel.sourceId, (connectionCounts.get(rel.sourceId) || 0) + 1);
    connectionCounts.set(rel.targetId, (connectionCounts.get(rel.targetId) || 0) + 1);
  });

  const results: { file: FileNode; connectionCount: number }[] = [];

  files.forEach((file) => {
    const count = connectionCounts.get(file.id) || 0;
    if (count >= threshold) {
      results.push({ file, connectionCount: count });
    }
  });

  return results.sort((a, b) => b.connectionCount - a.connectionCount);
}

export function searchFiles(
  files: FileNode[],
  keyword: string
): FileNode[] {
  if (!keyword.trim()) return files;

  const lowerKeyword = keyword.toLowerCase();

  return files.filter((file) => {
    const nameMatch = file.name.toLowerCase().includes(lowerKeyword);
    const pathMatch = file.path.toLowerCase().includes(lowerKeyword);
    return nameMatch || pathMatch;
  });
}

export function getFileConnections(
  fileId: string,
  relationships: RelationshipEdge[]
): { incoming: RelationshipEdge[]; outgoing: RelationshipEdge[] } {
  const incoming = relationships.filter((rel) => rel.targetId === fileId);
  const outgoing = relationships.filter((rel) => rel.sourceId === fileId);

  return { incoming, outgoing };
}

export function getRelatedFiles(
  fileId: string,
  relationships: RelationshipEdge[]
): FileNode[] {
  const relatedIds = new Set<string>();

  relationships.forEach((rel) => {
    if (rel.sourceId === fileId) {
      relatedIds.add(rel.targetId);
    }
    if (rel.targetId === fileId) {
      relatedIds.add(rel.sourceId);
    }
  });

  return Array.from(relatedIds) as unknown as FileNode[];
}

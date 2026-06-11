import { RelationshipEdge, RelationshipType } from '../types/relationship';
import { FileNode } from '../types/file';

export function createRelationship(
  sourceId: string,
  targetId: string,
  type: RelationshipType = 'manual',
  note?: string,
  weight: number = 5
): RelationshipEdge {
  return {
    id: `rel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    sourceId,
    targetId,
    type,
    note,
    weight,
    createdAt: new Date().toISOString(),
  };
}

export function calculateRelationshipWeight(
  sourceFile: FileNode,
  targetFile: FileNode,
  type: RelationshipType
): number {
  let weight = 5;

  if (type === 'shortcut') {
    weight += 3;
  } else if (type === 'mention') {
    weight += 2;
  }

  if (sourceFile.type === 'image' && targetFile.type === 'document') {
    weight += 1;
  }

  const sizeDiff = Math.abs(sourceFile.size - targetFile.size);
  if (sizeDiff < 1024 * 1024) {
    weight += 1;
  }

  return Math.min(weight, 10);
}

export function detectRelationshipsFromContent(
  files: FileNode[],
  contentMap: Map<string, string>
): RelationshipEdge[] {
  const relationships: RelationshipEdge[] = [];
  const fileNameMap = new Map<string, FileNode>();

  files.forEach((file) => {
    const baseName = file.name.replace(/\.[^/.]+$/, '').toLowerCase();
    fileNameMap.set(baseName, file);
  });

  for (const [fileId, content] of contentMap.entries()) {
    const sourceFile = files.find((f) => f.id === fileId);
    if (!sourceFile) continue;

    for (const [baseName, targetFile] of fileNameMap.entries()) {
      if (fileId === targetFile.id) continue;

      const pattern = new RegExp(`\\b${baseName}\\b`, 'i');
      if (pattern.test(content)) {
        const weight = calculateRelationshipWeight(sourceFile, targetFile, 'mention');
        relationships.push(
          createRelationship(fileId, targetFile.id, 'mention', undefined, weight)
        );
      }
    }
  }

  return relationships;
}

export function mergeRelationshipNotes(
  relationships: RelationshipEdge[],
  idsToMerge: string[],
  newNote: string
): RelationshipEdge[] {
  if (idsToMerge.length < 2) return relationships;

  const toMerge = relationships.filter((r) => idsToMerge.includes(r.id));
  const notToMerge = relationships.filter((r) => !idsToMerge.includes(r.id));

  const mergedWeight = Math.max(...toMerge.map((r) => r.weight));
  const existingNotes = toMerge
    .map((r) => r.note)
    .filter(Boolean)
    .join('; ');

  const merged: RelationshipEdge = {
    id: `merged-${Date.now()}`,
    sourceId: toMerge[0].sourceId,
    targetId: toMerge[0].targetId,
    type: 'manual',
    note: existingNotes ? `${existingNotes}; ${newNote}` : newNote,
    weight: mergedWeight,
    createdAt: new Date().toISOString(),
  };

  return [...notToMerge, merged];
}

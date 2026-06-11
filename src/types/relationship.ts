export type RelationshipType = 'mention' | 'shortcut' | 'manual';

export interface RelationshipEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  note?: string;
  weight: number;
  createdAt: string;
}

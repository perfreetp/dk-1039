import { memo } from 'react';
import {
  BaseEdge,
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
} from '@xyflow/react';
import { X } from 'lucide-react';

interface CustomEdgeData {
  type?: string;
  note?: string;
  weight?: number;
  onDelete?: (id: string) => void;
}

export const CustomEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as CustomEdgeData | undefined;

  const getEdgeColor = () => {
    if (selected) return '#e94560';
    switch (edgeData?.type) {
      case 'mention':
        return '#6366f1';
      case 'shortcut':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  const handleDelete = () => {
    if (edgeData?.onDelete) {
      edgeData.onDelete(id);
    }
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: getEdgeColor(),
          strokeWidth: selected ? 3 : 2,
          strokeOpacity: 0.8,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {edgeData?.note && (
            <div
              className={`
                px-2 py-1 rounded-lg text-xs text-white bg-primary-lighter/90
                backdrop-blur-sm border border-white/10 max-w-[150px]
                ${selected ? 'ring-2 ring-accent' : ''}
              `}
            >
              {String(edgeData.note)}
            </div>
          )}
          {selected && (
            <button
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-accent text-white
                         flex items-center justify-center hover:bg-accent-light transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

CustomEdge.displayName = 'CustomEdge';

import { useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import { FileNodeComponent } from './FileNode';
import { CustomEdge } from './CustomEdge';
import { useAppStore } from '../../store/appStore';
import { FileNode } from '../../types/file';
import { RelationshipEdge } from '../../types/relationship';

const nodeTypes = {
  fileNode: FileNodeComponent,
};

const edgeTypes = {
  custom: CustomEdge,
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
) => {
  dagreGraph.setGraph({ rankdir: direction, nodesep: 100, ranksep: 150 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 220, height: 80 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 110,
        y: nodeWithPosition.y - 40,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

interface RelationshipGraphProps {
  graphRef?: React.RefObject<HTMLDivElement>;
}

export function RelationshipGraph({ graphRef }: RelationshipGraphProps) {
  const {
    files,
    relationships,
    filters,
    selectedFileId,
    setSelectedFileId,
    removeRelationship,
  } = useAppStore();

  const isInitialized = useRef(false);

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      if (!filters.fileTypes.includes(file.type)) return false;
      
      if (filters.dateRange) {
        const fileDate = new Date(file.modifiedAt);
        const start = new Date(filters.dateRange.start);
        const end = new Date(filters.dateRange.end);
        end.setHours(23, 59, 59, 999);
        if (fileDate < start || fileDate > end) return false;
      }
      
      if (filters.searchKeyword) {
        const keyword = filters.searchKeyword.toLowerCase();
        if (
          !file.name.toLowerCase().includes(keyword) &&
          !file.path.toLowerCase().includes(keyword)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [files, filters]);

  const filteredRelationships = useMemo(() => {
    const fileIds = new Set(filteredFiles.map(f => f.id));
    return relationships.filter((rel) => {
      return fileIds.has(rel.sourceId) && fileIds.has(rel.targetId);
    });
  }, [relationships, filteredFiles]);

  const computedNodes: Node[] = useMemo(() => {
    return filteredFiles.map((file: FileNode) => ({
      id: file.id,
      type: 'fileNode',
      position: file.position || { x: 0, y: 0 },
      data: {
        label: file.name,
        type: file.type,
        size: file.size,
        preview: file.preview,
      },
      selected: file.id === selectedFileId,
    }));
  }, [filteredFiles, selectedFileId]);

  const computedEdges: Edge[] = useMemo(() => {
    return filteredRelationships.map((rel: RelationshipEdge) => ({
      id: rel.id,
      source: rel.sourceId,
      target: rel.targetId,
      type: 'custom',
      data: {
        type: rel.type,
        note: rel.note,
        weight: rel.weight,
        onDelete: removeRelationship,
      },
    }));
  }, [filteredRelationships, removeRelationship]);

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    return getLayoutedElements(computedNodes, computedEdges);
  }, [computedNodes, computedEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  useEffect(() => {
    if (isInitialized.current) {
      const { nodes: newNodes, edges: newEdges } = getLayoutedElements(computedNodes, computedEdges);
      setNodes(newNodes);
      setEdges(newEdges);
    } else {
      isInitialized.current = true;
    }
  }, [computedNodes, computedEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, type: 'custom' }, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedFileId(node.id);
    },
    [setSelectedFileId]
  );

  const onPaneClick = useCallback(() => {
    setSelectedFileId(null);
  }, [setSelectedFileId]);

  return (
    <div ref={graphRef} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        defaultEdgeOptions={{
          type: 'custom',
          animated: false,
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#ffffff10"
        />
        <Controls
          showZoom
          showFitView
          showInteractive={false}
          position="bottom-left"
        />
        <MiniMap
          nodeColor={(node) => {
            switch (node.data?.type) {
              case 'image':
                return '#3b82f6';
              case 'shortcut':
                return '#f59e0b';
              default:
                return '#e94560';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
          position="bottom-right"
        />
      </ReactFlow>
    </div>
  );
}

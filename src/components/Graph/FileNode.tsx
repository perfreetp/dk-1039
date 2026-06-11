import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FileText, Image, Link2 } from 'lucide-react';

interface FileNodeData {
  label: string;
  type: string;
  size: number;
  preview?: string;
}

export const FileNodeComponent = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as FileNodeData;
  const label = nodeData?.label || '';
  const type = nodeData?.type || 'document';
  const preview = nodeData?.preview;

  const getIcon = () => {
    switch (type) {
      case 'image':
        return <Image size={16} className="text-blue-400" />;
      case 'shortcut':
        return <Link2 size={16} className="text-yellow-400" />;
      default:
        return <FileText size={16} className="text-accent" />;
    }
  };

  return (
    <div
      className={`
        px-4 py-3 rounded-xl border-2 transition-all duration-200 min-w-[180px]
        ${selected
          ? 'border-accent bg-primary-lighter shadow-lg shadow-accent/20'
          : 'border-white/20 bg-primary-light hover:border-white/40 hover:bg-primary-lighter/50'
        }
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-accent !border-2 !border-white"
      />

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          {preview ? (
            <img
              src={preview}
              alt={label}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            getIcon()
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate" title={label}>
            {label}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            {type === 'document' && '文档'}
            {type === 'image' && '图片'}
            {type === 'shortcut' && '快捷方式'}
          </p>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-accent !border-2 !border-white"
      />
    </div>
  );
});

FileNodeComponent.displayName = 'FileNodeComponent';

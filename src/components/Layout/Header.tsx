import { FolderOpen, Scan, Search, Download, Plus } from 'lucide-react';
import { Button, Input, Select, Space, Badge } from 'antd';
import { useAppStore } from '../../store/appStore';
import { useFileScanner } from '../../hooks/useFileScanner';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenExport: () => void;
  onOpenEditor: () => void;
}

export function Header({ onOpenSearch, onOpenExport, onOpenEditor }: HeaderProps) {
  const {
    currentProject,
    filters,
    setFilters,
    isScanning,
  } = useAppStore();

  const { scanDirectory, loadMockData, progress } = useFileScanner();

  return (
    <header className="h-16 bg-primary-light border-b border-white/10 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-white font-bold text-sm">FR</span>
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg leading-tight">File Relationship</h1>
            <p className="text-gray-400 text-xs">文件关系图分析器</p>
          </div>
        </div>

        <div className="h-8 w-px bg-white/10 mx-2" />

        <Space size="middle">
          <Button
            icon={<FolderOpen size={16} />}
            onClick={scanDirectory}
            loading={isScanning}
            className="flex items-center gap-2"
          >
            选择文件夹
          </Button>

          <Button
            icon={<Scan size={16} />}
            onClick={loadMockData}
            disabled={isScanning}
          >
            加载示例数据
          </Button>
        </Space>

        {currentProject && (
          <div className="ml-4 px-3 py-1 bg-primary-lighter rounded-lg">
            <span className="text-gray-400 text-sm">当前项目：</span>
            <span className="text-white text-sm ml-1">{currentProject.name}</span>
          </div>
        )}

        {isScanning && (
          <div className="ml-4 flex items-center gap-2">
            <div className="w-32 h-2 bg-primary-lighter rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-gray-400 text-sm">{progress}%</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="搜索文件名..."
          className="w-64 bg-primary-lighter border-white/10"
          prefix={<Search size={16} className="text-gray-400" />}
          value={filters.searchKeyword}
          onChange={(e) => setFilters({ searchKeyword: e.target.value })}
        />

        <Select
          mode="multiple"
          placeholder="文件类型"
          value={filters.fileTypes}
          onChange={(value) => setFilters({ fileTypes: value })}
          className="w-40"
          options={[
            { label: '文档', value: 'document' },
            { label: '图片', value: 'image' },
            { label: '快捷方式', value: 'shortcut' },
          ]}
        />

        <Space size="small">
          <Badge count={0} size="small">
            <Button
              icon={<Search size={16} />}
              onClick={onOpenSearch}
              className="flex items-center"
            >
              搜索
            </Button>
          </Badge>

          <Button
            icon={<Plus size={16} />}
            onClick={onOpenEditor}
            className="flex items-center"
          >
            编辑关系
          </Button>

          <Button
            icon={<Download size={16} />}
            onClick={onOpenExport}
            className="flex items-center"
          >
            导出
          </Button>
        </Space>
      </div>
    </header>
  );
}

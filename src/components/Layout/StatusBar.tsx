import { FileText, Link2, Filter, Eye, EyeOff, Calendar } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import dayjs from 'dayjs';

export function StatusBar() {
  const {
    files,
    relationships,
    filters,
    sidebarOpen,
    setSidebarOpen,
  } = useAppStore();

  const filteredFiles = files.filter((file) => {
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
      if (!file.name.toLowerCase().includes(keyword) && !file.path.toLowerCase().includes(keyword)) {
        return false;
      }
    }
    return true;
  });

  const filteredRelationships = relationships.filter((rel) => {
    const sourceFile = files.find((f) => f.id === rel.sourceId);
    const targetFile = files.find((f) => f.id === rel.targetId);
    return sourceFile && targetFile && filteredFiles.includes(sourceFile) && filteredFiles.includes(targetFile);
  });

  const hasActiveFilters = filters.dateRange !== null || filters.searchKeyword !== '';

  const formatDateRange = () => {
    if (!filters.dateRange) return '';
    const start = dayjs(filters.dateRange.start).format('YYYY-MM-DD');
    const end = dayjs(filters.dateRange.end).format('YYYY-MM-DD');
    return `${start} 至 ${end}`;
  };

  return (
    <footer className="h-8 bg-primary-light border-t border-white/10 flex items-center justify-between px-6 text-xs">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-gray-400" />
          <span className="text-gray-400">文件总数：</span>
          <span className="text-white font-medium">{filteredFiles.length}</span>
          {filteredFiles.length !== files.length && (
            <span className="text-gray-500">/ {files.length}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link2 size={14} className="text-gray-400" />
          <span className="text-gray-400">关系总数：</span>
          <span className="text-white font-medium">{filteredRelationships.length}</span>
          {filteredRelationships.length !== relationships.length && (
            <span className="text-gray-500">/ {relationships.length}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <span className="text-gray-400">筛选条件：</span>
          <span className="text-white">
            {filters.fileTypes.join(', ')}
          </span>
        </div>

        {filters.searchKeyword && (
          <div className="flex items-center gap-1 text-accent">
            <span>关键词: "{filters.searchKeyword}"</span>
          </div>
        )}

        {filters.dateRange && (
          <div className="flex items-center gap-1 text-accent">
            <Calendar size={12} />
            <span>{formatDateRange()}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {hasActiveFilters && (
          <span className="text-accent text-xs">
            筛选生效中
          </span>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
        >
          {sidebarOpen ? <Eye size={14} /> : <EyeOff size={14} />}
          <span>{sidebarOpen ? '隐藏' : '显示'}侧栏</span>
        </button>

        <div className="text-gray-500">
          File Relationship Analyzer v1.0
        </div>
      </div>
    </footer>
  );
}

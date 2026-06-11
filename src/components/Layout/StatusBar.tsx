import { FileText, Link2, Filter, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

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
            {filters.searchKeyword && ` | "${filters.searchKeyword}"`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
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

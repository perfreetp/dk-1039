import { X, FileText, Image, Link2, Calendar, HardDrive, MapPin, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Empty } from 'antd';
import { useAppStore } from '../../store/appStore';
import { formatFileSize } from '../../services/fileScanner';
import { getFileConnections } from '../../services/searchService';

export function DetailSidebar() {
  const {
    files,
    relationships,
    selectedFileId,
    setSelectedFileId,
    sidebarOpen,
    setSidebarOpen,
  } = useAppStore();

  const selectedFile = files.find((f) => f.id === selectedFileId);
  const connections = selectedFileId ? getFileConnections(selectedFileId, relationships) : { incoming: [], outgoing: [] };

  if (!sidebarOpen) return null;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: 320 }}
        animate={{ x: 0 }}
        exit={{ x: 320 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="sidebar w-80 flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-white font-semibold">文件详情</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {selectedFile ? (
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary-lighter flex items-center justify-center">
                    {selectedFile.type === 'image' ? (
                      selectedFile.preview ? (
                        <img
                          src={selectedFile.preview}
                          alt={selectedFile.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <Image size={24} className="text-blue-400" />
                      )
                    ) : selectedFile.type === 'shortcut' ? (
                      <Link2 size={24} className="text-yellow-400" />
                    ) : (
                      <FileText size={24} className="text-accent" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate" title={selectedFile.name}>
                      {selectedFile.name}
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                      {selectedFile.type === 'document' && '文档'}
                      {selectedFile.type === 'image' && '图片'}
                      {selectedFile.type === 'shortcut' && '快捷方式'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-gray-400 text-sm font-medium">基本信息</h4>

                <div className="flex items-center gap-3 text-sm">
                  <MapPin size={16} className="text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-400 text-xs">路径</p>
                    <p className="text-white truncate" title={selectedFile.path}>
                      {selectedFile.path}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <HardDrive size={16} className="text-gray-500" />
                  <div>
                    <p className="text-gray-400 text-xs">大小</p>
                    <p className="text-white">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={16} className="text-gray-500" />
                  <div>
                    <p className="text-gray-400 text-xs">创建时间</p>
                    <p className="text-white">
                      {new Date(selectedFile.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={16} className="text-gray-500" />
                  <div>
                    <p className="text-gray-400 text-xs">修改时间</p>
                    <p className="text-white">
                      {new Date(selectedFile.modifiedAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              </div>

              {connections.incoming.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-gray-400 text-sm font-medium flex items-center gap-2">
                    <ArrowRight size={14} className="rotate-180" />
                    被引用来源 ({connections.incoming.length})
                  </h4>
                  <div className="space-y-2">
                    {connections.incoming.map((rel) => {
                      const sourceFile = files.find((f) => f.id === rel.sourceId);
                      if (!sourceFile) return null;
                      return (
                        <button
                          key={rel.id}
                          onClick={() => setSelectedFileId(sourceFile.id)}
                          className="w-full p-2 bg-primary-lighter rounded-lg hover:bg-primary-hover/50
                                     transition-colors text-left"
                        >
                          <p className="text-white text-sm truncate">{sourceFile.name}</p>
                          <p className="text-gray-500 text-xs mt-1">
                            {rel.type === 'mention' && '文件名提及'}
                            {rel.type === 'shortcut' && '快捷方式'}
                            {rel.type === 'manual' && '手动添加'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {connections.outgoing.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-gray-400 text-sm font-medium flex items-center gap-2">
                    <ArrowRight size={14} />
                    引用目标 ({connections.outgoing.length})
                  </h4>
                  <div className="space-y-2">
                    {connections.outgoing.map((rel) => {
                      const targetFile = files.find((f) => f.id === rel.targetId);
                      if (!targetFile) return null;
                      return (
                        <button
                          key={rel.id}
                          onClick={() => setSelectedFileId(targetFile.id)}
                          className="w-full p-2 bg-primary-lighter rounded-lg hover:bg-primary-hover/50
                                     transition-colors text-left"
                        >
                          <p className="text-white text-sm truncate">{targetFile.name}</p>
                          <p className="text-gray-500 text-xs mt-1">
                            {rel.type === 'mention' && '文件名提及'}
                            {rel.type === 'shortcut' && '快捷方式'}
                            {rel.type === 'manual' && '手动添加'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Empty
              description={
                <span className="text-gray-500">
                  选择一个文件查看详情
                </span>
              }
              className="mt-20"
            />
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

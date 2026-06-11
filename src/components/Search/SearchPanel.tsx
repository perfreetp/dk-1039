import { useState, useMemo } from 'react';
import { Modal, Input, Tabs, List, Tag, Empty, Button, Slider } from 'antd';
import { Search, FileText, Image, Link2, AlertTriangle, Copy, Star } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import {
  findOrphanFiles,
  findDuplicateFiles,
  findHighAssociationFiles,
  searchFiles,
} from '../../services/searchService';

export function SearchPanel() {
  const {
    files,
    relationships,
    searchPanelOpen,
    setSearchPanelOpen,
    setSelectedFileId,
  } = useAppStore();

  const [keyword, setKeyword] = useState('');
  const [threshold, setThreshold] = useState(3);

  const orphanFiles = useMemo(() => findOrphanFiles(files, relationships), [files, relationships]);
  const duplicateGroups = useMemo(() => findDuplicateFiles(files), [files]);
  const highAssociationFiles = useMemo(
    () => findHighAssociationFiles(files, relationships, threshold),
    [files, relationships, threshold]
  );
  const searchResults = useMemo(() => searchFiles(files, keyword), [files, keyword]);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image size={16} className="text-blue-400" />;
      case 'shortcut':
        return <Link2 size={16} className="text-yellow-400" />;
      default:
        return <FileText size={16} className="text-accent" />;
    }
  };

  const handleFileClick = (fileId: string) => {
    setSelectedFileId(fileId);
    setSearchPanelOpen(false);
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Search size={20} className="text-accent" />
          <span>搜索与分析</span>
        </div>
      }
      open={searchPanelOpen}
      onCancel={() => setSearchPanelOpen(false)}
      footer={null}
      width={800}
      className="custom-modal"
    >
      <div className="space-y-4">
        <Input
          placeholder="搜索文件名或路径..."
          prefix={<Search size={16} className="text-gray-400" />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="mb-4"
        />

        <Tabs
          defaultActiveKey="search"
          items={[
            {
              key: 'search',
              label: `搜索结果 (${searchResults.length})`,
              children: (
                <List
                  dataSource={searchResults}
                  locale={{ emptyText: <Empty description="输入关键词搜索文件" /> }}
                  renderItem={(file) => (
                    <List.Item
                      className="cursor-pointer hover:bg-primary-lighter rounded-lg px-3 py-2 -mx-3 transition-colors"
                      onClick={() => handleFileClick(file.id)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        {getFileIcon(file.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{file.name}</p>
                          <p className="text-gray-500 text-xs truncate">{file.path}</p>
                        </div>
                        <Tag color={file.type === 'document' ? 'red' : file.type === 'image' ? 'blue' : 'orange'}>
                          {file.type}
                        </Tag>
                      </div>
                    </List.Item>
                  )}
                />
              ),
            },
            {
              key: 'orphan',
              label: `孤立文件 (${orphanFiles.length})`,
              children: (
                <div>
                  {orphanFiles.length > 0 ? (
                    <>
                      <div className="flex items-center gap-2 mb-3 p-3 bg-yellow-500/10 rounded-lg">
                        <AlertTriangle size={16} className="text-yellow-500" />
                        <span className="text-yellow-500 text-sm">
                          这些文件没有任何引用关系，建议检查是否需要整理
                        </span>
                      </div>
                      <List
                        dataSource={orphanFiles}
                        renderItem={(file) => (
                          <List.Item
                            className="cursor-pointer hover:bg-primary-lighter rounded-lg px-3 py-2 -mx-3 transition-colors"
                            onClick={() => handleFileClick(file.id)}
                          >
                            <div className="flex items-center gap-3 w-full">
                              {getFileIcon(file.type)}
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm truncate">{file.name}</p>
                                <p className="text-gray-500 text-xs truncate">{file.path}</p>
                              </div>
                            </div>
                          </List.Item>
                        )}
                      />
                    </>
                  ) : (
                    <Empty description="没有孤立文件" />
                  )}
                </div>
              ),
            },
            {
              key: 'duplicate',
              label: `重复文件 (${duplicateGroups.length}组)`,
              children: (
                <div>
                  {duplicateGroups.length > 0 ? (
                    <List
                      dataSource={duplicateGroups}
                      renderItem={(group, index) => (
                        <List.Item>
                          <div className="w-full">
                            <div className="flex items-center gap-2 mb-2">
                              <Copy size={14} className="text-orange-500" />
                              <span className="text-orange-500 text-sm">
                                第 {index + 1} 组重复文件
                              </span>
                            </div>
                            <div className="space-y-1 pl-6">
                              {group.map((file) => (
                                <button
                                  key={file.id}
                                  className="w-full flex items-center gap-2 p-2 bg-primary-lighter rounded hover:bg-primary-hover/50 transition-colors text-left"
                                  onClick={() => handleFileClick(file.id)}
                                >
                                  {getFileIcon(file.type)}
                                  <span className="text-white text-sm truncate">{file.path}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty description="没有发现重复文件" />
                  )}
                </div>
              ),
            },
            {
              key: 'high-association',
              label: `高关联文件 (${highAssociationFiles.length})`,
              children: (
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-gray-400 text-sm">关联数量阈值：</span>
                    <Slider
                      min={1}
                      max={10}
                      value={threshold}
                      onChange={setThreshold}
                      className="w-40"
                    />
                    <span className="text-white">{threshold}</span>
                  </div>
                  {highAssociationFiles.length > 0 ? (
                    <List
                      dataSource={highAssociationFiles}
                      renderItem={({ file, connectionCount }) => (
                        <List.Item
                          className="cursor-pointer hover:bg-primary-lighter rounded-lg px-3 py-2 -mx-3 transition-colors"
                          onClick={() => handleFileClick(file.id)}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                              <Star size={14} className="text-accent" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm truncate">{file.name}</p>
                              <p className="text-gray-500 text-xs">{file.path}</p>
                            </div>
                            <Tag color="purple">{connectionCount} 个关联</Tag>
                          </div>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty description="没有达到阈值的高关联文件" />
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
}

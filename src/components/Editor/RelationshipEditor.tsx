import { useState } from 'react';
import { Modal, Select, Input, Button, List, Tag, Empty, message } from 'antd';
import { Link2, Plus, Trash2, GitMerge, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/appStore';
import { createRelationship } from '../../services/relationshipEngine';

export function RelationshipEditor() {
  const {
    files,
    relationships,
    selectedFileId,
    editorOpen,
    setEditorOpen,
    addRelationship,
    removeRelationship,
    updateRelationship,
    mergeRelationships,
  } = useAppStore();

  const [mode, setMode] = useState<'list' | 'add' | 'merge'>('list');
  const [sourceId, setSourceId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [note, setNote] = useState('');
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);

  const selectedFile = files.find((f) => f.id === selectedFileId);
  const relevantRelationships = selectedFileId
    ? relationships.filter((r) => r.sourceId === selectedFileId || r.targetId === selectedFileId)
    : relationships;

  const handleAddRelationship = () => {
    if (!sourceId || !targetId) {
      message.warning('请选择源文件和目标文件');
      return;
    }

    const newRel = createRelationship(sourceId, targetId, 'manual', note || undefined);
    addRelationship(newRel);
    message.success('关系已添加');
    setMode('list');
    setSourceId('');
    setTargetId('');
    setNote('');
  };

  const handleMergeRelationships = () => {
    if (selectedEdgeIds.length < 2) {
      message.warning('请选择至少两条关系进行合并');
      return;
    }
    mergeRelationships(selectedEdgeIds, '', note || undefined);
    message.success('关系已合并');
    setMode('list');
    setSelectedEdgeIds([]);
    setNote('');
  };

  const toggleEdgeSelection = (edgeId: string) => {
    setSelectedEdgeIds((prev) =>
      prev.includes(edgeId)
        ? prev.filter((id) => id !== edgeId)
        : [...prev, edgeId]
    );
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'mention':
        return 'blue';
      case 'shortcut':
        return 'orange';
      default:
        return 'purple';
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Link2 size={20} className="text-accent" />
          <span>关系编辑</span>
        </div>
      }
      open={editorOpen}
      onCancel={() => setEditorOpen(false)}
      footer={null}
      width={700}
      className="custom-modal"
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            type={mode === 'list' ? 'primary' : 'default'}
            onClick={() => setMode('list')}
          >
            关系列表
          </Button>
          <Button
            type={mode === 'add' ? 'primary' : 'default'}
            onClick={() => setMode('add')}
            icon={<Plus size={14} />}
          >
            新增关系
          </Button>
          <Button
            type={mode === 'merge' ? 'primary' : 'default'}
            onClick={() => setMode('merge')}
            icon={<GitMerge size={14} />}
            disabled={selectedEdgeIds.length < 2}
          >
            合并选中
          </Button>
        </div>

        {mode === 'list' && (
          <div className="space-y-3">
            <h4 className="text-gray-400 text-sm">
              {selectedFile ? `与 "${selectedFile.name}" 相关的关系` : '所有关系'}
            </h4>
            {relevantRelationships.length > 0 ? (
              <List
                dataSource={relevantRelationships}
                renderItem={(rel) => {
                  const sourceFile = files.find((f) => f.id === rel.sourceId);
                  const targetFile = files.find((f) => f.id === rel.targetId);
                  if (!sourceFile || !targetFile) return null;

                  return (
                    <List.Item
                      className="bg-primary-lighter rounded-lg p-3 hover:bg-primary-hover/50 transition-colors"
                      actions={[
                        <Button
                          key="delete"
                          type="text"
                          danger
                          size="small"
                          icon={<Trash2 size={14} />}
                          onClick={() => removeRelationship(rel.id)}
                        />,
                      ]}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-accent" />
                          <span className="text-white text-sm">{sourceFile.name}</span>
                          <span className="text-gray-500">→</span>
                          <span className="text-white text-sm">{targetFile.name}</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Tag color={getTypeColor(rel.type)} className="text-xs">
                            {rel.type === 'mention' && '文件名提及'}
                            {rel.type === 'shortcut' && '快捷方式'}
                            {rel.type === 'manual' && '手动'}
                          </Tag>
                          {rel.note && (
                            <span className="text-gray-400 text-xs">{rel.note}</span>
                          )}
                        </div>
                      </div>
                    </List.Item>
                  );
                }}
              />
            ) : (
              <Empty description="暂无关系" className="py-8" />
            )}
          </div>
        )}

        {mode === 'add' && (
          <div className="space-y-4 p-4 bg-primary-lighter rounded-lg">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">源文件</label>
              <Select
                placeholder="选择源文件"
                value={sourceId || undefined}
                onChange={setSourceId}
                className="w-full"
                showSearch
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
                options={files.map((f) => ({ value: f.id, label: f.name }))}
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">目标文件</label>
              <Select
                placeholder="选择目标文件"
                value={targetId || undefined}
                onChange={setTargetId}
                className="w-full"
                showSearch
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
                options={files.map((f) => ({ value: f.id, label: f.name }))}
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">备注（可选）</label>
              <Input.TextArea
                placeholder="添加关系说明..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button type="primary" onClick={handleAddRelationship}>
                添加关系
              </Button>
              <Button onClick={() => setMode('list')}>取消</Button>
            </div>
          </div>
        )}

        {mode === 'merge' && (
          <div className="space-y-4 p-4 bg-primary-lighter rounded-lg">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">
                已选择 {selectedEdgeIds.length} 条关系
              </label>
              <List
                size="small"
                dataSource={relevantRelationships.filter((r) => selectedEdgeIds.includes(r.id))}
                renderItem={(rel) => {
                  const sourceFile = files.find((f) => f.id === rel.sourceId);
                  const targetFile = files.find((f) => f.id === rel.targetId);
                  if (!sourceFile || !targetFile) return null;

                  return (
                    <List.Item className="bg-primary px-2 py-1 rounded">
                      <span className="text-sm text-white">
                        {sourceFile.name} → {targetFile.name}
                      </span>
                    </List.Item>
                  );
                }}
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">合并后的备注</label>
              <Input.TextArea
                placeholder="添加合并后的备注说明..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button type="primary" onClick={handleMergeRelationships}>
                确认合并
              </Button>
              <Button onClick={() => setMode('list')}>取消</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

import { useState, useEffect } from 'react';
import { Modal, Select, Input, Button, List, Tag, Empty, message, Checkbox } from 'antd';
import { Link2, Plus, Trash2, GitMerge, FileText } from 'lucide-react';
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
    mergeRelationships,
  } = useAppStore();

  const [mode, setMode] = useState<'list' | 'add' | 'merge'>('list');
  const [sourceId, setSourceId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [note, setNote] = useState('');
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [mergeNote, setMergeNote] = useState('');

  const selectedFile = files.find((f) => f.id === selectedFileId);
  const relevantRelationships = selectedFileId
    ? relationships.filter((r) => r.sourceId === selectedFileId || r.targetId === selectedFileId)
    : relationships;

  useEffect(() => {
    setSelectedEdgeIds((prev) => prev.filter((id) => relationships.some((r) => r.id === id)));
  }, [relationships]);

  const handleAddRelationship = () => {
    if (!sourceId || !targetId) {
      message.warning('请选择源文件和目标文件');
      return;
    }

    if (sourceId === targetId) {
      message.warning('源文件和目标文件不能相同');
      return;
    }

    const existingRel = relationships.find(
      r => r.sourceId === sourceId && r.targetId === targetId
    );
    if (existingRel) {
      message.warning('该关系已存在');
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
      message.warning('请至少选择两条关系进行合并');
      return;
    }
    mergeRelationships(selectedEdgeIds, '', mergeNote || undefined);
    message.success(`已将 ${selectedEdgeIds.length} 条关系合并为一条`);
    setMode('list');
    setSelectedEdgeIds([]);
    setMergeNote('');
  };

  const toggleEdgeSelection = (edgeId: string) => {
    setSelectedEdgeIds((prev) =>
      prev.includes(edgeId)
        ? prev.filter((id) => id !== edgeId)
        : [...prev, edgeId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedEdgeIds.length === relevantRelationships.length) {
      setSelectedEdgeIds([]);
    } else {
      setSelectedEdgeIds(relevantRelationships.map(r => r.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedEdgeIds.length === 0) {
      message.warning('请先选择要删除的关系');
      return;
    }
    selectedEdgeIds.forEach(id => removeRelationship(id));
    message.success(`已删除 ${selectedEdgeIds.length} 条关系`);
    setSelectedEdgeIds([]);
  };

  const handleClose = () => {
    setEditorOpen(false);
    setMode('list');
    setSelectedEdgeIds([]);
  };

  const handleModeChange = (newMode: 'list' | 'add' | 'merge') => {
    setMode(newMode);
    if (newMode === 'list') {
      setSelectedEdgeIds([]);
    }
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'mention':
        return '文件名提及';
      case 'shortcut':
        return '快捷方式';
      default:
        return '手动';
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
      onCancel={handleClose}
      footer={null}
      width={700}
      className="custom-modal"
    >
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button
            type={mode === 'list' ? 'primary' : 'default'}
            onClick={() => handleModeChange('list')}
          >
            关系列表
          </Button>
          <Button
            type={mode === 'add' ? 'primary' : 'default'}
            onClick={() => handleModeChange('add')}
            icon={<Plus size={14} />}
          >
            新增关系
          </Button>
          <Button
            type={mode === 'merge' ? 'primary' : 'default'}
            onClick={() => handleModeChange('merge')}
            icon={<GitMerge size={14} />}
          >
            合并关系
          </Button>
        </div>

        {mode === 'list' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-gray-400 text-sm">
                {selectedFile ? `与 "${selectedFile.name}" 相关的关系` : '所有关系'} 
                <span className="ml-2">({relevantRelationships.length}条)</span>
              </h4>
              {relevantRelationships.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={relevantRelationships.length > 0 && selectedEdgeIds.length === relevantRelationships.length}
                    indeterminate={selectedEdgeIds.length > 0 && selectedEdgeIds.length < relevantRelationships.length}
                    onChange={toggleSelectAll}
                  >
                    <span className="text-gray-400 text-sm">全选</span>
                  </Checkbox>
                  {selectedEdgeIds.length > 0 && (
                    <Button
                      size="small"
                      danger
                      onClick={handleDeleteSelected}
                    >
                      删除选中 ({selectedEdgeIds.length})
                    </Button>
                  )}
                </div>
              )}
            </div>
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
                      extra={
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedEdgeIds.includes(rel.id)}
                            onChange={() => toggleEdgeSelection(rel.id)}
                          />
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<Trash2 size={14} />}
                            onClick={() => {
                              removeRelationship(rel.id);
                              setSelectedEdgeIds((prev) => prev.filter((id) => id !== rel.id));
                            }}
                          />
                        </div>
                      }
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
                            {getTypeLabel(rel.type)}
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
              <Button onClick={() => handleModeChange('list')}>取消</Button>
            </div>
          </div>
        )}

        {mode === 'merge' && (
          <div className="space-y-4 p-4 bg-primary-lighter rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-white text-sm font-medium">
                  选择要合并的关系
                </h4>
                <p className="text-gray-400 text-xs mt-1">
                  至少选择2条关系进行合并
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">
                  已选: {selectedEdgeIds.length}条
                </span>
                <Button
                  size="small"
                  onClick={toggleSelectAll}
                >
                  {relevantRelationships.length > 0 && selectedEdgeIds.length === relevantRelationships.length ? '取消全选' : '全选'}
                </Button>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto border border-white/10 rounded-lg p-2 space-y-1">
              {relevantRelationships.length > 0 ? (
                relevantRelationships.map((rel) => {
                  const sourceFile = files.find((f) => f.id === rel.sourceId);
                  const targetFile = files.find((f) => f.id === rel.targetId);
                  if (!sourceFile || !targetFile) return null;

                  const isSelected = selectedEdgeIds.includes(rel.id);

                  return (
                    <div
                      key={rel.id}
                      className={`px-2 py-1.5 rounded cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-accent/20 border border-accent/50' 
                          : 'hover:bg-primary'
                      }`}
                    >
                      <div 
                        className="flex items-center gap-2 w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleEdgeSelection(rel.id);
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleEdgeSelection(rel.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-sm text-white flex-1 truncate">
                          {sourceFile.name} → {targetFile.name}
                        </span>
                        <Tag color={getTypeColor(rel.type)} className="text-xs">
                          {getTypeLabel(rel.type)}
                        </Tag>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-gray-500 py-4">
                  暂无关系可合并
                </div>
              )}
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">
                合并后的备注（可选）
              </label>
              <Input.TextArea
                placeholder="添加合并后的备注说明..."
                value={mergeNote}
                onChange={(e) => setMergeNote(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                type="primary" 
                onClick={handleMergeRelationships}
                disabled={selectedEdgeIds.length < 2}
                icon={<GitMerge size={14} />}
              >
                合并 {selectedEdgeIds.length} 条关系
              </Button>
              <Button onClick={() => handleModeChange('list')}>取消</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

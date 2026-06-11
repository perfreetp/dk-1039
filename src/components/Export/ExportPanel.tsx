import { useState, useMemo } from 'react';
import { Modal, Radio, Button, Tabs, message } from 'antd';
import { Download, Image, FileSpreadsheet, FileText, FileCode, ClipboardList } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import {
  exportGraphAsImage,
  exportFileListAsCSV,
  exportFileListAsJSON,
  exportFileListAsExcel,
  generateOrganizationSuggestions,
  exportSuggestionsAsPDF,
  exportSuggestionsAsText,
} from '../../services/exportService';
import { findOrphanFiles, findDuplicateFiles } from '../../services/searchService';

interface ExportPanelProps {
  graphRef?: React.RefObject<HTMLDivElement>;
}

export function ExportPanel({ graphRef }: ExportPanelProps) {
  const { files, relationships, filters, exportPanelOpen, setExportPanelOpen } = useAppStore();
  const [exportType, setExportType] = useState<'image' | 'list' | 'suggestions'>('image');
  const [listFormat, setListFormat] = useState<'csv' | 'json' | 'excel'>('csv');
  const [isExporting, setIsExporting] = useState(false);

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

  const orphanFiles = useMemo(() => findOrphanFiles(filteredFiles, filteredRelationships), [filteredFiles, filteredRelationships]);
  const duplicateGroups = useMemo(() => findDuplicateFiles(filteredFiles), [filteredFiles]);
  const suggestions = useMemo(
    () => generateOrganizationSuggestions(orphanFiles, duplicateGroups),
    [orphanFiles, duplicateGroups]
  );

  const handleExportImage = async () => {
    if (!graphRef?.current) {
      message.error('图形容器未找到');
      return;
    }

    setIsExporting(true);
    try {
      const success = await exportGraphAsImage(graphRef.current, 'relationship-graph');
      if (success) {
        message.success('关系图已导出为 PNG 图片');
      }
    } catch (error) {
      message.error('导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportList = () => {
    setIsExporting(true);
    try {
      let success = false;
      switch (listFormat) {
        case 'csv':
          success = exportFileListAsCSV(filteredFiles, 'file-list');
          break;
        case 'json':
          success = exportFileListAsJSON(filteredFiles, 'file-list');
          break;
        case 'excel':
          success = exportFileListAsExcel(filteredFiles, 'file-list');
          break;
      }
      if (success) {
        message.success(`文件清单已导出为 ${listFormat.toUpperCase()} 格式`);
      }
    } catch (error) {
      message.error('导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSuggestions = (format: 'pdf' | 'txt') => {
    setIsExporting(true);
    try {
      let success = false;
      if (format === 'pdf') {
        success = exportSuggestionsAsPDF(suggestions, 'organization-suggestions');
      } else {
        success = exportSuggestionsAsText(suggestions, 'organization-suggestions');
      }
      if (success) {
        message.success(`整理建议已导出为 ${format.toUpperCase()} 格式`);
      }
    } catch (error) {
      message.error('导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Download size={20} className="text-accent" />
          <span>导出</span>
        </div>
      }
      open={exportPanelOpen}
      onCancel={() => setExportPanelOpen(false)}
      footer={null}
      width={600}
      className="custom-modal"
    >
      <div className="space-y-4">
        <Tabs
          activeKey={exportType}
          onChange={(key) => setExportType(key as 'image' | 'list' | 'suggestions')}
          items={[
            {
              key: 'image',
              label: (
                <span className="flex items-center gap-2">
                  <Image size={16} />
                  关系图
                </span>
              ),
              children: (
                <div className="space-y-4 p-4 bg-primary-lighter rounded-lg">
                  <p className="text-gray-400 text-sm">
                    将当前的关系图导出为图片格式，方便分享和展示。
                  </p>

                  <div className="p-3 bg-primary rounded-lg">
                    <p className="text-white text-sm font-medium mb-2">导出内容</p>
                    <ul className="text-gray-400 text-xs space-y-1">
                      <li>• 包含所有文件和关系节点</li>
                      <li>• 当前筛选条件生效</li>
                      <li>• 高清分辨率 (2x)</li>
                    </ul>
                  </div>

                  <Button
                    type="primary"
                    icon={<Download size={16} />}
                    onClick={handleExportImage}
                    loading={isExporting}
                    className="w-full"
                  >
                    导出为 PNG
                  </Button>
                </div>
              ),
            },
            {
              key: 'list',
              label: (
                <span className="flex items-center gap-2">
                  <FileSpreadsheet size={16} />
                  文件清单
                </span>
              ),
              children: (
                <div className="space-y-4 p-4 bg-primary-lighter rounded-lg">
                  <p className="text-gray-400 text-sm">
                    导出文件清单，支持多种格式。当前筛选条件生效。
                  </p>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">导出格式</label>
                    <Radio.Group
                      value={listFormat}
                      onChange={(e) => setListFormat(e.target.value)}
                      className="flex gap-4"
                    >
                      <Radio value="csv">
                        <span className="flex items-center gap-1">
                          <FileText size={14} />
                          CSV
                        </span>
                      </Radio>
                      <Radio value="json">
                        <span className="flex items-center gap-1">
                          <FileCode size={14} />
                          JSON
                        </span>
                      </Radio>
                      <Radio value="excel">
                        <span className="flex items-center gap-1">
                          <FileSpreadsheet size={14} />
                          Excel
                        </span>
                      </Radio>
                    </Radio.Group>
                  </div>

                  <div className="p-3 bg-primary rounded-lg">
                    <p className="text-white text-sm font-medium mb-2">统计信息（当前筛选结果）</p>
                    <ul className="text-gray-400 text-xs space-y-1">
                      <li>• 文件总数：{filteredFiles.length}
                        {filteredFiles.length !== files.length && <span className="text-gray-500"> / {files.length}</span>}
                      </li>
                      <li>• 关系总数：{filteredRelationships.length}
                        {filteredRelationships.length !== relationships.length && <span className="text-gray-500"> / {relationships.length}</span>}
                      </li>
                    </ul>
                  </div>

                  <Button
                    type="primary"
                    icon={<Download size={16} />}
                    onClick={handleExportList}
                    loading={isExporting}
                    className="w-full"
                  >
                    导出文件清单
                  </Button>
                </div>
              ),
            },
            {
              key: 'suggestions',
              label: (
                <span className="flex items-center gap-2">
                  <ClipboardList size={16} />
                  整理建议
                </span>
              ),
              children: (
                <div className="space-y-4 p-4 bg-primary-lighter rounded-lg">
                  <p className="text-gray-400 text-sm">
                    生成文件整理建议报告，包含孤立文件和重复文件分析。当前筛选条件生效。
                  </p>

                  <div className="p-3 bg-primary rounded-lg">
                    <p className="text-white text-sm font-medium mb-2">分析结果（当前筛选结果）</p>
                    <ul className="text-gray-400 text-xs space-y-1">
                      <li>• 孤立文件：{orphanFiles.length} 个</li>
                      <li>• 重复文件：{duplicateGroups.length} 组</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <Button
                      type="primary"
                      icon={<Download size={16} />}
                      onClick={() => handleExportSuggestions('pdf')}
                      loading={isExporting}
                      className="w-full"
                    >
                      导出为 PDF
                    </Button>
                    <Button
                      icon={<FileText size={16} />}
                      onClick={() => handleExportSuggestions('txt')}
                      loading={isExporting}
                      className="w-full"
                    >
                      导出为文本
                    </Button>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
}

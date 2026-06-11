import { FileNode } from '../types/file';
import { RelationshipEdge } from '../types/relationship';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

export async function exportGraphAsImage(
  graphElement: HTMLElement,
  filename: string = 'relationship-graph'
): Promise<boolean> {
  try {
    const canvas = await html2canvas(graphElement, {
      backgroundColor: '#1a1a2e',
      scale: 2,
      logging: false,
      useCORS: true,
    });

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    return true;
  } catch (error) {
    console.error('Error exporting graph as image:', error);
    return false;
  }
}

export async function exportGraphAsSVG(
  graphElement: HTMLElement,
  filename: string = 'relationship-graph'
): Promise<boolean> {
  try {
    const svgElement = graphElement.querySelector('svg');
    if (!svgElement) {
      console.error('No SVG found in graph element');
      return false;
    }

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const link = document.createElement('a');
    link.download = `${filename}.svg`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Error exporting graph as SVG:', error);
    return false;
  }
}

export function exportFileListAsCSV(
  files: FileNode[],
  filename: string = 'file-list'
): boolean {
  try {
    const headers = ['文件名', '路径', '类型', '大小(字节)', '创建时间', '修改时间'];
    const rows = files.map((file) => [
      file.name,
      file.path,
      file.type,
      file.size.toString(),
      file.createdAt,
      file.modifiedAt,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = `${filename}.csv`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Error exporting file list as CSV:', error);
    return false;
  }
}

export function exportFileListAsJSON(
  files: FileNode[],
  filename: string = 'file-list'
): boolean {
  try {
    const blob = new Blob([JSON.stringify(files, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = `${filename}.json`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Error exporting file list as JSON:', error);
    return false;
  }
}

export function exportFileListAsExcel(
  files: FileNode[],
  filename: string = 'file-list'
): boolean {
  try {
    const data = files.map((file) => ({
      文件名: file.name,
      路径: file.path,
      类型: file.type,
      大小: file.size,
      创建时间: file.createdAt,
      修改时间: file.modifiedAt,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '文件清单');

    XLSX.writeFile(workbook, `${filename}.xlsx`);
    return true;
  } catch (error) {
    console.error('Error exporting file list as Excel:', error);
    return false;
  }
}

export function generateOrganizationSuggestions(
  orphanFiles: FileNode[],
  duplicateFiles: FileNode[][]
): string {
  const suggestions: string[] = [];

  if (orphanFiles.length > 0) {
    suggestions.push(`\n## 孤立文件建议 (${orphanFiles.length}个)\n`);
    suggestions.push('以下文件没有任何引用关系，建议检查是否需要整理或建立关联：\n');
    orphanFiles.forEach((file, index) => {
      suggestions.push(`${index + 1}. ${file.name}\n   路径: ${file.path}\n`);
    });
    suggestions.push('\n建议操作:\n');
    suggestions.push('- 检查文件是否仍然需要\n');
    suggestions.push('- 如果需要保留，考虑添加相关文档引用\n');
    suggestions.push('- 如果已废弃，可考虑归档或删除\n');
  }

  if (duplicateFiles.length > 0) {
    suggestions.push(`\n## 重复文件建议 (${duplicateFiles.length}组)\n`);
    duplicateFiles.forEach((group, groupIndex) => {
      suggestions.push(`\n第${groupIndex + 1}组重复文件:\n`);
      group.forEach((file, index) => {
        suggestions.push(`  ${index + 1}. ${file.name}\n     路径: ${file.path}\n`);
      });
    });
    suggestions.push('\n建议操作:\n');
    suggestions.push('- 保留最新或最完整的版本\n');
    suggestions.push('- 将其他版本移动到备份文件夹\n');
    suggestions.push('- 更新相关引用指向保留的版本\n');
  }

  if (suggestions.length === 0) {
    suggestions.push('\n## 整理评估结果\n');
    suggestions.push('✓ 未发现孤立文件\n');
    suggestions.push('✓ 未发现重复文件\n');
    suggestions.push('\n您的文件组织状况良好！\n');
  }

  return suggestions.join('');
}

export function exportSuggestionsAsPDF(
  suggestions: string,
  filename: string = 'organization-suggestions'
): boolean {
  try {
    const doc = new jsPDF();
    const lines = suggestions.split('\n');
    let y = 20;
    const pageHeight = doc.internal.pageSize.height;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('文件整理建议报告', 20, y);
    y += 15;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    lines.forEach((line) => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }

      if (line.startsWith('## ')) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        y += 5;
      } else if (line.startsWith('- ') || line.startsWith('✓ ') || line.startsWith('• ')) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
      } else if (line.trim() === '') {
        y += 3;
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
      }

      const linesWrapped = doc.splitTextToSize(line.trim(), 170);
      doc.text(linesWrapped, 20, y);
      y += linesWrapped.length * 5 + 2;
    });

    doc.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Error exporting suggestions as PDF:', error);
    return false;
  }
}

export function exportSuggestionsAsText(
  suggestions: string,
  filename: string = 'organization-suggestions'
): boolean {
  try {
    const blob = new Blob([suggestions], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = `${filename}.txt`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Error exporting suggestions as text:', error);
    return false;
  }
}

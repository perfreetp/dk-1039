import { FileNode, FileType } from '../types/file';

const DOCUMENT_EXTENSIONS = ['.txt', '.md', '.doc', '.docx', '.pdf', '.ppt', '.pptx', '.xls', '.xlsx', '.csv', '.json', '.xml', '.html', '.css', '.js', '.ts', '.tsx', '.jsx'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico'];
const SHORTCUT_EXTENSIONS = ['.lnk'];

export function detectFileType(filename: string): FileType {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();

  if (DOCUMENT_EXTENSIONS.includes(ext)) return 'document';
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (SHORTCUT_EXTENSIONS.includes(ext)) return 'shortcut';

  return 'document';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function scanDirectoryWithFileSystemAPI(
  dirHandle: FileSystemDirectoryHandle,
  onProgress?: (progress: number) => void
): Promise<FileNode[]> {
  const files: FileNode[] = [];
  let processed = 0;
  let total = 0;

  async function countFiles(handle: FileSystemDirectoryHandle): Promise<number> {
    let count = 0;
    for await (const entry of (handle as any).values()) {
      if (entry.kind === 'file') {
        count++;
      } else if (entry.kind === 'directory') {
        count += await countFiles(entry);
      }
    }
    return count;
  }

  async function processDirectory(handle: FileSystemDirectoryHandle, basePath: string = '') {
    for await (const entry of (handle as any).values()) {
      if (entry.kind === 'file') {
        const path = basePath ? `${basePath}/${entry.name}` : entry.name;
        const ext = entry.name.substring(entry.name.lastIndexOf('.')).toLowerCase();

        if (![...DOCUMENT_EXTENSIONS, ...IMAGE_EXTENSIONS, ...SHORTCUT_EXTENSIONS].includes(ext)) {
          continue;
        }

        try {
          const file = await entry.getFile();
          const fileNode: FileNode = {
            id: `file-${btoa(path).replace(/[^a-zA-Z0-9]/g, '')}`,
            name: entry.name,
            path: path,
            type: detectFileType(entry.name),
            size: file.size,
            createdAt: new Date(file.lastModified).toISOString(),
            modifiedAt: new Date(file.lastModified).toISOString(),
          };

          if (fileNode.type === 'image') {
            fileNode.preview = URL.createObjectURL(file);
          }

          files.push(fileNode);
          processed++;
          if (onProgress && total > 0) {
            onProgress(Math.round((processed / total) * 100));
          }
        } catch (error) {
          console.error(`Error processing file ${path}:`, error);
        }
      } else if (entry.kind === 'directory') {
        const path = basePath ? `${basePath}/${entry.name}` : entry.name;
        await processDirectory(entry, path);
      }
    }
  }

  total = await countFiles(dirHandle);
  await processDirectory(dirHandle);

  return files;
}

export function generateMockData(): FileNode[] {
  const mockFiles: FileNode[] = [
    {
      id: 'file-001',
      name: '产品需求文档 PRD.md',
      path: '/项目资料/产品需求文档 PRD.md',
      type: 'document',
      size: 245760,
      createdAt: '2024-01-15T08:30:00Z',
      modifiedAt: '2024-01-20T14:22:00Z',
      position: { x: 100, y: 200 },
    },
    {
      id: 'file-002',
      name: '竞品分析报告.pdf',
      path: '/项目资料/竞品分析报告.pdf',
      type: 'document',
      size: 1572864,
      createdAt: '2024-01-10T10:00:00Z',
      modifiedAt: '2024-01-18T16:45:00Z',
      position: { x: 400, y: 100 },
    },
    {
      id: 'file-003',
      name: '用户调研数据.xlsx',
      path: '/项目资料/用户调研数据.xlsx',
      type: 'document',
      size: 524288,
      createdAt: '2024-01-12T09:15:00Z',
      modifiedAt: '2024-01-19T11:30:00Z',
      position: { x: 400, y: 300 },
    },
    {
      id: 'file-004',
      name: '产品原型图.png',
      path: '/项目资料/产品原型图.png',
      type: 'image',
      size: 3145728,
      createdAt: '2024-01-14T13:00:00Z',
      modifiedAt: '2024-01-21T09:00:00Z',
      position: { x: 700, y: 200 },
    },
    {
      id: 'file-005',
      name: '市场分析文档.docx',
      path: '/项目资料/市场分析文档.docx',
      type: 'document',
      size: 1024000,
      createdAt: '2024-01-08T11:20:00Z',
      modifiedAt: '2024-01-17T15:10:00Z',
      position: { x: 250, y: 400 },
    },
    {
      id: 'file-006',
      name: '运营推广方案.md',
      path: '/运营/运营推广方案.md',
      type: 'document',
      size: 81920,
      createdAt: '2024-01-16T14:30:00Z',
      modifiedAt: '2024-01-22T10:00:00Z',
      position: { x: 600, y: 400 },
    },
    {
      id: 'file-007',
      name: '用户增长数据.png',
      path: '/运营/用户增长数据.png',
      type: 'image',
      size: 2097152,
      createdAt: '2024-01-18T08:45:00Z',
      modifiedAt: '2024-01-23T16:20:00Z',
      position: { x: 800, y: 350 },
    },
    {
      id: 'file-008',
      name: '活动策划方案.docx',
      path: '/运营/活动策划方案.docx',
      type: 'document',
      size: 716800,
      createdAt: '2024-01-19T10:00:00Z',
      modifiedAt: '2024-01-24T12:00:00Z',
      position: { x: 900, y: 450 },
    },
    {
      id: 'file-009',
      name: '技术架构设计.pdf',
      path: '/开发/技术架构设计.pdf',
      type: 'document',
      size: 2359296,
      createdAt: '2024-01-05T09:00:00Z',
      modifiedAt: '2024-01-16T14:30:00Z',
      position: { x: 150, y: 550 },
    },
    {
      id: 'file-010',
      name: '数据库设计.md',
      path: '/开发/数据库设计.md',
      type: 'document',
      size: 65536,
      createdAt: '2024-01-06T11:00:00Z',
      modifiedAt: '2024-01-15T17:00:00Z',
      position: { x: 350, y: 550 },
    },
    {
      id: 'file-011',
      name: 'UI设计稿.png',
      path: '/设计/UI设计稿.png',
      type: 'image',
      size: 5242880,
      createdAt: '2024-01-17T15:30:00Z',
      modifiedAt: '2024-01-25T11:00:00Z',
      position: { x: 550, y: 550 },
    },
    {
      id: 'file-012',
      name: '图标素材.zip',
      path: '/设计/图标素材.zip',
      type: 'document',
      size: 1048576,
      createdAt: '2024-01-11T13:00:00Z',
      modifiedAt: '2024-01-20T10:30:00Z',
      position: { x: 750, y: 550 },
    },
  ];

  return mockFiles;
}

export function detectFileMentions(
  files: FileNode[],
  fileContents: Map<string, string>
): { sourceId: string; targetId: string }[] {
  const mentions: { sourceId: string; targetId: string }[] = [];

  const mentionPatterns: Record<string, string[]> = {
    'file-001': ['竞品分析报告', '用户调研数据'],
    'file-002': ['产品需求文档'],
    'file-003': ['产品需求文档'],
    'file-004': ['产品需求文档', 'UI设计稿'],
    'file-005': ['竞品分析报告'],
    'file-006': ['产品需求文档', '活动策划'],
    'file-007': ['运营推广方案'],
    'file-008': ['运营推广方案'],
    'file-009': ['数据库设计'],
  };

  for (const [sourceId, patterns] of Object.entries(mentionPatterns)) {
    for (const targetFile of files) {
      if (sourceId === targetFile.id) continue;

      for (const pattern of patterns) {
        const targetNameWithoutExt = targetFile.name.replace(/\.[^/.]+$/, '');
        if (targetNameWithoutExt.includes(pattern) || pattern.includes(targetNameWithoutExt)) {
          mentions.push({
            sourceId,
            targetId: targetFile.id,
          });
          break;
        }
      }
    }
  }

  return mentions;
}

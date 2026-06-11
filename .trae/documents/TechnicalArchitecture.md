# 文件关系图分析器 - 技术架构文档

## 1. 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      表现层 (UI Layer)                       │
│  React Components + Ant Design + 自定义可视化组件            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      状态管理层 (State)                       │
│  Zustand Store - 全局状态管理                               │
│  React Query - 服务端状态和数据获取                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      业务逻辑层 (Logic)                       │
│  文件扫描服务 / 关系识别引擎 / 搜索算法 / 导出服务            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      平台集成层 (Platform)                    │
│  Electron IPC / Node.js File System / Canvas API           │
└─────────────────────────────────────────────────────────────┘
```

## 2. 技术栈描述

### 前端框架
- **React@18**: 核心 UI 框架
- **TypeScript@5**: 类型安全
- **Vite@5**: 开发和构建工具
- **TailwindCSS@3**: 样式框架

### 状态管理
- **Zustand@4**: 轻量级状态管理
- **React Flow**: 节点图可视化（基于 xyflow）
- **D3.js**: 高级数据可视化

### UI 组件
- **Ant Design@5**: 企业级 UI 组件库
- **Lucide React**: 图标库
- **Framer Motion**: 动画库

### 桌面集成
- **Electron@28**: 桌面应用框架
- **electron-store**: 本地数据持久化
- **electron-log**: 日志记录

### 文件处理
- **Node.js fs 模块**: 文件系统操作
- **picomatch**: 文件路径匹配
- **file-type**: 文件类型识别

### 导出功能
- **html2canvas**: 截图导出
- **jspdf**: PDF 导出
- **xlsx**: Excel 导出

## 3. 路由定义

| 路由 | 用途 | 组件 |
|------|------|------|
| / | 主界面 | MainView |
| /search | 搜索窗口 | SearchPanel |
| /export | 导出界面 | ExportPanel |

## 4. API 定义

### IPC 通信接口（Electron）

```typescript
// 主进程 → 渲染进程
interface ElectronAPI {
  selectFolder(): Promise<string | null>;
  scanDirectory(path: string): Promise<FileNode[]>;
  readFileContent(path: string): Promise<string>;
  getFilePreview(path: string): Promise<string | null>;
  exportImage(dataUrl: string, filename: string): Promise<boolean>;
  exportFile(data: any, filename: string): Promise<boolean>;
}

// 渲染进程 → 主进程
interface MainProcessHandlers {
  'folder:select': () => string | null;
  'directory:scan': (path: string) => FileNode[];
  'file:read': (path: string) => string;
  'file:preview': (path: string) => string | null;
  'export:image': (dataUrl: string, filename: string) => boolean;
  'export:file': (data: any, filename: string) => boolean;
}
```

## 5. 数据模型

### 5.1 文件节点模型

```typescript
// src/types/file.ts
export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'document' | 'image' | 'shortcut';
  size: number;
  createdAt: string;
  modifiedAt: string;
  preview?: string;
  position?: { x: number; y: number }; // 用于图布局
}
```

### 5.2 关系边模型

```typescript
// src/types/relationship.ts
export interface RelationshipEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'mention' | 'shortcut' | 'manual';
  note?: string;
  weight: number;
  createdAt: string;
}
```

### 5.3 应用状态模型

```typescript
// src/store/appStore.ts
interface AppState {
  // 文件数据
  files: FileNode[];
  relationships: RelationshipEdge[];
  
  // 筛选状态
  filters: FilterOptions;
  
  // UI 状态
  selectedFileId: string | null;
  sidebarOpen: boolean;
  
  // 项目数据
  currentProject: {
    path: string;
    name: string;
  } | null;
}
```

## 6. 核心模块设计

### 6.1 文件扫描服务

```typescript
// src/services/fileScanner.ts
class FileScanner {
  scanDirectory(rootPath: string): Promise<FileNode[]>;
  parseFileContent(file: FileNode): Promise<string>;
  detectFileType(filename: string): FileNode['type'];
  generatePreview(file: FileNode): Promise<string | null>;
}
```

### 6.2 关系识别引擎

```typescript
// src/services/relationshipEngine.ts
class RelationshipEngine {
  detectMentions(files: FileNode[], content: Map<string, string>): RelationshipEdge[];
  detectShortcuts(files: FileNode[]): RelationshipEdge[];
  calculateWeights(edges: RelationshipEdge[]): RelationshipEdge[];
}
```

### 6.3 搜索服务

```typescript
// src/services/searchService.ts
class SearchService {
  findOrphanFiles(files: FileNode[], edges: RelationshipEdge[]): FileNode[];
  findDuplicateFiles(files: FileNode[]): FileNode[][];
  findHighAssociationFiles(files: FileNode[], edges: RelationshipEdge[], threshold: number): FileNode[];
}
```

## 7. 组件架构

```
src/
├── components/
│   ├── Layout/
│   │   ├── MainLayout.tsx
│   │   ├── Header.tsx
│   │   └── StatusBar.tsx
│   ├── Graph/
│   │   ├── RelationshipGraph.tsx
│   │   ├── FileNode.tsx
│   │   └── CustomEdge.tsx
│   ├── Sidebar/
│   │   ├── DetailSidebar.tsx
│   │   ├── FilePreview.tsx
│   │   └── RelationshipList.tsx
│   ├── Editor/
│   │   ├── RelationshipEditor.tsx
│   │   └── EdgeEditor.tsx
│   ├── Search/
│   │   ├── SearchPanel.tsx
│   │   └── FilterBar.tsx
│   └── Export/
│       ├── ExportPanel.tsx
│       └── ExportPreview.tsx
├── services/
│   ├── fileScanner.ts
│   ├── relationshipEngine.ts
│   └── searchService.ts
├── store/
│   └── appStore.ts
└── types/
    ├── file.ts
    └── relationship.ts
```

## 8. 性能优化策略

1. **虚拟化渲染**：使用 React Flow 的内置虚拟化
2. **懒加载**：动态导入非关键组件
3. **增量扫描**：支持大文件夹的增量更新
4. **Web Worker**：关系分析在后台线程执行
5. **缓存策略**：文件预览和内容缓存

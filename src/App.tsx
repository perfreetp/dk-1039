import { useRef } from 'react';
import { ConfigProvider, theme } from 'antd';
import { MainLayout } from './components/Layout/MainLayout';
import { RelationshipGraph } from './components/Graph/RelationshipGraph';
import { DetailSidebar } from './components/Sidebar/DetailSidebar';
import { RelationshipEditor } from './components/Editor/RelationshipEditor';
import { SearchPanel } from './components/Search/SearchPanel';
import { ExportPanel } from './components/Export/ExportPanel';
import { useAppStore } from './store/appStore';

export default function App() {
  const graphRef = useRef<HTMLDivElement>(null);
  const {
    setSearchPanelOpen,
    setExportPanelOpen,
    setEditorOpen,
  } = useAppStore();

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#e94560',
          colorBgContainer: '#16213e',
          colorBgElevated: '#1a1a2e',
          colorBorder: 'rgba(255, 255, 255, 0.1)',
          colorText: '#e0e0e0',
          colorTextSecondary: '#9ca3af',
          borderRadius: 8,
        },
        components: {
          Select: {
            optionSelectedBg: '#0f3460',
          },
          Modal: {
            contentBg: '#1a1a2e',
            headerBg: '#1a1a2e',
          },
          Tabs: {
            itemSelectedColor: '#e94560',
            inkBarColor: '#e94560',
          },
        },
      }}
    >
      <MainLayout
        onOpenSearch={() => setSearchPanelOpen(true)}
        onOpenExport={() => setExportPanelOpen(true)}
        onOpenEditor={() => setEditorOpen(true)}
      >
        <div className="flex h-full">
          <div className="flex-1 relative">
            <RelationshipGraph graphRef={graphRef} />
          </div>
          <DetailSidebar />
        </div>
      </MainLayout>

      <RelationshipEditor />
      <SearchPanel />
      <ExportPanel graphRef={graphRef} />
    </ConfigProvider>
  );
}

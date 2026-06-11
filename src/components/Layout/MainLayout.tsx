import { ReactNode } from 'react';
import { Header } from './Header';
import { StatusBar } from './StatusBar';

interface MainLayoutProps {
  children: ReactNode;
  onOpenSearch: () => void;
  onOpenExport: () => void;
  onOpenEditor: () => void;
}

export function MainLayout({ children, onOpenSearch, onOpenExport, onOpenEditor }: MainLayoutProps) {
  return (
    <div className="h-screen w-screen flex flex-col bg-primary">
      <Header
        onOpenSearch={onOpenSearch}
        onOpenExport={onOpenExport}
        onOpenEditor={onOpenEditor}
      />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
      <StatusBar />
    </div>
  );
}

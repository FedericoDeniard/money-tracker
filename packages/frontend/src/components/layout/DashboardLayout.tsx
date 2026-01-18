import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';
import logo from '../../logo.svg';
import { DecorativeSquare } from '../ui/DecorativeSquare';

export function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden bg-[var(--bg-primary)] border-b border-[var(--text-secondary)]/20 p-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8">
            <DecorativeSquare size={32} className="absolute" />
            <img
              src={logo}
              alt="Money Tracker Logo"
              className="absolute inset-0 w-full h-full object-contain"
            />
          </div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">
            Money Tracker
          </h1>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
      </header>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 p-4 lg:p-8 lg:ml-64 min-h-[calc(100vh-64px)] lg:min-h-screen w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

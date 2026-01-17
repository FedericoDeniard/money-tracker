import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <Sidebar />
      <main className="ml-64 p-8 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

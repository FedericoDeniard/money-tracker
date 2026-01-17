import { LayoutDashboard, Receipt, Settings, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { DecorativeSquare } from '../ui/DecorativeSquare';
import { Button } from '../ui/Button';

export function Sidebar() {
  const location = useLocation();
  const { signOut } = useAuth();

  const links = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Receipt, label: 'Transacciones', path: '/transactions' },
    { icon: Settings, label: 'Configuración', path: '/settings' },
  ];

  return (
    <aside className="w-64 bg-[var(--bg-primary)] border-r border-[var(--text-secondary)]/20 min-h-screen flex flex-col fixed left-0 top-0 h-full z-10">
      <div className="p-6 flex items-center gap-3">
        <div className="relative w-10 h-10">
          <DecorativeSquare size={40} className="absolute" />
          <span className="absolute inset-0 flex items-center justify-center text-[var(--primary)] font-bold text-sm transform -rotate-16">
            $
          </span>
        </div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Money Tracker</h1>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-2">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-[var(--primary)] text-white shadow-md' 
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <link.icon size={20} />
              <span className="font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[var(--text-secondary)]/20">
        <Button
          variant="ghost"
          icon={<LogOut size={20} />}
          iconPosition="left"
          onClick={signOut}
        >
          Cerrar Sesión
        </Button>
      </div>
    </aside>
  );
}

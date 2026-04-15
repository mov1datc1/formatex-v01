import { useSelector } from 'react-redux';
import { Bell, Search } from 'lucide-react';
import type { RootState } from '../../store';

export const Navbar = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar rollos, pedidos, clientes..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 border border-transparent text-sm focus:outline-none focus:border-primary-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell size={20} className="text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User */}
        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-bold">
            {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{user?.nombre || 'Usuario'}</p>
            <p className="text-[11px] text-gray-500">{user?.role || 'Sin rol'}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

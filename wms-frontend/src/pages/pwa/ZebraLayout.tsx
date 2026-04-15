import { Outlet, Link, useLocation } from 'react-router-dom';
import { WmsIcon } from '../../components/icons/WmsIcons';
import { LogOut, Wifi, WifiOff } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import type { RootState } from '../../store';
import { useState, useEffect } from 'react';

export default function ZebraLayout() {
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const location = useLocation();
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const tabs = [
    { path: '/zebra/picker', label: 'Picking', icon: WmsIcon.Picking },
    { path: '/zebra/cortador', label: 'Corte', icon: WmsIcon.Cut },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Top bar */}
      <header className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center font-bold text-xs">360</div>
          <span className="font-bold text-sm">Zebra</span>
          {online ? <Wifi size={14} className="text-emerald-400" /> : <WifiOff size={14} className="text-red-400" />}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{user?.nombre}</span>
          <button onClick={() => dispatch(logout())} className="p-2 hover:bg-gray-700 rounded-lg">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="bg-gray-800 flex border-b border-gray-700">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = location.pathname === t.path;
          return (
            <Link key={t.path} to={t.path} className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors ${active ? 'text-primary-400 border-b-2 border-primary-400 bg-gray-700/50' : 'text-gray-400 hover:text-gray-200'}`}>
              <Icon size={18} />
              {t.label}
            </Link>
          );
        })}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}

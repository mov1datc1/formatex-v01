import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Wifi, WifiOff, Package, Scissors, PackageCheck, Truck, ScanBarcode, Tag, ScrollText } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import type { RootState } from '../../store';
import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';

const ALL_PRIMARY_NAV = [
  { path: '/zebra/picking', label: 'Picking', icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/20', roles: ['PICKER', 'SUPERVISOR', 'ADMIN', 'JEFE_ALMACEN', 'DIRECTOR', 'GERENTE'] },
  { path: '/zebra/corte', label: 'Corte', icon: Scissors, color: 'text-purple-400', bg: 'bg-purple-500/20', roles: ['CORTADOR', 'SUPERVISOR', 'ADMIN', 'JEFE_ALMACEN', 'DIRECTOR', 'GERENTE'] },
  { path: '/zebra/empaque', label: 'Empaque', icon: PackageCheck, color: 'text-teal-400', bg: 'bg-teal-500/20', roles: ['EMPACADOR', 'SUPERVISOR', 'ADMIN', 'JEFE_ALMACEN', 'DIRECTOR', 'GERENTE'] },
  { path: '/zebra/envio', label: 'Envío', icon: Truck, color: 'text-orange-400', bg: 'bg-orange-500/20', roles: ['CHOFER', 'ENVIO', 'DESPACHO', 'SUPERVISOR', 'ADMIN', 'JEFE_ALMACEN', 'DIRECTOR', 'GERENTE'] },
];

const ALL_SECONDARY_NAV = [
  { path: '/zebra/recepcion', label: 'Recepción', icon: ScanBarcode, color: 'text-emerald-400', bg: 'bg-emerald-500/20', roles: ['RECEPCION', 'SUPERVISOR', 'ADMIN', 'JEFE_ALMACEN', 'DIRECTOR', 'GERENTE'] },
  { path: '/zebra/etiquetas', label: 'Etiquetas', icon: Tag, color: 'text-amber-400', bg: 'bg-amber-500/20', roles: ['EMPACADOR', 'SUPERVISOR', 'ADMIN', 'JEFE_ALMACEN', 'DIRECTOR', 'GERENTE'] },
  { path: '/zebra/rollos', label: 'Rollos', icon: ScrollText, color: 'text-cyan-400', bg: 'bg-cyan-500/20', roles: ['PICKER', 'CORTADOR', 'SUPERVISOR', 'ADMIN', 'JEFE_ALMACEN', 'DIRECTOR', 'GERENTE'] },
  { path: '/zebra/retazos', label: 'Retazos', icon: Scissors, color: 'text-pink-400', bg: 'bg-pink-500/20', roles: ['CORTADOR', 'SUPERVISOR', 'ADMIN', 'JEFE_ALMACEN', 'DIRECTOR', 'GERENTE'] },
];

export default function ZebraLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);
  const location = useLocation();
  const [online, setOnline] = useState(navigator.onLine);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const userRole = (user?.role?.nombre || user?.role || '').toUpperCase();
  const isAdminOrSupervisor = ['ADMIN', 'SUPERVISOR', 'JEFE_ALMACEN', 'DIRECTOR', 'GERENTE', 'COORDINADOR'].includes(userRole) || (user?.nivel && user.nivel <= 2);

  // Filtrado de pestañas según rol operativo específico
  const primaryNav = useMemo(() => {
    if (isAdminOrSupervisor) return ALL_PRIMARY_NAV;
    if (userRole === 'PICKER') {
      return ALL_PRIMARY_NAV.filter(item => item.path === '/zebra/picking');
    }
    if (userRole === 'CORTADOR') {
      return [
        ALL_PRIMARY_NAV.find(item => item.path === '/zebra/corte')!,
        ALL_SECONDARY_NAV.find(item => item.path === '/zebra/retazos')!,
      ].filter(Boolean);
    }
    if (userRole === 'EMPACADOR') {
      return [
        ALL_PRIMARY_NAV.find(item => item.path === '/zebra/empaque')!,
        ALL_SECONDARY_NAV.find(item => item.path === '/zebra/etiquetas')!,
      ].filter(Boolean);
    }
    if (['CHOFER', 'ENVIO', 'DESPACHO'].includes(userRole)) {
      return ALL_PRIMARY_NAV.filter(item => item.path === '/zebra/envio');
    }
    return ALL_PRIMARY_NAV.filter(item => item.roles.includes(userRole));
  }, [userRole, isAdminOrSupervisor]);

  const secondaryNav = useMemo(() => {
    if (isAdminOrSupervisor) return ALL_SECONDARY_NAV;
    if (userRole === 'PICKER') {
      return ALL_SECONDARY_NAV.filter(item => item.path === '/zebra/rollos');
    }
    return [];
  }, [userRole, isAdminOrSupervisor]);

  // Protección de ruta: Si un picker intenta forzar la URL hacia corte, empaque o envío, redirigir a picking
  useEffect(() => {
    if (!isAdminOrSupervisor && userRole === 'PICKER') {
      const allowed = ['/zebra/picking', '/zebra/rollos'];
      if (!allowed.includes(location.pathname)) {
        toast('Acceso restringido a tu rol de Picking', { icon: '🔒' });
        navigate('/zebra/picking', { replace: true });
      }
    }
  }, [location.pathname, userRole, isAdminOrSupervisor, navigate]);

  const isInSecondary = secondaryNav.some(i => location.pathname === i.path);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Top bar — compact */}
      <header className="bg-gray-900/95 backdrop-blur-xl px-4 py-2.5 flex items-center justify-between border-b border-gray-800 safe-area-top">
        <div className="flex items-center gap-2.5">
          <img src="/logo-360.png" alt="WMS 360+" className="w-8 h-8 rounded-lg" />
          <div>
            <span className="font-bold text-sm tracking-tight">WMS 360+</span>
            <span className="text-[10px] text-gray-400 ml-1.5 font-mono">
              {userRole ? `[${userRole}]` : 'Operaciones'}
            </span>
          </div>
          {online ? (
            <Wifi size={12} className="text-emerald-400" />
          ) : (
            <WifiOff size={12} className="text-red-400 animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 max-w-[90px] truncate">{user?.nombre?.split(' ')[0]}</span>
          <button onClick={() => dispatch(logout())} className="p-1.5 hover:bg-gray-800 rounded-lg active:scale-95 transition-transform" title="Cerrar sesión">
            <LogOut size={14} className="text-gray-400" />
          </button>
        </div>
      </header>

      {/* Content area */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="p-4">
          <Outlet />
        </div>
      </main>

      {/* Expanded secondary nav overlay (solo si hay módulos secundarios para este rol) */}
      {showMore && secondaryNav.length > 0 && (
        <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="absolute bottom-[76px] left-0 right-0 p-3 safe-area-bottom" onClick={e => e.stopPropagation()}>
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-3 shadow-2xl shadow-black/50">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2 px-1">Más módulos</p>
              <div className="grid grid-cols-4 gap-1">
                {secondaryNav.map(item => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setShowMore(false)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-all active:scale-95 ${
                        active ? `${item.bg} ${item.color}` : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                      }`}
                    >
                      <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-xl border-t border-gray-800 safe-area-bottom">
        <div className="flex items-stretch">
          {primaryNav.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 flex flex-col items-center justify-center py-2 pt-2.5 gap-0.5 transition-all active:scale-95 relative ${
                  active ? item.color : 'text-gray-500'
                }`}
              >
                {/* Active indicator */}
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-current" />
                )}
                <div className={`p-1.5 rounded-xl transition-colors ${active ? item.bg : ''}`}>
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                </div>
                <span className={`text-[9px] font-medium ${active ? 'font-bold' : ''}`}>{item.label}</span>
              </Link>
            );
          })}

          {/* More button (solo si el rol tiene módulos secundarios disponibles) */}
          {secondaryNav.length > 0 && (
            <button
              onClick={() => setShowMore(!showMore)}
              className={`flex-1 flex flex-col items-center justify-center py-2 pt-2.5 gap-0.5 transition-all active:scale-95 relative ${
                isInSecondary ? 'text-cyan-400' : 'text-gray-500'
              }`}
            >
              {isInSecondary && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-current" />
              )}
              <div className={`p-1.5 rounded-xl ${isInSecondary ? 'bg-cyan-500/20' : ''}`}>
                <div className="grid grid-cols-2 gap-[2px]">
                  <div className="w-[7px] h-[7px] bg-current rounded-[2px]" />
                  <div className="w-[7px] h-[7px] bg-current rounded-[2px]" />
                  <div className="w-[7px] h-[7px] bg-current rounded-[2px]" />
                  <div className="w-[7px] h-[7px] bg-current rounded-[2px]" />
                </div>
              </div>
              <span className={`text-[9px] font-medium ${isInSecondary ? 'font-bold' : ''}`}>Más</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, Package, Scissors, PackageCheck, Truck,
  Warehouse, MapPin, ClipboardList, Bell, Users, Settings,
  ChevronLeft, ChevronRight, LogOut, ScrollText, ScanBarcode, Tag,
  Ship, Search, ArrowRightLeft, CalendarRange, FileText
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import type { RootState } from '../../store';

interface MenuItem {
  label: string;
  path: string;
  icon: React.ElementType;
  permission?: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    title: 'General',
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard },
      { label: 'Ubicaciones', path: '/almacen', icon: MapPin, permission: 'warehouse' },
      { label: 'Alertas', path: '/alertas', icon: Bell, permission: 'alerts' },
    ],
  },
  {
    title: 'Ventas / ATC',
    items: [
      { label: 'Pedidos', path: '/pedidos', icon: ClipboardList, permission: 'orders' },
      { label: 'Disponibilidad', path: '/disponibilidad', icon: Search, permission: 'availability' },
      { label: 'En Tránsito', path: '/transito', icon: Ship, permission: 'transit' },
      { label: 'Planificación', path: '/planificacion', icon: CalendarRange, permission: 'supply-planning' },
    ],
  },
  {
    title: 'Almacén',
    items: [
      { label: 'Picking', path: '/picking', icon: Package, permission: 'picking' },
      { label: 'Corte', path: '/corte', icon: Scissors, permission: 'cutting' },
      { label: 'Empaque', path: '/empaque', icon: PackageCheck, permission: 'packing' },
      { label: 'Envío', path: '/envio', icon: Truck, permission: 'shipping' },
      { label: 'Facturación', path: '/facturacion', icon: FileText, permission: 'orders' },
      { label: 'Transferencias', path: '/transferencias', icon: ArrowRightLeft, permission: 'transfers' },
    ],
  },
  {
    title: 'Inventario',
    items: [
      { label: 'Recepción', path: '/recepcion', icon: ScanBarcode, permission: 'reception' },
      { label: 'Etiquetas', path: '/etiquetas', icon: Tag, permission: 'inventory' },
      { label: 'Rollos (HUs)', path: '/inventario/rollos', icon: ScrollText, permission: 'inventory' },
      { label: 'Retazos', path: '/inventario/retazos', icon: Scissors, permission: 'inventory' },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { label: 'Catálogos', path: '/catalogos', icon: ClipboardList, permission: 'catalog' },
      { label: 'Almacén', path: '/almacen-config', icon: Warehouse, permission: 'warehouse' },
      { label: 'Admin', path: '/admin', icon: Users, permission: 'admin' },
      { label: 'Config', path: '/config', icon: Settings, permission: 'admin' },
    ],
  },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    if (!user?.permissions) return false;
    if (user.nivel <= 2) return true; // Director/Gerente ven todo
    return user.permissions.some((p) => p.modulo === permission);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-primary-900 text-white flex flex-col transition-all duration-300 z-50 ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-white/10">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo-360.png" alt="WMS 360+" className="w-8 h-8" />
            <span className="font-bold text-lg tracking-tight">WMS 360<span className="text-cyan-400">+</span></span>
          </Link>
        )}
        {collapsed && (
          <Link to="/" className="mx-auto">
            <img src="/logo-360.png" alt="WMS 360+" className="w-8 h-8" />
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {menuSections.map((section) => {
          const visibleItems = section.items.filter((item) => hasPermission(item.permission));
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title}>
              {!collapsed && (
                <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                    key={`${item.label}-${item.path}`}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      } ${collapsed ? 'justify-center' : ''}`}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className="border-t border-white/10 p-3">
        {!collapsed && user && (
          <div className="mb-2 px-2">
            <p className="text-sm font-medium truncate">{user.nombre}</p>
            <p className="text-[11px] text-white/50 truncate">{user.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Cerrar sesión"
        >
          <LogOut size={20} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
};

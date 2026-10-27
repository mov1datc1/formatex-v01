import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Login } from '../pages/auth/Login';
import Dashboard from '../pages/Dashboard';
import RollosPage from '../pages/inventory/RollosPage';
import RetazosPage from '../pages/inventory/RetazosPage';
import RecepcionPage from '../pages/reception/RecepcionPage';
import PedidosPage from '../pages/orders/PedidosPage';
import PickingPage from '../pages/picking/PickingPage';
import CortePage from '../pages/cutting/CortePage';
import CatalogosPage from '../pages/catalog/CatalogosPage';
import AlmacenPage from '../pages/warehouse/AlmacenPage';
import UbicacionesPage from '../pages/warehouse/UbicacionesPage';
import AlertasPage from '../pages/alerts/AlertasPage';
import AdminPage from '../pages/admin/AdminPage';
import ConfigPage from '../pages/config/ConfigPage';
import EtiquetasPage from '../pages/labeling/EtiquetasPage';
import TransitoPage from '../pages/transit/TransitoPage';
import DisponibilidadPage from '../pages/availability/DisponibilidadPage';
import EmpaquePage from '../pages/packing/EmpaquePage';
import EnvioPage from '../pages/shipping/EnvioPage';
import ZebraLayout from '../pages/pwa/ZebraLayout';
import PickerView from '../pages/pwa/PickerView';
import CortadorView from '../pages/pwa/CortadorView';
import PwaEmpaqueView from '../pages/pwa/PwaEmpaqueView';
import PwaEnvioView from '../pages/pwa/PwaEnvioView';
import PwaRecepcionView from '../pages/pwa/PwaRecepcionView';
import PwaEtiquetasView from '../pages/pwa/PwaEtiquetasView';
import PwaRollosView from '../pages/pwa/PwaRollosView';
import PwaRetazosView from '../pages/pwa/PwaRetazosView';
import TransferenciasPage from '../pages/transfers/TransferenciasPage';
import PlanificacionPage from '../pages/planning/PlanificacionPage';
import FacturacionPage from '../pages/invoicing/FacturacionPage';
import CobranzaPage from '../pages/cobranza/CobranzaPage';
import ComprasPage from '../pages/compras/ComprasPage';
import ComisionesPage from '../pages/comisiones/ComisionesPage';


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useSelector((state: RootState) => state.auth.user);
  const location = useLocation();
  if (!user?.token) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

function RoleGuard({
  children,
  excludeRoles,
  allowedRoles,
  redirectTo = '/pedidos',
}: {
  children: React.ReactNode;
  excludeRoles?: string[];
  allowedRoles?: string[];
  redirectTo?: string;
}) {
  const user = useSelector((state: RootState) => state.auth.user);
  const userRole = (user?.role?.nombre || user?.role || '').toUpperCase();
  const isAdmin = (user?.nivel && user.nivel <= 2) || ['ADMIN', 'DIRECTOR_OPERACIONES', 'DIRECTOR_COMPRAS'].includes(userRole);

  if (isAdmin) return <>{children}</>;
  if (excludeRoles && excludeRoles.includes(userRole)) {
    return <Navigate to={redirectTo} replace />;
  }
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to={redirectTo} replace />;
  }
  return <>{children}</>;
}

function DashboardGuard() {
  const user = useSelector((state: RootState) => state.auth.user);
  const userRole = (user?.role?.nombre || user?.role || '').toUpperCase();
  if (['ATC', 'VENDEDOR'].includes(userRole)) {
    return <Navigate to="/pedidos" replace />;
  }
  if (userRole === 'PICKER') return <Navigate to="/picking" replace />;
  if (userRole === 'CORTADOR') return <Navigate to="/corte" replace />;
  if (userRole === 'EMPACADOR') return <Navigate to="/empaque" replace />;
  if (userRole === 'DESPACHADOR' || userRole === 'CHOFER') return <Navigate to="/envio" replace />;
  return <Dashboard />;
}

export function AppRouter() {
  const dispatch = useDispatch();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const listener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          // Clear session on background for security (handhelds)
          dispatch(logout());
        }
      });

      return () => {
        listener.then(l => l.remove());
      };
    }
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Main dashboard layout */}
        <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<DashboardGuard />} />

          {/* General */}
          <Route path="almacen" element={<RoleGuard excludeRoles={['ATC', 'JEFE_ATC', 'COBRANZA', 'FACTURACION', 'PICKER', 'CORTADOR', 'EMPACADOR', 'DESPACHADOR', 'VENDEDOR']}><UbicacionesPage /></RoleGuard>} />
          <Route path="alertas" element={<RoleGuard excludeRoles={['ATC', 'JEFE_ATC', 'COBRANZA', 'FACTURACION', 'PICKER', 'CORTADOR', 'EMPACADOR', 'DESPACHADOR', 'VENDEDOR']}><AlertasPage /></RoleGuard>} />

          {/* Ventas / ATC */}
          <Route path="pedidos" element={<PedidosPage />} />
          <Route path="disponibilidad" element={<DisponibilidadPage />} />
          <Route path="transito" element={<TransitoPage />} />
          <Route path="comisiones" element={<ComisionesPage />} />

          {/* Cobranza */}
          <Route path="cobranza" element={<RoleGuard allowedRoles={['ADMIN', 'DIRECTOR_OPERACIONES', 'DIRECTOR_COMPRAS', 'COBRANZA', 'SUPERVISOR', 'JEFE_ALMACEN']}><CobranzaPage /></RoleGuard>} />

          {/* Planificación */}
          <Route path="planificacion" element={<RoleGuard excludeRoles={['ATC', 'JEFE_ATC', 'COBRANZA', 'FACTURACION', 'PICKER', 'CORTADOR', 'EMPACADOR', 'DESPACHADOR', 'VENDEDOR']}><PlanificacionPage /></RoleGuard>} />

          {/* Compras */}
          <Route path="compras" element={<RoleGuard excludeRoles={['ATC', 'JEFE_ATC', 'COBRANZA', 'FACTURACION', 'PICKER', 'CORTADOR', 'EMPACADOR', 'DESPACHADOR', 'VENDEDOR']}><ComprasPage /></RoleGuard>} />

          {/* Almacén */}
          <Route path="picking" element={<RoleGuard excludeRoles={['ATC', 'JEFE_ATC', 'COBRANZA', 'FACTURACION', 'VENDEDOR']}><PickingPage /></RoleGuard>} />
          <Route path="corte" element={<RoleGuard excludeRoles={['ATC', 'JEFE_ATC', 'COBRANZA', 'FACTURACION', 'VENDEDOR']}><CortePage /></RoleGuard>} />
          <Route path="empaque" element={<RoleGuard excludeRoles={['ATC', 'JEFE_ATC', 'COBRANZA', 'FACTURACION', 'VENDEDOR']}><EmpaquePage /></RoleGuard>} />
          <Route path="envio" element={<RoleGuard excludeRoles={['ATC', 'JEFE_ATC', 'COBRANZA', 'FACTURACION', 'VENDEDOR']}><EnvioPage /></RoleGuard>} />
          <Route path="transferencias" element={<RoleGuard excludeRoles={['ATC', 'JEFE_ATC', 'COBRANZA', 'FACTURACION', 'VENDEDOR']}><TransferenciasPage /></RoleGuard>} />

          {/* Facturación */}
          <Route path="facturacion" element={<RoleGuard allowedRoles={['ADMIN', 'DIRECTOR_OPERACIONES', 'DIRECTOR_COMPRAS', 'FACTURACION', 'SUPERVISOR', 'JEFE_ALMACEN']}><FacturacionPage /></RoleGuard>} />

          {/* Inventario */}
          <Route path="recepcion" element={<RoleGuard excludeRoles={['ATC', 'JEFE_ATC', 'COBRANZA', 'FACTURACION', 'VENDEDOR']}><RecepcionPage /></RoleGuard>} />
          <Route path="recepcion/nueva" element={<RoleGuard excludeRoles={['ATC', 'JEFE_ATC', 'COBRANZA', 'FACTURACION', 'VENDEDOR']}><RecepcionPage /></RoleGuard>} />
          <Route path="etiquetas" element={<RoleGuard excludeRoles={['ATC', 'JEFE_ATC', 'COBRANZA', 'FACTURACION', 'VENDEDOR']}><EtiquetasPage /></RoleGuard>} />
          <Route path="inventario/rollos" element={<RoleGuard excludeRoles={['ATC', 'JEFE_ATC', 'COBRANZA', 'FACTURACION', 'VENDEDOR']}><RollosPage /></RoleGuard>} />
          <Route path="inventario/retazos" element={<RoleGuard excludeRoles={['ATC', 'JEFE_ATC', 'COBRANZA', 'FACTURACION', 'VENDEDOR']}><RetazosPage /></RoleGuard>} />

          {/* Sistema / Catálogos */}
          <Route path="catalogos" element={<RoleGuard excludeRoles={['ATC', 'COBRANZA', 'FACTURACION', 'PICKER', 'CORTADOR', 'EMPACADOR', 'DESPACHADOR', 'VENDEDOR']}><CatalogosPage /></RoleGuard>} />
          <Route path="almacen-config" element={<RoleGuard excludeRoles={['ATC', 'JEFE_ATC', 'COBRANZA', 'FACTURACION', 'PICKER', 'CORTADOR', 'EMPACADOR', 'DESPACHADOR', 'VENDEDOR']}><AlmacenPage /></RoleGuard>} />

          {/* Admin */}
          <Route path="admin" element={<RoleGuard excludeRoles={['ATC', 'JEFE_ATC', 'COBRANZA', 'FACTURACION', 'PICKER', 'CORTADOR', 'EMPACADOR', 'DESPACHADOR', 'VENDEDOR']}><AdminPage /></RoleGuard>} />
          <Route path="config" element={<RoleGuard excludeRoles={['ATC', 'JEFE_ATC', 'COBRANZA', 'FACTURACION', 'PICKER', 'CORTADOR', 'EMPACADOR', 'DESPACHADOR', 'VENDEDOR']}><ConfigPage /></RoleGuard>} />
        </Route>

        {/* PWA / Zebra — mobile-first layout with bottom nav */}
        <Route path="/zebra" element={<ProtectedRoute><ZebraLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/zebra/picking" replace />} />
          <Route path="picking" element={<PickerView />} />
          <Route path="corte" element={<CortadorView />} />
          <Route path="empaque" element={<PwaEmpaqueView />} />
          <Route path="envio" element={<PwaEnvioView />} />
          <Route path="recepcion" element={<PwaRecepcionView />} />
          <Route path="etiquetas" element={<PwaEtiquetasView />} />
          <Route path="rollos" element={<PwaRollosView />} />
          <Route path="retazos" element={<PwaRetazosView />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}


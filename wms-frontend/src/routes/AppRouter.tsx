import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
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


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useSelector((state: RootState) => state.auth.user);
  const location = useLocation();
  if (!user?.token) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Main dashboard layout */}
        <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />

          {/* General */}
          <Route path="almacen" element={<UbicacionesPage />} />
          <Route path="alertas" element={<AlertasPage />} />

          {/* Ventas / ATC */}
          <Route path="pedidos" element={<PedidosPage />} />
          <Route path="disponibilidad" element={<DisponibilidadPage />} />
          <Route path="transito" element={<TransitoPage />} />
          <Route path="planificacion" element={<PlanificacionPage />} />

          {/* Almacén */}
          <Route path="picking" element={<PickingPage />} />
          <Route path="corte" element={<CortePage />} />
          <Route path="empaque" element={<EmpaquePage />} />
          <Route path="envio" element={<EnvioPage />} />
          <Route path="transferencias" element={<TransferenciasPage />} />

          {/* Inventario */}
          <Route path="recepcion" element={<RecepcionPage />} />
          <Route path="recepcion/nueva" element={<RecepcionPage />} />
          <Route path="etiquetas" element={<EtiquetasPage />} />
          <Route path="inventario/rollos" element={<RollosPage />} />
          <Route path="inventario/retazos" element={<RetazosPage />} />

          {/* Sistema */}
          <Route path="catalogos" element={<CatalogosPage />} />
          <Route path="almacen-config" element={<AlmacenPage />} />

          {/* Admin */}
          <Route path="admin" element={<AdminPage />} />
          <Route path="config" element={<ConfigPage />} />
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


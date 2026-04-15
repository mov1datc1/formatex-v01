import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import {
  Bell, AlertTriangle, Clock,
  CheckCircle, XCircle, BarChart3,
} from 'lucide-react';

interface Alert {
  id: string;
  type: 'stock_bajo' | 'hu_sin_ubicar' | 'pedido_urgente' | 'merma_alta' | 'ubicacion_llena' | 'transito_retrasado' | 'transferencia_pendiente';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
}

const SEVERITY_CONFIG = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: XCircle, badge: 'bg-red-500' },
  warning:  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertTriangle, badge: 'bg-amber-500' },
  info:     { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: Bell, badge: 'bg-blue-500' },
};

export default function AlertasPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  // Fetch data to generate alerts
  const { data: invStats } = useApi<any>(['inv-stats-alert'], '/inventory/stats');
  const { data: orderStats } = useApi<any>(['order-stats-alert'], '/orders/stats');
  const { data: whStats } = useApi<any>(['wh-stats-alert'], '/warehouse/stats');
  const { data: transitStats } = useApi<any>(['transit-stats-alert'], '/transit/stats');

  useEffect(() => {
    const generated: Alert[] = [];
    const now = new Date();

    // === INVENTORY ALERTS ===
    if (invStats) {
      // HUs sin ubicar
      if (invStats.sinUbicar && invStats.sinUbicar > 0) {
        generated.push({
          id: 'hu-sin-ubicar',
          type: 'hu_sin_ubicar',
          severity: invStats.sinUbicar > 10 ? 'critical' : 'warning',
          title: `${invStats.sinUbicar} HUs sin ubicar`,
          message: `Hay ${invStats.sinUbicar} rollos que no han sido asignados a una ubicación en el almacén. Ubícalos para mantener el orden.`,
          timestamp: now,
        });
      }
      // Stock bajo
      if (invStats.agotados && invStats.agotados > 0) {
        generated.push({
          id: 'stock-agotado',
          type: 'stock_bajo',
          severity: 'critical',
          title: `${invStats.agotados} HUs agotados`,
          message: 'Existen rollos marcados como agotados. Verifica y retira del inventario activo.',
          timestamp: now,
        });
      }
      // Retazos acumulados
      const retazos = invStats.retazos || 0;
      if (retazos > 20) {
        generated.push({
          id: 'retazos-acumulados',
          type: 'merma_alta',
          severity: 'warning',
          title: `${retazos} retazos acumulados`,
          message: 'Gran cantidad de retazos en inventario. Considera priorizar su uso en la sugerencia inteligente o realizar una liquidación.',
          timestamp: now,
        });
      }
    }

    // === ORDER ALERTS ===
    if (orderStats) {
      const urgentes = orderStats.urgentes || 0;
      if (urgentes > 0) {
        generated.push({
          id: 'pedidos-urgentes',
          type: 'pedido_urgente',
          severity: 'critical',
          title: `${urgentes} pedidos urgentes`,
          message: 'Existen pedidos marcados como urgentes que requieren atención inmediata del equipo de ATC.',
          timestamp: now,
        });
      }
      const porSurtir = orderStats.porSurtir || 0;
      if (porSurtir > 5) {
        generated.push({
          id: 'pedidos-por-surtir',
          type: 'pedido_urgente',
          severity: 'warning',
          title: `${porSurtir} pedidos por surtir`,
          message: 'Cola de pedidos por surtir creciendo. Asigna más personal al área de picking.',
          timestamp: now,
        });
      }
    }

    // === WAREHOUSE ALERTS ===
    if (whStats) {
      const ocupadas = whStats.ocupadas || 0;
      const total = whStats.totalUbicaciones || 1;
      const pctOcupacion = (ocupadas / total) * 100;
      if (pctOcupacion > 85) {
        generated.push({
          id: 'almacen-lleno',
          type: 'ubicacion_llena',
          severity: pctOcupacion > 95 ? 'critical' : 'warning',
          title: `Almacén al ${Math.round(pctOcupacion)}% de capacidad`,
          message: `${ocupadas} de ${total} ubicaciones ocupadas. Considera reorganizar o expandir capacidad.`,
          timestamp: now,
        });
      }
    }

    // === TRANSIT ALERTS ===
    if (transitStats) {
      const enTransito = transitStats.enTransito || 0;
      if (enTransito > 0) {
        generated.push({
          id: 'embarques-transito',
          type: 'transito_retrasado',
          severity: 'info',
          title: `${enTransito} embarques en tránsito`,
          message: 'Mercancía en camino. Verifica fechas de llegada estimadas y prepara espacio en el almacén.',
          timestamp: now,
        });
      }
    }

    // Sort by severity (critical first)
    const order = { critical: 0, warning: 1, info: 2 };
    generated.sort((a, b) => order[a.severity] - order[b.severity]);

    setAlerts(generated);
    setLoading(false);
  }, [invStats, orderStats, whStats, transitStats]);

  const filteredAlerts = filter === 'all' ? alerts : alerts.filter(a => a.severity === filter);
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const infoCount = alerts.filter(a => a.severity === 'info').length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Bell className="w-5 h-5 text-white" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertas del Sistema</h1>
          <p className="text-gray-500 text-sm">Monitoreo en tiempo real del WMS — {alerts.length} alertas activas</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => setFilter('all')}
          className={`rounded-xl p-4 text-left transition-all ${filter === 'all' ? 'ring-2 ring-indigo-400 bg-indigo-50' : 'bg-white border border-gray-100 hover:shadow'}`}>
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-500" />
            <span className="text-2xl font-bold text-indigo-600">{alerts.length}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Total</p>
        </button>
        <button onClick={() => setFilter('critical')}
          className={`rounded-xl p-4 text-left transition-all ${filter === 'critical' ? 'ring-2 ring-red-400 bg-red-50' : 'bg-white border border-gray-100 hover:shadow'}`}>
          <div className="flex items-center gap-2">
            <XCircle size={18} className="text-red-500" />
            <span className="text-2xl font-bold text-red-600">{criticalCount}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Críticas</p>
        </button>
        <button onClick={() => setFilter('warning')}
          className={`rounded-xl p-4 text-left transition-all ${filter === 'warning' ? 'ring-2 ring-amber-400 bg-amber-50' : 'bg-white border border-gray-100 hover:shadow'}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <span className="text-2xl font-bold text-amber-600">{warningCount}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Advertencias</p>
        </button>
        <button onClick={() => setFilter('info')}
          className={`rounded-xl p-4 text-left transition-all ${filter === 'info' ? 'ring-2 ring-blue-400 bg-blue-50' : 'bg-white border border-gray-100 hover:shadow'}`}>
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-blue-500" />
            <span className="text-2xl font-bold text-blue-600">{infoCount}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Informativas</p>
        </button>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Analizando estado del sistema...</div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <CheckCircle size={48} className="mx-auto mb-3 text-emerald-400" />
          <p className="text-lg font-semibold text-gray-700">
            {filter === 'all' ? '¡Todo en orden!' : `Sin alertas ${filter === 'critical' ? 'críticas' : filter === 'warning' ? 'de advertencia' : 'informativas'}`}
          </p>
          <p className="text-sm text-gray-400 mt-1">No se detectaron {filter !== 'all' ? 'alertas de este tipo' : 'problemas'} en el sistema</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map(alert => {
            const cfg = SEVERITY_CONFIG[alert.severity];
            const Icon = cfg.icon;
            return (
              <div key={alert.id} className={`${cfg.bg} ${cfg.border} border rounded-xl p-4 transition-all hover:shadow-md`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg ${cfg.badge} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={16} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-semibold ${cfg.text}`}>{alert.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cfg.badge} text-white uppercase`}>
                        {alert.severity === 'critical' ? 'Crítico' : alert.severity === 'warning' ? 'Advertencia' : 'Info'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock size={10} /> {new Date(alert.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className={`text-[10px] ${cfg.text} font-medium`}>
                        {alert.type === 'stock_bajo' && '📦 Inventario'}
                        {alert.type === 'hu_sin_ubicar' && '📍 Ubicaciones'}
                        {alert.type === 'pedido_urgente' && '🔴 Pedidos'}
                        {alert.type === 'merma_alta' && '✂️ Merma'}
                        {alert.type === 'ubicacion_llena' && '🏪 Almacén'}
                        {alert.type === 'transito_retrasado' && '🚛 Tránsito'}
                        {alert.type === 'transferencia_pendiente' && '🔄 Transferencias'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

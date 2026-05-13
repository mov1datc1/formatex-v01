import { useState } from 'react';
import { ShoppingCart, ListOrdered, Inbox, History, Plus } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { KpiIcon } from '../../components/icons/WmsIcons';
import OCListTab from './OCListTab';
import ReceptionQueueTab from './ReceptionQueueTab';
import HistorialTab from './HistorialTab';
import NuevaOCModal from './NuevaOCModal';

const tabs = [
  { id: 'lista', label: 'Órdenes de Compra', icon: ListOrdered },
  { id: 'recepcion', label: 'Cola Recepción', icon: Inbox },
  { id: 'historial', label: 'Historial', icon: History },
];

export default function ComprasPage() {
  const [activeTab, setActiveTab] = useState('lista');
  const [showNuevaOC, setShowNuevaOC] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey(k => k + 1);

  const { data: stats } = useApi<any>(['purchasing-stats', refreshKey], '/purchasing/stats');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <KpiIcon icon={ShoppingCart} gradient="from-blue-500 to-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
            <p className="text-gray-500 text-sm">Órdenes de Compra &amp; Recepción de Mercancía</p>
          </div>
        </div>
        <button
          onClick={() => setShowNuevaOC(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all"
        >
          <Plus size={18} /> Nueva OC
        </button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'OC Activas', value: (stats.borradores || 0) + (stats.confirmadas || 0) + (stats.enRecepcion || 0) + (stats.parciales || 0), icon: ShoppingCart, color: 'text-blue-600', iconColor: 'text-blue-500' },
            { label: 'En Recepción', value: stats.colaRecepcion || 0, icon: Inbox, color: 'text-amber-600', iconColor: 'text-amber-500' },
            { label: 'Completadas', value: stats.completadas || 0, icon: History, color: 'text-emerald-600', iconColor: 'text-emerald-500' },
            { label: 'Monto Activo', value: `$${(stats.montoActivo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: ShoppingCart, color: 'text-purple-600', iconColor: 'text-purple-500' },
          ].map(kpi => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} className={kpi.iconColor} strokeWidth={1.75} />
                  <p className="text-xs text-gray-400 uppercase font-medium">{kpi.label}</p>
                </div>
                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'lista' && <OCListTab key={refreshKey} onRefresh={refresh} />}
      {activeTab === 'recepcion' && <ReceptionQueueTab key={refreshKey} onRefresh={refresh} />}
      {activeTab === 'historial' && <HistorialTab key={refreshKey} />}

      {/* Modal Nueva OC */}
      {showNuevaOC && (
        <NuevaOCModal
          onClose={() => setShowNuevaOC(false)}
          onCreated={() => { setShowNuevaOC(false); refresh(); }}
        />
      )}
    </div>
  );
}

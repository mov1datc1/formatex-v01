import { useState } from 'react';
import { ShoppingCart, ListOrdered, Inbox, History, Plus } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25">
            <ShoppingCart size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Compras</h1>
            <p className="text-sm text-white/50">Órdenes de Compra &amp; Recepción</p>
          </div>
        </div>
        <button
          onClick={() => setShowNuevaOC(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
        >
          <Plus size={18} /> Nueva OC
        </button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'OC Activas', value: (stats.borradores || 0) + (stats.confirmadas || 0) + (stats.enRecepcion || 0) + (stats.parciales || 0), color: 'from-blue-500/20 to-blue-600/10', text: 'text-blue-400' },
            { label: 'En Recepción', value: stats.colaRecepcion || 0, color: 'from-amber-500/20 to-amber-600/10', text: 'text-amber-400' },
            { label: 'Completadas', value: stats.completadas || 0, color: 'from-emerald-500/20 to-emerald-600/10', text: 'text-emerald-400' },
            { label: 'Monto Activo', value: `$${(stats.montoActivo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, color: 'from-purple-500/20 to-purple-600/10', text: 'text-purple-400' },
          ].map(kpi => (
            <div key={kpi.label} className={`bg-gradient-to-br ${kpi.color} border border-white/5 rounded-xl p-4`}>
              <p className="text-xs text-white/50 mb-1">{kpi.label}</p>
              <p className={`text-2xl font-bold ${kpi.text}`}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-primary-800/50 p-1 rounded-xl border border-white/5">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
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

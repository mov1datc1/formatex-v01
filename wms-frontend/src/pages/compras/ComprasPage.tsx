import { useState } from 'react';
import {
  ShoppingCart, ListOrdered, Inbox, History, Plus, Building2,
  Globe2, Truck, Sparkles, Layers, RefreshCw
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { KpiIcon } from '../../components/icons/WmsIcons';
import OCListTab from './OCListTab';
import ReceptionQueueTab from './ReceptionQueueTab';
import HistorialTab from './HistorialTab';
import NuevaOCModal from './NuevaOCModal';
import RequisicionesTelaresTab from './RequisicionesTelaresTab';
import NuevaRequisicionTelaresModal from './NuevaRequisicionTelaresModal';

const chinaTabs = [
  { id: 'lista', label: 'Órdenes de Compra (China)', icon: ListOrdered },
  { id: 'recepcion', label: 'Cola Recepción Contenedores', icon: Inbox },
  { id: 'historial', label: 'Historial Importaciones', icon: History },
];

export default function ComprasPage() {
  // Modo corporativo: 'telares' (Requisiciones Formatex -> Telares) vs 'china' (Importaciones Telares -> China)
  const [corporateMode, setCorporateMode] = useState<'telares' | 'china'>('telares');

  // Sub-tabs para modo China
  const [chinaActiveTab, setChinaActiveTab] = useState('lista');

  // Modales
  const [showNuevaOC, setShowNuevaOC] = useState(false);
  const [showNuevaReq, setShowNuevaReq] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey(k => k + 1);

  const { data: stats } = useApi<any>(['purchasing-stats', refreshKey], '/purchasing/stats');

  return (
    <div className="space-y-6 animate-fade-in pb-12 text-xs">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <KpiIcon icon={ShoppingCart} gradient="from-blue-600 to-indigo-600" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Abastecimiento &amp; Compras</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                WMS 360+
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">
              {corporateMode === 'telares'
                ? 'Requisiciones y resurtido inter-bodegas: Formatex Zapopan requiriendo a Telares Tototlán.'
                : 'Importaciones macro internacionales: Telares y Tejidos comprando a molinos en China y fletes marítimos.'}
            </p>
          </div>
        </div>

        {/* Acciones principales según el modo */}
        <div className="flex items-center gap-2.5">
          {corporateMode === 'telares' ? (
            <button
              onClick={() => setShowNuevaReq(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 rounded-xl font-bold shadow-md shadow-amber-400/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus size={16} /> Nueva Requisición a Telares
            </button>
          ) : (
            <button
              onClick={() => setShowNuevaOC(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer active:scale-95"
            >
              <Plus size={16} /> Nueva OC Internacional (China)
            </button>
          )}
        </div>
      </div>

      {/* SELECTOR CORPORATIVO DE 2 MODOS (TELARES vs CHINA) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-1.5 bg-gray-100 rounded-2xl border border-gray-200/80">
        <button
          onClick={() => setCorporateMode('telares')}
          className={`flex items-start gap-3 p-3 rounded-xl transition-all text-left cursor-pointer ${
            corporateMode === 'telares'
              ? 'bg-white shadow-sm border border-gray-200 text-slate-900 font-bold'
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
          }`}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            corporateMode === 'telares' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-500'
          }`}>
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-gray-900">Requisiciones Formatex ➔ Telares</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                Camisa Formatex
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-normal mt-0.5">
              Traspasos de rollos cerrados (50m) solicitados por Almacén (Israel) o Elba para resurtir Zapopan.
            </p>
          </div>
        </button>

        <button
          onClick={() => setCorporateMode('china')}
          className={`flex items-start gap-3 p-3 rounded-xl transition-all text-left cursor-pointer ${
            corporateMode === 'china'
              ? 'bg-white shadow-sm border border-gray-200 text-slate-900 font-bold'
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
          }`}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            corporateMode === 'china' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
          }`}>
            <Globe2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-gray-900">Importaciones Telares ➔ China</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                Camisa Telares
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-normal mt-0.5">
              Órdenes macro a molinos chinos en USD, contenedores marítimos y pedimentos aduanales Manzanillo.
            </p>
          </div>
        </button>
      </div>

      {/* MODO 1: REQUISICIONES FORMATEX ➔ TELARES */}
      {corporateMode === 'telares' && (
        <RequisicionesTelaresTab onRefresh={refresh} />
      )}

      {/* MODO 2: IMPORTACIONES TELARES ➔ CHINA */}
      {corporateMode === 'china' && (
        <div className="space-y-6">
          {/* KPI Cards Modo China */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'OC Activas (China)', value: (stats.borradores || 0) + (stats.confirmadas || 0) + (stats.enRecepcion || 0) + (stats.parciales || 0), icon: ShoppingCart, color: 'text-blue-600', iconColor: 'text-blue-500' },
                { label: 'En Cola Recepción', value: stats.colaRecepcion || 0, icon: Inbox, color: 'text-amber-600', iconColor: 'text-amber-500' },
                { label: 'Completadas', value: stats.completadas || 0, icon: History, color: 'text-emerald-600', iconColor: 'text-emerald-500' },
                { label: 'Monto Activo', value: `$${(stats.montoActivo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: ShoppingCart, color: 'text-purple-600', iconColor: 'text-purple-500' },
              ].map(kpi => {
                const Icon = kpi.icon;
                return (
                  <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
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

          {/* Sub-tabs Modo China */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            {chinaTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setChinaActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    chinaActiveTab === tab.id
                      ? 'bg-white text-blue-700 shadow-sm font-bold'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                  }`}
                >
                  <Icon size={15} /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Sub-tab Content Modo China */}
          {chinaActiveTab === 'lista' && <OCListTab key={refreshKey} onRefresh={refresh} />}
          {chinaActiveTab === 'recepcion' && <ReceptionQueueTab key={refreshKey} onRefresh={refresh} />}
          {chinaActiveTab === 'historial' && <HistorialTab key={refreshKey} />}
        </div>
      )}

      {/* MODAL NUEVA OC INTERNACIONAL (CHINA) */}
      {showNuevaOC && (
        <NuevaOCModal
          onClose={() => setShowNuevaOC(false)}
          onCreated={() => { setShowNuevaOC(false); refresh(); }}
        />
      )}

      {/* MODAL NUEVA REQUISICIÓN A TELARES */}
      {showNuevaReq && (
        <NuevaRequisicionTelaresModal
          onClose={() => setShowNuevaReq(false)}
          onCreated={() => { setShowNuevaReq(false); refresh(); }}
        />
      )}
    </div>
  );
}

import { useState } from 'react';
import { FileText, CreditCard, BarChart3, UserCheck } from 'lucide-react';
import HistorialTab from './tabs/HistorialTab';
import CobranzaPPDTab from './tabs/CobranzaPPDTab';
import ComisionesTab from './tabs/ComisionesTab';
import EstadoCuentaTab from './tabs/EstadoCuentaTab';

const TABS = [
  { id: 'historial', label: 'Historial', icon: FileText, color: 'emerald' },
  { id: 'cobranza', label: 'Cobranza PPD', icon: CreditCard, color: 'amber' },
  { id: 'comisiones', label: 'Comisiones', icon: BarChart3, color: 'violet' },
  { id: 'estado-cuenta', label: 'Estado de Cuenta', icon: UserCheck, color: 'blue' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function FacturacionPage() {
  const [activeTab, setActiveTab] = useState<TabId>('historial');

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <FileText className="w-5 h-5 text-white" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturación y Cobranza</h1>
          <p className="text-gray-500 text-sm">CFDI · Pagos PPD · Comisiones · Estado de Cuenta</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} className={isActive ? `text-${tab.color}-600` : ''} />
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'historial' && <HistorialTab />}
      {activeTab === 'cobranza' && <CobranzaPPDTab />}
      {activeTab === 'comisiones' && <ComisionesTab />}
      {activeTab === 'estado-cuenta' && <EstadoCuentaTab />}
    </div>
  );
}

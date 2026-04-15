import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import { Settings, Save, Building2, CreditCard, Link2, RefreshCcw, ChevronRight, Plug } from 'lucide-react';

type Tab = 'general' | 'facturacion' | 'integraciones';

export default function ConfigPage() {
  const [tab, setTab] = useState<Tab>('general');
  const [saving, setSaving] = useState(false);

  // Load settings from backend (uses systemSetting table)
  const { data: settings, refetch } = useApi<any[]>(['system-settings'], '/admin/settings');

  // Helper to get setting value
  const getVal = (clave: string) => settings?.find((s: any) => s.clave === clave)?.valor || '';

  // Local form state
  const [formGeneral, setFormGeneral] = useState<Record<string, string>>({});
  const [formFact, setFormFact] = useState<Record<string, string>>({});

  // Initialize form when data loads
  const initGeneral = () => ({
    empresa_nombre: getVal('empresa_nombre'),
    empresa_rfc: getVal('empresa_rfc'),
    empresa_direccion: getVal('empresa_direccion'),
    empresa_telefono: getVal('empresa_telefono'),
    empresa_email_cobranza: getVal('empresa_email_cobranza'),
    reserva_blanda_horas: getVal('reserva_blanda_horas'),
    tolerancia_pedido_default: getVal('tolerancia_pedido_default'),
  });

  const initFact = () => ({
    empresa_banco: getVal('empresa_banco'),
    empresa_clabe: getVal('empresa_clabe'),
  });

  // Save handler
  const handleSave = async (grupo: string, formData: Record<string, string>) => {
    setSaving(true);
    try {
      const entries = Object.entries(formData).filter(([, v]) => v !== '');
      await Promise.all(
        entries.map(([clave, valor]) =>
          api.put('/admin/settings', { clave, valor, grupo })
        )
      );
      toast.success('✅ Configuración guardada');
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al guardar');
    }
    setSaving(false);
  };

  const tabs = [
    { key: 'general' as const, label: 'General', icon: Building2 },
    { key: 'facturacion' as const, label: 'Facturación', icon: CreditCard },
    { key: 'integraciones' as const, label: 'Integraciones', icon: Plug },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center text-white">
          <Settings size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
          <p className="text-gray-500 text-sm">Datos de empresa, facturación e integraciones</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 max-w-md">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              if (t.key === 'general') setFormGeneral(initGeneral());
              if (t.key === 'facturacion') setFormFact(initFact());
            }}
            className={`flex items-center gap-2 flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'general' && (
        <div className="bg-white rounded-xl border p-6 space-y-6 max-w-3xl">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Building2 size={18} className="text-gray-400" />
            Datos de la Empresa
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingField label="Razón Social" value={formGeneral.empresa_nombre || getVal('empresa_nombre')} onChange={(v) => setFormGeneral({ ...formGeneral, empresa_nombre: v })} />
            <SettingField label="RFC" value={formGeneral.empresa_rfc || getVal('empresa_rfc')} onChange={(v) => setFormGeneral({ ...formGeneral, empresa_rfc: v })} />
            <SettingField label="Dirección" value={formGeneral.empresa_direccion || getVal('empresa_direccion')} onChange={(v) => setFormGeneral({ ...formGeneral, empresa_direccion: v })} className="md:col-span-2" />
            <SettingField label="Teléfono" value={formGeneral.empresa_telefono || getVal('empresa_telefono')} onChange={(v) => setFormGeneral({ ...formGeneral, empresa_telefono: v })} />
            <SettingField label="Email Cobranza" value={formGeneral.empresa_email_cobranza || getVal('empresa_email_cobranza')} onChange={(v) => setFormGeneral({ ...formGeneral, empresa_email_cobranza: v })} />
          </div>

          <hr />
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <RefreshCcw size={18} className="text-gray-400" />
            Parámetros Operativos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingField label="Reserva Blanda (horas)" value={formGeneral.reserva_blanda_horas || getVal('reserva_blanda_horas')} onChange={(v) => setFormGeneral({ ...formGeneral, reserva_blanda_horas: v })} type="number" hint="Horas antes de que expire una reserva blanda" />
            <SettingField label="Tolerancia Pedido (%)" value={formGeneral.tolerancia_pedido_default || getVal('tolerancia_pedido_default')} onChange={(v) => setFormGeneral({ ...formGeneral, tolerancia_pedido_default: v })} type="number" hint="% de variación aceptable en metraje" />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => handleSave('general', formGeneral)}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save size={16} />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      )}

      {tab === 'facturacion' && (
        <div className="bg-white rounded-xl border p-6 space-y-6 max-w-3xl">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <CreditCard size={18} className="text-gray-400" />
            Datos Bancarios para Facturación
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingField label="Banco" value={formFact.empresa_banco || getVal('empresa_banco')} onChange={(v) => setFormFact({ ...formFact, empresa_banco: v })} />
            <SettingField label="CLABE Interbancaria" value={formFact.empresa_clabe || getVal('empresa_clabe')} onChange={(v) => setFormFact({ ...formFact, empresa_clabe: v })} />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => handleSave('facturacion', formFact)}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save size={16} />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      )}

      {tab === 'integraciones' && (
        <div className="space-y-4 max-w-3xl">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Link2 size={18} className="text-gray-400" />
            Integraciones Externas
          </h2>

          {/* CONTPAQi Card */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  CQ
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">CONTPAQi Nube</h3>
                  <p className="text-sm text-gray-500">Sincronización de inventario y facturación</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  Fase 2
                </span>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
            </div>
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <p className="font-medium">⏳ Próximamente</p>
              <p className="text-xs mt-1">La integración con CONTPAQi Nube se activará en la Fase 2 del proyecto. Permitirá sincronizar automáticamente SKUs, clientes, facturas y movimientos de inventario.</p>
            </div>
          </div>

          {/* Facturación Electrónica */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  FE
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Facturación Electrónica (CFDI)</h3>
                  <p className="text-sm text-gray-500">Timbrado automático de facturas</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  Pendiente
                </span>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
            </div>
          </div>

          {/* Transportistas API */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  TR
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">API Transportistas</h3>
                  <p className="text-sm text-gray-500">Tracking automático Estafeta, FedEx, DHL</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  Pendiente
                </span>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingField({ label, value, onChange, type = 'text', hint, className = '' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; hint?: string; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
      />
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

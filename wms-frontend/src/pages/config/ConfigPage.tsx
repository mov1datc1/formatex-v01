import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import {
  Settings, Save, Building2, CreditCard, Link2, RefreshCcw,
  ChevronRight, Plug, CheckCircle2, XCircle, Loader2, Eye, EyeOff,
} from 'lucide-react';

type Tab = 'general' | 'facturacion' | 'integraciones';

export default function ConfigPage() {
  const [tab, setTab] = useState<Tab>('general');
  const [saving, setSaving] = useState(false);

  // Load settings from backend
  const { data: settings, refetch } = useApi<any[]>(['system-settings'], '/admin/settings');

  const getVal = (clave: string) => settings?.find((s: any) => s.clave === clave)?.valor || '';

  // Local form state
  const [formGeneral, setFormGeneral] = useState<Record<string, string>>({});
  const [formFact, setFormFact] = useState<Record<string, string>>({});

  // Facturapi state
  const [facturapiKey, setFacturapiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ ok: boolean; org?: string } | null>(null);

  // Initialize Facturapi key from settings
  useEffect(() => {
    if (settings) {
      setFacturapiKey(getVal('facturapi_api_key'));
    }
  }, [settings]);

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
    empresa_regimen_fiscal: getVal('empresa_regimen_fiscal'),
    empresa_cp_fiscal: getVal('empresa_cp_fiscal'),
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

  // Save Facturapi key
  const saveFacturapiKey = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings', {
        clave: 'facturapi_api_key',
        valor: facturapiKey,
        grupo: 'integracion',
        tipo: 'string',
      });
      toast.success('✅ API Key guardada');
      setConnectionResult(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al guardar');
    }
    setSaving(false);
  };

  // Test Facturapi connection
  const testFacturapiConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      // Save key first if changed
      if (facturapiKey !== getVal('facturapi_api_key')) {
        await api.put('/admin/settings', {
          clave: 'facturapi_api_key',
          valor: facturapiKey,
          grupo: 'integracion',
          tipo: 'string',
        });
      }
      const { data } = await api.post('/invoicing/test-connection');
      setConnectionResult({
        ok: data.ok,
        org: data.organization?.legal_name || data.organization?.name || 'Organización detectada',
      });
      if (data.ok) {
        toast.success('✅ Conexión exitosa con Facturapi');
      } else {
        toast.error(`❌ Error: ${data.error}`);
      }
    } catch (e: any) {
      setConnectionResult({ ok: false });
      toast.error('❌ Error al conectar con Facturapi');
    }
    setTestingConnection(false);
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
            Datos Bancarios y Fiscales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingField label="Banco" value={formFact.empresa_banco || getVal('empresa_banco')} onChange={(v) => setFormFact({ ...formFact, empresa_banco: v })} />
            <SettingField label="CLABE Interbancaria" value={formFact.empresa_clabe || getVal('empresa_clabe')} onChange={(v) => setFormFact({ ...formFact, empresa_clabe: v })} />
            <SettingField label="Régimen Fiscal (SAT)" value={formFact.empresa_regimen_fiscal || getVal('empresa_regimen_fiscal')} onChange={(v) => setFormFact({ ...formFact, empresa_regimen_fiscal: v })} hint="Clave SAT: 601, 612, 616, etc." />
            <SettingField label="C.P. Fiscal" value={formFact.empresa_cp_fiscal || getVal('empresa_cp_fiscal')} onChange={(v) => setFormFact({ ...formFact, empresa_cp_fiscal: v })} hint="Código postal del domicilio fiscal" />
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

          {/* ============================================================ */}
          {/* FACTURAPI — CFDI Card */}
          {/* ============================================================ */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  FE
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Facturapi — CFDI 4.0</h3>
                  <p className="text-sm text-gray-500">Timbrado automático de facturas electrónicas</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {connectionResult?.ok ? (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Conectado
                  </span>
                ) : getVal('facturapi_api_key') ? (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    Configurado
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Pendiente
                  </span>
                )}
              </div>
            </div>

            {/* Facturapi Config Form */}
            <div className="mt-5 space-y-4">
              {/* API Key Input */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  API Key de Facturapi
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={facturapiKey}
                      onChange={(e) => { setFacturapiKey(e.target.value); setConnectionResult(null); }}
                      placeholder="sk_test_... o sk_live_..."
                      className="w-full px-3 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <button
                    onClick={saveFacturapiKey}
                    disabled={saving || !facturapiKey}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <Save size={16} />
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  {facturapiKey.startsWith('sk_test') && '🧪 Modo Test — facturas sin validez fiscal'}
                  {facturapiKey.startsWith('sk_live') && '🟢 Modo Producción — facturas con validez fiscal'}
                  {!facturapiKey.startsWith('sk_') && facturapiKey.length > 0 && '⚠️ La key debe empezar con sk_test_ o sk_live_'}
                </p>
              </div>

              {/* Test Connection Button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={testFacturapiConnection}
                  disabled={testingConnection || !facturapiKey}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {testingConnection ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plug size={16} />
                  )}
                  {testingConnection ? 'Probando...' : 'Probar Conexión'}
                </button>

                {/* Connection Result */}
                {connectionResult && (
                  <div className={`flex items-center gap-2 text-sm ${connectionResult.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                    {connectionResult.ok ? (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Conexión exitosa — {connectionResult.org}</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={16} />
                        <span>Error de conexión. Verifica la API Key.</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Info box */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
                <p className="font-medium">📋 Requisitos para facturar:</p>
                <ul className="text-xs mt-1 space-y-0.5 list-disc list-inside">
                  <li>Cuenta activa en <a href="https://facturapi.io" target="_blank" rel="noreferrer" className="underline">facturapi.io</a></li>
                  <li>CSD (Certificado de Sello Digital) cargado en Facturapi</li>
                  <li>Clientes con RFC, C.P. y Régimen Fiscal actualizados</li>
                </ul>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* CONTPAQi Card (existente) */}
          {/* ============================================================ */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  CQ
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">CONTPAQi Nube</h3>
                  <p className="text-sm text-gray-500">Sincronización de inventario</p>
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
              <p className="text-xs mt-1">Sincronización automática de SKUs, clientes y movimientos de inventario.</p>
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

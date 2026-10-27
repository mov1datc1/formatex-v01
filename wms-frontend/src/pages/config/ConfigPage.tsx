import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import {
  Settings, Save, Building2, CreditCard, Link2, RefreshCcw,
  ChevronRight, Plug, CheckCircle2, XCircle, Loader2, Eye, EyeOff,
  Landmark, FileText, Clock, Sparkles, HelpCircle
} from 'lucide-react';

type Tab = 'general' | 'cotizaciones' | 'facturacion' | 'integraciones';

export default function ConfigPage() {
  const [tab, setTab] = useState<Tab>('general');
  const [saving, setSaving] = useState(false);

  // Load settings from backend
  const { data: settings, refetch } = useApi<any[]>(['system-settings'], '/admin/settings');

  const getVal = (clave: string) => settings?.find((s: any) => s.clave === clave)?.valor || '';

  // Local form state
  const [formGeneral, setFormGeneral] = useState<Record<string, string>>({});
  const [formCotizaciones, setFormCotizaciones] = useState<Record<string, string>>({});
  const [formFact, setFormFact] = useState<Record<string, string>>({});

  // Facturapi state
  const [facturapiKey, setFacturapiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ ok: boolean; org?: string; error?: string } | null>(null);

  // Initialize Facturapi key from settings
  useEffect(() => {
    if (settings) {
      setFacturapiKey(getVal('facturapi_api_key'));
      setFormCotizaciones(initCotizaciones());
      setFormGeneral(initGeneral());
      setFormFact(initFact());
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

  const initCotizaciones = () => ({
    banco_beneficiario: getVal('banco_beneficiario') || 'FORMA TEXTIL S. DE R.L. DE C.V.',
    banco_nombre: getVal('banco_nombre') || 'BBVA México',
    banco_cuenta: getVal('banco_cuenta') || '0114 8592 31',
    banco_clabe: getVal('banco_clabe') || '0123 2000 1148 5923 18',
    banco_referencia_nota: getVal('banco_referencia_nota') || 'Folio del pedido (ej. PED-2026-1018)',
    cotizacion_email_comprobantes: getVal('cotizacion_email_comprobantes') || 'cobranza@formatex.mx',
    cotizacion_whatsapp_contacto: getVal('cotizacion_whatsapp_contacto') || '3336505447',
    cotizacion_vigencia_horas: getVal('cotizacion_vigencia_horas') || '24',
    cotizacion_pie_nota: getVal('cotizacion_pie_nota') || 'Gracias por su preferencia. En Formatex estamos comprometidos con la calidad textil de su negocio.',
    cotizacion_terminos_condiciones: getVal('cotizacion_terminos_condiciones') || `• Los precios están expresados en Moneda Nacional (MXN) e incluyen IVA (16%). Sujetos a cambio sin previo aviso.
• Vigencia de Apartado: El inventario apartado para esta cotización se reserva físicamente por un lapso de 24 horas hábiles. Concluido este periodo sin confirmación de pago en Cobranza, el sistema libera la mercancía automáticamente.
• Corte y Preparación: Todo proceso de corte o preparación en almacén iniciará una vez validado y liberado el pago por el departamento de Cobranza.
• Cancelaciones: Toda tela cortada por metraje a solicitud expresa del comprador no admite cambios, devoluciones ni cancelaciones.
• Envíos y Fletes: Las entregas foráneas se despachan por fletera convenida por cobrar a destino, viajando por cuenta y riesgo del comprador, salvo que el cliente haya contratado póliza de seguro de carga.`,
  });

  const initFact = () => ({
    empresa_banco: getVal('empresa_banco') || getVal('banco_nombre') || 'BBVA México',
    empresa_clabe: getVal('empresa_clabe') || getVal('banco_clabe') || '0123 2000 1148 5923 18',
    empresa_regimen_fiscal: getVal('empresa_regimen_fiscal'),
    empresa_cp_fiscal: getVal('empresa_cp_fiscal'),
  });

  // Save handler
  const handleSave = async (grupo: string, formData: Record<string, string>) => {
    setSaving(true);
    try {
      const entries = Object.entries(formData).filter(([, v]) => v !== undefined && v !== null);
      await Promise.all(
        entries.map(([clave, valor]) =>
          api.put('/admin/settings', { clave, valor, grupo })
        )
      );

      // Si se actualizan cotizaciones, sincronizar banco y clabe para facturación
      if (grupo === 'cotizaciones') {
        if (formData.banco_nombre) {
          await api.put('/admin/settings', { clave: 'empresa_banco', valor: formData.banco_nombre, grupo: 'facturacion' });
        }
        if (formData.banco_clabe) {
          await api.put('/admin/settings', { clave: 'empresa_clabe', valor: formData.banco_clabe, grupo: 'facturacion' });
        }
      }

      toast.success('✅ Configuración guardada correctamente');
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
        error: data.error,
      });
      if (data.ok) {
        toast.success('✅ Conexión exitosa con Facturapi');
      } else {
        toast.error(`❌ Error: ${data.error}`);
      }
    } catch (e: any) {
      const errMsg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Error desconocido';
      const errStatus = e?.response?.status || 'N/A';
      setConnectionResult({ ok: false, error: `[${errStatus}] ${errMsg}` });
      toast.error(`❌ Error [${errStatus}]: ${errMsg}`);
      console.error('Test connection error:', { status: errStatus, data: e?.response?.data, message: e?.message });
    }
    setTestingConnection(false);
  };

  const tabs = [
    { key: 'general' as const, label: 'General', icon: Building2 },
    { key: 'cotizaciones' as const, label: 'Cotización & Pagos', icon: Landmark },
    { key: 'facturacion' as const, label: 'Facturación SAT', icon: CreditCard },
    { key: 'integraciones' as const, label: 'Integraciones', icon: Plug },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center text-white shadow-xs">
          <Settings size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
          <p className="text-gray-500 text-sm">Empresa, cuentas de cobro, cotizaciones e integraciones</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 max-w-2xl border border-gray-200/60">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              if (t.key === 'general') setFormGeneral(initGeneral());
              if (t.key === 'cotizaciones') setFormCotizaciones(initCotizaciones());
              if (t.key === 'facturacion') setFormFact(initFact());
            }}
            className={`flex items-center justify-center gap-2 flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              tab === t.key ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content: GENERAL */}
      {tab === 'general' && (
        <div className="bg-white rounded-xl border p-6 space-y-6 max-w-3xl shadow-xs">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Building2 size={18} className="text-gray-400" />
            Datos de la Empresa
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingField label="Razón Social" value={formGeneral.empresa_nombre ?? getVal('empresa_nombre')} onChange={(v) => setFormGeneral({ ...formGeneral, empresa_nombre: v })} />
            <SettingField label="RFC" value={formGeneral.empresa_rfc ?? getVal('empresa_rfc')} onChange={(v) => setFormGeneral({ ...formGeneral, empresa_rfc: v })} />
            <SettingField label="Dirección" value={formGeneral.empresa_direccion ?? getVal('empresa_direccion')} onChange={(v) => setFormGeneral({ ...formGeneral, empresa_direccion: v })} className="md:col-span-2" />
            <SettingField label="Teléfono" value={formGeneral.empresa_telefono ?? getVal('empresa_telefono')} onChange={(v) => setFormGeneral({ ...formGeneral, empresa_telefono: v })} />
            <SettingField label="Email Cobranza" value={formGeneral.empresa_email_cobranza ?? getVal('empresa_email_cobranza')} onChange={(v) => setFormGeneral({ ...formGeneral, empresa_email_cobranza: v })} />
          </div>

          <hr className="border-gray-100" />
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <RefreshCcw size={18} className="text-gray-400" />
            Parámetros Operativos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingField label="Reserva Blanda (horas)" value={formGeneral.reserva_blanda_horas ?? getVal('reserva_blanda_horas')} onChange={(v) => setFormGeneral({ ...formGeneral, reserva_blanda_horas: v })} type="number" hint="Horas antes de que expire una reserva blanda" />
            <SettingField label="Tolerancia Pedido (%)" value={formGeneral.tolerancia_pedido_default ?? getVal('tolerancia_pedido_default')} onChange={(v) => setFormGeneral({ ...formGeneral, tolerancia_pedido_default: v })} type="number" hint="% de variación aceptable en metraje" />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => handleSave('general', formGeneral)}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Save size={16} />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      )}

      {/* Tab Content: COTIZACIONES & PAGOS */}
      {tab === 'cotizaciones' && (
        <div className="space-y-6 max-w-4xl">
          {/* Banner Explicativo */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm border border-blue-800/40 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-cyan-300 flex items-center justify-center shrink-0 border border-cyan-400/30">
              <Landmark size={22} />
            </div>
            <div>
              <h2 className="font-bold text-base text-white tracking-tight">
                Datos Bancarios Oficiales y Políticas de Cotización
              </h2>
              <p className="text-xs text-blue-200 mt-1 leading-relaxed">
                Esta sección controla el bloque bancario oficial (BBVA / SPEI), vigencia de apartado y términos comerciales estampados en el <strong>PDF de Cotización para Clientes</strong> y órdenes de venta. Modifícalos aquí sin necesidad de editar código.
              </p>
            </div>
          </div>

          {/* Bloque 1: Cuentas Bancarias */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <CreditCard size={18} className="text-blue-600" />
                  Cuentas Bancarias para Depósito y Transferencia
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Datos receptores de pago visibles para el cliente al cotizar.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                Bloque Oficial
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SettingField
                label="Beneficiario / Razón Social"
                value={formCotizaciones.banco_beneficiario ?? getVal('banco_beneficiario')}
                onChange={(v) => setFormCotizaciones({ ...formCotizaciones, banco_beneficiario: v })}
                hint="Nombre oficial de la empresa titular de la cuenta"
              />
              <SettingField
                label="Institución Bancaria"
                value={formCotizaciones.banco_nombre ?? getVal('banco_nombre')}
                onChange={(v) => setFormCotizaciones({ ...formCotizaciones, banco_nombre: v })}
                hint="Ej. BBVA México, Banamex, Santander"
              />
              <SettingField
                label="Número de Cuenta"
                value={formCotizaciones.banco_cuenta ?? getVal('banco_cuenta')}
                onChange={(v) => setFormCotizaciones({ ...formCotizaciones, banco_cuenta: v })}
                hint="Número de cuenta para depósitos en ventanilla / practicaja"
              />
              <SettingField
                label="CLABE Interbancaria (SPEI)"
                value={formCotizaciones.banco_clabe ?? getVal('banco_clabe')}
                onChange={(v) => setFormCotizaciones({ ...formCotizaciones, banco_clabe: v })}
                hint="18 dígitos para transferencias electrónicas SPEI"
              />
              <SettingField
                label="Instrucción de Referencia"
                value={formCotizaciones.banco_referencia_nota ?? getVal('banco_referencia_nota')}
                onChange={(v) => setFormCotizaciones({ ...formCotizaciones, banco_referencia_nota: v })}
                hint="Referencia sugerida para identificar el depósito del cliente"
              />
              <SettingField
                label="Email de Cobranza (Recepción Comprobantes)"
                value={formCotizaciones.cotizacion_email_comprobantes ?? getVal('cotizacion_email_comprobantes')}
                onChange={(v) => setFormCotizaciones({ ...formCotizaciones, cotizacion_email_comprobantes: v })}
                hint="Dirección donde el cliente debe enviar su comprobante"
              />
              <SettingField
                label="Teléfono / WhatsApp ATC para Pagos"
                value={formCotizaciones.cotizacion_whatsapp_contacto ?? getVal('cotizacion_whatsapp_contacto')}
                onChange={(v) => setFormCotizaciones({ ...formCotizaciones, cotizacion_whatsapp_contacto: v })}
                hint="Número directo para envío rápido de fichas de pago"
                className="md:col-span-2"
              />
            </div>
          </div>

          {/* Bloque 2: Políticas Comerciales y Vigencia */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Clock size={18} className="text-amber-600" />
                  Política Comercial, Vigencia y Condiciones
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Reglas de apartado, confirmación de corte y términos legales al pie de cotización.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
                Reglas Comerciales
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SettingField
                label="Vigencia de Apartado (Horas Hábiles)"
                value={formCotizaciones.cotizacion_vigencia_horas ?? getVal('cotizacion_vigencia_horas')}
                onChange={(v) => setFormCotizaciones({ ...formCotizaciones, cotizacion_vigencia_horas: v })}
                type="number"
                hint="Horas oficiales de apartado antes de liberación automática del stock"
              />
              <SettingField
                label="Leyenda / Nota Institucional al Pie"
                value={formCotizaciones.cotizacion_pie_nota ?? getVal('cotizacion_pie_nota')}
                onChange={(v) => setFormCotizaciones({ ...formCotizaciones, cotizacion_pie_nota: v })}
                hint="Mensaje breve de cortesía al final del documento"
              />
              <SettingTextarea
                label="Términos y Condiciones Comerciales (Viñetas del PDF)"
                value={formCotizaciones.cotizacion_terminos_condiciones ?? getVal('cotizacion_terminos_condiciones')}
                onChange={(v) => setFormCotizaciones({ ...formCotizaciones, cotizacion_terminos_condiciones: v })}
                rows={6}
                hint="Cada viñeta (•) aparecerá como una cláusula numerada o listada en el documento final."
                className="md:col-span-2"
              />
            </div>
          </div>

          {/* Bloque 3: Vista Previa en Tiempo Real */}
          <div className="bg-slate-900 text-white rounded-xl p-5 space-y-3 shadow-md border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Vista Previa del Bloque Bancario (Tal como aparecerá en el PDF)</span>
            </div>

            <div className="bg-blue-950/80 border border-blue-500/30 rounded-xl p-4 text-xs text-slate-200 space-y-2">
              <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
                <div className="flex items-center gap-2 font-bold text-white">
                  <CreditCard size={15} className="text-cyan-400" />
                  <span>Datos Bancarios para Pago y Transferencia</span>
                </div>
                <span className="text-[11px] text-cyan-300 font-mono font-bold">
                  Referencia Obligatoria: PED-2026-XXXX
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                <div>
                  <span className="text-slate-400 text-[10px] block">Beneficiario:</span>
                  <strong className="text-white font-semibold">
                    {formCotizaciones.banco_beneficiario || 'FORMA TEXTIL S. DE R.L. DE C.V.'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Banco:</span>
                  <strong className="text-white font-semibold">
                    {formCotizaciones.banco_nombre || 'BBVA México'}
                  </strong>
                  <span className="text-slate-300 block text-[11px]">
                    Cuenta: {formCotizaciones.banco_cuenta || '0114 8592 31'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">CLABE Interbancaria (SPEI):</span>
                  <strong className="font-mono text-cyan-300 font-bold">
                    {formCotizaciones.banco_clabe || '0123 2000 1148 5923 18'}
                  </strong>
                </div>
              </div>
              <div className="text-[11px] text-blue-200 pt-2 border-t border-blue-500/20 flex flex-wrap items-center justify-between gap-2">
                <p>
                  Comprobantes a: <strong className="text-white">{formCotizaciones.cotizacion_email_comprobantes || 'cobranza@formatex.mx'}</strong> · WhatsApp: <strong className="text-white">{formCotizaciones.cotizacion_whatsapp_contacto || '3336505447'}</strong>
                </p>
                <span className="text-amber-300 font-semibold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 text-[10px]">
                  ⏱️ Vigencia: {formCotizaciones.cotizacion_vigencia_horas || '24'} Horas Hábiles
                </span>
              </div>
            </div>
          </div>

          {/* Botón Guardar */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => handleSave('cotizaciones', formCotizaciones)}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-md disabled:opacity-50 transition-all cursor-pointer active:scale-95"
            >
              <Save size={16} />
              {saving ? 'Guardando...' : 'Guardar Configuración Comercial'}
            </button>
          </div>
        </div>
      )}

      {/* Tab Content: FACTURACION SAT */}
      {tab === 'facturacion' && (
        <div className="bg-white rounded-xl border p-6 space-y-6 max-w-3xl shadow-xs">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <CreditCard size={18} className="text-gray-400" />
            Datos Bancarios y Fiscales SAT
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingField label="Banco Predeterminado" value={formFact.empresa_banco ?? getVal('empresa_banco')} onChange={(v) => setFormFact({ ...formFact, empresa_banco: v })} />
            <SettingField label="CLABE Interbancaria" value={formFact.empresa_clabe ?? getVal('empresa_clabe')} onChange={(v) => setFormFact({ ...formFact, empresa_clabe: v })} />
            <SettingField label="Régimen Fiscal (SAT)" value={formFact.empresa_regimen_fiscal ?? getVal('empresa_regimen_fiscal')} onChange={(v) => setFormFact({ ...formFact, empresa_regimen_fiscal: v })} hint="Clave SAT: 601, 612, 616, etc." />
            <SettingField label="C.P. Fiscal" value={formFact.empresa_cp_fiscal ?? getVal('empresa_cp_fiscal')} onChange={(v) => setFormFact({ ...formFact, empresa_cp_fiscal: v })} hint="Código postal del domicilio fiscal" />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => handleSave('facturacion', formFact)}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
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
                        <span>{connectionResult.error || 'Error de conexión. Verifica la API Key.'}</span>
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
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-gray-800"
      />
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function SettingTextarea({ label, value, onChange, rows = 4, hint, className = '' }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-sans text-gray-800"
      />
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}


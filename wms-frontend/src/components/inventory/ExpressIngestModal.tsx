import { useState, useEffect, useMemo } from 'react';
import { api } from '../../config/api';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import toast from 'react-hot-toast';
import {
  X, Zap, ClipboardCheck, Plus, Trash2, Printer, CheckCircle2,
  AlertTriangle, ArrowRight, Package, Box, MapPin, Hash, Sparkles
} from 'lucide-react';
import PrintDialog from '../labels/PrintDialog';

interface ExpressIngestModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialSkuId?: string;
  initialOrderLineId?: string;
  initialMetrajeRequerido?: number;
  defaultTab?: 'express' | 'cyclic';
}

export default function ExpressIngestModal({
  open,
  onClose,
  onSuccess,
  initialSkuId,
  initialOrderLineId,
  initialMetrajeRequerido,
  defaultTab = 'express',
}: ExpressIngestModalProps) {
  const [activeTab, setActiveTab] = useState<'express' | 'cyclic'>(defaultTab);

  // Catalogs
  const { data: skusResp } = useApi<PaginatedResponse<any>>(['skus-catalog'], '/catalog/skus', { limit: 200 });
  const skus = skusResp?.data || [];
  const { data: locationsResp } = useApi<PaginatedResponse<any>>(['locations-catalog'], '/warehouse/locations', { limit: 200 });
  const locations = locationsResp?.data || [];

  // Tab 1: Express Ingest State
  const [skuId, setSkuId] = useState(initialSkuId || '');
  const [ubicacionId, setUbicacionId] = useState('');
  const [ingestMode, setIngestMode] = useState<'variable' | 'uniform'>('variable');
  const [variableText, setVariableText] = useState(initialMetrajeRequerido ? String(initialMetrajeRequerido) : '');
  const [uniformCount, setUniformCount] = useState(1);
  const [uniformMeters, setUniformMeters] = useState(50);
  const [tipoRollo, setTipoRollo] = useState<'ENTERO' | 'RETAZO'>('ENTERO');
  const [loteProveedor, setLoteProveedor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Tab 2: Cyclic Count State
  const [cyclicSkuId, setCyclicSkuId] = useState(initialSkuId || '');
  const [cyclicUbicacionId, setCyclicUbicacionId] = useState('');
  const [cyclicRolls, setCyclicRolls] = useState<Array<{ metraje: number; huId?: string }>>([
    { metraje: 50 },
  ]);
  const [skuBalance, setSkuBalance] = useState<any>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [cyclicNotas, setCyclicNotas] = useState('');

  // Print Dialog Integration
  const [createdHUsForPrint, setCreatedHUsForPrint] = useState<any[]>([]);
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    if (open && defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  useEffect(() => {
    if (initialSkuId) {
      setSkuId(initialSkuId);
      setCyclicSkuId(initialSkuId);
    }
  }, [initialSkuId]);

  // Fetch SKU balance for cyclic count
  useEffect(() => {
    if (!cyclicSkuId) {
      setSkuBalance(null);
      return;
    }
    setLoadingBalance(true);
    api.get(`/inventory/sku-balance/${cyclicSkuId}`)
      .then(res => setSkuBalance(res.data))
      .catch(() => setSkuBalance(null))
      .finally(() => setLoadingBalance(false));
  }, [cyclicSkuId]);

  // Parsed meters for variable mode
  const parsedVariableMeters = useMemo(() => {
    if (!variableText) return [];
    return variableText
      .split(/[\n,;]+/)
      .map(s => parseFloat(s.trim()))
      .filter(n => !isNaN(n) && n > 0);
  }, [variableText]);

  const totalMetrosExpress = useMemo(() => {
    if (ingestMode === 'variable') {
      return Math.round(parsedVariableMeters.reduce((acc, m) => acc + m, 0) * 100) / 100;
    }
    return Math.round(uniformCount * uniformMeters * 100) / 100;
  }, [ingestMode, parsedVariableMeters, uniformCount, uniformMeters]);

  const totalRollosExpress = useMemo(() => {
    if (ingestMode === 'variable') return parsedVariableMeters.length;
    return uniformCount > 0 ? uniformCount : 0;
  }, [ingestMode, parsedVariableMeters, uniformCount]);

  // Cyclic calculations
  const totalMetrosCyclicFisico = useMemo(() => {
    return Math.round(cyclicRolls.reduce((acc, r) => acc + (Number(r.metraje) || 0), 0) * 100) / 100;
  }, [cyclicRolls]);

  const discrepancia = useMemo(() => {
    const teorico = skuBalance?.metrosDisponibles || 0;
    return Math.round((totalMetrosCyclicFisico - teorico) * 100) / 100;
  }, [totalMetrosCyclicFisico, skuBalance]);

  if (!open) return null;

  // Handle Alta Express Submission
  const handleExpressSubmit = async (withPrint: boolean = true) => {
    if (!skuId) return toast.error('Selecciona una tela (SKU)');
    const metrajes = ingestMode === 'variable'
      ? parsedVariableMeters
      : Array(uniformCount).fill(uniformMeters);

    if (!metrajes || metrajes.length === 0) {
      return toast.error('Ingresa al menos un metraje válido');
    }

    setSubmitting(true);
    try {
      const resp = await api.post('/inventory/express-ingest', {
        skuId,
        ubicacionId: ubicacionId || undefined,
        metrajes,
        tipoRollo,
        loteProveedor: loteProveedor || undefined,
        orderLineId: initialOrderLineId || undefined,
      });

      const { hus, totalMetros, count } = resp.data;
      toast.success(`⚡ ${count} rollos ingresados (${totalMetros}m en total)`);

      if (withPrint && hus?.length > 0) {
        setCreatedHUsForPrint(hus);
        setShowPrint(true);
      }

      onSuccess?.();
      if (!withPrint) onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al registrar rollos');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Cyclic Count Submission
  const handleCyclicSubmit = async () => {
    if (!cyclicSkuId) return toast.error('Selecciona un SKU para auditar');
    const validRolls = cyclicRolls.filter(r => Number(r.metraje) > 0);
    if (validRolls.length === 0) return toast.error('Ingresa los rollos verificados');

    setSubmitting(true);
    try {
      const resp = await api.post('/inventory/cyclic-count', {
        skuId: cyclicSkuId,
        ubicacionId: cyclicUbicacionId || undefined,
        rollosContados: validRolls,
        notas: cyclicNotas || undefined,
      });

      const { discrepancia, nuevosHUs, alertaGenerada } = resp.data;
      if (alertaGenerada) {
        toast.error(`⚠️ Discrepancia detectada: ${discrepancia > 0 ? '+' : ''}${discrepancia}m. Alerta creada.`);
      } else {
        toast.success(`✅ Conteo registrado. Inventario ajustado.`);
      }

      if (nuevosHUs?.length > 0) {
        setCreatedHUsForPrint(nuevosHUs);
        setShowPrint(true);
      }

      onSuccess?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al guardar conteo cíclico');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 animate-fade-in my-8">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                <Zap size={22} className="fill-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Gestión Rápida de Inventario</h2>
                <p className="text-xs text-gray-300">Alta express de rollos sin compra formal y conteos cíclicos</p>
              </div>
            </div>

            {/* Tab selector */}
            <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
              <button
                onClick={() => setActiveTab('express')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'express'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Zap size={14} />
                Alta Express de Rollos
              </button>
              <button
                onClick={() => setActiveTab('cyclic')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'cyclic'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ClipboardCheck size={14} />
                Conteo Cíclico (Champion)
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            
            {activeTab === 'express' && (
              <div className="space-y-4">
                {/* SKU Selection */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Tela / SKU <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={skuId}
                    onChange={e => setSkuId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Selecciona Tela --</option>
                    {skus.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.codigo} — {s.nombre} ({s.color || 'Sin color'}) · {s.anchoMetros || 1.5}m ancho
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Ubicación Destino
                    </label>
                    <select
                      value={ubicacionId}
                      onChange={e => setUbicacionId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">⚡ Zona Transición (Por defecto)</option>
                      {locations.map((loc: any) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.codigo} — {loc.zone?.nombre || ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Tipo de Rollo
                    </label>
                    <select
                      value={tipoRollo}
                      onChange={e => setTipoRollo(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="ENTERO">Rollo Entero (&gt;40m)</option>
                      <option value="RETAZO">Retazo / Remanente (≤40m)</option>
                    </select>
                  </div>
                </div>

                {/* Ingestion Mode */}
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Modalidad de Captura
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIngestMode('variable')}
                        className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all ${
                          ingestMode === 'variable'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-600 border border-gray-200'
                        }`}
                      >
                        Rollos Variables
                      </button>
                      <button
                        type="button"
                        onClick={() => setIngestMode('uniform')}
                        className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all ${
                          ingestMode === 'uniform'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-600 border border-gray-200'
                        }`}
                      >
                        Rollos Uniformes
                      </button>
                    </div>
                  </div>

                  {ingestMode === 'variable' ? (
                    <div>
                      <textarea
                        rows={3}
                        value={variableText}
                        onChange={e => setVariableText(e.target.value)}
                        placeholder="Ejemplo: 48.5, 52, 50, 49.2, 60 (separados por coma o enter)"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">
                        Ingresa los metrajes de la etiqueta de fábrica de cada rollo.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-gray-500 font-semibold mb-1">Cantidad de Rollos</label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={uniformCount}
                          onChange={e => setUniformCount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-500 font-semibold mb-1">Metros por Rollo</label>
                        <input
                          type="number"
                          step="0.5"
                          min={1}
                          value={uniformMeters}
                          onChange={e => setUniformMeters(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-center"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Summary box */}
                <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 flex items-center justify-between text-indigo-900">
                  <div className="flex items-center gap-2">
                    <Box size={18} className="text-indigo-600" />
                    <span className="text-xs font-semibold">Total a generar:</span>
                  </div>
                  <div className="flex gap-4 text-right">
                    <div>
                      <span className="text-[10px] text-indigo-400 uppercase font-bold block">Rollos</span>
                      <span className="text-lg font-black text-indigo-900">{totalRollosExpress}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-indigo-400 uppercase font-bold block">Metraje</span>
                      <span className="text-lg font-black text-indigo-900">{totalMetrosExpress}m</span>
                    </div>
                  </div>
                </div>

                {/* Optional Batch */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">Lote Proveedor (Opcional)</label>
                    <input
                      type="text"
                      value={loteProveedor}
                      onChange={e => setLoteProveedor(e.target.value)}
                      placeholder="Lote de fábrica"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                  {initialOrderLineId && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>Se asignará automáticamente al pedido activo</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'cyclic' && (
              <div className="space-y-4">
                {/* SKU Selection */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Tela a Auditar (Pareto 80/20) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={cyclicSkuId}
                    onChange={e => setCyclicSkuId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Selecciona Tela para Conteo Cíclico --</option>
                    {skus.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.codigo} — {s.nombre} ({s.color || 'Sin color'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Theoretical Balance Card */}
                {loadingBalance ? (
                  <div className="p-4 text-center text-xs text-gray-400 bg-gray-50 rounded-xl">
                    Cargando stock registrado en sistema...
                  </div>
                ) : skuBalance ? (
                  <div className="bg-slate-900 text-white rounded-xl p-4 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Físico Disponible</p>
                      <p className="text-xl font-black text-emerald-400">{skuBalance.metrosDisponibles}m</p>
                      <p className="text-[10px] text-gray-400">{skuBalance.disponiblesCount} rollos</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Apartado / Reservas</p>
                      <p className="text-xl font-black text-amber-400">{skuBalance.metrosReservados}m</p>
                      <p className="text-[10px] text-gray-400">{skuBalance.reservadosCount} pedidos</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold">En Tránsito</p>
                      <p className="text-xl font-black text-cyan-400">{skuBalance.metrosTransito}m</p>
                      <p className="text-[10px] text-gray-400">{skuBalance.transitLinesCount} embarques</p>
                    </div>
                  </div>
                ) : null}

                {/* Physical rolls input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Rollos Verificados Físicamente en Rack
                    </label>
                    <button
                      type="button"
                      onClick={() => setCyclicRolls([...cyclicRolls, { metraje: 50 }])}
                      className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:underline"
                    >
                      <Plus size={14} /> Agregar Rollo
                    </button>
                  </div>

                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {cyclicRolls.map((r, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <span className="text-xs font-mono font-bold text-gray-400 w-6">#{idx + 1}</span>
                        <input
                          type="number"
                          step="0.5"
                          min={0.5}
                          value={r.metraje}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            const copy = [...cyclicRolls];
                            copy[idx].metraje = val;
                            setCyclicRolls(copy);
                          }}
                          placeholder="Metros"
                          className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded text-sm font-bold text-center"
                        />
                        <span className="text-xs text-gray-500">metros</span>
                        {cyclicRolls.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setCyclicRolls(cyclicRolls.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Discrepancy indicator */}
                {skuBalance && (
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                    Math.abs(discrepancia) <= 1
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : Math.abs(discrepancia) <= 5
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      {Math.abs(discrepancia) <= 1 ? (
                        <CheckCircle2 size={20} className="text-emerald-600" />
                      ) : (
                        <AlertTriangle size={20} className={Math.abs(discrepancia) <= 5 ? 'text-amber-600' : 'text-red-600'} />
                      )}
                      <div>
                        <p className="text-xs font-bold">
                          {Math.abs(discrepancia) <= 1 ? 'Inventario Cuadrado' : 'Discrepancia Detectada'}
                        </p>
                        <p className="text-[11px] opacity-80">
                          Teórico: {skuBalance.metrosDisponibles}m · Físico: {totalMetrosCyclicFisico}m
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black">
                        {discrepancia > 0 ? `+${discrepancia}` : discrepancia}m
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800"
            >
              Cancelar
            </button>

            {activeTab === 'express' ? (
              <div className="flex gap-2">
                <button
                  onClick={() => handleExpressSubmit(false)}
                  disabled={submitting || totalRollosExpress === 0}
                  className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  Solo Guardar
                </button>
                <button
                  onClick={() => handleExpressSubmit(true)}
                  disabled={submitting || totalRollosExpress === 0}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
                >
                  <Printer size={16} />
                  Guardar e Imprimir {totalRollosExpress} Etiquetas
                </button>
              </div>
            ) : (
              <button
                onClick={handleCyclicSubmit}
                disabled={submitting || !cyclicSkuId}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
              >
                <ClipboardCheck size={16} />
                Confirmar Conteo Cíclico
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Direct Label Print Dialog */}
      <PrintDialog
        open={showPrint}
        onClose={() => {
          setShowPrint(false);
          onClose();
        }}
        hus={createdHUsForPrint}
      />
    </>
  );
}

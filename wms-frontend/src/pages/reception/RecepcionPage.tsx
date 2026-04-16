import { useState, useEffect } from 'react';
import { useApi, useMutationApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import { MapPin, Package, CheckCircle2, Star, Loader2, ChevronRight, Layers, ArrowRight } from 'lucide-react';

interface LocationSuggestion {
  id: string;
  codigo: string;
  zona: { nombre: string; tipo: string; codigo: string };
  estado: string;
  capacidad: number;
  ocupados: number;
  disponibles: number;
  canFitAll?: boolean;
  hasSameSku?: boolean;
  husActuales?: Array<{ codigo: string; nombre: string; color: string; metraje: number; tipo: string }>;
  score: number;
  motivo: string[];
}

export default function RecepcionPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [page, setPage] = useState(1);
  const { data: resp, isLoading } = useApi<PaginatedResponse<any>>(['receipts', page], '/reception', { page, limit: 10 });
  const mutation = useMutationApi('/reception');

  // Form state
  const [supplierId, setSupplierId] = useState('');
  const [ordenCompra, setOrdenCompra] = useState('');
  const [transportista, setTransportista] = useState('');
  const [lineas, setLineas] = useState([{ skuId: '', cantidadRollos: 1, metrajePorRollo: 50, palletRef: '' }]);
  const { data: suppliers } = useApi<PaginatedResponse<any>>(['suppliers'], '/catalog/suppliers', { limit: 100 });
  const { data: skus } = useApi<PaginatedResponse<any>>(['skus'], '/catalog/skus', { limit: 100 });

  // Location suggestion state
  const [step, setStep] = useState<'form' | 'locations' | 'done'>('form');
  const [suggestions, setSuggestions] = useState<Record<number, { sugerencias: LocationSuggestion[]; seleccionada: LocationSuggestion | null; zoneSummary: any[] }>>({});
  const [selectedLocations, setSelectedLocations] = useState<Record<number, string>>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const addLinea = () => setLineas([...lineas, { skuId: '', cantidadRollos: 1, metrajePorRollo: 50, palletRef: '' }]);
  const removeLinea = (idx: number) => setLineas(lineas.filter((_, i) => i !== idx));
  const updateLinea = (idx: number, field: string, value: any) => {
    const updated = [...lineas];
    (updated[idx] as any)[field] = value;
    setLineas(updated);
  };

  // Step 1: Validate form → load suggestions
  const handleGetSuggestions = async () => {
    if (!supplierId) return toast.error('Selecciona un proveedor');
    if (lineas.some((l) => !l.skuId)) return toast.error('Selecciona SKU en todas las líneas');
    if (lineas.some((l) => l.cantidadRollos < 1)) return toast.error('Cantidad de rollos debe ser al menos 1');

    setLoadingSuggestions(true);
    try {
      const results: Record<number, any> = {};
      const selections: Record<number, string> = {};

      for (let i = 0; i < lineas.length; i++) {
        const l = lineas[i];
        const { data } = await api.get('/reception/suggest-locations', {
          params: { skuId: l.skuId, tipoRollo: 'ENTERO', metraje: l.metrajePorRollo, cantidadRollos: l.cantidadRollos },
        });
        results[i] = data;
        // Auto-select the best suggestion
        if (data.seleccionada) {
          selections[i] = data.seleccionada.id;
        }
      }

      setSuggestions(results);
      setSelectedLocations(selections);
      setStep('locations');
    } catch (e) {
      toast.error('Error obteniendo sugerencias de ubicación');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Step 2: Confirm and register
  const handleSubmit = async () => {
    try {
      const result = await mutation.mutateAsync({ supplierId, ordenCompra, transportista, lineas });
      toast.success('✅ Recepción registrada — HUs creados con ubicación asignada');
      setStep('form');
      setShowForm(false);
      setLineas([{ skuId: '', cantidadRollos: 1, metrajePorRollo: 50, palletRef: '' }]);
      setSupplierId('');
      setOrdenCompra('');
      setTransportista('');
      setSuggestions({});
      setSelectedLocations({});
      if (result) setSelectedReceipt(result);
    } catch (e: any) {
      console.error('Error registrando recepción:', e);
      toast.error(e?.response?.data?.message || 'Error al registrar recepción');
    }
  };

  const loadReceiptDetail = async (id: string) => {
    try {
      const { data } = await api.get(`/reception/${id}`);
      setSelectedReceipt(data);
    } catch { toast.error('Error al cargar detalle'); }
  };

  const totalRollos = lineas.reduce((a, l) => a + l.cantidadRollos, 0);
  const getSkuName = (skuId: string) => skus?.data?.find((s: any) => s.id === skuId)?.nombre || '';

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recepción de Rollos</h1>
          <p className="text-gray-500 text-sm">Registro de entradas con ubicación inteligente — {resp?.total || 0} recepciones</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setSelectedReceipt(null); setStep('form'); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          {showForm ? '✕ Cerrar' : '+ Nueva Recepción'}
        </button>
      </div>

      {/* ===== STEP 1: FORM ===== */}
      {showForm && step === 'form' && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
              <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px]">1</span>
              Datos de Recepción
            </div>
            <ChevronRight size={14} className="text-gray-300" />
            <div className="flex items-center gap-2 px-3 py-1.5 text-gray-400 text-xs font-medium">
              <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-[10px]">2</span>
              Ubicación Inteligente
            </div>
            <ChevronRight size={14} className="text-gray-300" />
            <div className="flex items-center gap-2 px-3 py-1.5 text-gray-400 text-xs font-medium">
              <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-[10px]">3</span>
              Confirmar
            </div>
          </div>

          <h2 className="text-lg font-semibold">Nueva Recepción de Pallet</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Proveedor *</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                <option value="">Seleccionar...</option>
                {suppliers?.data?.map((s: any) => <option key={s.id} value={s.id}>{s.nombre} ({s.codigo})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Orden de Compra</label>
              <input value={ordenCompra} onChange={(e) => setOrdenCompra(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" placeholder="OC-2026-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Transportista</label>
              <input value={transportista} onChange={(e) => setTransportista(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" placeholder="Nombre del transportista" />
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Líneas de Recepción ({totalRollos} rollos total)</h3>
              <button onClick={addLinea} className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100">+ Agregar Línea</button>
            </div>
            {lineas.map((l, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end mb-2 p-3 bg-gray-50 rounded-lg">
                <div className="col-span-4">
                  <label className="block text-xs text-gray-400 mb-1">SKU Tela *</label>
                  <select value={l.skuId} onChange={(e) => updateLinea(idx, 'skuId', e.target.value)} className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-sm">
                    <option value="">Seleccionar...</option>
                    {skus?.data?.map((s: any) => <option key={s.id} value={s.id}>{s.nombre} ({s.codigo})</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Rollos</label>
                  <input type="number" min={1} value={l.cantidadRollos} onChange={(e) => updateLinea(idx, 'cantidadRollos', +e.target.value)} className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">m/rollo</label>
                  <input type="number" min={1} value={l.metrajePorRollo} onChange={(e) => updateLinea(idx, 'metrajePorRollo', +e.target.value)} className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-sm" />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs text-gray-400 mb-1">Pallet Ref</label>
                  <input value={l.palletRef} onChange={(e) => updateLinea(idx, 'palletRef', e.target.value)} className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-sm" placeholder="PAL-001" />
                </div>
                <div className="col-span-1 flex justify-center">
                  {lineas.length > 1 && <button onClick={() => removeLinea(idx)} className="text-red-400 hover:text-red-600 text-lg">✕</button>}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button onClick={handleGetSuggestions} disabled={loadingSuggestions}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              {loadingSuggestions ? <><Loader2 size={15} className="animate-spin" /> Analizando almacén...</> : <><MapPin size={15} /> Sugerir Ubicaciones</>}
            </button>
          </div>
        </div>
      )}

      {/* ===== STEP 2: LOCATION SUGGESTIONS ===== */}
      {showForm && step === 'locations' && (
        <div className="space-y-4">
          {/* Step indicator */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 text-gray-400 text-xs font-medium">
                <span className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-[10px]">✓</span>
                Datos
              </div>
              <ChevronRight size={14} className="text-gray-300" />
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px]">2</span>
                Ubicación Inteligente
              </div>
              <ChevronRight size={14} className="text-gray-300" />
              <div className="flex items-center gap-2 px-3 py-1.5 text-gray-400 text-xs font-medium">
                <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-[10px]">3</span>
                Confirmar
              </div>
            </div>
          </div>

          {/* Per-line suggestions */}
          {lineas.map((linea, idx) => {
            const data = suggestions[idx];
            if (!data) return null;
            const skuName = getSkuName(linea.skuId);

            return (
              <div key={idx} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Package size={18} className="text-blue-500" />
                      {skuName} — {linea.cantidadRollos} rollos × {linea.metrajePorRollo}m
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Selecciona la ubicación preferida para estos rollos</p>
                  </div>
                  {/* Zone summary badges */}
                  <div className="flex gap-2">
                    {data.zoneSummary?.map((z: any) => (
                      <div key={z.codigo} className="text-right">
                        <p className="text-[10px] text-gray-400 font-medium">{z.zona}</p>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="text-green-600 font-bold">{z.libre} libres</span>
                          <span className="text-orange-500">{z.parcial} parciales</span>
                          <span className="text-gray-400">{z.ocupacionPct}% ocup.</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3 Location cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {data.sugerencias.map((sug: LocationSuggestion, sIdx: number) => {
                    const isSelected = selectedLocations[idx] === sug.id;
                    const isBest = sIdx === 0;

                    return (
                      <button
                        key={sug.id}
                        onClick={() => setSelectedLocations({ ...selectedLocations, [idx]: sug.id })}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-200'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                        }`}
                      >
                        {/* Best badge */}
                        {isBest && (
                          <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[9px] font-bold rounded-full flex items-center gap-1">
                            <Star size={10} /> RECOMENDADA
                          </div>
                        )}

                        {/* Selection indicator */}
                        <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                        }`}>
                          {isSelected && <CheckCircle2 size={14} className="text-white" />}
                        </div>

                        {/* Location code */}
                        <p className="font-mono font-bold text-lg text-gray-900 mb-1">{sug.codigo}</p>
                        <p className="text-xs text-gray-500 mb-3">{sug.zona?.nombre}</p>

                        {/* Capacity bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                            <span>Capacidad</span>
                            <span>{sug.ocupados}/{sug.capacidad} ocupados</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                sug.ocupados === 0 ? 'bg-green-400' :
                                sug.ocupados / sug.capacidad < 0.5 ? 'bg-blue-400' :
                                sug.ocupados / sug.capacidad < 0.8 ? 'bg-orange-400' : 'bg-red-400'
                              }`}
                              style={{ width: `${(sug.ocupados / sug.capacidad) * 100}%` }}
                            />
                          </div>
                          <p className="text-[10px] font-bold mt-1 text-green-600">{sug.disponibles} espacios libres</p>
                        </div>

                        {/* Same SKU indicator */}
                        {sug.hasSameSku && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-medium mb-2">
                            <Layers size={11} /> Mismo SKU aquí (consolidar)
                          </div>
                        )}

                        {/* Existing HUs */}
                        {sug.husActuales && sug.husActuales.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[9px] text-gray-400 font-semibold uppercase">Contenido actual:</p>
                            {sug.husActuales.slice(0, 3).map((hu, hIdx) => (
                              <p key={hIdx} className="text-[10px] text-gray-500">
                                {hu.nombre} · {hu.color} · {hu.metraje}m ({hu.tipo})
                              </p>
                            ))}
                            {sug.husActuales.length > 3 && (
                              <p className="text-[9px] text-gray-400">+{sug.husActuales.length - 3} más</p>
                            )}
                          </div>
                        )}

                        {/* Reasons */}
                        <div className="mt-3 space-y-0.5">
                          {sug.motivo?.map((m: string, mIdx: number) => (
                            <p key={mIdx} className="text-[9px] text-gray-400 flex items-start gap-1">
                              <span className="text-green-500 mt-px">✓</span> {m}
                            </p>
                          ))}
                        </div>

                        {/* Score */}
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" style={{ width: `${Math.min(sug.score, 100)}%` }} />
                            </div>
                            <span className="text-[9px] font-bold text-gray-400">{sug.score}pts</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {data.sugerencias.length === 0 && (
                  <div className="text-center py-6 text-gray-400">
                    <MapPin size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-medium">No hay ubicaciones disponibles</p>
                    <p className="text-xs">Las zonas de rollos enteros están llenas. Se asignará a zona de recibo.</p>
                  </div>
                )}
              </div>
            );
          })}

          {/* Actions */}
          <div className="flex justify-between">
            <button onClick={() => setStep('form')} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1.5">
              ← Volver a datos
            </button>
            <button onClick={handleSubmit} disabled={mutation.isPending}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl hover:from-blue-500 hover:to-cyan-400 text-sm font-bold disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-200">
              {mutation.isPending ? <><Loader2 size={15} className="animate-spin" /> Registrando...</> : <><CheckCircle2 size={16} /> Confirmar Recepción ({totalRollos} rollos)</>}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Receipt List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
          {isLoading ? <div className="p-8 text-center text-gray-400">Cargando...</div> : !resp?.data?.length ? (
            <div className="p-12 text-center text-gray-400">
              <p className="text-4xl mb-2">📥</p>
              <p>No hay recepciones aún</p>
              <p className="text-xs mt-1">Haz clic en "+ Nueva Recepción" para comenzar</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Código</th>
                  <th className="px-4 py-3 text-left">Proveedor</th>
                  <th className="px-4 py-3 text-center">Rollos</th>
                  <th className="px-4 py-3 text-center">Pallets</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {resp.data.map((r: any) => (
                  <tr key={r.id} className={`hover:bg-gray-50 cursor-pointer ${selectedReceipt?.id === r.id ? 'bg-blue-50' : ''}`} onClick={() => loadReceiptDetail(r.id)}>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 font-medium">{r.codigo}</td>
                    <td className="px-4 py-3 font-medium">{r.supplier?.nombre || '—'}</td>
                    <td className="px-4 py-3 text-center font-semibold">{r.totalRollos}</td>
                    <td className="px-4 py-3 text-center">{r.totalPallets}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.estado === 'COMPLETADA' ? 'bg-emerald-100 text-emerald-700' : r.estado === 'EN_PROCESO' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100'}`}>{r.estado}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Receipt Detail Panel */}
        <div className="bg-white rounded-xl border p-5">
          {!selectedReceipt ? (
            <div className="text-center text-gray-400 py-12">
              <p className="text-4xl mb-2">📦</p>
              <p className="text-sm">Selecciona una recepción</p>
              <p className="text-xs mt-1">para ver los HUs y ubicaciones asignadas</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">{selectedReceipt.codigo}</h3>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${selectedReceipt.estado === 'COMPLETADA' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{selectedReceipt.estado}</span>
              </div>
              <div className="text-sm space-y-1 text-gray-600">
                <p>🏭 <b>Proveedor:</b> {selectedReceipt.supplier?.nombre}</p>
                {selectedReceipt.ordenCompra && <p>📄 <b>OC:</b> {selectedReceipt.ordenCompra}</p>}
                {selectedReceipt.transportista && <p>🚛 <b>Transportista:</b> {selectedReceipt.transportista}</p>}
              </div>

              <div className="border-t pt-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  HUs Generados ({selectedReceipt.lineas?.reduce((a: number, l: any) => a + (l.handlingUnits?.length || 0), 0)})
                </h4>
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {selectedReceipt.lineas?.map((linea: any) =>
                    linea.handlingUnits?.map((hu: any) => (
                      <div key={hu.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
                        <div>
                          <p className="font-mono font-semibold text-blue-600">{hu.codigo}</p>
                          <p className="text-gray-400">{hu.sku?.nombre}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{hu.metrajeActual}m</p>
                          <div className="flex items-center gap-1">
                            <span className={`w-4 text-center ${hu.etiquetaImpresa ? '' : 'text-gray-300'}`}>
                              {hu.etiquetaImpresa ? '✅' : '⬜'}
                            </span>
                            <span className="font-mono text-[10px] bg-blue-100 text-blue-700 px-1 rounded">
                              📍 {hu.ubicacion?.codigo || 'SIN UBICAR'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border-t pt-3">
                <a href="/etiquetas" className="block text-center px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200">
                  Ir a Etiquetar estos rollos
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

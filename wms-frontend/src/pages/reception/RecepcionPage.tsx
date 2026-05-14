import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import { Package, CheckCircle2, Clock, ShoppingCart, ChevronDown, ChevronUp, Inbox, Eye, X, TrendingUp, MapPin } from 'lucide-react';
import ConfirmModal from '../../components/ui/ConfirmModal';

export default function RecepcionPage() {
  const [page, setPage] = useState(1);
  const { data: resp, isLoading, refetch: refetchReceipts } = useApi<PaginatedResponse<any>>(['receipts', page], '/reception', { page, limit: 20 });
  const { data: ocQueue, refetch: refetchOC } = useApi<any[]>(['reception-oc-queue'], '/purchasing/reception-queue');
  const [expandedOC, setExpandedOC] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [selectedOC, setSelectedOC] = useState<any>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  // New reception form state
  const { data: suppliers } = useApi<PaginatedResponse<any>>(['suppliers'], '/catalog/suppliers', { limit: 100 });
  const { data: skus } = useApi<PaginatedResponse<any>>(['skus'], '/catalog/skus', { limit: 100 });
  const [supplierId, setSupplierId] = useState('');
  const [ordenCompra, setOrdenCompra] = useState('');
  const [transportista, setTransportista] = useState('');
  const [lineas, setLineas] = useState([{ skuId: '', cantidadRollos: 1, metrajePorRollo: 50, palletRef: '' }]);

  // Confirm modal
  const [modal, setModal] = useState<{ open: boolean; title: string; message: string; action: () => void; confirmText: string }>({ open: false, title: '', message: '', action: () => {}, confirmText: '' });

  // Partial receipt PRO modal
  const [partialModal, setPartialModal] = useState<{ open: boolean; oc: any; rollosInputs: Record<string, number>; ubicacionInputs: Record<string, string>; submitting: boolean }>({ open: false, oc: null, rollosInputs: {}, ubicacionInputs: {}, submitting: false });
  const [locationSuggestions, setLocationSuggestions] = useState<Record<string, any>>({}); // skuId -> suggestion data

  const refresh = () => { refetchReceipts(); refetchOC(); };

  // === OC Actions ===
  const handlePartialReceipt = (oc: any) => {
    const inputs: Record<string, number> = {};
    for (const l of (oc.lineas || [])) inputs[l.skuId] = 0;
    setPartialModal({ open: true, oc, rollosInputs: inputs, ubicacionInputs: {}, submitting: false });
    setLocationSuggestions({});
  };

  const fetchLocationSuggestion = async (skuId: string, rollos: number) => {
    if (rollos <= 0) { setLocationSuggestions(p => { const n = { ...p }; delete n[skuId]; return n; }); return; }
    try {
      const { data } = await api.get('/reception/suggest-locations', { params: { skuId, tipoRollo: 'ENTERO', metraje: 50, cantidadRollos: rollos } });
      setLocationSuggestions(p => ({ ...p, [skuId]: data }));
      // Auto-select the best suggestion
      if (data.seleccionada?.id) {
        setPartialModal(p => ({ ...p, ubicacionInputs: { ...p.ubicacionInputs, [skuId]: data.seleccionada.id } }));
      }
    } catch { /* silent */ }
  };

  const submitPartialReceipt = async () => {
    const { oc, rollosInputs, ubicacionInputs } = partialModal;
    const items: any[] = [];
    for (const l of (oc.lineas || [])) {
      const rollos = rollosInputs[l.skuId] || 0;
      if (rollos > 0) items.push({ skuId: l.skuId, rollosRecibidos: rollos, metrajeRecibido: rollos * (Number(l.metrajePorRollo) || 50), ubicacionId: ubicacionInputs[l.skuId] || undefined });
    }
    if (!items.length) return toast.error('Ingresa al menos 1 rollo en alguna línea');
    setPartialModal(p => ({ ...p, submitting: true }));
    try {
      const { data } = await api.post(`/purchasing/orders/${oc.id}/partial-receipt`, { lineas: items });
      toast.success(`Recepción registrada — ${data.husCreados || 0} HUs creados → ${data.receiptCode || ''}`);
      setPartialModal({ open: false, oc: null, rollosInputs: {}, ubicacionInputs: {}, submitting: false });
      setLocationSuggestions({});
      refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al registrar');
      setPartialModal(p => ({ ...p, submitting: false }));
    }
  };

  const handleCompleteOC = (oc: any) => setModal({
    open: true, title: 'Completar Recepción', confirmText: 'Marcar Completada',
    message: `¿Confirmas recepción completa de ${oc.codigo} — ${oc.supplier?.nombre}?`,
    action: async () => {
      setModal(p => ({ ...p, open: false }));
      try { await api.post(`/purchasing/orders/${oc.id}/complete`); toast.success('OC completada'); refresh(); }
      catch (e: any) { toast.error(e?.response?.data?.message || 'Error'); }
    },
  });

  // === Manual reception ===
  const handleManualReception = async () => {
    if (!supplierId) return toast.error('Selecciona proveedor');
    if (lineas.some(l => !l.skuId)) return toast.error('Selecciona SKU en todas las líneas');
    try {
      const { data } = await api.post('/reception', { supplierId, ordenCompra, transportista, lineas });
      toast.success('Recepción registrada — HUs creados');
      setShowNewForm(false); setSupplierId(''); setOrdenCompra(''); setTransportista('');
      setLineas([{ skuId: '', cantidadRollos: 1, metrajePorRollo: 50, palletRef: '' }]);
      refresh(); if (data) setSelectedReceipt(data);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Error al registrar'); }
  };

  const loadDetail = async (id: string) => {
    try { const { data } = await api.get(`/reception/${id}`); setSelectedReceipt(data); } catch { toast.error('Error cargando detalle'); }
  };

  const pendingOCs = ocQueue || [];
  const receipts = resp?.data || [];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recepción de Mercancía</h1>
          <p className="text-gray-500 text-sm">Gestión unificada — {pendingOCs.length} OC pendientes · {resp?.total || 0} recepciones</p>
        </div>
        <button onClick={() => { setShowNewForm(!showNewForm); setSelectedReceipt(null); }}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all">
          {showNewForm ? '✕ Cerrar' : '+ Nueva Recepción Manual'}
        </button>
      </div>

      {/* Manual Form (collapsed) */}
      {showNewForm && (
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Recepción Manual (sin OC)</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Proveedor *</label>
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                <option value="">Seleccionar...</option>
                {suppliers?.data?.map((s: any) => <option key={s.id} value={s.id}>{s.nombre} ({s.codigo})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Orden de Compra</label>
              <input value={ordenCompra} onChange={e => setOrdenCompra(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" placeholder="OC-2026-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Transportista</label>
              <input value={transportista} onChange={e => setTransportista(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>
          <div className="border-t pt-3">
            <div className="flex justify-between mb-2">
              <h3 className="text-sm font-semibold">Líneas ({lineas.reduce((a, l) => a + l.cantidadRollos, 0)} rollos)</h3>
              <button onClick={() => setLineas([...lineas, { skuId: '', cantidadRollos: 1, metrajePorRollo: 50, palletRef: '' }])} className="text-xs px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg">+ Línea</button>
            </div>
            {lineas.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end mb-2 p-3 bg-gray-50 rounded-lg">
                <div className="col-span-4">
                  <label className="block text-xs text-gray-400 mb-1">SKU *</label>
                  <select value={l.skuId} onChange={e => { const u = [...lineas]; u[i].skuId = e.target.value; setLineas(u); }} className="w-full px-2 py-1.5 bg-white border rounded text-sm">
                    <option value="">Seleccionar...</option>
                    {skus?.data?.map((s: any) => <option key={s.id} value={s.id}>{s.nombre} ({s.codigo})</option>)}
                  </select>
                </div>
                <div className="col-span-2"><label className="block text-xs text-gray-400 mb-1">Rollos</label>
                  <input type="number" min={1} value={l.cantidadRollos} onChange={e => { const u = [...lineas]; u[i].cantidadRollos = +e.target.value; setLineas(u); }} className="w-full px-2 py-1.5 bg-white border rounded text-sm" /></div>
                <div className="col-span-2"><label className="block text-xs text-gray-400 mb-1">m/rollo</label>
                  <input type="number" min={1} value={l.metrajePorRollo} onChange={e => { const u = [...lineas]; u[i].metrajePorRollo = +e.target.value; setLineas(u); }} className="w-full px-2 py-1.5 bg-white border rounded text-sm" /></div>
                <div className="col-span-3"><label className="block text-xs text-gray-400 mb-1">Pallet Ref</label>
                  <input value={l.palletRef} onChange={e => { const u = [...lineas]; u[i].palletRef = e.target.value; setLineas(u); }} className="w-full px-2 py-1.5 bg-white border rounded text-sm" /></div>
                <div className="col-span-1 flex justify-center">{lineas.length > 1 && <button onClick={() => setLineas(lineas.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-lg">✕</button>}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button onClick={() => setShowNewForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button onClick={handleManualReception} className="px-5 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20">Registrar Recepción</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* === LEFT: Unified List === */}
        <div className="lg:col-span-2 space-y-4">
          {/* OC Pending Section */}
          {pendingOCs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <ShoppingCart size={16} className="text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-700">OC Pendientes de Recepción ({pendingOCs.length})</h3>
              </div>
              {pendingOCs.map((oc: any) => {
                const isExpanded = expandedOC === oc.id;
                const eta = oc.fechaEstimadaEntrega ? new Date(oc.fechaEstimadaEntrega) : null;
                const daysToEta = eta ? Math.ceil((eta.getTime() - Date.now()) / 86400000) : null;
                const pct = oc.porcentajeRecibido || 0;
                return (
                  <div key={oc.id} className="bg-white rounded-xl border hover:shadow-md transition-shadow">
                    {/* Row */}
                    <div className="flex items-center px-4 py-3 cursor-pointer" onClick={() => { setExpandedOC(isExpanded ? null : oc.id); setSelectedOC(oc); setSelectedReceipt(null); }}>
                      <div className={`w-2 h-2 rounded-full mr-3 ${oc.prioridad <= 2 ? 'bg-red-500' : 'bg-blue-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-primary-600 text-sm font-medium">{oc.codigo}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-900 text-sm font-medium truncate">{oc.supplier?.nombre}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                          <span>{(oc.lineas || []).length} SKUs</span>
                          <span>${Number(oc.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
                          {eta && <span className="flex items-center gap-1"><Clock size={10} /> {daysToEta !== null && daysToEta > 0 ? `${daysToEta}d` : daysToEta === 0 ? 'Hoy' : 'Atrasado'}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {pct > 0 && <div className="flex items-center gap-2 w-24">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full"><div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
                          <span className="text-xs text-gray-500 font-medium">{pct}%</span>
                        </div>}
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${oc.estado === 'PARCIAL' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>
                          {oc.estado === 'PARCIAL' ? 'Parcial' : 'Pendiente'}
                        </span>
                        {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="border-t px-4 py-3 bg-gray-50/50 space-y-3">
                        <table className="w-full text-xs">
                          <thead><tr className="text-gray-400 uppercase">
                            <th className="text-left py-1">SKU</th><th className="text-right py-1">Esperado</th><th className="text-right py-1">Recibido</th><th className="text-right py-1">Pendiente</th>
                          </tr></thead>
                          <tbody>
                            {(oc.lineas || []).map((l: any) => {
                              const esperado = Number(l.metrajeTotal) || 0;
                              const recibido = Number(l.metrajeRecibido) || 0;
                              const pendiente = esperado - recibido;
                              return (
                                <tr key={l.id} className="border-t border-gray-100">
                                  <td className="py-2"><span className="font-medium text-gray-700">{l.sku?.nombre}</span><br /><span className="text-gray-400">{l.sku?.codigo}</span></td>
                                  <td className="text-right text-gray-600">{l.cantidadRollos || '-'} rollos<br />{esperado}m</td>
                                  <td className="text-right font-medium text-emerald-600">{l.rollosRecibidos || 0} rollos<br />{recibido}m</td>
                                  <td className={`text-right font-medium ${pendiente > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{pendiente > 0 ? `${pendiente}m` : '✓'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <div className="flex justify-end gap-2 pt-2 border-t">
                          <button onClick={(e) => { e.stopPropagation(); handlePartialReceipt(oc); }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors">
                            <Package size={14} /> Registrar Ingreso Parcial
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleCompleteOC(oc); }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors">
                            <CheckCircle2 size={14} /> Ingreso Total / Completar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Completed Receptions */}
          <div>
            <div className="flex items-center gap-2 px-1 mb-2">
              <Inbox size={16} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-600">Recepciones Registradas ({resp?.total || 0})</h3>
            </div>
            <div className="bg-white rounded-xl border overflow-hidden">
              {isLoading ? <div className="p-8 text-center text-gray-400">Cargando...</div> : !receipts.length ? (
                <div className="p-8 text-center text-gray-400"><Package size={32} className="mx-auto mb-2 text-gray-300" /><p className="text-sm">No hay recepciones</p></div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-400 text-xs uppercase">
                    <tr><th className="px-4 py-3 text-left">Código</th><th className="px-4 py-3 text-left">Proveedor</th><th className="px-4 py-3 text-center">Rollos</th><th className="px-4 py-3 text-center">Pallets</th><th className="px-4 py-3 text-center">Estado</th><th className="px-4 py-3 text-left">Fecha</th><th className="px-4 py-3"></th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {receipts.map((r: any) => (
                      <tr key={r.id} className={`hover:bg-gray-50 cursor-pointer ${selectedReceipt?.id === r.id ? 'bg-blue-50' : ''}`} onClick={() => loadDetail(r.id)}>
                        <td className="px-4 py-3 font-mono text-xs text-primary-600 font-medium">{r.codigo}</td>
                        <td className="px-4 py-3 text-gray-900">{r.supplier?.nombre || '—'}</td>
                        <td className="px-4 py-3 text-center font-semibold">{r.totalRollos}</td>
                        <td className="px-4 py-3 text-center text-gray-500">{r.totalPallets}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.estado === 'COMPLETADA' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{r.estado}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString('es-MX')}</td>
                        <td className="px-4 py-3"><Eye size={14} className="text-gray-300" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {resp && resp.totalPages > 1 && (
                <div className="flex justify-center gap-2 py-3 border-t">
                  {Array.from({ length: resp.totalPages }, (_, i) => (
                    <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 rounded-lg text-xs font-medium ${page === i + 1 ? 'bg-primary-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>{i + 1}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === RIGHT: Detail Panel === */}
        <div className="bg-white rounded-xl border p-5">
          {selectedOC && !selectedReceipt ? (
            /* ── OC Detail Panel ── */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{selectedOC.codigo}</h3>
                  <p className="text-sm text-gray-500">{selectedOC.supplier?.nombre}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${selectedOC.estado === 'PARCIAL' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>
                  {selectedOC.estado === 'PARCIAL' ? 'Parcial' : 'Pendiente'}
                </span>
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Progreso de recepción</span>
                  <span className="text-gray-600 font-semibold">{selectedOC.porcentajeRecibido || 0}%</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${(selectedOC.porcentajeRecibido || 0) >= 100 ? 'bg-emerald-500' : (selectedOC.porcentajeRecibido || 0) > 0 ? 'bg-amber-400' : 'bg-gray-200'}`}
                    style={{ width: `${Math.min(selectedOC.porcentajeRecibido || 0, 100)}%` }}
                  />
                </div>
              </div>

              {/* OC Info */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-gray-400 mb-0.5">Total</p>
                  <p className="font-bold text-gray-900">${Number(selectedOC.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-gray-400 mb-0.5">SKUs</p>
                  <p className="font-bold text-gray-900">{(selectedOC.lineas || []).length}</p>
                </div>
              </div>

              {/* Items Detail */}
              <div className="border-t pt-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Items de la OC</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(selectedOC.lineas || []).map((l: any) => {
                    const esperado = Number(l.metrajeTotal) || 0;
                    const recibido = Number(l.metrajeRecibido) || 0;
                    const pendiente = esperado - recibido;
                    const lineaPct = esperado > 0 ? Math.round((recibido / esperado) * 100) : 0;
                    return (
                      <div key={l.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between mb-1.5">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{l.sku?.nombre}</p>
                            <p className="text-xs text-gray-400 font-mono">{l.sku?.codigo}</p>
                          </div>
                          <span className={`text-xs font-bold ${pendiente > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {pendiente > 0 ? `${pendiente}m pend.` : '✓ Completo'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-center">
                          <div>
                            <p className="text-gray-400">Esperado</p>
                            <p className="font-semibold text-gray-700">{l.cantidadRollos || '-'} rollos</p>
                            <p className="text-gray-500">{esperado}m</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Recibido</p>
                            <p className="font-semibold text-emerald-600">{l.rollosRecibidos || 0} rollos</p>
                            <p className="text-emerald-500">{recibido}m</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Avance</p>
                            <p className="font-bold text-gray-700">{lineaPct}%</p>
                          </div>
                        </div>
                        <div className="mt-1.5 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${lineaPct >= 100 ? 'bg-emerald-500' : lineaPct > 0 ? 'bg-amber-400' : 'bg-gray-200'}`} style={{ width: `${Math.min(lineaPct, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t pt-3 space-y-2">
                <button
                  onClick={() => handlePartialReceipt(selectedOC)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors border border-amber-200"
                >
                  <Package size={16} /> Registrar Ingreso Parcial
                </button>
                <button
                  onClick={() => handleCompleteOC(selectedOC)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors border border-emerald-200"
                >
                  <CheckCircle2 size={16} /> Ingreso Total / Completar
                </button>
              </div>
            </div>
          ) : selectedReceipt ? (
            /* ── Receipt Detail Panel ── */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-900">{selectedReceipt.codigo}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedReceipt.estado === 'COMPLETADA' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{selectedReceipt.estado}</span>
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
                          <p className="font-mono font-semibold text-primary-600">{hu.codigo}</p>
                          <p className="text-gray-400">{hu.sku?.nombre}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{hu.metrajeActual}m</p>
                          <span className="font-mono text-[10px] bg-blue-100 text-blue-700 px-1 rounded">📍 {hu.ubicacion?.codigo || 'SIN UBICAR'}</span>
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
          ) : (
            /* ── Empty State ── */
            <div className="text-center text-gray-400 py-12">
              <Package size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Selecciona una OC o recepción</p>
              <p className="text-xs mt-1">para ver los items, HUs y ubicaciones asignadas</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal open={modal.open} onClose={() => setModal(p => ({ ...p, open: false }))} onConfirm={modal.action} title={modal.title} message={modal.message} confirmText={modal.confirmText} />

      {/* === PRO Partial Receipt Modal === */}
      {partialModal.open && partialModal.oc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={() => !partialModal.submitting && setPartialModal({ open: false, oc: null, rollosInputs: {}, ubicacionInputs: {}, submitting: false })}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 animate-scale-in max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 pb-4 border-b">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-xl bg-amber-50">
                    <TrendingUp size={24} className="text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Registrar Ingreso Parcial</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      <span className="font-mono text-primary-600">{partialModal.oc.codigo}</span>
                      <span className="mx-1.5">•</span>
                      {partialModal.oc.supplier?.nombre}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !partialModal.submitting && setPartialModal({ open: false, oc: null, rollosInputs: {}, ubicacionInputs: {}, submitting: false })}
                  className="p-1.5 hover:bg-gray-100 rounded-lg -mr-1 -mt-1"
                >
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
            </div>

            {/* Body — scrollable */}
            <div className="p-6 space-y-3 overflow-y-auto flex-1">
              <p className="text-xs text-gray-400 mb-1">Ingresa la cantidad de rollos recibidos por cada SKU:</p>
              {(partialModal.oc.lineas || []).map((l: any) => {
                const esperado = Number(l.metrajeTotal) || 0;
                const recibido = Number(l.metrajeRecibido) || 0;
                const pendiente = esperado - recibido;
                const rollosInput = partialModal.rollosInputs[l.skuId] || 0;
                const metrajeInput = rollosInput * (Number(l.metrajePorRollo) || 50);
                return (
                  <div key={l.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{l.sku?.nombre}</p>
                        <p className="text-xs text-gray-400 font-mono">{l.sku?.codigo}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pendiente > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {pendiente > 0 ? `${pendiente}m pend.` : '✓ Completo'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs text-center mb-3">
                      <div className="bg-white rounded-lg p-2 border">
                        <p className="text-gray-400 mb-0.5">Esperado</p>
                        <p className="font-bold text-gray-700">{l.cantidadRollos || '—'} rollos</p>
                        <p className="text-gray-400">{esperado}m</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border">
                        <p className="text-gray-400 mb-0.5">Recibido prev.</p>
                        <p className="font-bold text-emerald-600">{l.rollosRecibidos || 0} rollos</p>
                        <p className="text-emerald-500">{recibido}m</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-primary-200">
                        <p className="text-primary-500 mb-0.5 font-medium">Este ingreso</p>
                        <p className="font-bold text-primary-700">{rollosInput} rollos</p>
                        <p className="text-primary-400">{metrajeInput}m</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Rollos recibidos ahora</label>
                      <input
                        type="number"
                        min={0}
                        value={rollosInput || ''}
                        onChange={e => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          setPartialModal(p => ({
                            ...p,
                            rollosInputs: { ...p.rollosInputs, [l.skuId]: val },
                          }));
                          fetchLocationSuggestion(l.skuId, val);
                        }}
                        placeholder="0"
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm font-medium focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
                        autoFocus={l === (partialModal.oc.lineas || [])[0]}
                      />
                    </div>
                    {/* Location Suggestion */}
                    {rollosInput > 0 && locationSuggestions[l.skuId] && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-1.5 mb-2">
                          <MapPin size={14} className="text-blue-500" />
                          <span className="text-xs font-semibold text-blue-700">Ubicación sugerida</span>
                        </div>
                        {locationSuggestions[l.skuId].sugerencias?.length > 0 ? (
                          <select
                            value={partialModal.ubicacionInputs[l.skuId] || ''}
                            onChange={e => setPartialModal(p => ({ ...p, ubicacionInputs: { ...p.ubicacionInputs, [l.skuId]: e.target.value } }))}
                            className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-200"
                          >
                            {locationSuggestions[l.skuId].sugerencias.map((s: any) => (
                              <option key={s.id} value={s.id}>
                                📍 {s.codigo} — {s.zona?.nombre} ({s.disponibles} libres){s.hasSameSku ? ' ⭐ mismo SKU' : ''}
                              </option>
                            ))}
                            <option value="">🔄 Auto (dejar al sistema)</option>
                          </select>
                        ) : (
                          <p className="text-xs text-blue-600">Sin espacio en zona principal — se asignará a Recibo/Staging</p>
                        )}
                        {locationSuggestions[l.skuId].zoneSummary?.length > 0 && (
                          <div className="mt-2 flex gap-2">
                            {locationSuggestions[l.skuId].zoneSummary.map((z: any) => (
                              <span key={z.codigo} className="text-[10px] bg-white px-2 py-0.5 rounded border text-gray-500">
                                {z.codigo}: {z.libre} libres / {z.total} ({z.ocupacionPct}%)
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-6 pt-4 border-t bg-gray-50/50 rounded-b-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Total este ingreso:</span>
                <span className="text-sm font-bold text-primary-700">
                  {Object.values(partialModal.rollosInputs).reduce((a, b) => a + b, 0)} rollos
                </span>
              </div>
              <div className="flex items-center gap-1.5 mb-3">
                <MapPin size={12} className="text-emerald-500" />
                <span className="text-[10px] text-emerald-600">Ubicaciones se asignan automáticamente según disponibilidad y tipo de mercancía. Los HUs quedarán listos para etiquetar.</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setPartialModal({ open: false, oc: null, rollosInputs: {}, ubicacionInputs: {}, submitting: false })}
                  disabled={partialModal.submitting}
                  className="flex-1 px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitPartialReceipt}
                  disabled={partialModal.submitting || Object.values(partialModal.rollosInputs).every(v => !v)}
                  className="flex-1 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all disabled:opacity-50"
                >
                  {partialModal.submitting ? 'Registrando...' : 'Registrar Ingreso'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

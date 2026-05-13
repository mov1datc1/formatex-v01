import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import { Package, CheckCircle2, Clock, ShoppingCart, ChevronDown, ChevronUp, Inbox, Eye } from 'lucide-react';
import ConfirmModal from '../../components/ui/ConfirmModal';

export default function RecepcionPage() {
  const [page, setPage] = useState(1);
  const { data: resp, isLoading, refetch: refetchReceipts } = useApi<PaginatedResponse<any>>(['receipts', page], '/reception', { page, limit: 20 });
  const { data: ocQueue, refetch: refetchOC } = useApi<any[]>(['reception-oc-queue'], '/purchasing/reception-queue');
  const [expandedOC, setExpandedOC] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
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

  const refresh = () => { refetchReceipts(); refetchOC(); };

  // === OC Actions ===
  const handlePartialReceipt = async (oc: any) => {
    const items: any[] = [];
    for (const l of (oc.lineas || [])) {
      const val = window.prompt(`${l.sku?.nombre} (${l.sku?.codigo})\nEsperado: ${Number(l.metrajeTotal)}m — Recibido: ${Number(l.metrajeRecibido) || 0}m\n\n¿Cuántos rollos recibidos?`, '0');
      if (val === null) return;
      const rollos = parseInt(val) || 0;
      if (rollos > 0) items.push({ skuId: l.skuId, rollosRecibidos: rollos, metrajeRecibido: rollos * (Number(l.metrajePorRollo) || 50) });
    }
    if (!items.length) return toast.error('No se ingresaron rollos');
    try {
      await api.post(`/purchasing/orders/${oc.id}/partial-receipt`, { lineas: items });
      toast.success('Recepción parcial registrada');
      refresh();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Error'); }
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
                    <div className="flex items-center px-4 py-3 cursor-pointer" onClick={() => setExpandedOC(isExpanded ? null : oc.id)}>
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
          {!selectedReceipt ? (
            <div className="text-center text-gray-400 py-12">
              <Package size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Selecciona una recepción</p>
              <p className="text-xs mt-1">para ver los HUs y ubicaciones asignadas</p>
            </div>
          ) : (
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
          )}
        </div>
      </div>

      <ConfirmModal open={modal.open} onClose={() => setModal(p => ({ ...p, open: false }))} onConfirm={modal.action} title={modal.title} message={modal.message} confirmText={modal.confirmText} />
    </div>
  );
}

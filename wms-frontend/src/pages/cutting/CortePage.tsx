import { useState } from 'react';
import { useApi, useMutationApi } from '../../hooks/useApi';
import type { PaginatedResponse, CutOperation } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import { WmsIcon, KpiIcon, StatusBadge } from '../../components/icons/WmsIcons';
import { X, Plus, Scissors, MapPin, Tag, Printer, CheckCircle2, Package } from 'lucide-react';
import PrintDialog from '../../components/labels/PrintDialog';

export default function CortePage() {
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const { data: resp, isLoading, refetch } = useApi<PaginatedResponse<CutOperation>>(['cuts', page], '/cutting', { page, limit: 15 });
  const { data: stats } = useApi<any>(['cut-stats'], '/cutting/stats');

  // Queue: orders EN_CORTE
  const { data: enCorte } = useApi<any>(['orders-en-corte'], '/orders', { estado: 'EN_CORTE', limit: 50 });
  const [selectedCutOrder, setSelectedCutOrder] = useState<any>(null);

  // Form state
  const [huSearch, setHuSearch] = useState('');
  const [selectedHU, setSelectedHU] = useState<any>(null);
  const [metrajeCortado, setMetrajeCortado] = useState(0);
  const [orderLineId, setOrderLineId] = useState<string>('');
  const [notas, setNotas] = useState('');

  // Post-cut retazo state
  const [lastCutResult, setLastCutResult] = useState<any>(null);
  const [showPrintRetazo, setShowPrintRetazo] = useState(false);

  const { data: husResult } = useApi<PaginatedResponse<any>>(['hus-cut-search', huSearch], '/inventory/hus', { search: huSearch, estadoHu: 'DISPONIBLE', limit: 10 }, huSearch.length >= 2);
  const mutation = useMutationApi('/cutting');

  // Load order detail for guided cutting
  const loadCutOrder = async (orderId: string) => {
    try {
      const { data } = await api.get(`/orders/${orderId}`);
      setSelectedCutOrder(data);
    } catch { toast.error('Error al cargar pedido'); }
  };

  // Pre-fill cut from order line assignment
  const startGuidedCut = (line: any, assignment: any) => {
    setSelectedHU({
      id: assignment.hu.id,
      codigo: assignment.hu.codigo,
      metrajeActual: assignment.hu.metrajeActual,
      sku: assignment.hu.sku,
      ubicacion: assignment.hu.ubicacion,
      tipoRollo: assignment.hu.tipoRollo || 'ENTERO',
      generacion: assignment.hu.generacion || 0,
    });
    setHuSearch(assignment.hu.codigo);
    setMetrajeCortado(assignment.metrajeTomado);
    setOrderLineId(line.id);
    setShowForm(true);
    setLastCutResult(null);
  };

  const handleCut = async () => {
    if (!selectedHU) return toast.error('Selecciona un rollo');
    if (metrajeCortado <= 0) return toast.error('Metraje debe ser mayor a 0');
    if (metrajeCortado > selectedHU.metrajeActual) return toast.error(`Solo hay ${selectedHU.metrajeActual}m disponibles`);

    try {
      const result: any = await mutation.mutateAsync({
        huOrigenId: selectedHU.id,
        metrajeCortado,
        orderLineId: orderLineId || undefined,
        notas,
      });
      const restante = selectedHU.metrajeActual - metrajeCortado;
      setLastCutResult(result);

      if (restante > 0.5) {
        toast.success(`Cortados ${metrajeCortado}m — Retazo de ${restante.toFixed(1)}m creado`);
      } else {
        toast.success(`Cortados ${metrajeCortado}m — Rollo agotado`);
      }

      setSelectedHU(null);
      setMetrajeCortado(0);
      setHuSearch('');
      setOrderLineId('');
      refetch();
      // Refresh order if guided
      if (selectedCutOrder) loadCutOrder(selectedCutOrder.id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al cortar');
    }
  };

  const ordersEnCorte = enCorte?.data || [];

  // Build retazo HU data for print dialog
  const retazoForPrint = lastCutResult?.huRetazo ? [{
    id: lastCutResult.huRetazo.id,
    codigo: lastCutResult.huRetazo.codigo,
    metrajeActual: lastCutResult.metrajeRestante,
    sku: lastCutResult.huOrigen?.sku,
    ubicacion: lastCutResult.huRetazo.ubicacion,
    tipoRollo: 'RETAZO',
    anchoMetros: lastCutResult.huOrigen?.sku?.anchoMetros || 1.5,
  }] : [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <KpiIcon icon={WmsIcon.Cut} gradient="from-purple-500 to-pink-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Corte de Rollos</h1>
            <p className="text-gray-500 text-sm">Operaciones de corte con trazabilidad — {resp?.total || 0} cortes</p>
          </div>
        </div>
        <button onClick={() => { setShowForm(!showForm); setLastCutResult(null); setSelectedHU(null); setHuSearch(''); }} className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm font-medium flex items-center gap-2">
          {showForm ? <><X size={16} /> Cerrar</> : <><Plus size={16} /> Nuevo Corte</>}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{stats?.totalCortes || 0}</p>
          <p className="text-xs text-gray-500">Cortes Totales</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{stats?.retazosActivos || 0}</p>
          <p className="text-xs text-gray-500">Retazos Activos</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{Math.round(stats?.metrajePromedioCortado || 0)}m</p>
          <p className="text-xs text-gray-500">Promedio Cortado</p>
        </div>
      </div>

      {/* Orders EN_CORTE Queue */}
      {ordersEnCorte.length > 0 && !showForm && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
            <Scissors size={14} className="text-purple-500" />
            Pedidos Pendientes de Corte ({ordersEnCorte.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ordersEnCorte.map((o: any) => {
              const isActive = selectedCutOrder?.id === o.id;
              const totalLines = o.lineas?.length || 0;
              const cutLines = o.lineas?.filter((l: any) => l.assignments?.some((a: any) => a.cortado))?.length || 0;
              return (
                <button key={o.id} onClick={() => loadCutOrder(o.id)} className={`text-left bg-white rounded-xl border p-4 hover:shadow-md transition-all ${isActive ? 'border-purple-400 ring-1 ring-purple-200' : 'border-gray-100'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm font-semibold text-purple-600">{o.codigo}</span>
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">🔪 En Corte</span>
                  </div>
                  <p className="text-sm text-gray-700">{o.client?.nombre}</p>
                  <p className="text-xs text-gray-400 mt-1">{cutLines}/{totalLines} líneas cortadas</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Order — Guided Cutting */}
      {selectedCutOrder && !showForm && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Scissors size={20} className="text-purple-500" />
                {selectedCutOrder.codigo} — Guía de Corte
              </h3>
              <p className="text-sm text-gray-500">{selectedCutOrder.client?.nombre}</p>
            </div>
            <button onClick={() => setSelectedCutOrder(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
          </div>

          <div className="space-y-3">
            {selectedCutOrder.lineas?.map((line: any) => {
              const isCut = line.assignments?.every((a: any) => a.cortado);
              return (
                <div key={line.id} className={`rounded-xl border p-4 ${isCut ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{line.sku?.nombre || '—'} <span className="text-gray-400">{line.sku?.color ? `· ${line.sku.color}` : ''}</span></p>
                      <p className="text-xs text-gray-400 font-mono">{line.sku?.codigo}</p>
                    </div>
                    {isCut ? (
                      <StatusBadge icon={CheckCircle2} label="Cortado" bgClass="bg-emerald-100" textClass="text-emerald-700" />
                    ) : (
                      <span className="text-xs text-amber-600 font-medium">Pendiente</span>
                    )}
                  </div>

                  {/* HUs to cut for this line */}
                  {line.assignments?.map((a: any) => (
                    <div key={a.id} className={`mt-2 flex items-center justify-between p-3 rounded-lg ${a.cortado ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${a.cortado ? 'bg-emerald-500 text-white' : 'bg-gray-200'}`}>
                          {a.cortado ? <CheckCircle2 size={14} /> : <Scissors size={12} className="text-gray-500" />}
                        </div>
                        <div>
                          <span className="font-mono text-xs text-indigo-600 font-semibold">{a.hu?.codigo}</span>
                          {a.hu?.ubicacion && (
                            <span className="ml-2 text-[10px] text-gray-400 flex items-center gap-0.5 inline-flex">
                              <MapPin size={9} /> {a.hu.ubicacion.codigo}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-700">{a.metrajeTomado}m de {a.hu?.metrajeActual}m</span>
                        {!a.cortado && a.requiereCorte && (
                          <button
                            onClick={() => startGuidedCut(line, a)}
                            className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-xs font-semibold hover:shadow-lg transition-all flex items-center gap-1"
                          >
                            <Scissors size={12} /> Cortar
                          </button>
                        )}
                        {!a.cortado && !a.requiereCorte && (
                          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Entero</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cut Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><WmsIcon.Cut size={20} className="text-purple-500" /> {orderLineId ? 'Corte Guiado — Pedido' : 'Nueva Operación de Corte'}</h2>

          {/* Step 1: Search HU (skip if guided) */}
          {!selectedHU && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Buscar Rollo (código HU)</label>
              <input value={huSearch} onChange={(e) => { setHuSearch(e.target.value); setSelectedHU(null); }} placeholder="Escribe el código HU..." className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
              {husResult?.data && husResult.data.length > 0 && !selectedHU && (
                <div className="mt-2 border rounded-lg divide-y max-h-40 overflow-y-auto">
                  {husResult.data.map((hu: any) => (
                    <button key={hu.id} onClick={() => { setSelectedHU(hu); setHuSearch(hu.codigo); setMetrajeCortado(Math.min(10, hu.metrajeActual)); }} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm flex justify-between">
                      <span><span className="font-mono text-blue-600">{hu.codigo}</span> — {hu.sku?.nombre}</span>
                      <span className="font-semibold">{hu.metrajeActual}m</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected HU info + metraje */}
          {selectedHU && (
            <div className="p-4 bg-blue-50 rounded-lg space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-mono font-bold text-blue-700">{selectedHU.codigo}</p>
                  <p className="text-sm text-gray-600">{selectedHU.sku?.nombre} {selectedHU.sku?.color ? `— ${selectedHU.sku.color}` : ''}</p>
                  <p className="text-xs text-gray-400">{selectedHU.tipoRollo} · Gen {selectedHU.generacion} · {selectedHU.ubicacion?.codigo || 'Sin ubicar'}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-700">{selectedHU.metrajeActual}m</p>
                  <p className="text-xs text-gray-500">disponibles</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Metros a cortar *</label>
                  <input type="number" min={0.5} max={selectedHU.metrajeActual} step={0.5} value={metrajeCortado} onChange={(e) => setMetrajeCortado(+e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-lg font-bold text-center" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Restante (retazo)</label>
                  <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-lg font-bold text-center text-orange-600">
                    {Math.max(0, selectedHU.metrajeActual - metrajeCortado).toFixed(1)}m
                  </div>
                </div>
              </div>

              {/* Visual bar */}
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden flex">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${(metrajeCortado / selectedHU.metrajeActual) * 100}%` }}></div>
                <div className="h-full bg-orange-400 transition-all" style={{ width: `${((selectedHU.metrajeActual - metrajeCortado) / selectedHU.metrajeActual) * 100}%` }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span className="text-blue-600">● Cortado: {metrajeCortado}m</span>
                <span className="text-orange-600">● Retazo: {Math.max(0, selectedHU.metrajeActual - metrajeCortado).toFixed(1)}m</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notas</label>
            <input value={notas} onChange={(e) => setNotas(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" placeholder="Observaciones del corte..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => { setShowForm(false); setSelectedHU(null); setLastCutResult(null); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button onClick={handleCut} disabled={mutation.isPending || !selectedHU} className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2 transition-all">
              {mutation.isPending ? 'Cortando...' : <><Scissors size={16} /> Ejecutar Corte ({metrajeCortado}m)</>}
            </button>
          </div>
        </div>
      )}

      {/* Post-Cut Result — Retazo Card with Print */}
      {lastCutResult && lastCutResult.huRetazo && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Tag size={20} className="text-orange-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Retazo Creado</h3>
              <p className="text-xs text-gray-500">Imprime la etiqueta y colócala en el carrito de retazos</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-xl p-3 text-center border">
              <p className="text-[10px] text-gray-400 mb-0.5">Código HU</p>
              <p className="font-mono text-sm font-bold text-orange-600">{lastCutResult.huRetazo.codigo}</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border">
              <p className="text-[10px] text-gray-400 mb-0.5">Metraje</p>
              <p className="text-xl font-black text-orange-700">{lastCutResult.metrajeRestante}m</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border">
              <p className="text-[10px] text-gray-400 mb-0.5">Ubicación Destino</p>
              <p className="font-mono text-sm font-bold text-blue-600 flex items-center justify-center gap-1">
                <MapPin size={12} /> {lastCutResult.retazoUbicacion || 'Pendiente'}
              </p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border">
              <p className="text-[10px] text-gray-400 mb-0.5">Origen</p>
              <p className="font-mono text-xs text-gray-600">{lastCutResult.huOrigen?.codigo}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowPrintRetazo(true)}
              className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all"
            >
              <Printer size={18} /> Imprimir Etiqueta del Retazo
            </button>
            <button
              onClick={() => setLastCutResult(null)}
              className="px-5 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-gray-400">Cargando...</div> : !resp?.data?.length ? (
          <div className="p-12 text-center text-gray-400">
            <WmsIcon.Cut size={48} className="mx-auto mb-3 text-gray-300" />
            <p>No hay operaciones de corte aún</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">HU Origen</th>
                <th className="px-4 py-3 text-left">Tela</th>
                <th className="px-4 py-3 text-right">Cortado</th>
                <th className="px-4 py-3 text-right">Restante</th>
                <th className="px-4 py-3 text-left">Retazo</th>
                <th className="px-4 py-3 text-left">Pedido</th>
                <th className="px-4 py-3 text-left">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {resp.data.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-purple-600 font-medium">{c.codigo}</td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">{c.huOrigen?.codigo}</td>
                  <td className="px-4 py-3 text-xs">{c.huOrigen?.sku?.nombre} {c.huOrigen?.sku?.color ? `(${c.huOrigen.sku.color})` : ''}</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-700">{c.metrajeCortado}m</td>
                  <td className="px-4 py-3 text-right font-semibold text-orange-600">{c.metrajeRestante}m</td>
                  <td className="px-4 py-3 font-mono text-xs text-orange-600">{c.huRetazo?.codigo || '—'} {c.huRetazo?.ubicacion?.codigo ? `(${c.huRetazo.ubicacion.codigo})` : ''}</td>
                  <td className="px-4 py-3 text-xs">{c.orderLine?.order?.codigo || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(c.fechaCorte).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Print Dialog for Retazo */}
      <PrintDialog open={showPrintRetazo} onClose={() => setShowPrintRetazo(false)} hus={retazoForPrint} />
    </div>
  );
}

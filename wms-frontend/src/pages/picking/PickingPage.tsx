import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import { WmsIcon, KpiIcon, StatusBadge, PipelineIcon } from '../../components/icons/WmsIcons';
import { ArrowRight, X, ScanLine, CheckCircle2, AlertCircle, MapPin, Scissors, Package, Navigation } from 'lucide-react';

export default function PickingPage() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [pickingList, setPickingList] = useState<any>(null);
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanning, setScanning] = useState(false);

  // Pedidos listos para picking: POR_SURTIR y EN_SURTIDO
  const { data: porSurtir } = useApi<any>(['picking-por-surtir'], '/orders', { estado: 'POR_SURTIR', limit: 50 });
  const { data: enSurtido } = useApi<any>(['picking-en-surtido'], '/orders', { estado: 'EN_SURTIDO', limit: 50 });

  const allOrders = [
    ...(porSurtir?.data || []),
    ...(enSurtido?.data || []),
  ].sort((a: any, b: any) => a.prioridad - b.prioridad);

  const loadDetail = async (orderId: string) => {
    try {
      const resp = await api.get(`/orders/${orderId}`);
      setSelectedOrder(resp.data);
      // Load picking list with route
      const plResp = await api.get(`/orders/${orderId}/picking-list`);
      setPickingList(plResp.data);
      setScanResult(null);
      setScanInput('');
    } catch { toast.error('Error al cargar pedido'); }
  };

  const startPicking = async (orderId: string) => {
    try {
      await api.put(`/orders/${orderId}/status`, { estado: 'EN_SURTIDO' });
      toast.success('Picking iniciado');
      loadDetail(orderId);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error');
    }
  };

  const finishPicking = async () => {
    if (!selectedOrder) return;
    try {
      await api.put(`/orders/${selectedOrder.id}/status`, { estado: 'EN_CORTE' });
      toast.success('Picking completado → Enviado a Corte');
      setSelectedOrder(null);
      setPickingList(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error');
    }
  };

  // Validate scan — only accepts HUs that belong to this order
  const handleScan = async () => {
    if (!scanInput.trim() || !selectedOrder) return;
    setScanning(true);
    try {
      const { data } = await api.post(`/orders/${selectedOrder.id}/validate-scan`, { huCodigo: scanInput.trim() });
      setScanResult(data);
      if (data.valid) {
        if (data.alreadyPicked) {
          toast('Este rollo ya fue escaneado', { icon: '✓' });
        } else {
          // Auto-pick: mark as EN_PICKING
          await api.post(`/orders/${selectedOrder.id}/assign-hu`, {
            orderLineId: data.assignment.lineId,
            huId: data.hu.id,
            metrajeTomado: data.assignment.metrajeTomar,
          });
          toast.success(`✓ ${data.hu.codigo} escaneado — ${data.assignment.metrajeTomar}m${data.assignment.requiereCorte ? ' 🔪 Requiere corte' : ''}`);
          // Refresh picking list
          const plResp = await api.get(`/orders/${selectedOrder.id}/picking-list`);
          setPickingList(plResp.data);
        }
      } else {
        toast.error(data.error || 'HU no válido para este pedido');
      }
      setScanInput('');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al validar escaneo');
    }
    setScanning(false);
  };

  const getPrioLabel = (p: number) => {
    if (p <= 1) return { label: 'URGENTE', bg: 'bg-red-100', text: 'text-red-700' };
    if (p <= 2) return { label: 'ALTA', bg: 'bg-orange-100', text: 'text-orange-700' };
    return { label: 'NORMAL', bg: 'bg-gray-100', text: 'text-gray-600' };
  };

  const pickedCount = pickingList?.items?.filter((i: any) => i.picked)?.length || 0;
  const totalItems = pickingList?.totalItems || 0;
  const allPicked = totalItems > 0 && pickedCount >= totalItems;
  const needsCut = pickingList?.items?.some((i: any) => i.requiereCorte && !i.cortado);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <KpiIcon icon={WmsIcon.Picking} gradient="from-indigo-500 to-purple-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Picking — Surtido de Pedidos</h1>
          <p className="text-gray-500 text-sm">Escanea los rollos asignados siguiendo la ruta de picking</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
          <PipelineIcon icon={WmsIcon.ToFulfill} bgClass="bg-blue-100" iconClass="text-blue-600" size={18} />
          <div>
            <p className="text-xl font-bold text-blue-700">{porSurtir?.total || 0}</p>
            <p className="text-xs text-blue-500">Por Surtir</p>
          </div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 flex items-center gap-3">
          <PipelineIcon icon={WmsIcon.Picking} bgClass="bg-purple-100" iconClass="text-purple-600" size={18} />
          <div>
            <p className="text-xl font-bold text-purple-700">{enSurtido?.total || 0}</p>
            <p className="text-xs text-purple-500">En Surtido</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
          <PipelineIcon icon={WmsIcon.Rolls} bgClass="bg-gray-100" iconClass="text-gray-600" size={18} />
          <div>
            <p className="text-xl font-bold text-gray-700">{allOrders.length}</p>
            <p className="text-xs text-gray-500">Pendientes Total</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Queue */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="font-semibold text-sm text-gray-600 flex items-center gap-2">
            <ScanLine size={14} className="text-indigo-500" />
            Cola de Picking ({allOrders.length})
          </h2>
          {!allOrders.length ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
              <WmsIcon.Picking size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No hay pedidos para surtir</p>
            </div>
          ) : allOrders.map((o: any) => {
            const prio = getPrioLabel(o.prioridad);
            const isActive = selectedOrder?.id === o.id;
            return (
              <button key={o.id} onClick={() => loadDetail(o.id)} className={`w-full text-left bg-white rounded-xl border p-4 hover:shadow-md transition-all ${isActive ? 'border-indigo-400 ring-1 ring-indigo-200' : 'border-gray-100'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm font-semibold text-indigo-600">{o.codigo}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${prio.bg} ${prio.text}`}>{prio.label}</span>
                    <ArrowRight size={14} className="text-gray-400" />
                  </div>
                </div>
                <p className="text-sm text-gray-700">{o.client?.nombre}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${o.estado === 'EN_SURTIDO' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {o.estado === 'EN_SURTIDO' ? '⚡ En Surtido' : '📋 Por Surtir'}
                  </span>
                  <span className="text-xs text-gray-400">{o._count?.lineas || o.lineas?.length || 0} líneas</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-2">
          {!selectedOrder ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
              <WmsIcon.Picking size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-500">Selecciona un pedido para surtir</p>
              <p className="text-sm text-gray-400 mt-1">Escanea rollos para asignarlos a cada línea</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border p-6 space-y-5">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    {selectedOrder.codigo}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${selectedOrder.estado === 'EN_SURTIDO' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {selectedOrder.estado === 'EN_SURTIDO' ? 'EN SURTIDO' : 'POR SURTIR'}
                    </span>
                  </h2>
                  <p className="text-sm text-gray-600">{selectedOrder.client?.nombre}</p>
                  {selectedOrder.client?.direccion && (
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <MapPin size={10} /> {selectedOrder.client.direccion}
                    </p>
                  )}
                </div>
                <button onClick={() => { setSelectedOrder(null); setPickingList(null); }} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
              </div>

              {/* Progress bar */}
              {pickingList && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">Progreso de picking</span>
                    <span className="text-sm font-bold text-indigo-700">{pickedCount} / {totalItems} rollos</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${totalItems > 0 ? (pickedCount / totalItems) * 100 : 0}%` }} />
                  </div>
                </div>
              )}

              {/* Start Picking button if POR_SURTIR */}
              {selectedOrder.estado === 'POR_SURTIR' && (
                <button
                  onClick={() => startPicking(selectedOrder.id)}
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <ScanLine size={18} />
                  Iniciar Picking
                </button>
              )}

              {/* Scanner Input - ONLY for EN_SURTIDO */}
              {selectedOrder.estado === 'EN_SURTIDO' && (
                <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <ScanLine size={16} className="text-indigo-600" />
                    <span className="text-sm font-semibold text-indigo-700">Escáner de Rollos</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">Solo HUs de este pedido</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={scanInput}
                      onChange={e => setScanInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleScan()}
                      placeholder="Escanea o escribe código HU..."
                      className="flex-1 px-4 py-3 bg-white border border-indigo-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                      autoFocus
                    />
                    <button onClick={handleScan} disabled={scanning || !scanInput.trim()} className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium text-sm disabled:opacity-50 hover:shadow-lg transition-all">
                      {scanning ? 'Validando...' : 'Escanear'}
                    </button>
                  </div>
                  {/* Scan result feedback */}
                  {scanResult && !scanResult.valid && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 animate-fade-in">
                      <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                      <span className="text-sm text-red-700">{scanResult.error}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Picking Route — Items sorted by location */}
              {pickingList && pickingList.items?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Navigation size={16} className="text-indigo-400" />
                    Ruta de Picking — {pickingList.items.length} rollos
                  </h3>
                  <div className="space-y-2">
                    {pickingList.items.map((item: any, idx: number) => (
                      <div key={item.assignmentId} className={`rounded-xl border p-4 transition-all ${item.picked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100 hover:border-indigo-200'}`}>
                        <div className="flex items-center gap-3">
                          {/* Step number */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${item.picked ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            {item.picked ? <CheckCircle2 size={18} /> : idx + 1}
                          </div>

                          {/* Location badge */}
                          <div className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 flex-shrink-0 ${item.picked ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-800'}`}>
                            <MapPin size={12} /> {item.ubicacion?.codigo || 'SIN UBICAR'}
                          </div>

                          {/* HU info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-mono text-sm font-semibold ${item.picked ? 'text-emerald-700' : 'text-indigo-600'}`}>{item.huCodigo}</span>
                              {item.requiereCorte && !item.cortado && (
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                                  <Scissors size={10} /> Requiere Corte
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">{item.skuNombre} {item.skuColor ? `· ${item.skuColor}` : ''}</p>
                          </div>

                          {/* Metraje */}
                          <div className="text-right flex-shrink-0">
                            <p className={`text-sm font-bold ${item.picked ? 'text-emerald-700' : 'text-gray-800'}`}>{item.metrajeTomar}m</p>
                            <p className="text-[10px] text-gray-400">de {item.metrajeActual}m</p>
                          </div>
                        </div>

                        {/* Zone info */}
                        {item.ubicacion && !item.picked && (
                          <div className="mt-2 ml-11 flex items-center gap-2 text-[10px] text-gray-400">
                            <span>Zona: {item.ubicacion.zona}</span>
                            <span>•</span>
                            <span>Pasillo: {item.ubicacion.pasillo}</span>
                            {item.ubicacion.rack && <><span>•</span><span>Rack: {item.ubicacion.rack}</span></>}
                            {item.ubicacion.nivel && <><span>•</span><span>Nivel: {item.ubicacion.nivel}</span></>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Complete Picking */}
              {selectedOrder.estado === 'EN_SURTIDO' && allPicked && (
                <button
                  onClick={finishPicking}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {needsCut ? (
                    <><Scissors size={18} /> Completar Picking → Enviar a Corte</>
                  ) : (
                    <><CheckCircle2 size={18} /> Completar Picking</>
                  )}
                </button>
              )}

              {selectedOrder.estado === 'EN_SURTIDO' && !allPicked && totalItems > 0 && (
                <div className="text-center text-xs text-gray-400 py-2">
                  Escanea los {totalItems - pickedCount} rollos restantes para completar el picking
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

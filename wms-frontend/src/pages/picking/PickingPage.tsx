import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import { WmsIcon, KpiIcon, StatusBadge, PipelineIcon } from '../../components/icons/WmsIcons';
import { ArrowRight, X, ScanLine, CheckCircle2, AlertCircle, MapPin } from 'lucide-react';

export default function PickingPage() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);


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
      toast.success('Picking completado → En Corte');
      setSelectedOrder(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error');
    }
  };

  const getPrioLabel = (p: number) => {
    if (p <= 1) return { label: 'URGENTE', bg: 'bg-red-100', text: 'text-red-700' };
    if (p <= 2) return { label: 'ALTA', bg: 'bg-orange-100', text: 'text-orange-700' };
    return { label: 'NORMAL', bg: 'bg-gray-100', text: 'text-gray-600' };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <KpiIcon icon={WmsIcon.Picking} gradient="from-indigo-500 to-purple-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Picking — Surtido de Pedidos</h1>
          <p className="text-gray-500 text-sm">Asignar rollos (HUs) a líneas del pedido para corte</p>
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
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
              </div>

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

              {/* Lines to pick */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <WmsIcon.Rolls size={16} className="text-gray-400" />
                  Líneas del Pedido
                </h3>
                <div className="space-y-3">
                  {selectedOrder.lineas?.map((line: any) => {
                    const pct = line.metrajeRequerido > 0 ? (line.metrajeSurtido / line.metrajeRequerido) * 100 : 0;
                    const isComplete = pct >= 80;
                    return (
                      <div key={line.id} className={`border rounded-xl p-4 ${isComplete ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">{line.sku?.nombre || '—'}</p>
                            <p className="text-xs text-gray-400">{line.sku?.codigo} · {line.sku?.color}</p>
                          </div>
                          {isComplete ? (
                            <StatusBadge icon={CheckCircle2} label="Surtido" bgClass="bg-emerald-100" textClass="text-emerald-700" />
                          ) : (
                            <StatusBadge icon={AlertCircle} label={`${Math.round(pct)}%`} bgClass="bg-amber-100" textClass="text-amber-700" />
                          )}
                        </div>

                        {/* Progress bar */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isComplete ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-600 min-w-[80px] text-right">
                            {line.metrajeSurtido}m / {line.metrajeRequerido}m
                          </span>
                        </div>

                        {/* Assigned HUs */}
                        {line.assignments?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {line.assignments.map((a: any) => (
                              <span key={a.id} className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-mono">
                                {a.hu?.codigo} ({a.metrajeTomado}m)
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Complete Picking */}
              {selectedOrder.estado === 'EN_SURTIDO' && (
                <button
                  onClick={finishPicking}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <CheckCircle2 size={18} />
                  Completar Picking → Enviar a Corte
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

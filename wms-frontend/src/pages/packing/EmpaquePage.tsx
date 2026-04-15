import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import { WmsIcon, KpiIcon, StatusBadge } from '../../components/icons/WmsIcons';
import { CheckCircle2, Scale, Ruler, ArrowRight, X } from 'lucide-react';

export default function EmpaquePage() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [peso, setPeso] = useState<number>(0);
  const [dimensiones, setDimensiones] = useState({ largo: 0, ancho: 0, alto: 0 });
  const [notas, setNotas] = useState('');

  const { data: orders, refetch } = useApi<any[]>(['packing-orders'], '/orders', { estado: 'EMPACADO', limit: 20 });

  const loadDetail = async (orderId: string) => {
    try {
      const resp = await api.get(`/orders/${orderId}`);
      setSelectedOrder(resp.data);
    } catch { toast.error('Error al cargar pedido'); }
  };

  const markInvoiced = async () => {
    if (!selectedOrder) return;
    try {
      await api.put(`/orders/${selectedOrder.id}/status`, { estado: 'FACTURADO' });
      toast.success('Pedido marcado como FACTURADO');
      setSelectedOrder(null);
      setPeso(0);
      setDimensiones({ largo: 0, ancho: 0, alto: 0 });
      setNotas('');
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <KpiIcon icon={WmsIcon.Packed} gradient="from-teal-500 to-cyan-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empaque</h1>
          <p className="text-gray-500 text-sm">Verificar, pesar y preparar pedidos para facturación</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order list */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-gray-600">Pedidos Listos ({orders?.length || 0})</h2>
          </div>
          {!orders?.length ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
              <WmsIcon.Packed size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No hay pedidos para empacar</p>
            </div>
          ) : orders.map((o: any) => (
            <button key={o.id} onClick={() => loadDetail(o.id)} className={`w-full text-left bg-white rounded-xl border p-4 hover:shadow-md transition-all ${selectedOrder?.id === o.id ? 'border-teal-400 ring-1 ring-teal-200' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-semibold text-teal-600">{o.codigo}</span>
                <ArrowRight size={16} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-700 mt-1">{o.client?.nombre}</p>
              <p className="text-xs text-gray-400">{o._count?.lineas || 0} líneas · ${Number(o.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          {!selectedOrder ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
              <WmsIcon.Packed size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-500">Selecciona un pedido para empacar</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border p-6 space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedOrder.codigo}</h2>
                  <p className="text-sm text-gray-600">{selectedOrder.client?.nombre}</p>
                  {selectedOrder.client?.direccion && <p className="text-xs text-gray-400 mt-0.5">{selectedOrder.client.direccion}</p>}
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
              </div>

              {/* Packing List */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <WmsIcon.Quote size={16} className="text-gray-400" />
                  Lista de Empaque (Packing Slip)
                </h3>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-4 py-2 text-left">Tela</th>
                        <th className="px-4 py-2 text-center">Solicitado</th>
                        <th className="px-4 py-2 text-center">Surtido</th>
                        <th className="px-4 py-2 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {selectedOrder.lineas?.map((line: any) => {
                        const pct = line.metrajeRequerido > 0 ? (line.metrajeSurtido / line.metrajeRequerido) * 100 : 0;
                        const ok = pct >= 80;
                        return (
                          <tr key={line.id}>
                            <td className="px-4 py-2.5">
                              <p className="font-medium">{line.sku?.nombre || '—'}</p>
                              <p className="text-xs text-gray-400">{line.sku?.codigo}</p>
                            </td>
                            <td className="px-4 py-2.5 text-center">{line.metrajeRequerido}m</td>
                            <td className="px-4 py-2.5 text-center font-semibold">{line.metrajeSurtido}m</td>
                            <td className="px-4 py-2.5 text-center">
                              {ok ? (
                                <StatusBadge icon={CheckCircle2} label="OK" bgClass="bg-emerald-100" textClass="text-emerald-700" />
                              ) : (
                                <StatusBadge icon={WmsIcon.Timer} label={`${Math.round(pct)}%`} bgClass="bg-amber-100" textClass="text-amber-700" />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Weight & Dimensions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Scale size={12} /> Peso (kg)</label>
                  <input type="number" step={0.1} min={0} value={peso || ''} onChange={e => setPeso(Number(e.target.value))} className="w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm" placeholder="0.0" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Ruler size={12} /> Dimensiones (cm)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" min={0} value={dimensiones.largo || ''} onChange={e => setDimensiones(d => ({ ...d, largo: +e.target.value }))} className="px-3 py-2.5 bg-gray-50 border rounded-xl text-sm" placeholder="Largo" />
                    <input type="number" min={0} value={dimensiones.ancho || ''} onChange={e => setDimensiones(d => ({ ...d, ancho: +e.target.value }))} className="px-3 py-2.5 bg-gray-50 border rounded-xl text-sm" placeholder="Ancho" />
                    <input type="number" min={0} value={dimensiones.alto || ''} onChange={e => setDimensiones(d => ({ ...d, alto: +e.target.value }))} className="px-3 py-2.5 bg-gray-50 border rounded-xl text-sm" placeholder="Alto" />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Notas de empaque</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} className="w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm" placeholder="Observaciones del empaque..." />
              </div>

              {/* Financial */}
              <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center">
                <span className="text-sm text-gray-600">Total del pedido:</span>
                <span className="text-xl font-bold text-emerald-600">${Number(selectedOrder.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Action */}
              <button onClick={markInvoiced} className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2 shadow-sm">
                <WmsIcon.Invoiced size={18} />
                Aprobar Empaque → Facturación
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

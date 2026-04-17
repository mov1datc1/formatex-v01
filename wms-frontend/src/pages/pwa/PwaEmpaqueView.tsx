import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import { PackageCheck, ArrowRight, CheckCircle2, X } from 'lucide-react';

export default function PwaEmpaqueView() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const { data: resp, refetch } = useApi<PaginatedResponse<any>>(['pwa-empaque'], '/orders', { estado: 'EMPACADO', limit: 50 });
  const orders = resp?.data || [];

  const loadDetail = async (id: string) => {
    try { const { data } = await api.get(`/orders/${id}`); setSelectedOrder(data); }
    catch { toast.error('Error al cargar'); }
  };

  const markInvoiced = async () => {
    if (!selectedOrder) return;
    try {
      await api.put(`/orders/${selectedOrder.id}/status`, { estado: 'FACTURADO' });
      toast.success('✅ Pedido → FACTURADO');
      setSelectedOrder(null);
      refetch();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-teal-500 flex items-center justify-center">
          <PackageCheck size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Empaque</h1>
          <p className="text-xs text-gray-400">{orders.length} pedidos listos</p>
        </div>
      </div>

      {!selectedOrder ? (
        <div className="space-y-2">
          {!orders.length ? (
            <div className="text-center py-16">
              <PackageCheck size={48} className="mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500">No hay pedidos para empacar</p>
            </div>
          ) : orders.map((o: any) => (
            <button key={o.id} onClick={() => loadDetail(o.id)}
              className="w-full text-left bg-gray-900 rounded-2xl p-4 active:scale-[0.98] transition-all border border-gray-800">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-teal-400">{o.codigo}</span>
                <ArrowRight size={18} className="text-gray-600" />
              </div>
              <p className="text-sm text-gray-300 mt-1">{o.client?.nombre}</p>
              <p className="text-xs text-gray-600">{o._count?.lineas || 0} líneas</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
            <div className="flex justify-between items-center mb-3">
              <div>
                <span className="font-mono font-bold text-lg text-teal-400">{selectedOrder.codigo}</span>
                <p className="text-sm text-gray-300">{selectedOrder.client?.nombre}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 bg-gray-800 rounded-xl"><X size={16} /></button>
            </div>

            <div className="space-y-2">
              {selectedOrder.lineas?.map((l: any) => {
                const pct = l.metrajeRequerido > 0 ? (l.metrajeSurtido / l.metrajeRequerido) * 100 : 0;
                return (
                  <div key={l.id} className="p-3 bg-gray-800 rounded-xl border border-gray-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-white font-medium">{l.sku?.nombre}</span>
                      <span className={pct >= 80 ? 'text-emerald-400' : 'text-amber-400'}>
                        {l.metrajeSurtido}/{l.metrajeRequerido}m
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
                      <div className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={markInvoiced}
            className="w-full py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-2xl text-lg font-bold active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-lg">
            <CheckCircle2 size={22} /> Aprobar → Facturación
          </button>
        </div>
      )}
    </div>
  );
}

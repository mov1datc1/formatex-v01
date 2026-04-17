import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import { Truck, ArrowRight, X } from 'lucide-react';

export default function PwaEnvioView() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [transportista, setTransportista] = useState('');
  const [guia, setGuia] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const { data: resp, refetch } = useApi<PaginatedResponse<any>>(['pwa-envio'], '/orders', { estado: 'FACTURADO', limit: 50 });
  const orders = resp?.data || [];

  const loadDetail = async (id: string) => {
    try { const { data } = await api.get(`/orders/${id}`); setSelectedOrder(data); }
    catch { toast.error('Error al cargar'); }
  };

  const dispatch = async () => {
    if (!selectedOrder || !transportista) return toast.error('Ingresa transportista');
    try {
      await api.put(`/orders/${selectedOrder.id}/status`, { estado: 'DESPACHADO' });
      toast.success('🚛 Pedido DESPACHADO');
      setSelectedOrder(null); setTransportista(''); setGuia(''); setConfirmed(false);
      refetch();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center">
          <Truck size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Envío</h1>
          <p className="text-xs text-gray-400">{orders.length} facturados</p>
        </div>
      </div>

      {!selectedOrder ? (
        <div className="space-y-2">
          {!orders.length ? (
            <div className="text-center py-16">
              <Truck size={48} className="mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500">No hay pedidos para despachar</p>
            </div>
          ) : orders.map((o: any) => (
            <button key={o.id} onClick={() => loadDetail(o.id)}
              className="w-full text-left bg-gray-900 rounded-2xl p-4 active:scale-[0.98] transition-all border border-gray-800">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-orange-400">{o.codigo}</span>
                <ArrowRight size={18} className="text-gray-600" />
              </div>
              <p className="text-sm text-gray-300 mt-1">{o.client?.nombre}</p>
              <p className="text-xs text-gray-600">${Number(o.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
            <div className="flex justify-between items-center mb-3">
              <div>
                <span className="font-mono font-bold text-lg text-orange-400">{selectedOrder.codigo}</span>
                <p className="text-sm text-gray-300">{selectedOrder.client?.nombre}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 bg-gray-800 rounded-xl"><X size={16} /></button>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-gray-800 rounded-xl p-3 mb-4">
              <div className="text-center">
                <p className="text-[10px] text-gray-500">Líneas</p>
                <p className="font-bold">{selectedOrder.lineas?.length || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-500">Metros</p>
                <p className="font-bold text-blue-400">{selectedOrder.lineas?.reduce((a: number, l: any) => a + (l.metrajeSurtido || 0), 0)}m</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-500">Total</p>
                <p className="font-bold text-emerald-400">${Number(selectedOrder.total || 0).toLocaleString('es-MX')}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Transportista *</label>
                <input value={transportista} onChange={e => setTransportista(e.target.value)}
                  className="w-full py-3 px-4 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm"
                  placeholder="Estafeta, DHL, Propio..." />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Guía / Tracking</label>
                <input value={guia} onChange={e => setGuia(e.target.value)}
                  className="w-full py-3 px-4 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm"
                  placeholder="Número de guía..." />
              </div>

              <label className="flex items-center gap-3 p-3 bg-amber-900/20 border border-amber-800/50 rounded-xl">
                <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="w-5 h-5 rounded" />
                <span className="text-sm text-amber-300">Mercancía verificada y completa</span>
              </label>
            </div>
          </div>

          <button onClick={dispatch} disabled={!confirmed || !transportista}
            className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl text-lg font-bold disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-lg">
            <Truck size={22} /> Despachar
          </button>
        </div>
      )}
    </div>
  );
}

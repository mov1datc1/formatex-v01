import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import ScanInput from './ScanInput';
import { WmsIcon, StatusBadge } from '../../components/icons/WmsIcons';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function PickerView() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [scanResult, setScanResult] = useState<any>(null);

  const { data: ordersResp, refetch } = useApi<PaginatedResponse<any>>(['picker-orders'], '/orders', { estado: 'POR_SURTIR', limit: 20 });
  const { data: progressResp } = useApi<PaginatedResponse<any>>(['picker-progress'], '/orders', { estado: 'EN_SURTIDO', limit: 20 });

  const takeOrder = async (orderId: string) => {
    try {
      await api.put(`/orders/${orderId}/status`, { estado: 'EN_SURTIDO' });
      toast.success('Pedido tomado — Estado: EN SURTIDO');
      const detail = await api.get(`/orders/${orderId}`);
      setSelectedOrder(detail.data);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error');
    }
  };

  const handleScan = async (code: string) => {
    if (!selectedOrder) return toast.error('Selecciona un pedido primero');
    try {
      const resp = await api.get(`/inventory/hus`, { params: { search: code, limit: 1 } });
      const hu = resp.data?.data?.[0];
      if (!hu) return toast.error(`HU "${code}" no encontrado`);
      setScanResult(hu);
      toast.success(`Escaneado: ${hu.codigo} — ${hu.sku?.nombre} ${hu.metrajeActual}m`);
    } catch (e: any) {
      toast.error('Error al buscar HU');
    }
  };

  const assignHU = async (lineId: string, huId: string, metraje: number) => {
    try {
      await api.post(`/orders/${selectedOrder.id}/assign`, { orderLineId: lineId, huId, metrajeTomado: metraje });
      toast.success('HU asignado al pedido');
      setScanResult(null);
      // Refresh detail
      const detail = await api.get(`/orders/${selectedOrder.id}`);
      setSelectedOrder(detail.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al asignar');
    }
  };

  const sendToCut = async () => {
    if (!selectedOrder) return;
    try {
      await api.put(`/orders/${selectedOrder.id}/status`, { estado: 'EN_CORTE' });
      toast.success('Pedido enviado a CORTE');
      setSelectedOrder(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error');
    }
  };

  const allOrders = [...(ordersResp?.data || []), ...(progressResp?.data || [])];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center">
          <WmsIcon.Picking size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Modo Picker</h1>
          <p className="text-xs text-gray-400">{allOrders?.length || 0} pedidos pendientes</p>
        </div>
      </div>

      {!selectedOrder ? (
        /* Order list */
        <div className="space-y-3">
          <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">Selecciona un pedido:</p>
          {allOrders?.length === 0 ? (
            <div className="text-center py-12">
              <WmsIcon.Quote size={48} className="mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">No hay pedidos por surtir</p>
            </div>
          ) : allOrders?.map((o: any) => (
            <button
              key={o.id}
              onClick={() => o.estado === 'POR_SURTIR' ? takeOrder(o.id) : (async () => { const d = await api.get(`/orders/${o.id}`); setSelectedOrder(d.data); })()}
              className="w-full text-left bg-gray-800 rounded-2xl p-4 hover:bg-gray-700 active:scale-[0.98] transition-all border border-gray-700"
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-mono font-bold text-primary-400">{o.codigo}</span>
                  <StatusBadge
                    icon={o.estado === 'EN_SURTIDO' ? WmsIcon.InFulfill : WmsIcon.ToFulfill}
                    label={o.estado === 'EN_SURTIDO' ? 'En Surtido' : 'Por Surtir'}
                    bgClass={o.estado === 'EN_SURTIDO' ? 'bg-indigo-900/50' : 'bg-blue-900/50'}
                    textClass={o.estado === 'EN_SURTIDO' ? 'text-indigo-300' : 'text-blue-300'}
                  />
                </div>
                <ArrowRight size={20} className="text-gray-500" />
              </div>
              <p className="text-sm text-gray-300 mt-1">{o.client?.nombre}</p>
              <p className="text-xs text-gray-500">{o._count?.lineas || o.lineas?.length} líneas · {o.prioridad <= 2 ? '⚡ Urgente' : 'Normal'}</p>
            </button>
          ))}
        </div>
      ) : (
        /* Order detail + scanning */
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <div>
                <span className="font-mono font-bold text-lg text-primary-400">{selectedOrder.codigo}</span>
                <p className="text-sm text-gray-300">{selectedOrder.client?.nombre}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="px-3 py-2 bg-gray-700 rounded-xl text-sm text-gray-300">← Volver</button>
            </div>

            {/* Lines */}
            <div className="space-y-2">
              {selectedOrder.lineas?.map((line: any) => {
                const progress = line.metrajeRequerido > 0 ? (line.metrajeSurtido / line.metrajeRequerido) * 100 : 0;
                const complete = progress >= 100;
                return (
                  <div key={line.id} className={`p-3 rounded-xl border ${complete ? 'bg-emerald-900/20 border-emerald-700' : 'bg-gray-700 border-gray-600'}`}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-white">{line.sku?.nombre || 'Tela'}</span>
                      <span className={complete ? 'text-emerald-400' : 'text-amber-400'}>
                        {line.metrajeSurtido}/{line.metrajeRequerido}m
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-600 rounded-full mt-2 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${complete ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, progress)}%` }} />
                    </div>
                    {/* Assign scanned HU to this line */}
                    {scanResult && !complete && (
                      <button
                        onClick={() => assignHU(line.id, scanResult.id, Math.min(scanResult.metrajeActual, line.metrajeRequerido - line.metrajeSurtido))}
                        className="mt-2 w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium active:scale-[0.98]"
                      >
                        Asignar {scanResult.codigo} ({scanResult.metrajeActual}m)
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scan */}
          <ScanInput onScan={handleScan} placeholder="Escanear rollo..." />

          {/* Scanned result */}
          {scanResult && (
            <div className="bg-blue-900/30 border border-blue-700 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={18} className="text-blue-400" />
                <span className="font-bold text-blue-300">Rollo Escaneado</span>
              </div>
              <p className="font-mono text-lg text-white">{scanResult.codigo}</p>
              <p className="text-sm text-gray-300">{scanResult.sku?.nombre} — {scanResult.metrajeActual}m</p>
              <p className="text-xs text-gray-500">{scanResult.ubicacion?.codigo}</p>
            </div>
          )}

          {/* Send to cut */}
          <button onClick={sendToCut} className="w-full py-4 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-2xl text-lg font-bold active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-lg">
            <WmsIcon.Cut size={22} />
            Enviar a Corte
          </button>
        </div>
      )}
    </div>
  );
}

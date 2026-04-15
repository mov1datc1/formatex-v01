import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import ScanInput from './ScanInput';
import { WmsIcon, StatusBadge } from '../../components/icons/WmsIcons';
import { ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function CortadorView() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [cutMetraje, setCutMetraje] = useState<number>(0);

  const { data: ordersResp, refetch } = useApi<PaginatedResponse<any>>(['cortador-orders'], '/orders', { estado: 'EN_CORTE', limit: 20 });
  const orders = ordersResp?.data || [];

  const handleScan = async (code: string) => {
    if (!selectedOrder) return toast.error('Selecciona un pedido primero');
    try {
      const resp = await api.get(`/inventory/hus`, { params: { search: code, limit: 1 } });
      const hu = resp.data?.data?.[0];
      if (!hu) return toast.error(`HU "${code}" no encontrado`);
      setScanResult(hu);
      setCutMetraje(0);
      toast.success(`Escaneado: ${hu.codigo} — ${hu.metrajeActual}m disponibles`);
    } catch {
      toast.error('Error al buscar HU');
    }
  };

  const executeCut = async () => {
    if (!scanResult || !selectedOrder || cutMetraje <= 0) return;
    try {
      // Perform the cut
      await api.post('/cutting', {
        huOrigenId: scanResult.id,
        metrajeCorte: cutMetraje,
        pedidoId: selectedOrder.id,
        motivo: `Corte para pedido ${selectedOrder.codigo}`,
      });
      toast.success(`Corte realizado: ${cutMetraje}m de ${scanResult.codigo}`);
      setScanResult(null);
      setCutMetraje(0);
      // Refresh order detail
      const detail = await api.get(`/orders/${selectedOrder.id}`);
      setSelectedOrder(detail.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al cortar');
    }
  };

  const markPacked = async () => {
    if (!selectedOrder) return;
    try {
      await api.put(`/orders/${selectedOrder.id}/status`, { estado: 'EMPACADO' });
      toast.success('Pedido marcado como EMPACADO');
      setSelectedOrder(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-purple-500 flex items-center justify-center">
          <WmsIcon.Cut size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Modo Cortador</h1>
          <p className="text-xs text-gray-400">{orders?.length || 0} pedidos en corte</p>
        </div>
      </div>

      {!selectedOrder ? (
        /* Order list */
        <div className="space-y-3">
          <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">Pedidos en corte:</p>
          {!orders?.length ? (
            <div className="text-center py-12">
              <WmsIcon.Cut size={48} className="mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">No hay pedidos en corte</p>
            </div>
          ) : orders?.map((o: any) => (
            <button
              key={o.id}
              onClick={async () => { const d = await api.get(`/orders/${o.id}`); setSelectedOrder(d.data); }}
              className="w-full text-left bg-gray-800 rounded-2xl p-4 hover:bg-gray-700 active:scale-[0.98] transition-all border border-gray-700"
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-mono font-bold text-purple-400">{o.codigo}</span>
                  <StatusBadge icon={WmsIcon.InCut} label="En Corte" bgClass="bg-purple-900/50" textClass="text-purple-300" />
                </div>
                <ArrowRight size={20} className="text-gray-500" />
              </div>
              <p className="text-sm text-gray-300 mt-1">{o.client?.nombre}</p>
              <p className="text-xs text-gray-500">{o._count?.lineas || o.lineas?.length} líneas</p>
            </button>
          ))}
        </div>
      ) : (
        /* Cut detail */
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <div>
                <span className="font-mono font-bold text-lg text-purple-400">{selectedOrder.codigo}</span>
                <p className="text-sm text-gray-300">{selectedOrder.client?.nombre}</p>
              </div>
              <button onClick={() => { setSelectedOrder(null); setScanResult(null); }} className="px-3 py-2 bg-gray-700 rounded-xl text-sm text-gray-300">← Volver</button>
            </div>

            {/* Lines with cut status */}
            <div className="space-y-2">
              {selectedOrder.lineas?.map((line: any) => {
                const progress = line.metrajeRequerido > 0 ? (line.metrajeSurtido / line.metrajeRequerido) * 100 : 0;
                const complete = progress >= 80; // tolerance ±20%
                return (
                  <div key={line.id} className={`p-3 rounded-xl border ${complete ? 'bg-emerald-900/20 border-emerald-700' : 'bg-gray-700 border-gray-600'}`}>
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {complete ? <CheckCircle2 size={16} className="text-emerald-400" /> : <WmsIcon.Cut size={16} className="text-purple-400" />}
                        <span className="font-medium text-white">{line.sku?.nombre || 'Tela'}</span>
                      </div>
                      <span className={complete ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                        {line.metrajeSurtido}/{line.metrajeRequerido}m
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-600 rounded-full mt-2 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${complete ? 'bg-emerald-500' : 'bg-purple-500'}`} style={{ width: `${Math.min(100, progress)}%` }} />
                    </div>
                    {/* Assignments */}
                    {line.assignments?.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between text-xs text-gray-400 mt-1.5 pl-6">
                        <span className="font-mono">{a.hu?.codigo}</span>
                        <span>{a.metrajeTomado}m {a.cortado ? '✓ cortado' : 'pendiente'}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scan */}
          <ScanInput onScan={handleScan} placeholder="Escanear rollo a cortar..." />

          {/* Scanned + cut input */}
          {scanResult && (
            <div className="bg-purple-900/30 border border-purple-700 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <WmsIcon.Rolls size={18} className="text-purple-400" />
                <span className="font-bold text-purple-300">Rollo a Cortar</span>
              </div>
              <div className="bg-gray-800 rounded-xl p-3">
                <p className="font-mono text-lg text-white">{scanResult.codigo}</p>
                <p className="text-sm text-gray-300">{scanResult.sku?.nombre}</p>
                <p className="text-sm text-gray-300">Metraje actual: <span className="font-bold text-white">{scanResult.metrajeActual}m</span></p>
                <p className="text-xs text-gray-500">Ubicación: {scanResult.ubicacion?.codigo}</p>
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-2 block">Metros a cortar:</label>
                <input
                  type="number"
                  value={cutMetraje || ''}
                  onChange={e => setCutMetraje(Number(e.target.value))}
                  max={scanResult.metrajeActual}
                  min={0.1}
                  step={0.1}
                  className="w-full py-4 px-6 bg-gray-800 border-2 border-gray-600 rounded-2xl text-white text-2xl font-bold text-center focus:border-purple-400 focus:outline-none"
                  placeholder="0"
                  autoFocus
                />
                {cutMetraje > scanResult.metrajeActual && (
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs mt-2">
                    <AlertTriangle size={14} />
                    <span>No puedes cortar más que el metraje actual ({scanResult.metrajeActual}m)</span>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Retazo restante: <span className="text-white font-bold">{Math.max(0, scanResult.metrajeActual - cutMetraje).toFixed(1)}m</span>
                </p>
              </div>

              <button
                onClick={executeCut}
                disabled={cutMetraje <= 0 || cutMetraje > scanResult.metrajeActual}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl text-lg font-bold disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                <WmsIcon.Cut size={22} />
                Ejecutar Corte — {cutMetraje}m
              </button>
            </div>
          )}

          {/* Mark as packed */}
          <button onClick={markPacked} className="w-full py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-2xl text-lg font-bold active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-lg">
            <WmsIcon.Packed size={22} />
            Marcar como Empacado
          </button>
        </div>
      )}
    </div>
  );
}

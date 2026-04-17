import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import ScanInput from './ScanInput';
import {
  Package, ArrowRight, CheckCircle2, XCircle, MapPin,
  Scissors, AlertTriangle, Navigation,
} from 'lucide-react';

export default function PickerView() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [pickingList, setPickingList] = useState<any>(null);
  const [lastScan, setLastScan] = useState<any>(null);

  const { data: ordersResp, refetch } = useApi<PaginatedResponse<any>>(['picker-orders'], '/orders', { estado: 'POR_SURTIR', limit: 20 });
  const { data: progressResp } = useApi<PaginatedResponse<any>>(['picker-progress'], '/orders', { estado: 'EN_SURTIDO', limit: 20 });

  // Take an order (POR_SURTIR → EN_SURTIDO) and load its picking list
  const takeOrder = async (orderId: string) => {
    try {
      await api.put(`/orders/${orderId}/status`, { estado: 'EN_SURTIDO' });
      toast.success('Pedido tomado — Cargando lista de picking...');
      await loadPickingList(orderId);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error');
    }
  };

  // Resume an in-progress order
  const resumeOrder = async (orderId: string) => {
    await loadPickingList(orderId);
  };

  // Load picking list from backend
  const loadPickingList = async (orderId: string) => {
    try {
      const resp = await api.get(`/orders/${orderId}/picking-list`);
      setPickingList(resp.data);
      setSelectedOrder(resp.data);
      setLastScan(null);
    } catch (e: any) {
      toast.error('Error al cargar lista de picking');
    }
  };

  // ====== CORE: Validate scanned HU against the order ======
  const handleScan = async (code: string) => {
    if (!selectedOrder) return toast.error('Selecciona un pedido primero');
    setLastScan(null);

    try {
      const resp = await api.post(`/orders/${selectedOrder.orderId}/validate-scan`, { huCodigo: code });
      const result = resp.data;

      if (!result.valid) {
        // ❌ REJECT — HU doesn't belong to this order
        setLastScan({ valid: false, code, error: result.error });
        toast.error(result.error, { duration: 5000, icon: '🚫' });
        // Vibrate on error (if supported)
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        return;
      }

      if (result.alreadyPicked) {
        // ⚠️ Already scanned
        setLastScan({ valid: true, alreadyPicked: true, code, hu: result.hu });
        toast('Ya escaneaste este HU', { icon: '⚠️', duration: 3000 });
        return;
      }

      // ✅ VALID — Confirm the pick
      await api.post(`/orders/lines/${result.assignment.lineId}/assign`, {
        huId: result.hu.id,
        metrajeTomado: result.assignment.metrajeTomar,
      });

      setLastScan({ valid: true, alreadyPicked: false, code, hu: result.hu, assignment: result.assignment });
      toast.success(`✅ HU verificado y recogido — ${result.hu.codigo}`, { duration: 3000 });

      // Vibrate on success
      if (navigator.vibrate) navigator.vibrate(100);

      // Refresh picking list
      await loadPickingList(selectedOrder.orderId);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al validar escaneo');
    }
  };

  // Send to cut when all picked
  const sendToCut = async () => {
    if (!selectedOrder) return;
    try {
      await api.put(`/orders/${selectedOrder.orderId}/status`, { estado: 'EN_CORTE' });
      toast.success('✂️ Pedido enviado a CORTE');
      setSelectedOrder(null);
      setPickingList(null);
      setLastScan(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error');
    }
  };

  const allOrders = [...(ordersResp?.data || []), ...(progressResp?.data || [])];
  const pickedCount = pickingList?.pickedCount || 0;
  const totalItems = pickingList?.totalItems || 0;
  const allPicked = totalItems > 0 && pickedCount >= totalItems;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center">
          <Package size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Picking Controlado</h1>
          <p className="text-xs text-gray-400">{allOrders?.length || 0} pedidos</p>
        </div>
      </div>

      {!selectedOrder ? (
        /* ====== ORDER LIST ====== */
        <div className="space-y-3">
          <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">Selecciona un pedido:</p>
          {allOrders?.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500">No hay pedidos por surtir</p>
            </div>
          ) : allOrders?.map((o: any) => (
            <button
              key={o.id}
              onClick={() => o.estado === 'POR_SURTIR' ? takeOrder(o.id) : resumeOrder(o.id)}
              className="w-full text-left bg-gray-900 rounded-2xl p-4 active:scale-[0.98] transition-all border border-gray-800"
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-mono font-bold text-blue-400">{o.codigo}</span>
                  <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    o.estado === 'EN_SURTIDO' ? 'bg-indigo-900/50 text-indigo-300' : 'bg-blue-900/50 text-blue-300'
                  }`}>{o.estado === 'EN_SURTIDO' ? 'En Surtido' : 'Por Surtir'}</span>
                </div>
                <ArrowRight size={18} className="text-gray-600" />
              </div>
              <p className="text-sm text-gray-300 mt-1">{o.client?.nombre}</p>
              <p className="text-xs text-gray-600">{o._count?.lineas || o.lineas?.length} líneas · {o.prioridad <= 2 ? '⚡ Urgente' : 'Normal'}</p>
            </button>
          ))}
        </div>
      ) : (
        /* ====== PICKING MODE ====== */
        <div className="space-y-4">
          {/* Order header + progress */}
          <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
            <div className="flex justify-between items-center mb-3">
              <div>
                <span className="font-mono font-bold text-lg text-blue-400">{pickingList?.codigo}</span>
                <p className="text-sm text-gray-300">{pickingList?.cliente}</p>
              </div>
              <button onClick={() => { setSelectedOrder(null); setPickingList(null); setLastScan(null); }}
                className="px-3 py-1.5 bg-gray-800 rounded-xl text-xs text-gray-300">← Volver</button>
            </div>

            {/* Progress bar */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-medium">Progreso de picking</span>
              <span className={`text-sm font-bold ${allPicked ? 'text-emerald-400' : 'text-blue-400'}`}>
                {pickedCount}/{totalItems} HUs
              </span>
            </div>
            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${allPicked ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${totalItems > 0 ? (pickedCount / totalItems) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Picking list — HUs to find */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Navigation size={12} /> Ruta de picking
            </p>
            {pickingList?.items?.map((item: any, idx: number) => (
              <div
                key={item.assignmentId}
                className={`p-3 rounded-xl border transition-all ${
                  item.picked
                    ? 'bg-emerald-900/20 border-emerald-800/50'
                    : 'bg-gray-900 border-gray-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {/* Status icon */}
                    {item.picked ? (
                      <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex items-center justify-center text-[9px] text-gray-500 font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                    )}
                    <div>
                      <p className={`font-mono font-bold text-sm ${item.picked ? 'text-emerald-400 line-through' : 'text-white'}`}>
                        {item.huCodigo}
                      </p>
                      <p className="text-xs text-gray-400">{item.skuNombre} · {item.skuColor}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{item.metrajeTomar}m</p>
                    {item.requiereCorte && (
                      <span className="text-[9px] text-orange-400 flex items-center gap-0.5 justify-end">
                        <Scissors size={9} /> Cortar
                      </span>
                    )}
                  </div>
                </div>

                {/* Location guide */}
                {!item.picked && item.ubicacion && (
                  <div className="mt-2 flex items-center gap-2 bg-blue-900/30 rounded-lg px-3 py-2">
                    <MapPin size={14} className="text-blue-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-blue-300">
                        Ve a: {item.ubicacion.codigo}
                      </p>
                      <p className="text-[10px] text-blue-400/60">
                        Zona {item.ubicacion.zona} · Pasillo {item.ubicacion.pasillo} · Nivel {item.ubicacion.nivel}
                      </p>
                    </div>
                  </div>
                )}
                {!item.picked && !item.ubicacion && (
                  <div className="mt-2 flex items-center gap-2 bg-amber-900/30 rounded-lg px-3 py-2">
                    <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
                    <p className="text-[10px] text-amber-300">Sin ubicación asignada — consultar a supervisor</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Scan input */}
          <ScanInput onScan={handleScan} placeholder="Escanear HU del pedido..." />

          {/* Last scan result feedback */}
          {lastScan && (
            <div className={`rounded-2xl p-4 border ${
              lastScan.valid
                ? lastScan.alreadyPicked
                  ? 'bg-amber-900/30 border-amber-700'
                  : 'bg-emerald-900/30 border-emerald-700'
                : 'bg-red-900/30 border-red-700'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {lastScan.valid ? (
                  lastScan.alreadyPicked ? (
                    <><AlertTriangle size={18} className="text-amber-400" /><span className="font-bold text-amber-300">Ya escaneado</span></>
                  ) : (
                    <><CheckCircle2 size={18} className="text-emerald-400" /><span className="font-bold text-emerald-300">HU Verificado ✅</span></>
                  )
                ) : (
                  <><XCircle size={18} className="text-red-400" /><span className="font-bold text-red-300">HU Rechazado 🚫</span></>
                )}
              </div>
              <p className="font-mono text-sm text-white">{lastScan.code}</p>
              {lastScan.error && <p className="text-xs text-red-300 mt-1">{lastScan.error}</p>}
              {lastScan.hu && (
                <p className="text-xs text-gray-400 mt-0.5">{lastScan.hu.sku?.nombre} · {lastScan.hu.metrajeActual}m</p>
              )}
            </div>
          )}

          {/* Send to cut button */}
          <button
            onClick={sendToCut}
            disabled={!allPicked}
            className={`w-full py-4 rounded-2xl text-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${
              allPicked
                ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white active:scale-[0.98]'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            <Scissors size={22} />
            {allPicked ? 'Enviar a Corte ✂️' : `Faltan ${totalItems - pickedCount} HUs por escanear`}
          </button>
        </div>
      )}
    </div>
  );
}

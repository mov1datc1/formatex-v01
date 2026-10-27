import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import type { RootState } from '../../store';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import ScanInput from './ScanInput';
import {
  Package, ArrowRight, CheckCircle2, XCircle, MapPin,
  Scissors, AlertTriangle, Navigation, Truck, Zap, ShoppingBag,
  Check, X
} from 'lucide-react';

export default function PickerView() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [pickingList, setPickingList] = useState<any>(null);
  const [lastScan, setLastScan] = useState<any>(null);
  const [filterMine, setFilterMine] = useState<boolean>(true);

  // Cart selection state
  const [showCartSelector, setShowCartSelector] = useState(false);
  const [selectedCart, setSelectedCart] = useState('Carrito 01 - A1');
  const [submittingAction, setSubmittingAction] = useState(false);

  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Fetch orders in POR_SURTIR (verified by Cobranza) and EN_SURTIDO
  const { data: ordersResp, refetch } = useApi<PaginatedResponse<any>>(
    ['picker-orders'],
    '/orders',
    { estado: 'POR_SURTIR', limit: 50 }
  );
  const { data: progressResp } = useApi<PaginatedResponse<any>>(
    ['picker-progress'],
    '/orders',
    { estado: 'EN_SURTIDO', limit: 50 }
  );

  const allOrders = [...(ordersResp?.data || []), ...(progressResp?.data || [])];

  const userRole = (currentUser?.role?.nombre || currentUser?.role || '').toUpperCase();
  const isSupervisor = ['ADMIN', 'SUPERVISOR', 'JEFE_ALMACEN', 'DIRECTOR', 'GERENTE', 'COORDINADOR'].includes(userRole) || (currentUser?.nivel && currentUser.nivel <= 2);

  // Filter by "Mis Pedidos Asignados" vs "Todos"
  const visibleOrders = allOrders.filter((o: any) => {
    if (!isSupervisor) {
      // Pickers solo ven pedidos explícitamente asignados a su ID (sin pedidos ajenos ni sin asignar)
      return o.surtidorId === currentUser?.id;
    }
    if (!filterMine) return true;
    if (!currentUser?.id) return true;
    return o.surtidorId === currentUser.id;
  });

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
      setShowCartSelector(false);
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
        setLastScan({ valid: false, code, error: result.error });
        toast.error(result.error, { duration: 5000, icon: '🚫' });
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        return;
      }

      if (result.alreadyPicked) {
        setLastScan({ valid: true, alreadyPicked: true, code, hu: result.hu });
        toast('Ya escaneaste este HU', { icon: '⚠️', duration: 3000 });
        return;
      }

      await api.post(`/orders/lines/${result.assignment.lineId}/assign`, {
        huId: result.hu.id,
        metrajeTomado: result.assignment.metrajeTomar,
      });

      setLastScan({ valid: true, alreadyPicked: false, code, hu: result.hu, assignment: result.assignment });
      toast.success(`✅ HU verificado y recogido — ${result.hu.codigo}`, { duration: 3000 });

      if (navigator.vibrate) navigator.vibrate(100);
      await loadPickingList(selectedOrder.orderId);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al validar escaneo');
    }
  };

  // Send to cut with assigned cart (Surtidor is liberated!)
  const confirmSendToCutWithCart = async () => {
    if (!selectedOrder) return;
    setSubmittingAction(true);
    try {
      await api.put(`/orders/${selectedOrder.orderId}/assign-cart`, { carritoCorte: selectedCart });
      await api.put(`/orders/${selectedOrder.orderId}/status`, { estado: 'EN_CORTE' });
      toast.success(`✂️ Pedido transferido a Corte en ${selectedCart}. ¡Surtidor liberado!`, { duration: 5000 });
      setSelectedOrder(null);
      setPickingList(null);
      setLastScan(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al enviar a corte');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Send directly to packaging (for full rolls without cuts)
  const confirmSendToPackaging = async () => {
    if (!selectedOrder) return;
    setSubmittingAction(true);
    try {
      await api.put(`/orders/${selectedOrder.orderId}/status`, { estado: 'EMPACADO' });
      toast.success('📦 Rollos enteros surtidos → Pedido enviado a Empaque', { duration: 4000 });
      setSelectedOrder(null);
      setPickingList(null);
      setLastScan(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al enviar a empaque');
    } finally {
      setSubmittingAction(false);
    }
  };

  const pickedCount = pickingList?.pickedCount || 0;
  const totalItems = pickingList?.totalItems || 0;
  const allPicked = totalItems > 0 && pickedCount >= totalItems;
  const hasCuts = pickingList?.items?.some((i: any) => i.requiereCorte) || selectedOrder?.requiereCorte;

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-500 flex items-center justify-center font-bold text-white shadow-md">
            <Package size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Picking Controlado</h1>
            <p className="text-[11px] text-gray-400">
              {currentUser?.nombre ? `👤 ${currentUser.nombre}` : 'Terminal Zebra'}
            </p>
          </div>
        </div>

        {/* Filter Toggle: Mis Asignados vs Todos (Solo visible para Supervisores y Jefes de Almacén) */}
        {!selectedOrder && isSupervisor && (
          <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-800 text-xs">
            <button
              onClick={() => setFilterMine(true)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                filterMine ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              Mis Pedidos
            </button>
            <button
              onClick={() => setFilterMine(false)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                !filterMine ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              Todos ({allOrders.length})
            </button>
          </div>
        )}
      </div>

      {!selectedOrder ? (
        /* ====== ORDER LIST ====== */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {(!isSupervisor || filterMine) ? 'Mis Pedidos Asignados' : 'Todos los Pedidos por Surtir'} ({visibleOrders.length})
            </span>
          </div>

          {visibleOrders.length === 0 ? (
            <div className="text-center py-12 bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-2">
              <Package size={44} className="mx-auto text-gray-700 mb-1" />
              <p className="text-sm font-bold text-gray-300">
                {!isSupervisor ? 'No tienes pedidos asignados' : 'No hay pedidos pendientes'}
              </p>
              <p className="text-xs text-gray-500">
                {!isSupervisor
                  ? `👤 ${currentUser?.nombre || 'Surtidor'} · Israel (Jefe de Almacén) te asignará tus pedidos desde el Tablero de Despacho.`
                  : 'No se encontraron pedidos en estado Por Surtir o En Surtido en este momento.'}
              </p>
            </div>
          ) : (
            visibleOrders.map((o: any) => {
              const isMine = o.surtidorId === currentUser?.id;

              return (
                <button
                  key={o.id}
                  onClick={() => o.estado === 'POR_SURTIR' ? takeOrder(o.id) : resumeOrder(o.id)}
                  className={`w-full text-left rounded-2xl p-4 active:scale-[0.98] transition-all border shadow-lg space-y-2 ${
                    isMine
                      ? 'bg-blue-950/40 border-blue-500/40'
                      : 'bg-gray-900 border-gray-800'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-blue-400">{o.codigo}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        o.estado === 'EN_SURTIDO' ? 'bg-indigo-900/60 text-indigo-300' : 'bg-blue-900/60 text-blue-300'
                      }`}>
                        {o.estado === 'EN_SURTIDO' ? '⚡ En Surtido' : '📋 Por Surtir'}
                      </span>
                    </div>
                    <ArrowRight size={18} className="text-gray-500" />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-gray-200">{o.client?.nombre}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {o._count?.lineas || o.lineas?.length} líneas · {o.prioridad <= 2 ? '⚡ Urgente' : 'Normal'}
                    </p>
                  </div>

                  {/* Skills / Classification Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-800/80 text-[10px]">
                    {o.tipoPicking === 'REQUIERE_MONTACARGAS' && (
                      <span className="bg-purple-900/50 text-purple-300 border border-purple-700/50 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Truck size={10} /> Requiere Montacargas
                      </span>
                    )}
                    {o.tipoPicking === 'SOLO_PISO' && (
                      <span className="bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded-full font-bold">
                        🚶 Nivel Piso
                      </span>
                    )}
                    {o.tipoPicking === 'MIXTO' && (
                      <span className="bg-amber-900/50 text-amber-300 border border-amber-700/50 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Zap size={10} /> Pedido Mixto
                      </span>
                    )}

                    {o.surtidorNombre && (
                      <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full font-mono">
                        👤 {o.surtidorNombre}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      ) : (
        /* ====== ACTIVE PICKING SESSION ====== */
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-mono font-bold text-lg text-blue-400">{pickingList?.codigo}</span>
                <p className="text-sm text-gray-300 font-medium">{pickingList?.cliente}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setPickingList(null);
                  setLastScan(null);
                }}
                className="px-3 py-1.5 bg-gray-800 rounded-xl text-xs text-gray-300"
              >
                ← Volver
              </button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Progreso de Picking:</span>
                <span className={`font-mono font-bold ${allPicked ? 'text-emerald-400' : 'text-blue-400'}`}>
                  {pickedCount} / {totalItems} HUs
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${allPicked ? 'bg-emerald-500' : 'bg-blue-500'}`}
                  style={{ width: `${totalItems > 0 ? (pickedCount / totalItems) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Picking List items with exact location guide */}
          <div className="space-y-2">
            {pickingList?.items?.map((item: any, idx: number) => (
              <div
                key={item.assignmentId || idx}
                className={`p-3.5 rounded-2xl border transition-all ${
                  item.picked
                    ? 'bg-emerald-950/30 border-emerald-600/50'
                    : 'bg-gray-900 border-gray-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-gray-100 text-sm">{item.tela}</p>
                    <p className="font-mono text-[11px] text-gray-400">{item.huCodigo}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-400 text-sm">{item.metrajeTomar}m</span>
                    {item.requiereCorte && (
                      <span className="block text-[10px] text-purple-400 font-semibold">🔪 Con Corte</span>
                    )}
                  </div>
                </div>

                {/* Location Guide */}
                {!item.picked && item.ubicacion && (
                  <div className="mt-2 flex items-center gap-2 bg-blue-950/60 border border-blue-800/60 rounded-xl px-3 py-2">
                    <MapPin size={16} className="text-blue-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-blue-300 font-mono">
                        Rack: {item.ubicacion.codigo || item.ubicacion}
                      </p>
                      <p className="text-[10px] text-blue-400/80">
                        Nivel {item.ubicacion.nivel || 1} · Pasillo {item.ubicacion.pasillo || 1}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Laser Scanner Input */}
          <ScanInput onScan={handleScan} placeholder="Escanear HU del pedido..." />

          {/* Last Scan Result Card */}
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
            </div>
          )}

          {/* Final Action: Cut Cart Assignment Modal or Empaque */}
          {allPicked && (
            <div className="space-y-3 pt-2">
              {hasCuts ? (
                /* Corte required: Show cart picker */
                <div className="bg-gradient-to-br from-purple-950/80 to-gray-900 border-2 border-purple-500/60 rounded-3xl p-4 space-y-3 shadow-xl">
                  <div className="flex items-center gap-2.5 text-purple-300">
                    <Scissors size={20} />
                    <div>
                      <h4 className="font-bold text-sm text-white">Depositar en Carrito de Corte</h4>
                      <p className="text-[10px] text-purple-300/80">El surtidor se libera al dejar los rollos en el carrito</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      'Carrito 01 - A1',
                      'Carrito 01 - A2',
                      'Carrito 01 - A3',
                      'Carrito 02 - A1',
                      'Carrito 02 - A2',
                      'Carrito 02 - A3',
                    ].map((cart) => (
                      <button
                        key={cart}
                        type="button"
                        onClick={() => setSelectedCart(cart)}
                        className={`p-2 rounded-xl border text-center font-bold transition-all ${
                          selectedCart === cart
                            ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                            : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-750'
                        }`}
                      >
                        🛒 {cart}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={confirmSendToCutWithCart}
                    disabled={submittingAction}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
                  >
                    <Check size={18} />
                    <span>{submittingAction ? 'Transfiriendo...' : `Depositar en ${selectedCart} & Liberar`}</span>
                  </button>
                </div>
              ) : (
                /* No cut required: Send directly to empaque */
                <button
                  onClick={confirmSendToPackaging}
                  disabled={submittingAction}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Package size={20} />
                  <span>{submittingAction ? 'Enviando...' : 'Rollos Enteros Surtidos → Enviar a Empaque'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

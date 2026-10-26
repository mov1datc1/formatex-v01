import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { usePermission } from '../../hooks/usePermission';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import {
  ArrowRight, X, ScanLine, CheckCircle2, AlertCircle, MapPin,
  Scissors, Package, Users, Zap, Truck, Clock, ShieldCheck,
  RefreshCw, Check, AlertTriangle, ShoppingBag, Play
} from 'lucide-react';

export default function PickingPage() {
  const { user, isAdmin } = usePermission();

  // Role check: Only Coordinators/Admins see the Dispatch Tower
  const isCoordinator =
    isAdmin ||
    user?.role === 'COORDINADOR_ALMACEN' ||
    user?.role === 'DIRECTOR_OPERACIONES' ||
    user?.role === 'ADMIN' ||
    (user?.nivel ?? 99) <= 2;

  // Active tab: Coordinators default to 'despacho', Pickers are strictly 'estacion'
  const [activeTab, setActiveTab] = useState<'despacho' | 'estacion'>(
    isCoordinator ? 'despacho' : 'estacion'
  );
  const currentTab = isCoordinator ? activeTab : 'estacion';

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [pickingList, setPickingList] = useState<any>(null);
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanning, setScanning] = useState(false);

  // Cart assignment modal state
  const [showCartModal, setShowCartModal] = useState(false);
  const [selectedCart, setSelectedCart] = useState('Carrito 01 - A1');
  const [finishingPicking, setFinishingPicking] = useState(false);

  // Dispatch queue state (Israel view)
  const [filterTipo, setFilterTipo] = useState<string>('TODOS');
  const [selectedSurtidorMap, setSelectedSurtidorMap] = useState<Record<string, string>>({});
  const [autoDispatching, setAutoDispatching] = useState(false);

  // Picking Station state
  const [pickerFilter, setPickerFilter] = useState<'MIS_ASIGNADOS' | 'DISPONIBLES'>('MIS_ASIGNADOS');
  const [supervisorSurtidorFilter, setSupervisorSurtidorFilter] = useState<string>('TODOS');

  // Fetch dispatch queue (Israel metrics + surtidores capacity)
  const { data: dispatchData, isLoading: loadingDispatch, refetch: refetchDispatch } = useApi<any>(
    ['orders-dispatch-queue'],
    '/orders/dispatch-queue'
  );

  // Fetch orders in POR_SURTIR and EN_SURTIDO for the Picking Station
  const { data: stationOrdersResp, isLoading: loadingOrders, refetch: refetchStationOrders } = useApi<any>(
    ['picking-station-orders'],
    '/orders',
    { estado: 'POR_SURTIR,EN_SURTIDO', limit: 100 }
  );

  const dispatchOrders = dispatchData?.orders || [];
  const surtidores = dispatchData?.surtidores || [];
  const allStationOrders = stationOrdersResp?.data || [];

  // Current picker's personal workload
  const myWorkload = surtidores.find(
    (s: any) => s.id === user?.id || s.username === user?.username || s.nombre === user?.nombre
  );

  // Filter dispatch orders for Israel
  const filteredDispatchOrders = dispatchOrders.filter((o: any) => {
    if (filterTipo === 'TODOS') return true;
    if (filterTipo === 'SIN_ASIGNAR') return !o.surtidorId;
    if (filterTipo === 'MONTACARGAS') return o.tipoPicking === 'REQUIERE_MONTACARGAS';
    if (filterTipo === 'PISO') return o.tipoPicking === 'SOLO_PISO';
    if (filterTipo === 'MIXTO') return o.tipoPicking === 'MIXTO';
    return true;
  });

  // Filter orders for the Picking Station based on role
  const filteredStationOrders = allStationOrders.filter((o: any) => {
    if (isCoordinator) {
      if (supervisorSurtidorFilter === 'TODOS') return true;
      if (supervisorSurtidorFilter === 'SIN_ASIGNAR') return !o.surtidorId;
      return o.surtidorId === supervisorSurtidorFilter;
    }

    // Picker view:
    if (pickerFilter === 'MIS_ASIGNADOS') {
      return o.surtidorId === user?.id || (user?.nombre && o.surtidorNombre === user?.nombre);
    }
    // Unassigned queue available to be taken
    return !o.surtidorId && o.estado === 'POR_SURTIR';
  });

  const myAssignedOrdersCount = allStationOrders.filter(
    (o: any) => o.surtidorId === user?.id || (user?.nombre && o.surtidorNombre === user?.nombre)
  ).length;

  const unassignedOrdersCount = allStationOrders.filter(
    (o: any) => !o.surtidorId && o.estado === 'POR_SURTIR'
  ).length;

  // Assign order to surtidor (Israel)
  const handleAssignSurtidor = async (orderId: string, tipoPicking?: string) => {
    const surtidorId = selectedSurtidorMap[orderId];
    if (!surtidorId) {
      return toast.error('Selecciona un surtidor primero');
    }

    try {
      await api.post(`/orders/${orderId}/assign-surtidor`, { surtidorId, tipoPicking });
      toast.success('Pedido asignado exitosamente al surtidor');
      refetchDispatch();
      refetchStationOrders();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al asignar');
    }
  };

  // Run 1-Click Auto Dispatch (Israel's algorithm)
  const handleAutoDispatch = async () => {
    setAutoDispatching(true);
    try {
      const { data } = await api.post('/orders/auto-dispatch');
      toast.success(data.message || 'Despacho inteligente completado');
      refetchDispatch();
      refetchStationOrders();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error en despacho automático');
    } finally {
      setAutoDispatching(false);
    }
  };

  const loadDetail = async (orderId: string) => {
    try {
      const resp = await api.get(`/orders/${orderId}`);
      setSelectedOrder(resp.data);
      const plResp = await api.get(`/orders/${orderId}/picking-list`);
      setPickingList(plResp.data);
      setScanResult(null);
      setScanInput('');
    } catch {
      toast.error('Error al cargar detalle del pedido');
    }
  };

  // Start picking session (moves POR_SURTIR → EN_SURTIDO)
  const startPicking = async (orderId: string) => {
    try {
      await api.put(`/orders/${orderId}/status`, { estado: 'EN_SURTIDO' });
      toast.success('🚀 Surtido iniciado — Marbetes y ubicaciones listos');
      await loadDetail(orderId);
      refetchStationOrders();
      refetchDispatch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al iniciar surtido');
    }
  };

  // Trigger completion flow: if cut required, prompt cart; if closed rolls, send to EMPACADO
  const handleCompletePickingFlow = () => {
    if (!selectedOrder) return;
    const hasCuts = pickingList?.items?.some((i: any) => i.requiereCorte) || selectedOrder.requiereCorte;
    if (hasCuts) {
      setShowCartModal(true);
    } else {
      confirmSendToEmpaque();
    }
  };

  // Send to Cut with cutting cart (Surtidor is liberated!)
  const confirmSendToCorteWithCart = async () => {
    if (!selectedOrder) return;
    setFinishingPicking(true);
    try {
      await api.put(`/orders/${selectedOrder.id}/assign-cart`, { carritoCorte: selectedCart });
      await api.put(`/orders/${selectedOrder.id}/status`, { estado: 'EN_CORTE' });
      toast.success(`✂️ Pedido transferido a Corte en ${selectedCart}. ¡Surtidor liberado!`, { duration: 5000 });
      setShowCartModal(false);
      setSelectedOrder(null);
      setPickingList(null);
      refetchStationOrders();
      refetchDispatch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al enviar a corte');
    } finally {
      setFinishingPicking(false);
    }
  };

  // Send directly to Empaque (for full rolls without cuts)
  const confirmSendToEmpaque = async () => {
    if (!selectedOrder) return;
    setFinishingPicking(true);
    try {
      await api.put(`/orders/${selectedOrder.id}/status`, { estado: 'EMPACADO' });
      toast.success('📦 Rollos enteros surtidos → Pedido enviado a Empaque. ¡Surtidor liberado!', { duration: 5000 });
      setSelectedOrder(null);
      setPickingList(null);
      refetchStationOrders();
      refetchDispatch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al enviar a empaque');
    } finally {
      setFinishingPicking(false);
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
          await api.post(`/orders/lines/${data.assignment.lineId}/assign`, {
            huId: data.hu.id,
            metrajeTomado: data.assignment.metrajeTomar,
          });
          toast.success(`✓ ${data.hu.codigo} escaneado — ${data.assignment.metrajeTomar}m${data.assignment.requiereCorte ? ' 🔪 Requiere corte' : ''}`);
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
  const needsCut = pickingList?.items?.some((i: any) => i.requiereCorte && !i.cortado) || selectedOrder?.requiereCorte;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Package className="text-primary-600" size={28} />
            <span>{isCoordinator ? 'Surtido & Torre de Despacho' : 'Mi Estación de Surtido & Escaneo'}</span>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isCoordinator
              ? 'Torre de control de despacho (Israel) · Asignación inteligente por altura y balance de carga'
              : `Operador: ${user?.nombre || 'Surtidor'} · Surtido de pedidos asignados y escaneo láser de marbetes`}
          </p>
        </div>

        {/* Tab Switcher — ONLY for Coordinators & Admins */}
        {isCoordinator ? (
          <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200 shadow-sm">
            <button
              onClick={() => setActiveTab('despacho')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                currentTab === 'despacho'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Users size={16} className="text-primary-600" />
              <span>Torre de Despacho (Israel)</span>
              {dispatchData?.pedidosSinAsignar > 0 && (
                <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {dispatchData.pedidosSinAsignar}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('estacion')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                currentTab === 'estacion'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <ScanLine size={16} className="text-indigo-600" />
              <span>Estación de Surtido</span>
              <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {allStationOrders.length}
              </span>
            </button>
          </div>
        ) : (
          /* Surtidor Active Session Badge */
          <div className="flex items-center gap-2 bg-primary-50 border border-primary-200 px-3.5 py-1.5 rounded-2xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-primary-900">{user?.nombre}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
              {myWorkload?.tieneMontacargas ? '🚜 Montacargas' : '🚶 Piso'}
            </span>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: TORRE DE DESPACHO Y ASIGNACIÓN (ISRAEL / COORDINADOR ONLY)      */}
      {/* ===================================================================== */}
      {currentTab === 'despacho' && isCoordinator && (
        <div className="space-y-6 animate-fade-in">
          {/* Top KPI Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Validados por Cobranza</p>
                <p className="text-xl font-bold text-gray-900">{dispatchData?.totalPorSurtir || 0}</p>
                <p className="text-[10px] text-gray-400">Listos en POR_SURTIR</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle size={22} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Pendientes de Asignar</p>
                <p className="text-xl font-bold text-amber-600">{dispatchData?.pedidosSinAsignar || 0}</p>
                <p className="text-[10px] text-gray-400">Esperando despacho</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Truck size={22} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Requieren Montacargas</p>
                <p className="text-xl font-bold text-purple-700">
                  {dispatchOrders.filter((o: any) => o.tipoPicking === 'REQUIERE_MONTACARGAS' || o.tipoPicking === 'MIXTO').length}
                </p>
                <p className="text-[10px] text-gray-400">Rollos en Niveles 2 a 5</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShoppingBag size={22} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Solo Nivel Piso</p>
                <p className="text-xl font-bold text-emerald-600">
                  {dispatchOrders.filter((o: any) => o.tipoPicking === 'SOLO_PISO').length}
                </p>
                <p className="text-[10px] text-gray-400">Cortes o rollos bajos</p>
              </div>
            </div>
          </div>

          {/* Surtidores Workload Bar (Capacidad Israel: 55-60 unidades/día) */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Users size={18} className="text-primary-600" />
                  <span>Equipo de Surtidores & Capacidad Diaria (Meta: 55 a 60 Unidades/Día)</span>
                </h3>
                <p className="text-xs text-gray-500">
                  Supervisado por Israel · Clasificación de personal certificado en Montacargas vs Surtidores de Piso
                </p>
              </div>

              {/* 1-Click Auto Dispatch Button */}
              <button
                onClick={handleAutoDispatch}
                disabled={autoDispatching || dispatchData?.pedidosSinAsignar === 0}
                className="px-4 py-2 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95"
              >
                <Zap size={14} className={autoDispatching ? 'animate-spin' : ''} />
                <span>{autoDispatching ? 'Distribuyendo...' : '⚡ Despacho Inteligente 1-Click'}</span>
              </button>
            </div>

            {/* Surtidores Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {surtidores.map((surtidor: any) => {
                const isOverloaded = surtidor.unidadesHoy >= 55;
                const isBalanced = surtidor.unidadesHoy >= 40 && surtidor.unidadesHoy < 55;

                return (
                  <div
                    key={surtidor.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isOverloaded
                        ? 'bg-red-50/40 border-red-200'
                        : isBalanced
                        ? 'bg-amber-50/40 border-amber-200'
                        : 'bg-gray-50/70 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold font-mono">
                          {surtidor.nombre.charAt(0)}
                        </span>
                        <div>
                          <p className="font-bold text-xs text-gray-900 leading-tight">{surtidor.nombre}</p>
                          <p className="text-[10px] text-gray-500 font-mono">@{surtidor.username}</p>
                        </div>
                      </div>

                      {/* Certification Badge */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        surtidor.tieneMontacargas
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {surtidor.tieneMontacargas ? '🚜 Montacargas' : '🚶 Piso'}
                      </span>
                    </div>

                    {/* Workload Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-500">Carga hoy:</span>
                        <span className="font-bold text-gray-800 font-mono">
                          {surtidor.unidadesHoy} / {surtidor.capacidadMax} unidades ({surtidor.pedidosAsignados} pedidos)
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            isOverloaded ? 'bg-red-500' : isBalanced ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${surtidor.porcentajeCarga}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Orders in Dispatch Queue (POR_SURTIR) */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Package size={18} className="text-primary-600" />
                  <span>Pedidos en Rampa de Surtido ({filteredDispatchOrders.length})</span>
                </h3>
                <p className="text-xs text-gray-500">
                  Cola oficial aprobada por Cobranza · Asigna manualmente o usa el algoritmo de Israel
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                {[
                  { id: 'TODOS', label: 'Todos' },
                  { id: 'SIN_ASIGNAR', label: '⚠️ Sin Asignar' },
                  { id: 'MONTACARGAS', label: '🚜 Montacargas' },
                  { id: 'PISO', label: '🚶 Piso' },
                  { id: 'MIXTO', label: '⚡ Mixto' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilterTipo(f.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                      filterTipo === f.id
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingDispatch ? (
              <div className="text-center py-12 text-gray-500 text-xs">Cargando cola de despacho...</div>
            ) : filteredDispatchOrders.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-xs">
                <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500" />
                No hay pedidos en cola con el filtro seleccionado
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDispatchOrders.map((order: any) => {
                  const currentSelectedSurtidor = selectedSurtidorMap[order.id] || order.surtidorId || '';

                  return (
                    <div
                      key={order.id}
                      className="p-4 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all bg-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      {/* Left: Order Info & Badges */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-200">
                            {order.codigo}
                          </span>
                          {order.folioContpaqi && (
                            <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              CONTPAQi: {order.folioContpaqi}
                            </span>
                          )}

                          {/* TipoPicking Badge */}
                          {order.tipoPicking === 'REQUIERE_MONTACARGAS' && (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                              <Truck size={12} /> Requiere Montacargas (Racks Altos)
                            </span>
                          )}
                          {order.tipoPicking === 'SOLO_PISO' && (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1">
                              <CheckCircle2 size={12} /> Nivel Piso / General
                            </span>
                          )}
                          {order.tipoPicking === 'MIXTO' && (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <Zap size={12} /> Pedido Mixto (Altos + Cortes)
                            </span>
                          )}

                          {/* SLA Badge */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            order.urgente ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-600'
                          }`}>
                            <Clock size={11} /> SLA: {order.horasRestantes}h rest.
                          </span>
                        </div>

                        <div>
                          <p className="font-bold text-gray-900 text-sm">{order.cliente}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {order.totalRollos} rollos cerrados · {order.totalCortes} cortes · {order.totalMetros?.toLocaleString()} metros totales
                          </p>
                        </div>
                      </div>

                      {/* Right: Surtidor Assignment Controller */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 lg:min-w-[340px]">
                        <div className="flex-1">
                          <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                            {order.surtidorNombre ? 'Surtidor Asignado' : 'Asignar a Surtidor:'}
                          </label>
                          <select
                            value={currentSelectedSurtidor}
                            onChange={(e) => {
                              setSelectedSurtidorMap((prev) => ({ ...prev, [order.id]: e.target.value }));
                            }}
                            className="w-full text-xs py-2 px-3 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:outline-none focus:border-primary-500"
                          >
                            <option value="">-- Seleccionar Surtidor --</option>
                            {surtidores.map((s: any) => (
                              <option key={s.id} value={s.id}>
                                {s.nombre} ({s.tieneMontacargas ? '🚜 Montacargas' : '🚶 Piso'}) - {s.unidadesHoy}/60 u
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:self-end">
                          <button
                            onClick={() => handleAssignSurtidor(order.id, order.tipoPicking)}
                            className="w-full sm:w-auto px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                          >
                            <Check size={14} />
                            <span>{order.surtidorId ? 'Reasignar' : 'Asignar'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: ESTACIÓN DE PICKING & ESCANEO (PICKER + SUPERVISOR MONITOR)    */}
      {/* ===================================================================== */}
      {currentTab === 'estacion' && (
        <div className="space-y-6 animate-fade-in">
          {/* Picker Personal HUD Card (Only shown for pickers) */}
          {!isCoordinator && (
            <div className="bg-gradient-to-r from-gray-900 via-primary-950 to-indigo-950 text-white rounded-3xl p-5 shadow-xl border border-white/10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl font-bold font-mono">
                    {user?.nombre?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white">{user?.nombre}</h2>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        🟢 Turno Activo
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 mt-0.5 flex items-center gap-1.5">
                      {myWorkload?.tieneMontacargas ? (
                        <>🚜 Certificado en Montacargas (Racks Altos N2 a N5)</>
                      ) : (
                        <>🚶 Surtidor de Nivel Piso y Cortes</>
                      )}
                    </p>
                  </div>
                </div>

                {/* Personal Daily Workload Progress */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 min-w-[280px]">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-300 font-medium">Mi Carga de Hoy:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {myWorkload?.unidadesHoy || 0} / {myWorkload?.capacidadMax || 60} u
                    </span>
                  </div>
                  <div className="h-2.5 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round(((myWorkload?.unidadesHoy || 0) / (myWorkload?.capacidadMax || 60)) * 100))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                    <span>Meta diaria: 55 a 60 unidades</span>
                    <span>{myWorkload?.pedidosAsignados || myAssignedOrdersCount} pedidos asignados</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main 2-Column Picking Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Orders Queue */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <ScanLine size={18} className="text-primary-600" />
                    <span>{isCoordinator ? 'Pedidos en Surtido' : 'Mis Pedidos de Surtido'}</span>
                  </h2>
                  <p className="text-xs text-gray-500">
                    {isCoordinator ? 'Supervisión en tiempo real' : 'Asignados por Israel'}
                  </p>
                </div>
                <button
                  onClick={() => refetchStationOrders()}
                  className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1 font-bold bg-primary-50 px-2.5 py-1 rounded-lg"
                >
                  <RefreshCw size={12} className={loadingOrders ? 'animate-spin' : ''} />
                  <span>Refrescar</span>
                </button>
              </div>

              {/* Filter Pills */}
              {!isCoordinator ? (
                /* Picker Toggle: Mis Pedidos vs Disponibles */
                <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold border border-gray-200">
                  <button
                    onClick={() => setPickerFilter('MIS_ASIGNADOS')}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                      pickerFilter === 'MIS_ASIGNADOS'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    🎯 Mis Asignados ({myAssignedOrdersCount})
                  </button>
                  <button
                    onClick={() => setPickerFilter('DISPONIBLES')}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                      pickerFilter === 'DISPONIBLES'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    📦 Sin Asignar ({unassignedOrdersCount})
                  </button>
                </div>
              ) : (
                /* Coordinator Surtidor Dropdown Filter */
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Filtrar por Surtidor:</label>
                  <select
                    value={supervisorSurtidorFilter}
                    onChange={(e) => setSupervisorSurtidorFilter(e.target.value)}
                    className="w-full text-xs py-2 px-3 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:outline-none focus:border-primary-500"
                  >
                    <option value="TODOS">Todos los Surtidores ({allStationOrders.length} pedidos)</option>
                    <option value="SIN_ASIGNAR">⚠️ Sin Surtidor Asignado</option>
                    {surtidores.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} ({s.pedidosAsignados} pedidos)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Order Cards List */}
              <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
                {loadingOrders ? (
                  <div className="text-center py-12 text-gray-400 text-xs">Cargando pedidos...</div>
                ) : filteredStationOrders.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <Package size={38} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm font-bold text-gray-800">
                      {!isCoordinator && pickerFilter === 'MIS_ASIGNADOS'
                        ? '¡Estás al día!'
                        : 'Sin pedidos en esta vista'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {!isCoordinator && pickerFilter === 'MIS_ASIGNADOS'
                        ? 'No tienes pedidos pendientes asignados por Israel en este momento.'
                        : 'Los pedidos aparecerán conforme sean aprobados por Cobranza.'}
                    </p>
                  </div>
                ) : (
                  filteredStationOrders.map((order: any) => {
                    const prio = getPrioLabel(order.prioridad);
                    const isSelected = selectedOrder?.id === order.id;
                    const isPorSurtir = order.estado === 'POR_SURTIR';

                    return (
                      <div
                        key={order.id}
                        onClick={() => {
                          if (isPorSurtir) {
                            startPicking(order.id);
                          } else {
                            loadDetail(order.id);
                          }
                        }}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-primary-50/70 border-primary-500 shadow-md ring-1 ring-primary-500'
                            : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                            {order.codigo}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prio.bg} ${prio.text}`}>
                            {prio.label}
                          </span>
                        </div>

                        <p className="font-bold text-xs text-gray-900 truncate mb-1">
                          {order.client?.nombre || order.cliente || 'Cliente General'}
                        </p>

                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          {/* Status Badge */}
                          {isPorSurtir ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                              📋 Asignado (Listo para iniciar)
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                              ⚡ En Proceso de Escaneo
                            </span>
                          )}

                          {/* TipoPicking */}
                          {order.tipoPicking === 'REQUIERE_MONTACARGAS' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                              🚜 Montacargas
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1.5 border-t border-gray-100">
                          <span>{order.lineas?.length || 0} telas</span>
                          {isPorSurtir ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startPicking(order.id);
                              }}
                              className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-sm hover:from-emerald-700 hover:to-teal-700"
                            >
                              <Play size={10} /> Iniciar Surtido
                            </button>
                          ) : (
                            <span className="font-semibold text-primary-600 flex items-center gap-1">
                              Continuar →
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Active Picking Station & Laser Scanner */}
            <div className="lg:col-span-2 space-y-4">
              {!selectedOrder ? (
                <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center text-gray-500 shadow-sm">
                  <ScanLine size={48} className="mx-auto mb-3 text-gray-400" />
                  <h3 className="text-base font-bold text-gray-800">Selecciona un pedido para escanear</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Haz clic en cualquiera de tus pedidos asignados para abrir la lista de ubicaciones y activar la pistola lectora de marbetes HU.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm space-y-4">
                  {/* Order Active Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-bold text-gray-900">{selectedOrder.codigo}</span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                          EN SURTIDO
                        </span>
                        {selectedOrder.surtidorNombre && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded">
                            Surtidor: {selectedOrder.surtidorNombre}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 font-medium">
                        {selectedOrder.client?.nombre || selectedOrder.cliente}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-primary-50 text-primary-800 border border-primary-200 px-3 py-1.5 rounded-xl">
                        {pickedCount} de {totalItems} HUs Escaneados
                      </span>
                    </div>
                  </div>

                  {/* Laser Barcode Scanner Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-400 block">
                      Escaneo de Marbete HU (Pistola o Teclado):
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={scanInput}
                        onChange={(e) => setScanInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                        placeholder="Escanea o escribe marbete HU (ej. HU-2026-00045)..."
                        className="w-full pl-10 pr-24 py-3 bg-gray-50 border-2 border-primary-500/50 rounded-2xl text-sm font-mono focus:outline-none focus:border-primary-600"
                        autoFocus
                      />
                      <ScanLine size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <button
                        onClick={handleScan}
                        disabled={scanning || !scanInput.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                      >
                        {scanning ? 'Validando...' : 'Escanear'}
                      </button>
                    </div>
                  </div>

                  {/* Picking List Lines */}
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {pickingList?.items?.map((item: any, idx: number) => (
                      <div
                        key={item.assignmentId || idx}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                          item.picked ? 'bg-emerald-50/70 border-emerald-300' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                              item.picked ? 'bg-emerald-500 text-white' : 'bg-gray-300 text-gray-700'
                            }`}>
                              {item.picked ? '✓' : idx + 1}
                            </span>
                            <span className="font-bold text-gray-900">{item.tela}</span>
                            <span className="font-mono text-[10px] text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                              {item.huCodigo}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-gray-500 pl-7">
                            <span className="flex items-center gap-1 font-mono font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                              <MapPin size={12} className="text-primary-600" /> {item.ubicacion}
                            </span>
                            <span>Tomar: <b className="text-gray-900 font-mono">{item.metrajeTomar}m</b></span>
                            {item.requiereCorte && (
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded border border-purple-200">
                                🔪 Requiere Corte
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          {item.picked ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1 bg-emerald-100 px-2.5 py-1 rounded-xl">
                              <CheckCircle2 size={14} /> Recogido
                            </span>
                          ) : (
                            <span className="text-gray-400 font-medium bg-white px-2.5 py-1 rounded-xl border border-gray-200">
                              Pendiente
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom Complete Action */}
                  {allPicked && (
                    <div className="pt-3 border-t">
                      <button
                        onClick={handleCompletePickingFlow}
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98"
                      >
                        <CheckCircle2 size={18} />
                        <span>
                          {needsCut
                            ? 'Completar Picking → Asignar Carrito de Corte y Liberar Surtidor'
                            : 'Completar Picking → Enviar Directamente a Empaque'}
                        </span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ASIGNACIÓN DE CARRITO DE CORTE (ISRAEL RULE)                  */}
      {/* ===================================================================== */}
      {showCartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-100 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Scissors size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Asignar Carrito de Corte</h3>
                  <p className="text-xs text-gray-500">El surtidor queda liberado al depositar el pedido</p>
                </div>
              </div>
              <button onClick={() => setShowCartModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-gray-600">
                Selecciona en qué carrito y charola (A1, A2, A3) colocas los rollos para que el cortador los localice de inmediato en su mesa:
              </p>

              {/* Predefined Cart & Shelf options */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Carrito 01 - A1',
                  'Carrito 01 - A2',
                  'Carrito 01 - A3',
                  'Carrito 02 - A1',
                  'Carrito 02 - A2',
                  'Carrito 02 - A3',
                  'Carrito 03 - A1',
                  'Carrito 03 - A2',
                ].map((cart) => (
                  <button
                    key={cart}
                    type="button"
                    onClick={() => setSelectedCart(cart)}
                    className={`p-2.5 rounded-xl border text-left font-bold transition-all ${
                      selectedCart === cart
                        ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    🛒 {cart}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setShowCartModal(false)}
                className="flex-1 py-2.5 text-xs text-gray-600 bg-gray-100 rounded-xl font-medium"
              >
                Volver
              </button>
              <button
                onClick={confirmSendToCorteWithCart}
                disabled={finishingPicking}
                className="flex-1 py-2.5 text-xs text-white font-bold bg-purple-600 hover:bg-purple-700 rounded-xl shadow-lg transition-all"
              >
                {finishingPicking ? 'Transfiriendo...' : 'Depositar & Liberar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

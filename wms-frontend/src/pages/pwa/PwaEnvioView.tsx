import { useState, useRef } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import {
  Truck, ArrowRight, X, ScanBarcode, ShieldCheck, ShieldAlert,
  CheckCircle2, XCircle, Calendar, MapPin, Package, RefreshCw
} from 'lucide-react';

const ROUTE_OPTIONS = [
  { id: 'TODAS', label: 'Todas las Camionetas / Rutas' },
  { id: 'LOCAL_INFERIOR', label: '1. Local ZMG (Camioneta Propia)' },
  { id: 'FORANEO_SUPERIOR', label: '2. Foránea Consolidada' },
  { id: 'OCOTLAN', label: '3. Ruta Ocotlán / Poncitlán' },
  { id: 'PAQUETERIA', label: '4. Paquetería (Paquetexpress)' },
];

const ROUTE_LABELS: Record<string, string> = {
  LOCAL_INFERIOR: '1. Local ZMG (Camioneta Formatex)',
  FORANEO_SUPERIOR: '2. Foránea Consolidada',
  OCOTLAN: '3. Ruta Ocotlán (Fija)',
  PAQUETERIA: '4. Paqueterías (Paquetexpress/Travisa)',
};

function inferOrderRoute(order: any): string {
  if (order?.tipoEtiquetaEmbarque) return order.tipoEtiquetaEmbarque;
  const fl = (order?.fletera || '').toLowerCase();
  const pob = (order?.client?.poblacion || '').toLowerCase();
  if (fl.includes('paquetexpress') || fl.includes('travisa') || fl.includes('dhl') || fl.includes('castores')) {
    return 'PAQUETERIA';
  }
  if (pob.includes('ocotlan') || pob.includes('ocotlán') || pob.includes('poncitlan')) {
    return 'OCOTLAN';
  }
  if (pob && !pob.includes('guadalajara') && !pob.includes('zapopan') && !pob.includes('tlaquepaque') && !pob.includes('tonala')) {
    return 'FORANEO_SUPERIOR';
  }
  return 'LOCAL_INFERIOR';
}

function buildLocalValidation(order: any, scannedCode: string, targetRoute: string) {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const rawDate = order.fechaPromesaEntrega ? new Date(order.fechaPromesaEntrega) : null;
  const schedStr = rawDate
    ? `${rawDate.getFullYear()}-${String(rawDate.getMonth() + 1).padStart(2, '0')}-${String(rawDate.getDate()).padStart(2, '0')}`
    : todayStr;

  const isFutureOrder = schedStr > todayStr;
  const dateMatchesToday = !isFutureOrder;

  const readyStates = ['FACTURADO', 'EMPACADO'];
  const alreadyDispatched = order.estado === 'DESPACHADO';
  const statusReady = readyStates.includes(order.estado) && !alreadyDispatched;

  const orderRoute = inferOrderRoute(order);
  const routeMatches = !targetRoute || targetRoute === 'TODAS' ? true : orderRoute === targetRoute;

  const allowed = statusReady && dateMatchesToday && routeMatches;

  let blockReason = '';
  let title = '✅ SÍ CORRESPONDE — AUTORIZADO PARA SUBIR A CAMIONETA';
  let subtitle = 'El pedido está listo para embarque, programado para enviarse HOY y coincide con la ruta.';

  if (!allowed) {
    title = '⛔ ¡ALTO! NO SUBIR A LA CAMIONETA';
    if (alreadyDispatched) {
      blockReason = 'ALREADY_DISPATCHED';
      subtitle = `El pedido ${order.codigo} YA FUE DESPACHADO anteriormente.`;
    } else if (!statusReady) {
      blockReason = 'NOT_READY_FOR_SHIPPING';
      subtitle = `El pedido ${order.codigo} aún NO está listo para embarque (Estado actual: ${order.estado}).`;
    } else if (isFutureOrder) {
      blockReason = 'WRONG_DATE_FUTURE';
      const formattedSched = rawDate?.toLocaleDateString('es-MX', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      });
      subtitle = `ENVÍO PROGRAMADO PARA OTRA FECHA (${formattedSched}). No se debe subir ni enviar antes de tiempo.`;
    } else if (!routeMatches) {
      blockReason = 'WRONG_ROUTE';
      subtitle = `RUTA INCORRECTA: Este pedido pertenece a "${ROUTE_LABELS[orderRoute] || orderRoute}", pero estás cargando "${ROUTE_LABELS[targetRoute] || targetRoute}".`;
    }
  }

  const totalMeters = (order.lineas || []).reduce(
    (sum: number, l: any) => sum + Number(l.metrajeSurtido || l.metrajeRequerido || 0),
    0
  );

  return {
    found: true,
    allowed,
    scannedCode,
    blockReason: allowed ? null : blockReason,
    title,
    subtitle,
    checks: {
      statusReady,
      alreadyDispatched,
      dateMatchesToday,
      isFutureOrder,
      routeMatches,
    },
    order: {
      ...order,
      scheduledDateStr: schedStr,
      scheduledDateFormatted: rawDate
        ? rawDate.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
        : 'Hoy (Entrega inmediata)',
      routeCode: orderRoute,
      routeLabel: ROUTE_LABELS[orderRoute] || orderRoute,
      totalMeters,
    },
  };
}

export default function PwaEnvioView() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [transportista, setTransportista] = useState('');
  const [guia, setGuia] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  // Candado de Embarque state
  const [scanInput, setScanInput] = useState('');
  const [activeRoute, setActiveRoute] = useState('TODAS');
  const [isScanning, setIsScanning] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const { data: resp, refetch } = useApi<PaginatedResponse<any>>(
    ['pwa-envio'],
    '/orders',
    { estado: 'FACTURADO', limit: 50 }
  );
  const orders = resp?.data || [];

  // También traemos un pedido en corte/surtido para poder demostrar el candado si escanean uno no listo
  const { data: notReadyResp } = useApi<PaginatedResponse<any>>(
    ['pwa-envio-not-ready'],
    '/orders',
    { estado: 'EN_CORTE', limit: 5 }
  );
  const notReadyOrders = notReadyResp?.data || [];

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayOrderSample = orders.find((o: any) => {
    const d = o.fechaPromesaEntrega ? new Date(o.fechaPromesaEntrega).toISOString().slice(0, 10) : todayIso;
    return d <= todayIso;
  });
  const futureOrderSample = orders.find((o: any) => {
    const d = o.fechaPromesaEntrega ? new Date(o.fechaPromesaEntrega).toISOString().slice(0, 10) : todayIso;
    return d > todayIso;
  });
  const unreadyOrderSample = notReadyOrders[0];

  const handleScanValidate = async (codeToValidate?: string) => {
    const cleanCode = (codeToValidate ?? scanInput).trim();
    if (!cleanCode) {
      toast.error('Escanea o escribe el código del pedido, packing list o rollo');
      return;
    }

    setIsScanning(true);
    try {
      const { data } = await api.get('/shipping/validate-scan', {
        params: { code: cleanCode, targetRoute: activeRoute },
      });
      setValidationResult(data);
      setScanInput('');
    } catch {
      // Fallback local resiliente en caso de que el endpoint esté desplegando
      try {
        const { data: searchResp } = await api.get('/orders', {
          params: { search: cleanCode, limit: 10 },
        });
        const match = (searchResp?.data || []).find(
          (o: any) =>
            o.codigo?.toUpperCase() === cleanCode.toUpperCase() ||
            o.folioContpaqi?.toUpperCase() === cleanCode.toUpperCase()
        ) || searchResp?.data?.[0];

        if (!match) {
          setValidationResult({
            found: false,
            allowed: false,
            scannedCode: cleanCode,
            title: '⛔ CÓDIGO NO RECONOCIDO',
            subtitle: `No se encontró ningún pedido o rollo con el código "${cleanCode}". NO SUBIR A LA CAMIONETA.`,
          });
        } else {
          const detailRes = await api.get(`/orders/${match.id}`);
          setValidationResult(buildLocalValidation(detailRes.data, cleanCode, activeRoute));
        }
        setScanInput('');
      } catch {
        toast.error('Error al validar código de embarque');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleProceedFromLock = async (orderObj: any) => {
    try {
      const { data } = await api.get(`/orders/${orderObj.id}`);
      setSelectedOrder(data);
      if (data.fletera) setTransportista(data.fletera);
      if (data.guiaEnvio) setGuia(data.guiaEnvio);
      setValidationResult(null);
    } catch {
      setSelectedOrder(orderObj);
      setValidationResult(null);
    }
  };

  const handleRescheduleForToday = async (orderId: string, code: string) => {
    try {
      const todayDate = new Date().toISOString().slice(0, 10);
      await api.put(`/shipping/orders/${orderId}/schedule`, {
        fechaPromesaEntrega: todayDate,
      });
      toast.success('Fecha reprogramada para HOY por autorización');
      refetch();
      handleScanValidate(code);
    } catch {
      toast.error('No se pudo reprogramar la fecha');
    }
  };

  const dispatch = async () => {
    if (!selectedOrder || !transportista) return toast.error('Ingresa transportista');
    try {
      await api.put(`/orders/${selectedOrder.id}/status`, { estado: 'DESPACHADO' });
      toast.success('🚛 Pedido DESPACHADO y cargado a camioneta');
      setSelectedOrder(null);
      setTransportista('');
      setGuia('');
      setConfirmed(false);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error');
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header Handheld */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-950/50">
            <Truck size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight">Candado de Embarque</h1>
            <p className="text-xs text-gray-400">Escanea antes de subir a camioneta · {orders.length} listos</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300"
          title="Actualizar"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* BARRA DE ESCANEO ZEBRA TC22 — CANDADO DE EMBARQUE */}
      {!selectedOrder && (
        <div className="bg-gray-900 border-2 border-orange-500/70 rounded-2xl p-3.5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
              <ScanBarcode size={16} />
              Escáner de Carga a Camioneta
            </span>
            <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full font-bold border border-orange-500/30">
              Candado Activo 🔒
            </span>
          </div>

          {/* Selector de Ruta / Camioneta activa */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
              Camioneta / Ruta que estás cargando:
            </label>
            <select
              value={activeRoute}
              onChange={(e) => setActiveRoute(e.target.value)}
              className="w-full py-2 px-3 bg-gray-800 border border-gray-700 rounded-xl text-xs font-bold text-white"
            >
              {ROUTE_OPTIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Input de lector láser / código de barras */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleScanValidate();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <ScanBarcode size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400" />
              <input
                ref={scanInputRef}
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Escanea Pedido (PED-...), Packing o Rollo..."
                className="w-full pl-10 pr-3 py-3 bg-gray-950 border border-gray-700 focus:border-orange-500 rounded-xl text-sm font-mono text-white placeholder-gray-500 focus:outline-none"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isScanning}
              className="px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs rounded-xl shrink-0 active:scale-95 transition-all"
            >
              {isScanning ? '...' : 'Validar'}
            </button>
          </form>

          {/* Botones rápidos para simular lectura con Handheld en la Demo */}
          <div className="pt-1 border-t border-gray-800">
            <p className="text-[10px] text-gray-400 font-semibold mb-1.5">
              ⚡ Pruebas rápidas de escaneo Handheld:
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {todayOrderSample && (
                <button
                  type="button"
                  onClick={() => handleScanValidate(todayOrderSample.codigo)}
                  className="p-2 bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-700/60 rounded-xl text-left transition-all"
                >
                  <div className="text-[10px] font-black text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Envío de HOY (SÍ)
                  </div>
                  <div className="text-[11px] font-mono font-bold text-white truncate">
                    {todayOrderSample.codigo}
                  </div>
                </button>
              )}
              {futureOrderSample && (
                <button
                  type="button"
                  onClick={() => handleScanValidate(futureOrderSample.codigo)}
                  className="p-2 bg-rose-950/60 hover:bg-rose-900/70 border border-rose-700/60 rounded-xl text-left transition-all"
                >
                  <div className="text-[10px] font-black text-rose-400 flex items-center gap-1">
                    <XCircle size={12} /> Otra Fecha (NO)
                  </div>
                  <div className="text-[11px] font-mono font-bold text-white truncate">
                    {futureOrderSample.codigo}
                  </div>
                </button>
              )}
              {unreadyOrderSample && (
                <button
                  type="button"
                  onClick={() => handleScanValidate(unreadyOrderSample.codigo)}
                  className="col-span-2 p-2 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-700/50 rounded-xl flex items-center justify-between transition-all"
                >
                  <span className="text-[10px] font-black text-amber-300 flex items-center gap-1">
                    <ShieldAlert size={12} /> Probar Pedido Aún en Corte (NO LISTO)
                  </span>
                  <span className="text-[11px] font-mono font-bold text-white">
                    {unreadyOrderSample.codigo}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lista de pedidos o formulario de despacho */}
      {!selectedOrder ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Cola de Embarque ({orders.length})
            </span>
            <span className="text-[10px] text-gray-500">Toca un pedido para pasar candado</span>
          </div>

          {!orders.length ? (
            <div className="text-center py-12 bg-gray-900/50 rounded-2xl border border-gray-800">
              <Truck size={42} className="mx-auto mb-2 text-gray-700" />
              <p className="text-gray-400 text-sm font-semibold">No hay pedidos facturados pendientes</p>
            </div>
          ) : (
            orders.map((o: any) => {
              const schedIso = o.fechaPromesaEntrega
                ? new Date(o.fechaPromesaEntrega).toISOString().slice(0, 10)
                : todayIso;
              const isToday = schedIso <= todayIso;
              const routeCode = inferOrderRoute(o);

              return (
                <button
                  key={o.id}
                  onClick={() => handleScanValidate(o.codigo)}
                  className={`w-full text-left bg-gray-900 rounded-2xl p-3.5 active:scale-[0.98] transition-all border ${
                    isToday ? 'border-gray-800 hover:border-emerald-700' : 'border-rose-900/70 bg-rose-950/15'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-orange-400">{o.codigo}</span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                          isToday
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60'
                            : 'bg-rose-950 text-rose-300 border border-rose-700/60'
                        }`}
                      >
                        {isToday
                          ? '🟢 ENVÍO HOY'
                          : `⛔ PROGRAMADO: ${new Date(o.fechaPromesaEntrega).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                            })}`}
                      </span>
                    </div>
                    <ArrowRight size={16} className="text-gray-500" />
                  </div>

                  <p className="text-sm font-bold text-gray-200 mt-1.5 truncate">{o.client?.nombre}</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <MapPin size={11} className="text-gray-500" />
                      {o.client?.poblacion || 'ZMG'} · {ROUTE_LABELS[routeCode]?.split(' ')[1] || routeCode}
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      ${Number(o.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-2xl p-4 border-2 border-emerald-600/60">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-lg text-orange-400">{selectedOrder.codigo}</span>
                  <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700 rounded-md text-[10px] font-black">
                    ✅ CANDADO VALIDADO HOY
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-200 mt-0.5">{selectedOrder.client?.nombre}</p>
                <p className="text-xs text-gray-400">{selectedOrder.client?.poblacion || 'Guadalajara'}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 bg-gray-800 rounded-xl">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-gray-800 rounded-xl p-3 mb-4">
              <div className="text-center">
                <p className="text-[10px] text-gray-400">Líneas</p>
                <p className="font-bold">{selectedOrder.lineas?.length || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400">Metros</p>
                <p className="font-bold text-blue-400">
                  {selectedOrder.lineas?.reduce((a: number, l: any) => a + (l.metrajeSurtido || l.metrajeRequerido || 0), 0)}m
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400">Total</p>
                <p className="font-bold text-emerald-400">
                  ${Number(selectedOrder.total || 0).toLocaleString('es-MX')}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Transportista / Unidad *</label>
                <input
                  value={transportista}
                  onChange={(e) => setTransportista(e.target.value)}
                  className="w-full py-3 px-4 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm"
                  placeholder="Camioneta Propia, Paquetexpress, Travisa..."
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Guía / Tracking</label>
                <input
                  value={guia}
                  onChange={(e) => setGuia(e.target.value)}
                  className="w-full py-3 px-4 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm"
                  placeholder="Número de guía o ruta..."
                />
              </div>

              <label className="flex items-center gap-3 p-3 bg-emerald-900/20 border border-emerald-700/50 rounded-xl">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm text-emerald-300 font-semibold">
                  Mercancía verificada y subida a la camioneta correcta
                </span>
              </label>
            </div>
          </div>

          <button
            onClick={dispatch}
            disabled={!confirmed || !transportista}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl text-lg font-black disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-lg"
          >
            <Truck size={22} /> Confirmar Salida de Camioneta
          </button>
        </div>
      )}

      {/* POP-UP MODAL DEL CANDADO DE EMBARQUE (SÍ / NO) EN HANDHELD */}
      {validationResult && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div
            className={`w-full max-w-md rounded-3xl overflow-hidden border-2 shadow-2xl ${
              validationResult.allowed
                ? 'bg-gray-900 border-emerald-500 shadow-emerald-950/60'
                : 'bg-gray-900 border-rose-500 shadow-rose-950/70'
            }`}
          >
            {/* Cabecera Gigante SÍ / NO */}
            <div
              className={`p-5 text-center ${
                validationResult.allowed
                  ? 'bg-gradient-to-b from-emerald-600 to-emerald-800'
                  : 'bg-gradient-to-b from-rose-600 to-rose-900'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-2">
                {validationResult.allowed ? (
                  <ShieldCheck size={40} className="text-white" />
                ) : (
                  <ShieldAlert size={40} className="text-white" />
                )}
              </div>
              <div className="text-2xl font-black text-white tracking-tight">
                {validationResult.allowed ? '✅ SÍ SUBIR A CAMIONETA' : '⛔ ¡NO SUBIR A CAMIONETA!'}
              </div>
              <p className="text-xs text-white/90 font-semibold mt-1 leading-relaxed">
                {validationResult.subtitle}
              </p>
            </div>

            {/* Detalle del Pedido y Checklist del Candado */}
            <div className="p-4 space-y-3">
              {validationResult.order && (
                <>
                  <div className="bg-gray-950 border border-gray-800 rounded-2xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-base text-orange-400">
                        {validationResult.order.codigo}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                        Estado: {validationResult.order.estado}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white">{validationResult.order.client?.nombre}</p>
                    <div className="text-xs text-gray-400 flex items-center gap-1.5">
                      <MapPin size={13} className="text-orange-400 shrink-0" />
                      <span>
                        {validationResult.order.client?.direccion || 'Domicilio Cliente'} (
                        {validationResult.order.client?.poblacion || 'ZMG'})
                      </span>
                    </div>
                    <div className="text-xs text-gray-300 flex items-center justify-between pt-1 border-t border-gray-800">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-blue-400" />
                        Fecha Envío: <strong>{validationResult.order.scheduledDateFormatted}</strong>
                      </span>
                      <span className="flex items-center gap-1 font-bold text-emerald-400">
                        <Package size={13} />
                        {validationResult.order.totalMeters || 0} m
                      </span>
                    </div>
                  </div>

                  {/* Los 3 Candados Verificados */}
                  <div className="space-y-1.5">
                    <div
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold ${
                        validationResult.checks?.statusReady
                          ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                          : 'bg-rose-950/60 border-rose-700 text-rose-300'
                      }`}
                    >
                      <span>1. ¿Listo y Facturado para Embarque?</span>
                      <span>
                        {validationResult.checks?.statusReady
                          ? '✓ SÍ (FACTURADO)'
                          : `✗ NO (${validationResult.order.estado})`}
                      </span>
                    </div>

                    <div
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold ${
                        validationResult.checks?.dateMatchesToday
                          ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                          : 'bg-rose-950/60 border-rose-700 text-rose-300'
                      }`}
                    >
                      <span>2. ¿Es un envío programado para HOY?</span>
                      <span>
                        {validationResult.checks?.dateMatchesToday
                          ? '✓ SÍ (HOY)'
                          : `✗ NO (${validationResult.order.scheduledDateFormatted})`}
                      </span>
                    </div>

                    <div
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold ${
                        validationResult.checks?.routeMatches
                          ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                          : 'bg-rose-950/60 border-rose-700 text-rose-300'
                      }`}
                    >
                      <span>3. ¿Corresponde a la Ruta / Destino?</span>
                      <span className="truncate max-w-[150px]">
                        {validationResult.checks?.routeMatches
                          ? `✓ SÍ (${validationResult.order.routeLabel?.split(' ')[1] || 'OK'})`
                          : '✗ RUTA DISTINTA'}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Botones de Acción del Modal */}
              <div className="pt-2 space-y-2">
                {validationResult.allowed ? (
                  <button
                    type="button"
                    onClick={() => handleProceedFromLock(validationResult.order)}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <CheckCircle2 size={18} />
                    Autorizar Carga a Camioneta Ahora
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setValidationResult(null)}
                      className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <XCircle size={18} />
                      Entendido — NO Subir a la Camioneta
                    </button>
                    {validationResult.checks?.isFutureOrder && validationResult.order?.id && (
                      <button
                        type="button"
                        onClick={() =>
                          handleRescheduleForToday(validationResult.order.id, validationResult.order.codigo)
                        }
                        className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-amber-300 font-bold text-xs rounded-xl border border-amber-700/40"
                      >
                        🔓 Autorización Supervisor: Adelantar Envío para HOY
                      </button>
                    )}
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setValidationResult(null)}
                  className="w-full py-2 text-xs font-bold text-gray-400 hover:text-white"
                >
                  Cerrar ventana
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

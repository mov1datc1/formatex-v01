import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import ScanInput from './ScanInput';
import { WmsIcon, StatusBadge } from '../../components/icons/WmsIcons';
import { ArrowRight, CheckCircle2, AlertTriangle, MapPin, Printer, Tag, Scissors, X, Package } from 'lucide-react';
import PrintDialog from '../../components/labels/PrintDialog';

export default function CortadorView() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [cutMetraje, setCutMetraje] = useState<number>(0);
  const [activeLineId, setActiveLineId] = useState<string>('');
  const [cutting, setCutting] = useState(false);
  const [selectedMesa, setSelectedMesa] = useState<string>(() => {
    return localStorage.getItem('formatex_cortador_mesa') || 'MESA 1';
  });

  const handleSelectMesa = (mesa: string) => {
    setSelectedMesa(mesa);
    localStorage.setItem('formatex_cortador_mesa', mesa);
  };

  // Post-cut printing state
  const [lastCutResult, setLastCutResult] = useState<any>(null);
  const [printBatch, setPrintBatch] = useState<any[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const { data: ordersResp, refetch } = useApi<PaginatedResponse<any>>(['cortador-orders'], '/orders', { estado: 'EN_CORTE', limit: 20 });
  const orders = ordersResp?.data || [];

  const loadOrder = async (orderId: string) => {
    try {
      const d = await api.get(`/orders/${orderId}`);
      setSelectedOrder(d.data);
      setScanResult(null);
      setLastCutResult(null);
    } catch { toast.error('Error al cargar pedido'); }
  };

  // Refresh order data without clearing cut result (used after cutting)
  const refreshOrder = async (orderId: string) => {
    try {
      const d = await api.get(`/orders/${orderId}`);
      setSelectedOrder(d.data);
    } catch { /* silent */ }
  };

  // Guided cut: pre-fill from assignment
  const startGuidedCut = (line: any, assignment: any) => {
    setScanResult({
      id: assignment.hu.id,
      codigo: assignment.hu.codigo,
      metrajeActual: assignment.hu.metrajeActual,
      sku: assignment.hu.sku,
      ubicacion: assignment.hu.ubicacion,
    });
    setCutMetraje(assignment.metrajeTomado);
    setActiveLineId(line.id);
    setLastCutResult(null);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleScan = async (code: string) => {
    if (!selectedOrder) return toast.error('Selecciona un pedido primero');
    try {
      const resp = await api.get(`/inventory/hus`, { params: { search: code, limit: 1 } });
      const hu = resp.data?.data?.[0];
      if (!hu) {
        toast.error(`HU "${code}" no encontrado`);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        return;
      }

      // Check if this HU belongs to any line in this order
      let foundLine: any = null;
      let foundAssignment: any = null;
      for (const line of selectedOrder.lineas || []) {
        const a = line.assignments?.find((a: any) => a.hu?.id === hu.id || a.hu?.codigo === hu.codigo);
        if (a) { foundLine = line; foundAssignment = a; break; }
      }

      if (foundLine && foundAssignment) {
        startGuidedCut(foundLine, foundAssignment);
        toast.success(`${hu.codigo} — Cortar ${foundAssignment.metrajeTomado}m para línea`);
      } else {
        setScanResult(hu);
        setCutMetraje(0);
        setActiveLineId('');
        toast(`${hu.codigo} escaneado — ingresa metraje a cortar`, { icon: '📋' });
      }
      if (navigator.vibrate) navigator.vibrate(100);
    } catch {
      toast.error('Error al buscar HU');
    }
  };

  const executeCut = async () => {
    if (!scanResult || cutMetraje <= 0) return;
    if (cutMetraje > scanResult.metrajeActual) return toast.error(`Solo hay ${scanResult.metrajeActual}m disponibles`);
    setCutting(true);
    try {
      const { data } = await api.post('/cutting', {
        huOrigenId: scanResult.id,
        metrajeCortado: cutMetraje,
        orderLineId: activeLineId || undefined,
        notas: `Corte para pedido ${selectedOrder?.codigo || ''}`,
        mesaCorte: selectedMesa !== 'TODAS' ? selectedMesa : undefined,
      });

      setLastCutResult(data);

      const restante = scanResult.metrajeActual - cutMetraje;
      if (restante > 0.5) {
        toast.success(`✂️ Cortados ${cutMetraje}m — Retazo de ${restante.toFixed(1)}m creado`);
      } else {
        toast.success(`✂️ Cortados ${cutMetraje}m — Rollo agotado`);
      }

      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

      setScanResult(null);
      setCutMetraje(0);
      setActiveLineId('');
      // Refresh order without clearing lastCutResult
      if (selectedOrder) refreshOrder(selectedOrder.id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al cortar');
    }
    setCutting(false);
  };

  const markPacked = async () => {
    if (!selectedOrder) return;
    try {
      await api.put(`/orders/${selectedOrder.id}/status`, { estado: 'EMPACADO' });
      toast.success('📦 Pedido marcado como EMPACADO');
      setSelectedOrder(null);
      setLastCutResult(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error');
    }
  };

  // Build child roll (customer piece) data for print
  const hijoForPrint = lastCutResult ? [{
    codigo: lastCutResult.codigo,
    metrajeActual: lastCutResult.metrajeCortado,
    sku: lastCutResult.huOrigen?.sku || lastCutResult.orderLine?.sku,
    tipoRollo: 'CORTE_CLIENTE',
    anchoMetros: lastCutResult.huOrigen?.sku?.anchoMetros || 1.5,
    pedido: lastCutResult.orderLine?.order?.codigo || selectedOrder?.codigo || 'PEDIDO',
    cliente: lastCutResult.orderLine?.order?.client?.nombre || selectedOrder?.client?.nombre || 'CLIENTE',
    origen: lastCutResult.huOrigen?.codigo,
    mesa: selectedMesa,
    cortador: 'CORTADOR',
  }] : [];

  // Build retazo data for print
  const retazoForPrint = lastCutResult?.huRetazo ? [{
    id: lastCutResult.huRetazo.id,
    codigo: lastCutResult.huRetazo.codigo,
    metrajeActual: lastCutResult.metrajeRestante,
    sku: lastCutResult.huOrigen?.sku,
    ubicacion: lastCutResult.huRetazo.ubicacion?.codigo || lastCutResult.retazoUbicacion || 'ZONA-MERMA',
    tipoRollo: 'RETAZO',
    anchoMetros: lastCutResult.huOrigen?.sku?.anchoMetros || 1.5,
    origen: lastCutResult.huOrigen?.codigo,
  }] : [];

  const handlePrintBoth = () => {
    setPrintBatch([...hijoForPrint, ...retazoForPrint]);
    setShowPrintModal(true);
  };

  const handlePrintHijo = () => {
    setPrintBatch(hijoForPrint);
    setShowPrintModal(true);
  };

  const handlePrintRetazo = () => {
    setPrintBatch(retazoForPrint);
    setShowPrintModal(true);
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

      {/* Selector de Mesa de Corte para el Cortador */}
      <div className="bg-gray-800/80 p-2 rounded-2xl border border-gray-700 space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] uppercase font-bold text-gray-400">Mi Mesa Asignada (Estación):</span>
          <span className="text-[10px] font-bold text-purple-400">{selectedMesa}</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {['TODAS', 'MESA 1', 'MESA 2', 'MESA 3', 'MESA 4', 'MESA 5', 'MESA 6'].map(m => (
            <button
              key={m}
              onClick={() => handleSelectMesa(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedMesa === m
                  ? 'bg-purple-600 text-white shadow-md scale-105'
                  : 'bg-gray-700/60 text-gray-400 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
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
              onClick={() => loadOrder(o.id)}
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
              <button onClick={() => { setSelectedOrder(null); setScanResult(null); setLastCutResult(null); }} className="px-3 py-2 bg-gray-700 rounded-xl text-sm text-gray-300">← Volver</button>
            </div>

            {/* Lines with guided cut buttons */}
            <div className="space-y-2">
              {selectedOrder.lineas?.map((line: any) => {
                const progress = line.metrajeRequerido > 0 ? (line.metrajeSurtido / line.metrajeRequerido) * 100 : 0;
                const complete = progress >= 80;
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
                    {/* Assignments with guided cut */}
                    {line.assignments?.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between text-xs mt-2 pl-2">
                        <div className="flex items-center gap-2">
                          {a.cortado ? (
                            <CheckCircle2 size={14} className="text-emerald-400" />
                          ) : (
                            <Scissors size={14} className="text-purple-400" />
                          )}
                          <span className="font-mono text-gray-300">{a.hu?.codigo}</span>
                          {a.hu?.ubicacion && (
                            <span className="text-gray-500 flex items-center gap-0.5"><MapPin size={9} /> {a.hu.ubicacion.codigo}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">{a.metrajeTomado}m de {a.hu?.metrajeActual}m</span>
                          {!a.cortado && a.requiereCorte && (
                            <button
                              onClick={() => startGuidedCut(line, a)}
                              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-[10px] font-bold active:scale-95 transition-transform flex items-center gap-1"
                            >
                              <Scissors size={10} /> Cortar
                            </button>
                          )}
                          {a.cortado && <span className="text-emerald-400">✓</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scan */}
          <ScanInput onScan={handleScan} placeholder="Escanear rollo a cortar..." />

          {/* Scanned HU + cut input */}
          {scanResult && (
            <div className="bg-purple-900/30 border border-purple-700 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <WmsIcon.Rolls size={18} className="text-purple-400" />
                <span className="font-bold text-purple-300">Rollo a Cortar</span>
                {activeLineId && <span className="text-[10px] bg-purple-800 text-purple-200 px-2 py-0.5 rounded-full">Guiado por pedido</span>}
              </div>
              <div className="bg-gray-800 rounded-xl p-3">
                <p className="font-mono text-lg text-white">{scanResult.codigo}</p>
                <p className="text-sm text-gray-300">{scanResult.sku?.nombre} {scanResult.sku?.color ? `· ${scanResult.sku.color}` : ''}</p>
                <p className="text-sm text-gray-300">Metraje actual: <span className="font-bold text-white">{scanResult.metrajeActual}m</span></p>
                {scanResult.ubicacion && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={10} /> {scanResult.ubicacion.codigo}</p>
                )}
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
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span className="text-purple-400">● Cortado: {cutMetraje}m</span>
                  <span className="text-orange-400">● Retazo: {Math.max(0, scanResult.metrajeActual - cutMetraje).toFixed(1)}m</span>
                </div>
                {/* Visual bar */}
                <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden flex mt-2">
                  <div className="h-full bg-purple-500 transition-all" style={{ width: `${(cutMetraje / scanResult.metrajeActual) * 100}%` }} />
                  <div className="h-full bg-orange-500 transition-all" style={{ width: `${((scanResult.metrajeActual - cutMetraje) / scanResult.metrajeActual) * 100}%` }} />
                </div>
              </div>

              <button
                onClick={executeCut}
                disabled={cutting || cutMetraje <= 0 || cutMetraje > scanResult.metrajeActual}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl text-lg font-bold disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                <Scissors size={22} />
                {cutting ? 'Cortando...' : `Ejecutar Corte — ${cutMetraje}m`}
              </button>
            </div>
          )}

          {/* Post-Cut: Dual Output Card (Hijo para Cliente + Retazo para Almacén) */}
          {lastCutResult && (
            <div className="bg-gradient-to-b from-purple-950/60 via-gray-900 to-gray-900 border-2 border-purple-600/80 rounded-3xl p-5 space-y-4 shadow-2xl animate-fade-in">
              <div className="flex items-center justify-between border-b border-purple-700/50 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Corte Realizado con Éxito</h3>
                    <p className="text-[11px] text-purple-300 font-mono">{lastCutResult.codigo} · {selectedMesa}</p>
                  </div>
                </div>
                <button
                  onClick={() => setLastCutResult(null)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Botón Maestro: 1-Click IMPRIMIR AMBAS ETIQUETAS */}
              <button
                onClick={handlePrintBoth}
                className="w-full py-4 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl text-base font-black active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-xl shadow-purple-600/30 border border-purple-400/30"
              >
                <Printer size={22} className="animate-pulse" />
                <span>⚡ IMPRIMIR AMBAS ETIQUETAS</span>
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Rollo Hijo (Cliente / Pedido) */}
                <div className="bg-purple-950/40 border border-purple-500/40 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-purple-300 flex items-center gap-1">
                      <Package size={12} /> Rollo Hijo (Cliente)
                    </span>
                    <span className="text-xs font-mono font-bold text-purple-400">
                      {lastCutResult.orderLine?.order?.codigo || selectedOrder?.codigo || 'PEDIDO'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-white">{lastCutResult.metrajeCortado}m</span>
                    <span className="text-[11px] text-gray-400 truncate max-w-[150px]">
                      {lastCutResult.orderLine?.order?.client?.nombre || selectedOrder?.client?.nombre}
                    </span>
                  </div>
                  <button
                    onClick={handlePrintHijo}
                    className="w-full py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Tag size={14} /> Imprimir Etiqueta Cliente
                  </button>
                </div>

                {/* 2. Retazo Nuevo (Inventario) */}
                <div className="bg-orange-950/40 border border-orange-500/40 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-orange-300 flex items-center gap-1">
                      <Scissors size={12} /> Retazo (Almacén)
                    </span>
                    <span className="text-xs font-mono font-bold text-orange-400">
                      {lastCutResult.huRetazo?.codigo || 'Agotado'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-orange-300">{lastCutResult.metrajeRestante}m</span>
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <MapPin size={10} /> {lastCutResult.retazoUbicacion || 'ZONA-MERMA'}
                    </span>
                  </div>
                  <button
                    onClick={handlePrintRetazo}
                    disabled={!lastCutResult.huRetazo}
                    className="w-full py-2 bg-orange-700 hover:bg-orange-600 disabled:opacity-30 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Tag size={14} /> Imprimir Etiqueta Retazo
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 text-center italic">
                🏷️ Pega la morada en el rollo cortado para el cliente y la naranja en el retazo que va al carrito.
              </p>
            </div>
          )}

          {/* Mark as packed */}
          <button onClick={markPacked} className="w-full py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-2xl text-lg font-bold active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-lg">
            <WmsIcon.Packed size={22} />
            Marcar como Empacado
          </button>
        </div>
      )}

      {/* Print Dialog */}
      <PrintDialog open={showPrintModal} onClose={() => setShowPrintModal(false)} hus={printBatch} />
    </div>
  );
}

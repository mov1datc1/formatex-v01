import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import ScanInput from './ScanInput';
import { WmsIcon, StatusBadge } from '../../components/icons/WmsIcons';
import { ArrowRight, CheckCircle2, AlertTriangle, MapPin, Printer, Tag, Scissors } from 'lucide-react';
import PrintDialog from '../../components/labels/PrintDialog';

export default function CortadorView() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [cutMetraje, setCutMetraje] = useState<number>(0);
  const [activeLineId, setActiveLineId] = useState<string>('');
  const [cutting, setCutting] = useState(false);

  // Post-cut retazo state
  const [lastCutResult, setLastCutResult] = useState<any>(null);
  const [showPrintRetazo, setShowPrintRetazo] = useState(false);

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

  // Build retazo data for print
  const retazoForPrint = lastCutResult?.huRetazo ? [{
    id: lastCutResult.huRetazo.id,
    codigo: lastCutResult.huRetazo.codigo,
    metrajeActual: lastCutResult.metrajeRestante,
    sku: lastCutResult.huOrigen?.sku,
    ubicacion: lastCutResult.huRetazo.ubicacion,
    tipoRollo: 'RETAZO',
    anchoMetros: lastCutResult.huOrigen?.sku?.anchoMetros || 1.5,
  }] : [];

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

          {/* Post-Cut: Retazo Card with Print */}
          {lastCutResult && lastCutResult.huRetazo && (
            <div className="bg-orange-900/30 border border-orange-700 rounded-2xl p-4 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-orange-400" />
                <span className="font-bold text-orange-300">Retazo Creado — Imprime Etiqueta</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-500">Código</p>
                  <p className="font-mono text-sm font-bold text-orange-400">{lastCutResult.huRetazo.codigo}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-500">Metraje</p>
                  <p className="text-xl font-black text-orange-300">{lastCutResult.metrajeRestante}m</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-500">Ubicación</p>
                  <p className="font-mono text-xs font-bold text-blue-400 flex items-center justify-center gap-1">
                    <MapPin size={10} /> {lastCutResult.retazoUbicacion || 'Pendiente'}
                  </p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-500">Origen</p>
                  <p className="font-mono text-xs text-gray-400">{lastCutResult.huOrigen?.codigo}</p>
                </div>
              </div>

              <button
                onClick={() => setShowPrintRetazo(true)}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-2xl text-lg font-bold active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-lg"
              >
                <Printer size={22} /> Imprimir Etiqueta del Retazo
              </button>

              <p className="text-[10px] text-gray-500 text-center">
                Pega la etiqueta en el retazo y colócalo en el carrito → Ubicación: {lastCutResult.retazoUbicacion || 'asignar manualmente'}
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

      {/* Print Dialog for Retazo */}
      <PrintDialog open={showPrintRetazo} onClose={() => setShowPrintRetazo(false)} hus={retazoForPrint} />
    </div>
  );
}

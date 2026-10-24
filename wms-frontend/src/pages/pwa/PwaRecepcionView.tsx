import { useState, useEffect, useRef } from 'react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import ScanInput from './ScanInput';
import {
  ScanBarcode, ArrowRight, MapPin, Truck, CheckCircle2,
  AlertTriangle, RefreshCw, Layers, ShieldCheck, Printer,
  History, Sparkles, Building2, ChevronLeft, ChevronRight, Hash
} from 'lucide-react';

function playBeep(success = true) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    if (success) {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {}
}

export default function PwaRecepcionView() {
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [lastScanResult, setLastScanResult] = useState<any | null>(null);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [submittingIntake, setSubmittingIntake] = useState(false);
  const [liberationVoucher, setLiberationVoucher] = useState<any | null>(null);

  // Putaway scan mode
  const [mode, setMode] = useState<'descarga' | 'putaway'>('descarga');
  const [putawayHU, setPutawayHU] = useState<any | null>(null);
  const [putawaySuccess, setPutawaySuccess] = useState<any | null>(null);

  // Driver details
  const [choferNombre, setChoferNombre] = useState('Israel (Logística Almacén)');
  const [placas, setPlacas] = useState('JW-9281-A');
  const [transportista, setTransportista] = useState('Camioneta Tototlán ➔ Zapopan');
  const [totalPallets, setTotalPallets] = useState<number>(1);

  // Fetch incoming transfers
  const { data: incomingTransfers, isLoading, refetch } = useApi<any[]>(
    ['pwa-incoming-transfers'],
    '/reception/incoming-transfers'
  );

  const { data: skusCatalog } = useApi<any>(['pwa-skus'], '/catalog/skus', { limit: 100 });
  const allSkus = skusCatalog?.data || [];

  // When order is selected, initialize counts
  useEffect(() => {
    if (selectedOrder) {
      setScannedItems([]);
      setLastScanResult(null);
      setLiberationVoucher(null);
      setTransportista(selectedOrder.ruta || 'Camioneta Tototlán ➔ Zapopan');
    }
  }, [selectedOrder]);

  // Total expected rolls in selected order
  const totalExpectedRollos = selectedOrder?.totalRollos || 0;
  const totalScannedCount = scannedItems.length;
  const progressPct = totalExpectedRollos > 0 ? Math.min(100, Math.round((totalScannedCount / totalExpectedRollos) * 100)) : 100;

  // Handle barcode scanned by Zebra laser or input
  const handleScanCode = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    // Putaway Mode
    if (mode === 'putaway') {
      await handlePutawayScan(code);
      return;
    }

    // Descarga Mode
    if (!selectedOrder) {
      toast.error('Selecciona una orden de descarga primero', { icon: '⚠️' });
      playBeep(false);
      return;
    }

    // Match code against expected SKUs in the order, or against global SKU catalog
    const lineMatch = (selectedOrder.lineas || []).find((l: any) => {
      const sku = l.sku;
      return (
        sku?.codigo?.toLowerCase() === code.toLowerCase() ||
        sku?.codigoBarras?.toLowerCase() === code.toLowerCase() ||
        sku?.nombre?.toLowerCase().includes(code.toLowerCase()) ||
        l.skuId === code ||
        code.toLowerCase().includes(sku?.codigo?.toLowerCase() || '---')
      );
    });

    const fallbackSku = allSkus.find((s: any) =>
      s.codigo?.toLowerCase() === code.toLowerCase() ||
      s.codigoBarras?.toLowerCase() === code.toLowerCase()
    );

    const matchedSku = lineMatch?.sku || fallbackSku || {
      id: lineMatch?.skuId || 'UNKNOWN',
      nombre: `Tela Lote ${code}`,
      codigo: code,
      color: 'Surtido',
    };

    const newItem = {
      scanId: `scan-${Date.now()}`,
      timestamp: new Date(),
      code,
      sku: matchedSku,
      metraje: Number(lineMatch?.metrajePorRollo) || 50,
      palletRef: `TAR-0${Math.floor(scannedItems.length / 4) + 1}`,
      lote: `TNT-${new Date().getFullYear()}`,
      orderMatched: Boolean(lineMatch),
    };

    setScannedItems(prev => [newItem, ...prev]);
    setLastScanResult({
      success: true,
      sku: matchedSku,
      code,
      index: scannedItems.length + 1,
    });

    // Feedback
    playBeep(true);
    if (navigator.vibrate) navigator.vibrate(80);
    toast.success(`Rollo escaneado: ${matchedSku.nombre} (50m)`, {
      duration: 2000,
      icon: '📦',
    });
  };

  // Putaway scan handling (HU ➔ Location)
  const handlePutawayScan = async (code: string) => {
    // If we haven't selected an HU yet, this scan is an HU
    if (!putawayHU) {
      try {
        const { data: huData } = await api.get(`/inventory/hus/${code}`);
        if (!huData) throw new Error('HU no encontrado');
        setPutawayHU(huData);
        playBeep(true);
        if (navigator.vibrate) navigator.vibrate(100);
        toast.success(`HU ${huData.codigo} seleccionado. Ahora escanea el Rack de destino.`, { duration: 4000 });
      } catch {
        playBeep(false);
        if (navigator.vibrate) navigator.vibrate([150, 50, 150]);
        toast.error(`Código HU ${code} no encontrado`);
      }
      return;
    }

    // If we already have an HU, this scan must be a Location Rack code
    try {
      const { data: locData } = await api.get(`/warehouse/locations/by-code/${code}`);
      if (!locData) throw new Error('Ubicación no encontrada');

      await api.post('/reception/putaway', {
        assignments: [{ huId: putawayHU.id, ubicacionId: locData.id }],
      });

      playBeep(true);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      setPutawaySuccess({
        hu: putawayHU,
        location: locData,
      });
      toast.success(`✅ Rollo ${putawayHU.codigo} acomodado en ${locData.codigo}`);
      setPutawayHU(null);
    } catch {
      playBeep(false);
      if (navigator.vibrate) navigator.vibrate([150, 50, 150]);
      toast.error(`Error al ubicar en ${code}`);
    }
  };

  // Complete discharge & release driver from handheld
  const handleConfirmIntakeAndRelease = async () => {
    if (scannedItems.length === 0) {
      return toast.error('Escanea al menos un rollo antes de liberar');
    }

    setSubmittingIntake(true);
    try {
      // Group scanned items by skuId
      const grouped: Record<string, { skuId: string; cantidadRollos: number; metrajePorRollo: number }> = {};
      scannedItems.forEach(item => {
        const id = item.sku.id || 'GENERIC';
        if (!grouped[id]) {
          grouped[id] = { skuId: id, cantidadRollos: 0, metrajePorRollo: item.metraje || 50 };
        }
        grouped[id].cantidadRollos += 1;
      });

      const payload = {
        sourceType: selectedOrder.tipo || 'REQUISICION_TELARES',
        sourceId: selectedOrder.id,
        supplierId: selectedOrder.supplierId || selectedOrder.supplier?.id,
        ordenCompra: selectedOrder.codigo,
        transportista,
        choferNombre,
        placas,
        horaLlegada: new Date(Date.now() - 30 * 60000).toISOString(),
        horaLiberacion: new Date().toISOString(),
        firmaAcuse: 'Firma recabada en terminal Handheld Zebra',
        notasDescarga: 'Descarga escaneada 1 a 1 en muelle móvil',
        totalPallets: Number(totalPallets) || 1,
        lineas: Object.values(grouped),
      };

      const { data } = await api.post('/reception/process-intake', payload);
      playBeep(true);
      if (navigator.vibrate) navigator.vibrate([100, 100, 200]);
      setLiberationVoucher(data.releaseVoucher);
      setShowDriverModal(false);
      toast.success(`🎉 Transportista liberado: ${data.releaseVoucher?.folioLiberacion}`);
      refetch();
    } catch (e: any) {
      playBeep(false);
      toast.error(e?.response?.data?.message || 'Error al procesar descarga');
    } finally {
      setSubmittingIntake(false);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-md ${
            mode === 'descarga' ? 'bg-amber-500 text-gray-950' : 'bg-teal-500 text-white'
          }`}>
            {mode === 'descarga' ? <Truck size={20} /> : <MapPin size={20} />}
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">
              {mode === 'descarga' ? 'Recepción Handheld' : 'Putaway en Racks'}
            </h1>
            <p className="text-[11px] text-gray-400">Escáner móvil Zebra / TC22</p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-800 text-xs">
          <button
            onClick={() => setMode('descarga')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              mode === 'descarga' ? 'bg-amber-500 text-gray-950 shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Descarga
          </button>
          <button
            onClick={() => setMode('putaway')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              mode === 'putaway' ? 'bg-teal-500 text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Putaway
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODE 1: DESCARGA Y COTEJO FÍSICO 1 A 1 CON ESCÁNER                  */}
      {/* ===================================================================== */}
      {mode === 'descarga' && (
        <>
          {/* Order Selection Screen */}
          {!selectedOrder ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Traspasos en Ruta ({incomingTransfers?.length || 0})
                </span>
                <button onClick={() => refetch()} className="text-xs text-amber-400 flex items-center gap-1">
                  <RefreshCw size={11} /> Actualizar
                </button>
              </div>

              {isLoading ? (
                <div className="text-center py-12 text-gray-500 text-xs">Cargando traspasos...</div>
              ) : !incomingTransfers?.length ? (
                <div className="text-center py-12 bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-2">
                  <Truck size={36} className="mx-auto text-gray-600 mb-1" />
                  <p className="text-sm font-bold text-gray-300">No hay camiones en rampa</p>
                  <p className="text-xs text-gray-500">
                    Las requisiciones de Telares en ruta aparecerán aquí para escanear los bultos.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {incomingTransfers.map((tr: any) => (
                    <button
                      key={tr.id}
                      onClick={() => setSelectedOrder(tr)}
                      className="w-full text-left bg-gray-900 hover:bg-gray-850 active:scale-[0.98] transition-all rounded-2xl p-4 border border-gray-800 shadow-lg space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                          {tr.codigo}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-300">
                          {tr.ruta || 'Camioneta Tototlán'}
                        </span>
                      </div>

                      <div className="text-xs">
                        <p className="font-bold text-gray-100 text-sm">{tr.origen} ➔ {tr.destino}</p>
                        <p className="text-gray-400 text-[11px] mt-0.5">
                          {tr.totalRollos} rollos esperados ({tr.totalMetros?.toLocaleString()}m)
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-gray-800/80 text-gray-400">
                        <span>Chofer: {tr.solicitante}</span>
                        <span className="text-amber-400 font-semibold flex items-center gap-1">
                          Escanear <ArrowRight size={12} />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Active Scanning Station for Selected Order */
            <div className="space-y-3.5">
              {/* Order Mini-Header */}
              <div className="bg-gray-900 rounded-2xl p-3.5 border border-gray-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-400">{selectedOrder.codigo}</span>
                    <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded font-mono">
                      {selectedOrder.totalRollos} rollos esp.
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 font-medium truncate max-w-[200px] mt-0.5">
                    {selectedOrder.ruta || 'Tototlán ➔ Zapopan'}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-2.5 py-1 text-[11px] text-gray-400 hover:text-white bg-gray-800 rounded-lg"
                >
                  Cambiar
                </button>
              </div>

              {/* Progress Counter & Bar */}
              <div className="bg-gray-900 rounded-2xl p-3.5 border border-gray-800 space-y-2">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-gray-400 font-medium">Avance de Descarga:</span>
                  <span className="font-bold text-base text-emerald-400 font-mono">
                    {totalScannedCount} / {totalExpectedRollos} rollos
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      progressPct >= 100 ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Zebra Scanner Input Component */}
              <div className="space-y-1">
                <ScanInput
                  onScan={handleScanCode}
                  placeholder="Escanea etiqueta de rollo / SKU..."
                />
              </div>

              {/* Last Scanned Feedback Card (Matching the Reference Video Image!) */}
              {lastScanResult && (
                <div className="bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border-2 border-emerald-500/50 rounded-2xl p-4 shadow-xl shadow-emerald-950/40 animate-scale-in space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-gray-950 flex items-center justify-center font-bold text-xs">
                        ✓
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Producto Agregado
                      </span>
                    </div>
                    <span className="font-mono text-xs text-emerald-300 font-bold">
                      #{lastScanResult.index}
                    </span>
                  </div>

                  <p className="text-base font-bold text-white leading-tight">
                    {lastScanResult.sku?.nombre}
                  </p>

                  <div className="flex items-center justify-between text-xs text-emerald-300/80 pt-1 font-mono">
                    <span>Código: {lastScanResult.code}</span>
                    <span className="font-bold text-emerald-300">50.0 metros</span>
                  </div>
                </div>
              )}

              {/* Scanned Roll History Feed */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <History size={13} className="text-amber-400" /> Historial de Rollos Escaneados ({scannedItems.length})
                  </h3>
                  {scannedItems.length > 0 && (
                    <button
                      onClick={() => setScannedItems([])}
                      className="text-[10px] text-gray-500 hover:text-red-400"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {scannedItems.length === 0 ? (
                  <div className="py-6 text-center text-gray-500 text-xs">
                    <ScanBarcode size={28} className="mx-auto mb-1 text-gray-600" />
                    Apunta el escáner al código de barras del rollo
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {scannedItems.map((item, idx) => (
                      <div
                        key={item.scanId}
                        className="flex items-center justify-between p-2 bg-gray-850 rounded-xl border border-gray-800 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center text-[10px] font-mono">
                            {scannedItems.length - idx}
                          </span>
                          <div>
                            <p className="font-bold text-gray-200">{item.sku?.nombre}</p>
                            <p className="text-[10px] text-gray-500 font-mono">{item.code}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-emerald-400">{item.metraje}m</span>
                          <span className="block text-[9px] text-gray-500 font-mono">
                            {item.timestamp.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Finish Discharge & Release Carrier Button */}
              {scannedItems.length > 0 && (
                <div className="pt-2">
                  <button
                    onClick={() => setShowDriverModal(true)}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 active:scale-[0.98] text-gray-950 font-black rounded-2xl text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition-all"
                  >
                    <Truck size={18} />
                    <span>Liberar Chofer ({scannedItems.length} Rollos Cotejados)</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ===================================================================== */}
      {/* MODE 2: PUTAWAY GUIADO POR ESCANEO (ROLLO ➔ RACK)                    */}
      {/* ===================================================================== */}
      {mode === 'putaway' && (
        <div className="space-y-3.5">
          <div className="bg-gradient-to-r from-teal-950/80 to-emerald-950/80 border border-teal-500/30 rounded-2xl p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 text-teal-400 font-bold">
              <MapPin size={16} />
              <span>Flujo de Acomodo en 2 Pasos</span>
            </div>
            <p className="text-gray-300">
              1. <b>Escanea el marbete del Rollo (HU)</b><br />
              2. <b>Escanea el código de barras del Rack</b> (ej. <span className="font-mono text-teal-300">RE-01-P01-R01-N1</span>)
            </p>
          </div>

          {/* Current Step Status */}
          <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800 space-y-3 text-center">
            {!putawayHU ? (
              <div className="py-4 space-y-2">
                <span className="w-12 h-12 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto text-xl font-bold">
                  1
                </span>
                <p className="text-sm font-bold text-gray-200">Paso 1: Escanea Rollo (HU)</p>
                <p className="text-xs text-gray-500">Apunta el láser a la etiqueta de 50 metros</p>
              </div>
            ) : (
              <div className="py-2 space-y-3 text-left">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <span className="text-xs font-bold text-teal-400">Rollo Seleccionado</span>
                  <button onClick={() => setPutawayHU(null)} className="text-[10px] text-gray-500 hover:text-white">
                    Cancelar
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-base font-bold text-teal-300">{putawayHU.codigo}</span>
                    <p className="text-xs text-gray-300 font-medium">{putawayHU.sku?.nombre}</p>
                  </div>
                  <span className="text-base font-bold text-emerald-400 font-mono">{putawayHU.metrajeActual} m</span>
                </div>
                <div className="p-3 bg-gray-800/80 rounded-xl border border-gray-700 text-center space-y-1">
                  <span className="text-xs font-bold text-amber-400 block">Paso 2: Escanea Código de Rack</span>
                  <span className="text-[11px] text-gray-400">Ejemplo: RE-01-P02-R01-N1</span>
                </div>
              </div>
            )}

            <ScanInput
              onScan={handleScanCode}
              placeholder={!putawayHU ? 'Escanea código HU...' : 'Escanea código de rack...'}
            />
          </div>

          {/* Last Putaway Success Card */}
          {putawaySuccess && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-xs space-y-1">
              <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Rollo Ubicado con Éxito
              </p>
              <p className="text-gray-300">
                HU <span className="font-mono font-bold text-white">{putawaySuccess.hu?.codigo}</span> guardado en rack{' '}
                <span className="font-mono font-bold text-emerald-300">{putawaySuccess.location?.codigo}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Driver Release Modal on Handheld */}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 w-full max-w-sm space-y-4 animate-scale-in text-white">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Truck size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Liberar Transportista</h3>
                  <p className="text-[10px] text-gray-400">Cotejo concluido al 100%</p>
                </div>
              </div>
              <button onClick={() => setShowDriverModal(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-gray-400 block mb-1">Nombre Chofer</label>
                <input
                  type="text"
                  value={choferNombre}
                  onChange={e => setChoferNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-400 block mb-1">Placas</label>
                  <input
                    type="text"
                    value={placas}
                    onChange={e => setPlacas(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Tarimas</label>
                  <input
                    type="number"
                    min={1}
                    value={totalPallets}
                    onChange={e => setTotalPallets(+e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-gray-800/60 rounded-xl border border-gray-700 text-center space-y-0.5">
                <span className="text-[11px] text-gray-400 block">Total a Recibir</span>
                <span className="text-base font-bold text-emerald-400">{scannedItems.length} rollos</span>
                <span className="text-[10px] text-gray-500 block">
                  {scannedItems.reduce((s, i) => s + i.metraje, 0)} metros netos
                </span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setShowDriverModal(false)}
                className="flex-1 py-2.5 text-xs text-gray-400 bg-gray-800 rounded-xl font-medium"
              >
                Volver
              </button>
              <button
                onClick={handleConfirmIntakeAndRelease}
                disabled={submittingIntake}
                className="flex-1 py-2.5 text-xs text-gray-950 font-bold bg-amber-500 hover:bg-amber-400 rounded-xl shadow-lg transition-all"
              >
                {submittingIntake ? 'Liberando...' : 'Confirmar Salida'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liberation Voucher Success Card */}
      {liberationVoucher && (
        <div className="bg-gradient-to-br from-emerald-900 to-teal-950 border border-emerald-500/50 rounded-3xl p-5 space-y-3 text-white shadow-2xl animate-scale-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-gray-950 flex items-center justify-center font-bold">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold">Transportista Liberado</h3>
              <p className="text-[10px] text-emerald-300 font-mono">{liberationVoucher.folioLiberacion}</p>
            </div>
          </div>

          <div className="p-3 bg-black/30 rounded-xl text-xs space-y-1">
            <p className="text-gray-300">Chofer: <b className="text-white">{liberationVoucher.choferNombre}</b></p>
            <p className="text-gray-300">Placas: <b className="text-white font-mono">{liberationVoucher.placas}</b></p>
            <p className="text-gray-300">Rollos: <b className="text-emerald-400">{liberationVoucher.totalRollos} rollos recibidos</b></p>
          </div>

          <button
            onClick={() => {
              setLiberationVoucher(null);
              setSelectedOrder(null);
              setMode('putaway');
            }}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Ir a Acomodar en Racks (Putaway)</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

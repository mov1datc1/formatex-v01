import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import ScanInput from './ScanInput';
import PaseSalidaModal from '../reception/PaseSalidaModal';
import PrintDialog from '../../components/labels/PrintDialog';
import {
  ScanBarcode, ArrowRight, MapPin, Truck, CheckCircle2,
  AlertTriangle, RefreshCw, Layers, ShieldCheck, Printer,
  History, Sparkles, Building2, ChevronDown, ChevronUp, Tag,
  FileText, Check, AlertCircle, Sparkle
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
  // Workflow Mode
  const [mode, setMode] = useState<'descarga' | 'etiquetado' | 'putaway'>('descarga');

  // Descarga & Cotejo State
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showPackingList, setShowPackingList] = useState(false);
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [lastScanResult, setLastScanResult] = useState<any | null>(null);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [submittingIntake, setSubmittingIntake] = useState(false);
  const [liberationVoucher, setLiberationVoucher] = useState<any | null>(null);
  const [createdReceipt, setCreatedReceipt] = useState<any | null>(null);
  const [showPaseSalidaModal, setShowPaseSalidaModal] = useState(false);

  // Driver details
  const [choferNombre, setChoferNombre] = useState('Israel (Logística Almacén)');
  const [placas, setPlacas] = useState('JW-9281-A');
  const [transportista, setTransportista] = useState('Camioneta Tototlán ➔ Zapopan');
  const [totalPallets, setTotalPallets] = useState<number>(1);
  const [notasDescarga, setNotasDescarga] = useState('');

  // Etiquetado State
  const [selectedHuForPrint, setSelectedHuForPrint] = useState<any[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Putaway State
  const [putawayHU, setPutawayHU] = useState<any | null>(null);
  const [suggestedLocations, setSuggestedLocations] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [putawaySuccess, setPutawaySuccess] = useState<any | null>(null);
  const [submittingPutaway, setSubmittingPutaway] = useState(false);

  // Fetch incoming transfers
  const { data: incomingTransfers, isLoading, refetch: refetchTransfers } = useApi<any[]>(
    ['pwa-incoming-transfers'],
    '/reception/incoming-transfers'
  );

  // Fetch HUs in Staging for Etiquetado
  const { data: stagingHUsData, refetch: refetchStaging } = useApi<any>(
    ['pwa-staging-hus'],
    '/inventory/hus',
    { limit: 50, estadoHu: 'RECIBIDO' }
  );
  const stagingHUs = stagingHUsData?.data || [];

  const { data: skusCatalog } = useApi<any>(['pwa-skus'], '/catalog/skus', { limit: 100 });
  const allSkus = skusCatalog?.data || [];

  // When order is selected, initialize counts
  useEffect(() => {
    if (selectedOrder) {
      setScannedItems([]);
      setLastScanResult(null);
      setLiberationVoucher(null);
      setCreatedReceipt(null);
      setTransportista(selectedOrder.ruta || 'Camioneta Tototlán ➔ Zapopan');
      setTotalPallets(Math.max(1, Math.ceil((selectedOrder.totalRollos || 1) / 4)));
    }
  }, [selectedOrder]);

  // Total expected rolls in selected order
  const totalExpectedRollos = selectedOrder?.totalRollos || 0;
  const totalExpectedMetros = selectedOrder?.totalMetros || (totalExpectedRollos * 50);
  const totalScannedCount = scannedItems.length;
  const totalScannedMetros = scannedItems.reduce((acc, it) => acc + (it.metraje || 50), 0);
  const progressPct = totalExpectedRollos > 0 ? Math.min(100, Math.round((totalScannedCount / totalExpectedRollos) * 100)) : 100;

  // Discrepancy calculations
  const rollosDiff = totalScannedCount - totalExpectedRollos;
  const metrosDiff = totalScannedMetros - totalExpectedMetros;

  // Barcode Scan router
  const handleScanCode = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    if (mode === 'putaway') {
      await handlePutawayScan(code);
      return;
    }

    if (mode === 'etiquetado') {
      await handleEtiquetadoScan(code);
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

    playBeep(true);
    if (navigator.vibrate) navigator.vibrate(80);
    toast.success(`Rollo escaneado: ${matchedSku.nombre} (50m)`, {
      duration: 2000,
      icon: '📦',
    });
  };

  // Etiquetado scan handling
  const handleEtiquetadoScan = async (code: string) => {
    const huMatch = stagingHUs.find((h: any) =>
      h.codigo?.toLowerCase() === code.toLowerCase() ||
      h.sku?.codigo?.toLowerCase() === code.toLowerCase() ||
      h.sku?.codigoBarras?.toLowerCase() === code.toLowerCase()
    );

    if (huMatch) {
      setSelectedHuForPrint([huMatch]);
      setShowPrintModal(true);
      playBeep(true);
      if (navigator.vibrate) navigator.vibrate(100);
      toast.success(`Rollo ${huMatch.codigo} listo para imprimir marbete`);
    } else {
      playBeep(false);
      toast.error(`Código ${code} no encontrado en mesa de recibo`);
    }
  };

  // Putaway scan handling (HU ➔ Location)
  const handlePutawayScan = async (code: string) => {
    // Step 1: Scan HU
    if (!putawayHU) {
      try {
        const { data: huData } = await api.get(`/inventory/hus/${code}`);
        if (!huData) throw new Error('HU no encontrado');
        setPutawayHU(huData);
        playBeep(true);
        if (navigator.vibrate) navigator.vibrate(100);

        // Fetch suggested locations based on zoning rules
        setLoadingSuggestions(true);
        try {
          const { data: suggestions } = await api.get('/reception/suggest-locations', {
            params: {
              skuId: huData.skuId,
              tipoRollo: huData.tipoRollo || 'ENTERO',
              metraje: huData.metrajeActual || 50,
              cantidadRollos: 1,
            },
          });
          setSuggestedLocations(suggestions || []);
        } catch {
          setSuggestedLocations([]);
        } finally {
          setLoadingSuggestions(false);
        }

        toast.success(`HU ${huData.codigo} seleccionado. Revisa las ubicaciones sugeridas o escanea el rack.`);
      } catch {
        playBeep(false);
        if (navigator.vibrate) navigator.vibrate([150, 50, 150]);
        toast.error(`Código HU ${code} no encontrado`);
      }
      return;
    }

    // Step 2: Scan Rack Location Code
    await executePutawayAssignment(code);
  };

  // Execute Putaway Assignment
  const executePutawayAssignment = async (locCodeOrId: string, directLocId?: string) => {
    if (!putawayHU) return;
    setSubmittingPutaway(true);
    try {
      let locationId = directLocId;
      let locationObj = null;

      if (!locationId) {
        const { data: locData } = await api.get(`/warehouse/locations/by-code/${locCodeOrId}`);
        if (!locData) throw new Error('Ubicación no encontrada');
        locationId = locData.id;
        locationObj = locData;
      } else {
        locationObj = suggestedLocations.find(l => l.id === locationId) || { codigo: locCodeOrId };
      }

      await api.post('/reception/putaway', {
        assignments: [{ huId: putawayHU.id, ubicacionId: locationId }],
      });

      playBeep(true);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      setPutawaySuccess({
        hu: putawayHU,
        location: locationObj,
      });
      toast.success(`✅ Rollo ${putawayHU.codigo} acomodado en ${locationObj.codigo || locCodeOrId}`);
      setPutawayHU(null);
      setSuggestedLocations([]);
      refetchStaging();
    } catch (e: any) {
      playBeep(false);
      if (navigator.vibrate) navigator.vibrate([150, 50, 150]);
      toast.error(e?.response?.data?.message || `Error al ubicar en ${locCodeOrId}`);
    } finally {
      setSubmittingPutaway(false);
    }
  };

  // Complete discharge & release driver from handheld
  const handleConfirmIntakeAndRelease = async () => {
    if (scannedItems.length === 0) {
      return toast.error('Escanea al menos un rollo antes de liberar');
    }

    setSubmittingIntake(true);
    try {
      const grouped: Record<string, { skuId: string; cantidadRollos: number; metrajePorRollo: number }> = {};
      scannedItems.forEach(item => {
        const id = item.sku.id || 'GENERIC';
        if (!grouped[id]) {
          grouped[id] = { skuId: id, cantidadRollos: 0, metrajePorRollo: item.metraje || 50 };
        }
        grouped[id].cantidadRollos += 1;
      });

      // Compose discrepancy text for release voucher
      let balanceTexto = 'Descarga conforme al 100%';
      if (rollosDiff < 0) {
        balanceTexto = `FALTANTE DETECTADO: ${Math.abs(rollosDiff)} rollos (${Math.abs(metrosDiff)}m). Esperados ${totalExpectedRollos}, cotejados ${totalScannedCount}.`;
      } else if (rollosDiff > 0) {
        balanceTexto = `SOBRANTE DETECTADO: +${rollosDiff} rollos (+${metrosDiff}m).`;
      }

      const fullNotas = [notasDescarga, balanceTexto].filter(Boolean).join(' | ');

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
        notasDescarga: fullNotas,
        totalPallets: Number(totalPallets) || 1,
        lineas: Object.values(grouped),
      };

      const { data } = await api.post('/reception/process-intake', payload);
      playBeep(true);
      if (navigator.vibrate) navigator.vibrate([100, 100, 200]);
      setLiberationVoucher(data.releaseVoucher);
      setCreatedReceipt(data.receipt);
      setShowDriverModal(false);
      toast.success(`🎉 Transportista liberado: ${data.releaseVoucher?.folioLiberacion}`);
      refetchTransfers();
      refetchStaging();
    } catch (e: any) {
      playBeep(false);
      toast.error(e?.response?.data?.message || 'Error al procesar descarga');
    } finally {
      setSubmittingIntake(false);
    }
  };

  // Mark HUs labeled from Handheld
  const handleMarkLabeled = async (huId: string) => {
    try {
      await api.put(`/inventory/hus/${huId}/relocate`, {
        etiquetaImpresa: true,
        fechaEtiquetado: new Date().toISOString(),
      });
      playBeep(true);
      toast.success('✓ Rollo reetiquetado');
      refetchStaging();
    } catch {
      toast.error('Error al actualizar rollo');
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Top Header Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-md ${
            mode === 'descarga' ? 'bg-amber-500 text-gray-950' :
            mode === 'etiquetado' ? 'bg-purple-500 text-white' :
            'bg-teal-500 text-white'
          }`}>
            {mode === 'descarga' && <Truck size={20} />}
            {mode === 'etiquetado' && <Tag size={20} />}
            {mode === 'putaway' && <MapPin size={20} />}
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">
              {mode === 'descarga' && 'Recepción & Descarga'}
              {mode === 'etiquetado' && 'Doble Etiquetado'}
              {mode === 'putaway' && 'Putaway en Racks'}
            </h1>
            <p className="text-[11px] text-gray-400">Terminal móvil Zebra TC22 / Handheld</p>
          </div>
        </div>

        {/* 3-Mode Switcher */}
        <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-800 text-xs">
          <button
            onClick={() => setMode('descarga')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              mode === 'descarga' ? 'bg-amber-500 text-gray-950 shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Descarga
          </button>
          <button
            onClick={() => setMode('etiquetado')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              mode === 'etiquetado' ? 'bg-purple-500 text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Etiquetar
          </button>
          <button
            onClick={() => setMode('putaway')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
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
                <button onClick={() => refetchTransfers()} className="text-xs text-amber-400 flex items-center gap-1">
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

              {/* Collapsible Packing List Button */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <button
                  onClick={() => setShowPackingList(!showPackingList)}
                  className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-gray-200 hover:bg-gray-850"
                >
                  <span className="flex items-center gap-2">
                    <FileText size={15} className="text-amber-400" />
                    <span>Packing List Esperado (Manifiesto de Carga)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400 font-mono">
                      {selectedOrder.lineas?.length || 0} partidas
                    </span>
                    {showPackingList ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {showPackingList && (
                  <div className="p-3 bg-gray-950/60 border-t border-gray-800 text-xs space-y-2 max-h-56 overflow-y-auto">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase tracking-wider pb-1 border-b border-gray-800">
                      <span>Tela / SKU</span>
                      <span>Esperado vs Escaneado</span>
                    </div>

                    {(selectedOrder.lineas || []).map((line: any, idx: number) => {
                      const sku = line.sku;
                      const lineExpected = line.cantidadRollos || line.cantidad || 0;
                      const lineScanned = scannedItems.filter(it => it.sku.id === line.skuId || it.code.includes(sku?.codigo || '---')).length;
                      const isComplete = lineScanned >= lineExpected;

                      return (
                        <div key={line.id || idx} className="flex items-center justify-between p-2 rounded-xl bg-gray-900 border border-gray-800">
                          <div>
                            <p className="font-bold text-gray-200">{sku?.nombre || 'Tela'}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{sku?.codigo || line.skuId}</p>
                          </div>
                          <div className="text-right">
                            <span className={`font-mono font-bold ${isComplete ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {lineScanned} / {lineExpected} rollos
                            </span>
                            <span className="block text-[10px] text-gray-500">
                              {lineScanned * 50} / {lineExpected * 50}m
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Progress Counter & Bar */}
              <div className="bg-gray-900 rounded-2xl p-3.5 border border-gray-800 space-y-2">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-gray-400 font-medium">Avance de Cotejo Físico:</span>
                  <span className="font-bold text-base text-emerald-400 font-mono">
                    {totalScannedCount} / {totalExpectedRollos} rollos ({totalScannedMetros}m)
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

                {/* Discrepancy Live Badge */}
                {scannedItems.length > 0 && (
                  <div className="text-[11px] pt-1 flex items-center justify-between">
                    <span className="text-gray-400">Balance vs Manifiesto:</span>
                    {rollosDiff === 0 ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check size={12} /> 100% Conforme
                      </span>
                    ) : rollosDiff < 0 ? (
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <AlertTriangle size={12} /> Faltan {Math.abs(rollosDiff)} rollos (-{Math.abs(metrosDiff)}m)
                      </span>
                    ) : (
                      <span className="text-blue-400 font-bold">
                        +{rollosDiff} rollos de excedente (+{metrosDiff}m)
                      </span>
                    )}
                  </div>
                )}
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
                    <History size={13} className="text-amber-400" /> Historial de Rollos ({scannedItems.length})
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
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
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
                    <span>Liberar Chofer & Generar Nota de Entrega</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ===================================================================== */}
      {/* MODE 2: MESA DE DOBLE ETIQUETADO FORMATEX 360°                        */}
      {/* ===================================================================== */}
      {mode === 'etiquetado' && (
        <div className="space-y-3.5">
          <div className="bg-gradient-to-r from-purple-950/80 to-indigo-950/80 border border-purple-500/30 rounded-2xl p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-300 font-bold">
                <Tag size={16} />
                <span>Mesa de Doble Etiquetado Formatex</span>
              </div>
              <span className="text-[10px] bg-purple-900/60 text-purple-200 px-2 py-0.5 rounded-full font-mono">
                {stagingHUs.filter((h: any) => !h.etiquetaImpresa).length} sin marbete
              </span>
            </div>
            <p className="text-gray-300">
              Sustituye la etiqueta de contenedor marítimo/China por el marbete oficial Formatex con SKU comercial y QR de trazabilidad.
            </p>
          </div>

          {/* Quick Scanner for Labeling */}
          <ScanInput
            onScan={handleScanCode}
            placeholder="Escanea rollo para imprimir su marbete..."
          />

          {/* Staging HU List */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Rollos en Staging ({stagingHUs.length})
              </h3>
              <button onClick={() => refetchStaging()} className="text-xs text-purple-400 flex items-center gap-1">
                <RefreshCw size={11} /> Recargar
              </button>
            </div>

            {stagingHUs.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-xs">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-purple-500/40" />
                No hay rollos pendientes en mesa de reetiquetado
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {stagingHUs.map((hu: any) => (
                  <div
                    key={hu.id}
                    className="p-3 bg-gray-850 rounded-xl border border-gray-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400">{hu.codigo}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                          hu.etiquetaImpresa ? 'bg-emerald-900/50 text-emerald-300' : 'bg-amber-900/50 text-amber-300'
                        }`}>
                          {hu.etiquetaImpresa ? '✓ Reetiquetado' : '🟡 Pendiente'}
                        </span>
                      </div>
                      <p className="text-gray-200 font-medium mt-0.5">{hu.sku?.nombre || 'Tela'}</p>
                      <p className="text-[10px] text-gray-400 font-mono">
                        {hu.metrajeActual}m · {hu.ubicacion?.codigo || 'REC-STAGING-01'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedHuForPrint([hu]);
                          setShowPrintModal(true);
                        }}
                        className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl active:scale-95 transition-all"
                        title="Imprimir Marbete"
                      >
                        <Printer size={15} />
                      </button>
                      {!hu.etiquetaImpresa && (
                        <button
                          onClick={() => handleMarkLabeled(hu.id)}
                          className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl active:scale-95 transition-all"
                          title="Marcar como Reetiquetado"
                        >
                          <Check size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODE 3: PUTAWAY GUIADO CON UBICACIONES SUGERIDAS EN TIEMPO REAL      */}
      {/* ===================================================================== */}
      {mode === 'putaway' && (
        <div className="space-y-3.5">
          <div className="bg-gradient-to-r from-teal-950/80 to-emerald-950/80 border border-teal-500/30 rounded-2xl p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 text-teal-400 font-bold">
              <MapPin size={16} />
              <span>Acomodo Guiado en Racks (Zonificación Inteligente)</span>
            </div>
            <p className="text-gray-300">
              1. <b>Escanea el marbete del Rollo (HU)</b><br />
              2. <b>Elige una de las ubicaciones sugeridas en tiempo real</b> o escanea el código del Rack.
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
                  <button
                    onClick={() => {
                      setPutawayHU(null);
                      setSuggestedLocations([]);
                    }}
                    className="text-[10px] text-gray-500 hover:text-white"
                  >
                    Cambiar Rollo
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-base font-bold text-teal-300">{putawayHU.codigo}</span>
                    <p className="text-xs text-gray-300 font-medium">{putawayHU.sku?.nombre}</p>
                    <p className="text-[10px] text-gray-400 font-mono">SKU: {putawayHU.sku?.codigo}</p>
                  </div>
                  <span className="text-base font-bold text-emerald-400 font-mono">{putawayHU.metrajeActual} m</span>
                </div>

                {/* Real-Time Suggested Locations Section */}
                <div className="space-y-2 pt-2 border-t border-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Sparkles size={14} /> Ubicaciones Sugeridas en Tiempo Real:
                    </span>
                    {loadingSuggestions && (
                      <span className="text-[10px] text-gray-400 animate-pulse">Calculando...</span>
                    )}
                  </div>

                  {suggestedLocations.length > 0 ? (
                    <div className="space-y-2">
                      {suggestedLocations.map((loc: any, idx: number) => (
                        <button
                          key={loc.id}
                          disabled={submittingPutaway}
                          onClick={() => executePutawayAssignment(loc.codigo, loc.id)}
                          className="w-full text-left p-3 rounded-xl bg-gray-800 hover:bg-gray-750 active:scale-[0.98] border border-teal-500/40 transition-all space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-teal-300 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] flex items-center justify-center">
                                #{idx + 1}
                              </span>
                              {loc.codigo}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                              {loc.disponibles} espacio(s) libres
                            </span>
                          </div>

                          <p className="text-[11px] text-gray-300">
                            {loc.motivo?.join(' · ') || 'Ubicación óptima para acomodo'}
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-700/60">
                            <span>Capacidad: {loc.ocupados}/{loc.capacidad} rollos</span>
                            <span className="text-teal-400 font-semibold flex items-center gap-1">
                              Tocar para Asignar <ArrowRight size={10} />
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-800/80 rounded-xl border border-gray-700 text-center space-y-1">
                      <span className="text-xs font-bold text-amber-400 block">Paso 2: Escanea Código de Rack</span>
                      <span className="text-[11px] text-gray-400">Apunta el láser al código del rack (ej. RE-01-P02-R01-N1)</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <ScanInput
              onScan={handleScanCode}
              placeholder={!putawayHU ? 'Escanea código HU...' : 'O escanea código de rack manual...'}
            />
          </div>

          {/* Last Putaway Success Card */}
          {putawaySuccess && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-xs space-y-1">
              <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Rollo Ubicado con Éxito en Tiempo Real
              </p>
              <p className="text-gray-300">
                HU <span className="font-mono font-bold text-white">{putawaySuccess.hu?.codigo}</span> asignado al rack{' '}
                <span className="font-mono font-bold text-emerald-300">{putawaySuccess.location?.codigo}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Driver Release Modal on Handheld */}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 w-full max-w-sm space-y-4 animate-scale-in text-white my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Truck size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Liberar Transportista</h3>
                  <p className="text-[10px] text-gray-400">Genera Nota de Entrega & Acuse</p>
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
                  <label className="text-gray-400 block mb-1">Tarimas / Pallets</label>
                  <input
                    type="number"
                    min={1}
                    value={totalPallets}
                    onChange={e => setTotalPallets(+e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white font-bold"
                  />
                </div>
              </div>

              {/* Live Comparison and Discrepancy Note */}
              <div className="p-3 bg-gray-800/80 rounded-xl border border-gray-700 space-y-1.5">
                <div className="flex justify-between items-center text-[11px] text-gray-400">
                  <span>Balance de Bultos:</span>
                  <span className="font-mono font-bold text-white">
                    {scannedItems.length} de {totalExpectedRollos} rollos
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-gray-400">
                  <span>Metraje Recibido:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {totalScannedMetros} m (esp. {totalExpectedMetros}m)
                  </span>
                </div>

                {rollosDiff === 0 ? (
                  <div className="p-2 bg-emerald-950/70 border border-emerald-800/80 rounded-lg text-emerald-300 text-[11px] font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={13} />
                    <span>Descarga 100% Conforme sin discrepancias</span>
                  </div>
                ) : rollosDiff < 0 ? (
                  <div className="p-2 bg-amber-950/70 border border-amber-800/80 rounded-lg text-amber-300 text-[11px] font-bold flex items-center gap-1.5">
                    <AlertTriangle size={13} />
                    <span>⚠️ Faltante: Faltan {Math.abs(rollosDiff)} rollos ({Math.abs(metrosDiff)}m)</span>
                  </div>
                ) : (
                  <div className="p-2 bg-blue-950/70 border border-blue-800/80 rounded-lg text-blue-300 text-[11px] font-bold flex items-center gap-1.5">
                    <AlertCircle size={13} />
                    <span>ℹ️ Sobrante: Excedente de +{rollosDiff} rollos (+{metrosDiff}m)</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Observaciones en Nota de Entrega</label>
                <textarea
                  rows={2}
                  value={notasDescarga}
                  onChange={e => setNotasDescarga(e.target.value)}
                  placeholder="Ej. Tarima 2 entregada con empaque íntegro, chofer conforme..."
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-xs resize-none"
                />
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
                {submittingIntake ? 'Generando Nota...' : 'Confirmar Salida'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liberation Voucher Success Card */}
      {liberationVoucher && (
        <div className="bg-gradient-to-br from-emerald-900 to-teal-950 border border-emerald-500/50 rounded-3xl p-5 space-y-3.5 text-white shadow-2xl animate-scale-in">
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
            <p className="text-gray-300">Tarimas: <b className="text-white font-bold">{liberationVoucher.totalPallets || totalPallets} pallets</b></p>
            <p className="text-gray-300">Rollos: <b className="text-emerald-400">{liberationVoucher.totalRollos} rollos ({liberationVoucher.totalMetros?.toLocaleString()}m)</b></p>
            {liberationVoucher.notas && (
              <p className="text-amber-300/90 text-[11px] pt-1 border-t border-gray-700/50">
                <b>Nota:</b> {liberationVoucher.notas}
              </p>
            )}
          </div>

          {/* Action Buttons: Print Voucher & Proceed to Putaway */}
          <div className="space-y-2">
            <button
              onClick={() => setShowPaseSalidaModal(true)}
              className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 border border-emerald-400/40 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer size={15} />
              <span>Ver / Imprimir Nota de Entrega Formal</span>
            </button>

            <button
              onClick={() => {
                setLiberationVoucher(null);
                setSelectedOrder(null);
                setMode('etiquetado');
              }}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Tag size={15} />
              <span>Ir a Mesa de Doble Etiquetado</span>
              <ArrowRight size={14} />
            </button>

            <button
              onClick={() => {
                setLiberationVoucher(null);
                setSelectedOrder(null);
                setMode('putaway');
              }}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <MapPin size={15} />
              <span>Ir Directo a Acomodo en Racks (Putaway)</span>
            </button>
          </div>
        </div>
      )}

      {/* Official Pase de Salida Modal */}
      {showPaseSalidaModal && (
        <PaseSalidaModal
          open={showPaseSalidaModal}
          onClose={() => setShowPaseSalidaModal(false)}
          voucher={liberationVoucher}
          receipt={createdReceipt}
          onGoToLabeling={() => {
            setShowPaseSalidaModal(false);
            setLiberationVoucher(null);
            setSelectedOrder(null);
            setMode('etiquetado');
          }}
        />
      )}

      {/* Label Printing Dialog */}
      {showPrintModal && (
        <PrintDialog
          open={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          hus={selectedHuForPrint}
        />
      )}
    </div>
  );
}

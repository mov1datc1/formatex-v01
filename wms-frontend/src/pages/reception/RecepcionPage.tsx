import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import {
  Package, CheckCircle2, Clock, ShoppingCart, ChevronDown, ChevronUp,
  Inbox, Eye, X, TrendingUp, MapPin, Truck, Printer, Layers, Tag,
  ShieldCheck, ArrowRight, ExternalLink, RefreshCw, CheckSquare, Plus,
  FileText, Building2, HelpCircle
} from 'lucide-react';
import ConfirmModal from '../../components/ui/ConfirmModal';
import DescargaChecklistModal from './DescargaChecklistModal';
import PaseSalidaModal from './PaseSalidaModal';
import PrintDialog from '../../components/labels/PrintDialog';

export default function RecepcionPage() {
  const [activeTab, setActiveTab] = useState<'traspasos' | 'ordenes' | 'reetiquetado' | 'putaway' | 'historial'>('traspasos');
  const [page, setPage] = useState(1);

  // Queries
  const { data: incomingTransfers, isLoading: loadingTransfers, refetch: refetchTransfers } = useApi<any[]>(
    ['incoming-transfers'],
    '/reception/incoming-transfers'
  );
  const { data: ocQueue, isLoading: loadingOC, refetch: refetchOC } = useApi<any[]>(
    ['reception-oc-queue'],
    '/purchasing/reception-queue'
  );
  const { data: receiptsResp, isLoading: loadingReceipts, refetch: refetchReceipts } = useApi<PaginatedResponse<any>>(
    ['receipts', page],
    '/reception',
    { page, limit: 20 }
  );
  const { data: stagingHUsResp, refetch: refetchHUs } = useApi<PaginatedResponse<any>>(
    ['staging-hus'],
    '/inventory/hus',
    { limit: 100 }
  );
  const { data: zones } = useApi<any[]>(['wh-zones'], '/warehouse/zones');

  // Modals state
  const [selectedOrderForChecklist, setSelectedOrderForChecklist] = useState<any | null>(null);
  const [selectedVoucherForModal, setSelectedVoucherForModal] = useState<any | null>(null);
  const [selectedReceiptForVoucher, setSelectedReceiptForVoucher] = useState<any | null>(null);
  const [selectedReceiptDetail, setSelectedReceiptDetail] = useState<any | null>(null);

  // Print Modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [husToPrint, setHusToPrint] = useState<any[]>([]);

  // Manual Form
  const [showNewForm, setShowNewForm] = useState(false);
  const { data: suppliers } = useApi<PaginatedResponse<any>>(['suppliers'], '/catalog/suppliers', { limit: 100 });
  const { data: skus } = useApi<PaginatedResponse<any>>(['skus'], '/catalog/skus', { limit: 100 });
  const [manualSupplierId, setManualSupplierId] = useState('');
  const [manualOrdenCompra, setManualOrdenCompra] = useState('');
  const [manualTransportista, setManualTransportista] = useState('');
  const [manualLineas, setManualLineas] = useState([{ skuId: '', cantidadRollos: 1, metrajePorRollo: 50, palletRef: '' }]);

  // Putaway assignments state (huId -> ubicacionId)
  const [putawaySelections, setPutawaySelections] = useState<Record<string, string>>({});
  const [savingPutaway, setSavingPutaway] = useState(false);

  // Partial receipt for standard OCs
  const [partialModal, setPartialModal] = useState<{ open: boolean; oc: any; rollosInputs: Record<string, number>; ubicacionInputs: Record<string, string>; submitting: boolean }>({ open: false, oc: null, rollosInputs: {}, ubicacionInputs: {}, submitting: false });
  const [modal, setModal] = useState<{ open: boolean; title: string; message: string; action: () => void; confirmText: string }>({ open: false, title: '', message: '', action: () => {}, confirmText: '' });

  const refreshAll = () => {
    refetchTransfers();
    refetchOC();
    refetchReceipts();
    refetchHUs();
  };

  // Filter HUs that are in Staging / Recibo or created recently
  const allHUs = stagingHUsResp?.data || [];
  const stagingHUs = allHUs.filter((h: any) =>
    !h.ubicacion ||
    h.ubicacion?.tipo === 'STAGING' ||
    h.ubicacion?.tipo === 'RECIBO' ||
    h.ubicacion?.codigo?.startsWith('REC-')
  );

  // Handle post-intake success
  const handleIntakeSuccess = (data: { receipt: any; releaseVoucher: any; husCount: number }) => {
    setSelectedOrderForChecklist(null);
    setSelectedVoucherForModal(data.releaseVoucher);
    setSelectedReceiptForVoucher(data.receipt);
    refreshAll();
  };

  // Labeling actions
  const handlePrintLabelsForReceipt = (receipt: any) => {
    const list: any[] = [];
    (receipt.lineas || []).forEach((l: any) => {
      (l.handlingUnits || []).forEach((h: any) => {
        list.push({
          ...h,
          sku: h.sku || l.sku,
        });
      });
    });
    if (list.length === 0) return toast.error('No hay HUs en esta recepción');
    setHusToPrint(list);
    setShowPrintModal(true);
  };

  const handleMarkReceiptLabeled = async (receiptId: string) => {
    try {
      await api.post(`/reception/${receiptId}/mark-labeled`, {});
      toast.success('Todos los rollos marcados como reetiquetados con marbete Formatex');
      refreshAll();
      if (selectedReceiptDetail?.id === receiptId) {
        const { data } = await api.get(`/reception/${receiptId}`);
        setSelectedReceiptDetail(data);
      }
    } catch {
      toast.error('Error al actualizar estatus de etiquetado');
    }
  };

  // Putaway submission
  const handleConfirmPutaway = async () => {
    const assignments = Object.entries(putawaySelections)
      .filter(([_, locId]) => Boolean(locId))
      .map(([huId, ubicacionId]) => ({ huId, ubicacionId }));

    if (assignments.length === 0) {
      return toast.error('Selecciona al menos una ubicación de rack para acomodar');
    }

    setSavingPutaway(true);
    try {
      const { data } = await api.post('/reception/putaway', { assignments });
      toast.success(`Putaway completado — ${data.count} rollos acomodados en racks`);
      setPutawaySelections({});
      refreshAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al ejecutar putaway');
    } finally {
      setSavingPutaway(false);
    }
  };

  // Manual Reception
  const handleManualReception = async () => {
    if (!manualSupplierId) return toast.error('Selecciona proveedor');
    if (manualLineas.some(l => !l.skuId)) return toast.error('Selecciona SKU en todas las líneas');
    try {
      const { data } = await api.post('/reception', {
        supplierId: manualSupplierId,
        ordenCompra: manualOrdenCompra,
        transportista: manualTransportista,
        lineas: manualLineas,
      });
      toast.success('Recepción manual registrada con éxito');
      setShowNewForm(false);
      setManualSupplierId('');
      setManualOrdenCompra('');
      setManualTransportista('');
      setManualLineas([{ skuId: '', cantidadRollos: 1, metrajePorRollo: 50, palletRef: '' }]);
      refreshAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al registrar recepción');
    }
  };

  const transfersList = incomingTransfers || [];
  const ocsList = ocQueue || [];
  const receiptsList = receiptsResp?.data || [];

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-gray-900 via-slate-800 to-indigo-950 p-6 rounded-2xl text-white shadow-xl shadow-slate-900/10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-bold text-gray-900 shadow-md">
              <Truck size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Recepción & Doble Etiquetado</h1>
              <p className="text-xs sm:text-sm text-gray-300">
                Flujo operativo Formatex: Cotejo de Descarga ➔ Liberación de Chofer ➔ Etiqueta HU ➔ Putaway
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshAll}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-1.5"
            title="Refrescar datos"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-1.5"
          >
            {showNewForm ? <X size={15} /> : <Plus size={15} />}
            <span>{showNewForm ? 'Cerrar' : '+ Recepción Manual'}</span>
          </button>
        </div>
      </div>

      {/* Manual Form (Collapsible) */}
      {showNewForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4 animate-scale-in">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-sm font-bold text-gray-800">Nueva Recepción Manual (Ad-hoc)</h2>
            <span className="text-xs text-gray-400">Para ingresos directos sin requisición previa</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Proveedor *</label>
              <select
                value={manualSupplierId}
                onChange={e => setManualSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800"
              >
                <option value="">Seleccionar proveedor...</option>
                {suppliers?.data?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.nombre} ({s.codigo})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Folio / Referencia</label>
              <input
                value={manualOrdenCompra}
                onChange={e => setManualOrdenCompra(e.target.value)}
                placeholder="OC-2026-001 o Factura"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Transportista / Chofer</label>
              <input
                value={manualTransportista}
                onChange={e => setManualTransportista(e.target.value)}
                placeholder="Nombre o línea de carga"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800"
              />
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-700">Líneas de Tela</span>
              <button
                onClick={() => setManualLineas([...manualLineas, { skuId: '', cantidadRollos: 1, metrajePorRollo: 50, palletRef: '' }])}
                className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-semibold"
              >
                + Agregar Línea
              </button>
            </div>
            {manualLineas.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center mb-2 p-2.5 bg-gray-50 rounded-xl">
                <div className="col-span-5">
                  <select
                    value={l.skuId}
                    onChange={e => {
                      const copy = [...manualLineas];
                      copy[i].skuId = e.target.value;
                      setManualLineas(copy);
                    }}
                    className="w-full px-2 py-1.5 bg-white border rounded-lg text-xs"
                  >
                    <option value="">Seleccionar SKU...</option>
                    {skus?.data?.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.nombre} ({s.codigo})</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min={1}
                    value={l.cantidadRollos}
                    onChange={e => {
                      const copy = [...manualLineas];
                      copy[i].cantidadRollos = +e.target.value;
                      setManualLineas(copy);
                    }}
                    placeholder="Rollos"
                    className="w-full px-2 py-1.5 bg-white border rounded-lg text-xs text-center"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min={1}
                    value={l.metrajePorRollo}
                    onChange={e => {
                      const copy = [...manualLineas];
                      copy[i].metrajePorRollo = +e.target.value;
                      setManualLineas(copy);
                    }}
                    placeholder="m/rollo"
                    className="w-full px-2 py-1.5 bg-white border rounded-lg text-xs text-center"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={l.palletRef}
                    onChange={e => {
                      const copy = [...manualLineas];
                      copy[i].palletRef = e.target.value;
                      setManualLineas(copy);
                    }}
                    placeholder="Tarima Ref"
                    className="w-full px-2 py-1.5 bg-white border rounded-lg text-xs text-center font-mono"
                  />
                </div>
                <div className="col-span-1 text-center">
                  {manualLineas.length > 1 && (
                    <button
                      onClick={() => setManualLineas(manualLineas.filter((_, idx) => idx !== i))}
                      className="text-red-400 hover:text-red-600 font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              onClick={() => setShowNewForm(false)}
              className="px-4 py-2 text-xs text-gray-500 hover:bg-gray-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              onClick={handleManualReception}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
            >
              Registrar Recepción
            </button>
          </div>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex gap-2 overflow-x-auto border-b border-gray-200 pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('traspasos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'traspasos'
              ? 'bg-amber-500 text-gray-900 shadow-md shadow-amber-500/20'
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          <Truck size={15} />
          <span>Traspasos Telares (TNT ➔ Zapopan)</span>
          {transfersList.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'traspasos' ? 'bg-black/20 text-gray-900' : 'bg-amber-100 text-amber-800'
            }`}>
              {transfersList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ordenes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'ordenes'
              ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          <ShoppingCart size={15} />
          <span>Órdenes de Compra Externas</span>
          {ocsList.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'ordenes' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
              {ocsList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reetiquetado')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'reetiquetado'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          <Tag size={15} />
          <span>Mesa de Reetiquetado (Doble Etiqueta)</span>
          {stagingHUs.filter((h: any) => !h.etiquetaImpresa).length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-gray-900">
              {stagingHUs.filter((h: any) => !h.etiquetaImpresa).length} pend.
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('putaway')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'putaway'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          <MapPin size={15} />
          <span>Acomodo en Racks (Putaway)</span>
          {stagingHUs.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'putaway' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'
            }`}>
              {stagingHUs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('historial')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'historial'
              ? 'bg-gray-800 text-white shadow-md'
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          <Inbox size={15} />
          <span>Historial & Pases de Salida ({receiptsResp?.total || 0})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TRASPASOS TELARES (TNT ➔ ZAPOPAN)                                 */}
      {/* ========================================================================= */}
      {activeTab === 'traspasos' && (
        <div className="space-y-4">
          {/* Informational Guidance Box */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
            <div className="p-2.5 bg-amber-500 text-gray-950 rounded-xl mt-0.5 font-bold shadow-sm">
              <Truck size={20} />
            </div>
            <div className="text-xs">
              <p className="font-bold text-amber-950 text-sm">Circuito de Abastecimiento Telares y Tejidos (Tototlán ➔ Zapopan)</p>
              <p className="text-amber-900 mt-1 leading-relaxed">
                Los rollos provienen del contenedor de China descargado en la bodega hermana de Tototlán. Al llegar la camioneta a la rampa de
                Formatex, se ejecuta el <b>Cotejo Físico de Descarga</b>. Una vez verificado el 100% de los rollos contra el manifiesto, se
                emite el <b>Pase de Liberación del Transportista</b> y los rollos pasan a la <b>Mesa de Reetiquetado</b> para colocarles la etiqueta oficial
                de Formatex antes de ser almacenados en sus racks.
              </p>
            </div>
          </div>

          {/* Transfers Cards Grid */}
          {loadingTransfers ? (
            <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border">
              <RefreshCw className="animate-spin mx-auto mb-2 text-gray-400" size={24} />
              <p className="text-sm">Cargando traspasos en camino...</p>
            </div>
          ) : transfersList.length === 0 ? (
            <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border">
              <Package size={40} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">No hay traspasos de Telares pendientes de descarga</p>
              <p className="text-xs text-gray-400 mt-1">
                Todas las requisiciones en ruta han sido recibidas y cotejadas en muelle.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {transfersList.map((tr: any) => {
                const isUrgent = tr.prioridad <= 2;
                return (
                  <div
                    key={tr.id}
                    className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Top status */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg">
                            {tr.codigo}
                          </span>
                          {isUrgent && (
                            <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              URGENTE
                            </span>
                          )}
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          tr.estado === 'EN_TRANSITO'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {tr.estado === 'EN_TRANSITO' ? 'Camioneta en Ruta' : tr.estado}
                        </span>
                      </div>

                      {/* Route details */}
                      <div className="text-xs space-y-1 mb-3">
                        <p className="text-gray-700 font-semibold flex items-center gap-1.5">
                          <Building2 size={13} className="text-gray-400" /> {tr.origen} ➔ {tr.destino}
                        </p>
                        <p className="text-gray-500 flex items-center gap-1.5">
                          <Truck size={13} className="text-gray-400" /> {tr.ruta} · {tr.horaEstimada}
                        </p>
                        <p className="text-gray-400">Solicitado por: <span className="text-gray-700 font-medium">{tr.solicitante}</span></p>
                      </div>

                      {/* Quantities */}
                      <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-xl text-center text-xs mb-3">
                        <div>
                          <span className="text-gray-400 block text-[11px]">Total Rollos (50m)</span>
                          <span className="font-bold text-gray-900 text-base">{tr.totalRollos} rollos</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Metros Manifestados</span>
                          <span className="font-bold text-emerald-600 text-base">{tr.totalMetros?.toLocaleString()} m</span>
                        </div>
                      </div>

                      {/* Lines preview */}
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {(tr.lineas || []).map((l: any) => (
                          <div key={l.id} className="flex items-center justify-between text-xs py-1 px-2 bg-gray-50/70 rounded-lg">
                            <span className="font-medium text-gray-800 truncate max-w-[200px]">
                              {l.sku?.nombre || 'Tela'} {l.sku?.color ? `(${l.sku.color})` : ''}
                            </span>
                            <span className="font-semibold text-gray-700 font-mono text-[11px]">
                              {l.cantidadRollos} rollos · {l.metrajeTotal}m
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-3 border-t flex gap-2">
                      <button
                        onClick={() => setSelectedOrderForChecklist(tr)}
                        className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
                      >
                        <CheckSquare size={15} />
                        <span>Iniciar Descarga & Cotejo</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ÓRDENES DE COMPRA EXTERNAS                                        */}
      {/* ========================================================================= */}
      {activeTab === 'ordenes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">
              Órdenes de Compra Pendientes de Recepción ({ocsList.length})
            </h3>
            <span className="text-xs text-gray-400">Proveedores nacionales e importaciones directas</span>
          </div>

          {loadingOC ? (
            <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border">Cargando OCs...</div>
          ) : ocsList.length === 0 ? (
            <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border">
              <Package size={40} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">No hay órdenes de compra pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ocsList.map((oc: any) => {
                const pct = oc.porcentajeRecibido || 0;
                return (
                  <div key={oc.id} className="bg-white rounded-2xl border p-4 shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg">
                          {oc.codigo}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{oc.supplier?.nombre}</p>
                          <p className="text-xs text-gray-400">{(oc.lineas || []).length} SKUs en orden</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-28 text-right">
                          <span className="text-xs font-semibold text-gray-700">{pct}% recibido</span>
                          <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedOrderForChecklist({
                            ...oc,
                            tipo: 'OC_PROVEEDOR',
                            origen: oc.supplier?.nombre || 'Proveedor Externo',
                            destino: 'Nave Formatex Zapopan',
                            ruta: 'Transporte de Carga Proveedor',
                          })}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <CheckSquare size={14} />
                          <span>Descargar & Liberar</span>
                        </button>
                      </div>
                    </div>

                    <div className="border-t pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {(oc.lineas || []).map((l: any) => (
                        <div key={l.id} className="p-2 bg-gray-50 rounded-lg">
                          <p className="font-semibold text-gray-800 truncate">{l.sku?.nombre}</p>
                          <p className="text-[11px] text-gray-500">
                            {l.rollosRecibidos || 0} / {l.cantidadRollos || Math.round((Number(l.metrajeTotal) || 0) / 50)} rollos recibidos
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MESA DE REETIQUETADO (DOBLE ETIQUETA FORMATEX)                    */}
      {/* ========================================================================= */}
      {activeTab === 'reetiquetado' && (
        <div className="space-y-4">
          {/* Banner explicativo del Doble Etiquetado */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
            <div className="p-2.5 bg-purple-600 text-white rounded-xl mt-0.5 font-bold shadow-sm">
              <Tag size={20} />
            </div>
            <div className="text-xs">
              <p className="font-bold text-purple-950 text-sm">Protocolo de Doble Etiquetado Formatex WMS 360°</p>
              <p className="text-purple-900 mt-1 leading-relaxed">
                Cada rollo descargado de Telares ingresa inicialmente a la estación <b>REC-STAGING-01</b>. Aquí el operador escanea el rollo,
                valida el metraje físico y emite el marbete definitivo con el SKU de Formatex, código QR de trazabilidad y ubicación sugerida en rack.
              </p>
            </div>
          </div>

          {/* Quick Action Bar */}
          <div className="bg-white rounded-2xl border p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Rollos en Mesa de Recepción & Staging ({stagingHUs.length})</h3>
              <p className="text-xs text-gray-400">
                {stagingHUs.filter((h: any) => !h.etiquetaImpresa).length} sin etiqueta impresa · {stagingHUs.filter((h: any) => h.etiquetaImpresa).length} con etiqueta oficial
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (stagingHUs.length === 0) return toast.error('No hay rollos en staging');
                  setHusToPrint(stagingHUs);
                  setShowPrintModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all"
              >
                <Printer size={15} />
                <span>Imprimir Etiquetas Formatex ({stagingHUs.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('putaway')}
                className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-bold border border-teal-200 transition-colors flex items-center gap-1.5"
              >
                <span>Acomodar en Racks</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Rolls List */}
          {stagingHUs.length === 0 ? (
            <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border">
              <Package size={40} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">No hay rollos pendientes en la mesa de reetiquetado</p>
              <p className="text-xs text-gray-400 mt-1">Los nuevos rollos aparecerán aquí automáticamente tras cotejar una descarga.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {stagingHUs.map((hu: any) => (
                <div key={hu.id} className="bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg">
                      {hu.codigo}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      hu.etiquetaImpresa ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {hu.etiquetaImpresa ? '✓ Reetiquetado' : '🟡 Sin Etiqueta'}
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <p className="font-bold text-gray-900 text-sm truncate">{hu.sku?.nombre || 'Tela'}</p>
                    <p className="text-gray-500 font-mono">{hu.sku?.codigo} {hu.sku?.color ? `· ${hu.sku.color}` : ''}</p>
                    <div className="flex items-center justify-between pt-1 border-t text-gray-600">
                      <span>Metraje Neto: <b className="text-emerald-600 text-sm">{hu.metrajeActual} m</b></span>
                      <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-mono">Ancho: {hu.anchoMetros || 1.5}m</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-500 text-[11px]">
                      <span>Tarima: <b className="text-gray-800 font-mono">{hu.palletId || 'PALLET-01'}</b></span>
                      <span>Calidad: <b className="text-purple-700">{hu.gradoCalidad || 'PRIMERA'}</b></span>
                    </div>
                  </div>

                  <div className="pt-2 border-t flex gap-2">
                    <button
                      onClick={() => {
                        setHusToPrint([hu]);
                        setShowPrintModal(true);
                      }}
                      className="flex-1 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border border-gray-200 transition-colors"
                    >
                      <Printer size={13} /> Imprimir 4x2
                    </button>
                    {!hu.etiquetaImpresa && (
                      <button
                        onClick={async () => {
                          try {
                            await api.put(`/inventory/hus/${hu.id}/relocate`, { etiquetaImpresa: true, fechaEtiquetado: new Date().toISOString() });
                            toast.success(`Rollo ${hu.codigo} marcado como reetiquetado`);
                            refreshAll();
                          } catch {
                            toast.error('Error al actualizar rollo');
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-200"
                        title="Marcar rollo con marbete colocado"
                      >
                        ✓
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ACOMODO EN RACKS SEGÚN ZONIFICACIÓN (PUTAWAY)                     */}
      {/* ========================================================================= */}
      {activeTab === 'putaway' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/80 rounded-2xl p-4 flex items-start justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-teal-600 text-white rounded-xl mt-0.5 font-bold shadow-sm">
                <MapPin size={20} />
              </div>
              <div className="text-xs">
                <p className="font-bold text-teal-950 text-sm">Algoritmo de Zonificación y Acomodo en Racks</p>
                <p className="text-teal-900 mt-1 leading-relaxed">
                  El sistema sugiere automáticamente el rack idóneo: rollos de alta rotación a <b>Nivel 1 (Piso)</b> para agilizar corte,
                  rollos de resguardo a <b>Niveles 2-5 (Racks Altos con Montacargas)</b>, y consolidación contigua del mismo SKU.
                </p>
              </div>
            </div>

            <a
              href="/ubicaciones"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 bg-white hover:bg-gray-50 text-teal-800 rounded-xl text-xs font-bold border border-teal-300 shadow-sm flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <ExternalLink size={14} />
              <span>Ver Mapa de Racks</span>
            </a>
          </div>

          <div className="bg-white rounded-2xl border p-4 shadow-sm flex items-center justify-between">
            <div className="text-xs">
              <span className="font-bold text-gray-800 text-sm">{stagingHUs.length} rollos</span> listos para ingresar a racks definitivos
            </div>
            <button
              onClick={handleConfirmPutaway}
              disabled={savingPutaway || stagingHUs.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-teal-600/20 transition-all disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              <span>{savingPutaway ? 'Guardando en Racks...' : 'Confirmar Acomodo en Racks'}</span>
            </button>
          </div>

          {stagingHUs.length === 0 ? (
            <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border">
              <MapPin size={40} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">No hay rollos pendientes de acomodo</p>
              <p className="text-xs text-gray-400 mt-1">Todos los rollos recibidos están ubicados en sus racks asignados.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {stagingHUs.map((hu: any) => {
                const currentLoc = putawaySelections[hu.id] || hu.ubicacionId || '';
                return (
                  <div key={hu.id} className="bg-white rounded-xl border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-teal-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold font-mono text-xs border border-teal-100">
                        HU
                      </div>
                      <div className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gray-900">{hu.codigo}</span>
                          <span className="text-emerald-700 font-bold">{hu.metrajeActual} m</span>
                        </div>
                        <p className="text-gray-600 font-medium">{hu.sku?.nombre} · {hu.sku?.color}</p>
                        <p className="text-[10px] text-gray-400">Tarima: {hu.palletId || 'PALLET-01'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right sm:mr-2">
                        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">Rack Asignado</span>
                        <input
                          type="text"
                          value={putawaySelections[hu.id] || (hu.ubicacion?.codigo?.startsWith('RE-') ? hu.ubicacion.codigo : 'RE-01-P01-R01-N1')}
                          onChange={e => setPutawaySelections(p => ({ ...p, [hu.id]: e.target.value }))}
                          placeholder="RE-01-P01-R01-N1"
                          className="px-3 py-1.5 bg-teal-50/50 border border-teal-200 rounded-lg text-xs font-mono font-bold text-teal-900 text-center uppercase focus:ring-2 focus:ring-teal-200"
                        />
                      </div>

                      <button
                        onClick={async () => {
                          try {
                            const { data } = await api.get('/reception/suggest-locations', {
                              params: { skuId: hu.skuId, tipoRollo: 'ENTERO', metraje: 50, cantidadRollos: 1 },
                            });
                            if (data.seleccionada?.codigo) {
                              setPutawaySelections(p => ({ ...p, [hu.id]: data.seleccionada.id }));
                              toast.success(`Sugerido: ${data.seleccionada.codigo} (${data.seleccionada.motivo?.[0] || 'Libre'})`);
                            }
                          } catch {
                            toast.error('Error al calcular sugerencia');
                          }
                        }}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                        title="Calcular rack inteligente por algoritmo de zonificación"
                      >
                        ⚡ Sugerir Rack
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: HISTORIAL DE RECEPCIONES & PASES DE LIBERACIÓN                    */}
      {/* ========================================================================= */}
      {activeTab === 'historial' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
            <div className="p-4 border-b bg-gray-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Historial de Recepciones & Descargas Realizadas</h3>
                <p className="text-xs text-gray-500">Comprobantes y pases de salida emitidos a transportistas</p>
              </div>
            </div>

            {loadingReceipts ? (
              <div className="p-12 text-center text-gray-400">Cargando recepciones...</div>
            ) : receiptsList.length === 0 ? (
              <div className="p-12 text-center text-gray-400">No hay recepciones registradas</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-100/70 text-gray-600 uppercase text-[11px] border-b">
                    <th className="px-4 py-3 text-left">Folio Recepción</th>
                    <th className="px-4 py-3 text-left">Origen / Proveedor</th>
                    <th className="px-4 py-3 text-left">Transportista & Chofer</th>
                    <th className="px-4 py-3 text-center">Tarimas</th>
                    <th className="px-4 py-3 text-center">Rollos</th>
                    <th className="px-4 py-3 text-center">Estatus</th>
                    <th className="px-4 py-3 text-left">Fecha Descarga</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {receiptsList.map((r: any) => {
                    let voucherMeta: any = {};
                    try {
                      if (r.notas && r.notas.startsWith('{')) voucherMeta = JSON.parse(r.notas);
                    } catch {}

                    return (
                      <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-primary-600 text-xs">{r.codigo}</span>
                          {r.ordenCompra && (
                            <span className="block text-[10px] text-gray-400 font-mono mt-0.5">{r.ordenCompra}</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span className="font-semibold text-gray-800">{r.supplier?.nombre || 'Telares y Tejidos'}</span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-700 block">{voucherMeta.choferNombre || r.transportista || 'Israel'}</span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            Placas: {voucherMeta.placas || r.placas || 'S/P'}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center font-bold text-gray-700">{r.totalPallets || 1}</td>
                        <td className="px-4 py-3 text-center font-bold text-purple-700">{r.totalRollos} rollos</td>

                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {r.estado}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-gray-600">
                          {new Date(r.createdAt).toLocaleDateString('es-MX', { dateStyle: 'medium' })}
                          <span className="block text-[10px] text-gray-400">
                            {new Date(r.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {voucherMeta.folioLiberacion && (
                              <button
                                onClick={() => {
                                  setSelectedVoucherForModal(voucherMeta);
                                  setSelectedReceiptForVoucher(r);
                                }}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold text-[11px] border border-emerald-200 transition-colors flex items-center gap-1"
                                title="Ver Pase de Salida del Chofer"
                              >
                                <FileText size={12} /> Pase Salida
                              </button>
                            )}

                            <button
                              onClick={() => handlePrintLabelsForReceipt(r)}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-semibold text-[11px] border border-purple-200 transition-colors flex items-center gap-1"
                              title="Reimprimir Etiquetas Formatex"
                            >
                              <Printer size={12} /> Etiquetas
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Descarga Checklist Modal */}
      {selectedOrderForChecklist && (
        <DescargaChecklistModal
          open={Boolean(selectedOrderForChecklist)}
          onClose={() => setSelectedOrderForChecklist(null)}
          order={selectedOrderForChecklist}
          onSuccess={handleIntakeSuccess}
        />
      )}

      {/* Pase de Salida Modal */}
      {selectedVoucherForModal && (
        <PaseSalidaModal
          open={Boolean(selectedVoucherForModal)}
          onClose={() => {
            setSelectedVoucherForModal(null);
            setSelectedReceiptForVoucher(null);
          }}
          voucher={selectedVoucherForModal}
          receipt={selectedReceiptForVoucher}
          onGoToLabeling={() => setActiveTab('reetiquetado')}
        />
      )}

      {/* Print Labels Dialog */}
      <PrintDialog
        open={showPrintModal}
        onClose={() => {
          setShowPrintModal(false);
          setHusToPrint([]);
        }}
        hus={husToPrint}
      />
    </div>
  );
}

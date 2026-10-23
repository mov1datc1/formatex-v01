import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import { WmsIcon, KpiIcon } from '../../components/icons/WmsIcons';
import {
  ArrowRight, X, FileText, Printer, Truck, Camera, CheckCircle2,
  Calendar, Layers, MapPin, Scale, Clock, ShieldCheck, Upload, Eye
} from 'lucide-react';

const LABEL_TYPES = [
  {
    id: 'LOCAL_INFERIOR',
    label: '1. Local (Nivel Inferior)',
    desc: 'Reparto local ZMG en camionetas Formatex. Estiba en piso.',
    color: 'border-blue-300 bg-blue-50/60 text-blue-900',
    badge: 'bg-blue-600 text-white',
  },
  {
    id: 'FORANEO_SUPERIOR',
    label: '2. Foránea (Nivel Superior)',
    desc: 'Fleteras pesadas consolidadas fuera de Jalisco. Racks altos.',
    color: 'border-purple-300 bg-purple-50/60 text-purple-900',
    badge: 'bg-purple-600 text-white',
  },
  {
    id: 'OCOTLAN',
    label: '3. Ruta Ocotlán (Fija)',
    desc: 'Salida fija Martes y Jueves mañana. Preparar Lunes/Miércoles.',
    color: 'border-amber-300 bg-amber-50/60 text-amber-900',
    badge: 'bg-amber-600 text-white',
  },
  {
    id: 'PAQUETERIA',
    label: '4. Paqueterías (Paquetexpress/Travisa)',
    desc: 'Corte diario 14:00 hrs. Requiere peso (kg) y medidas (cm).',
    color: 'border-emerald-300 bg-emerald-50/60 text-emerald-900',
    badge: 'bg-emerald-600 text-white',
  },
];

export default function EnvioPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'in_transit' | 'calendar'>('pending');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [transportista, setTransportista] = useState('');
  const [guia, setGuia] = useState('');
  const [placas, setPlacas] = useState('');
  const [chofer, setChofer] = useState('');
  const [labelType, setLabelType] = useState('LOCAL_INFERIOR');
  const [pesoKg, setPesoKg] = useState('');
  const [largoCm, setLargoCm] = useState('');
  const [anchoCm, setAnchoCm] = useState('');
  const [altoCm, setAltoCm] = useState('');
  const [evidenciaFotoUrl, setEvidenciaFotoUrl] = useState('');
  const [notas, setNotas] = useState('');
  const [firmaRecibido, setFirmaRecibido] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal para subir evidencia en envíos en tránsito
  const [evidenceModalShipment, setEvidenceModalShipment] = useState<any>(null);
  const [evidenceInputUrl, setEvidenceInputUrl] = useState('');
  const [evidenceTracking, setEvidenceTracking] = useState('');

  // Pedidos FACTURADOS listos para despacho
  const { data: resp, refetch } = useApi<PaginatedResponse<any>>(
    ['shipping-orders'],
    '/orders',
    { estado: 'FACTURADO', limit: 50 }
  );
  const orders = resp?.data || [];

  // Envíos EN_TRANSITO
  const { data: shipmentsResp, refetch: refetchShipments } = useApi<PaginatedResponse<any>>(
    ['shipments-in-transit'],
    '/shipping/shipments',
    { estado: 'EN_TRANSITO', limit: 50 }
  );
  const inTransitShipments = shipmentsResp?.data || [];

  const loadDetail = async (orderId: string) => {
    try {
      const res = await api.get(`/orders/${orderId}`);
      setSelectedOrder(res.data);
      // Precargar datos si vienen definidos en el pedido
      if (res.data.fletera) setTransportista(res.data.fletera);
      if (res.data.guiaEnvio) setGuia(res.data.guiaEnvio);
      if (res.data.tipoEtiquetaEmbarque) setLabelType(res.data.tipoEtiquetaEmbarque);
      else if (res.data.fletera?.toLowerCase().includes('paquetexpress') || res.data.fletera?.toLowerCase().includes('travisa')) {
        setLabelType('PAQUETERIA');
      } else if (res.data.client?.poblacion?.toLowerCase().includes('ocotlan') || res.data.client?.poblacion?.toLowerCase().includes('poncitlan')) {
        setLabelType('OCOTLAN');
      }
    } catch {
      toast.error('Error al cargar pedido');
    }
  };

  const dispatch = async () => {
    if (!selectedOrder) return;
    if (!transportista) return toast.error('Ingresa el transportista o fletera');
    if (labelType === 'PAQUETERIA' && !pesoKg) {
      return toast.error('Para paqueterías (Paquetexpress) es obligatorio registrar el peso en kg');
    }

    setIsSubmitting(true);
    try {
      await api.post('/shipping/dispatch', {
        orderId: selectedOrder.id,
        transportista,
        guiaEnvio: guia || undefined,
        placas: placas || undefined,
        chofer: chofer || undefined,
        labelType,
        evidenciaFotoUrl: evidenciaFotoUrl || undefined,
        pesoKg: pesoKg ? parseFloat(pesoKg) : undefined,
        largoCm: largoCm ? parseFloat(largoCm) : undefined,
        anchoCm: anchoCm ? parseFloat(anchoCm) : undefined,
        altoCm: altoCm ? parseFloat(altoCm) : undefined,
        notas: notas || undefined,
      });

      toast.success(`Pedido ${selectedOrder.codigo} DESPACHADO exitosamente`);
      setSelectedOrder(null);
      setTransportista('');
      setGuia('');
      setPlacas('');
      setChofer('');
      setPesoKg('');
      setLargoCm('');
      setAnchoCm('');
      setAltoCm('');
      setEvidenciaFotoUrl('');
      setNotas('');
      setFirmaRecibido(false);
      refetch();
      refetchShipments();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al despachar el pedido');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEvidence = async () => {
    if (!evidenceModalShipment) return;
    if (!evidenceInputUrl && !evidenceTracking) {
      return toast.error('Ingresa al menos el tracking o la foto de la guía');
    }

    try {
      await api.put(`/shipping/shipments/${evidenceModalShipment.id}/upload-evidence`, {
        evidenciaFotoUrl: evidenceInputUrl,
        guiaEnvio: evidenceTracking || undefined,
      });
      toast.success('Evidencia de guía y tracking guardados exitosamente');
      setEvidenceModalShipment(null);
      setEvidenceInputUrl('');
      setEvidenceTracking('');
      refetchShipments();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al subir evidencia');
    }
  };

  const handleSimulatePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Usar data URL para preview y guardado directo de evidencia fotográfica
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setEvidenciaFotoUrl(url);
        toast.success('Fotografía de la guía capturada correctamente');
      };
      reader.readAsDataURL(file);
    }
  };

  const printSalida = () => {
    if (!selectedOrder) return;
    const printWindow = window.open('', '_blank', 'width=850,height=700');
    if (!printWindow) return toast.error('Habilita los popups');

    const selectedLabelObj = LABEL_TYPES.find(l => l.id === labelType);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head>
        <title>Hoja de Embarque y Salida — ${selectedOrder.codigo}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; margin: 18mm; color: #1e293b; font-size: 12px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
          .brand { color: #1e3a8a; font-weight: 900; font-size: 20px; }
          .label-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 11px; background: #0f172a; color: #fff; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          th { background: #f8fafc; font-weight: 700; font-size: 11px; }
          .box-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 10px 0; }
          .card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; background: #f8fafc; }
          .card-title { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
          .card-val { font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 2px; }
          .totals { text-align: right; margin-top: 12px; }
          .totals .total { font-size: 16px; font-weight: 800; color: #059669; }
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
          .sig-box { width: 180px; text-align: center; border-top: 1px solid #475569; padding-top: 6px; font-size: 10px; }
          @media print { @page { size: A4; margin: 12mm; } }
        </style>
      </head><body>
        <div class="header">
          <div>
            <span class="brand">FORMATEX WMS 360°</span>
            <div style="font-size: 11px; color: #64748b;">FORMA TEXTIL S. DE R.L. DE C.V. — NAVE CENTRAL</div>
            <div class="label-badge">ETIQUETA: ${selectedLabelObj?.label || labelType}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 16px; font-weight: 800; color: #0f172a;">${selectedOrder.codigo}</div>
            <div style="font-size: 11px; color: #64748b;">Fecha: ${new Date().toLocaleDateString('es-MX')}</div>
          </div>
        </div>

        <div class="box-grid">
          <div class="card">
            <div class="card-title">Cliente / Destino</div>
            <div class="card-val">${selectedOrder.client?.nombre || '—'}</div>
            <div style="font-size: 10px; color: #64748b;">${selectedOrder.deliveryContactName ? `Recibe: ${selectedOrder.deliveryContactName} (${selectedOrder.deliveryContactPhone || ''})` : ''}</div>
          </div>
          <div class="card">
            <div class="card-title">Transporte & Guía</div>
            <div class="card-val">${transportista || 'Por asignar'}</div>
            <div style="font-size: 10px; color: #64748b;">Guía: <strong>${guia || 'Sin folio'}</strong> ${chofer ? `· Chofer: ${chofer}` : ''}</div>
          </div>
          <div class="card">
            <div class="card-title">Peso & Medidas (Paquetería)</div>
            <div class="card-val">${pesoKg ? `${pesoKg} kg` : 'N/A'}</div>
            <div style="font-size: 10px; color: #64748b;">${largoCm ? `${largoCm}x${anchoCm}x${altoCm} cm` : 'Dimensiones estándar'}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Tela / SKU</th>
              <th>Color</th>
              <th>Lote Asignado</th>
              <th>Mts Requeridos</th>
              <th>Mts Surtidos</th>
              <th>P. Unitario</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
            ${selectedOrder.lineas?.map((l: any) => `
              <tr>
                <td><strong>${l.sku?.nombre || '—'}</strong><br/><small style="color: #64748b;">${l.sku?.codigo || ''}</small></td>
                <td>${l.sku?.color || '—'}</td>
                <td><span style="font-family: monospace; font-size: 10px; background: #e2e8f0; padding: 2px 4px; border-radius: 3px;">${l.assignments?.[0]?.hu?.lote || 'LOTE-ORIGEN'}</span></td>
                <td>${l.metrajeRequerido}m</td>
                <td><strong>${l.metrajeSurtido}m</strong></td>
                <td>$${Number(l.precioUnitario || 0).toFixed(2)}</td>
                <td>$${Number(l.importe || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <p>Subtotal: $${Number(selectedOrder.subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          <p>IVA 16%: $${Number(selectedOrder.iva || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          <p class="total">Total: $${Number(selectedOrder.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        </div>

        ${notas ? `<p style="margin-top: 10px; font-size: 10px; color: #64748b; background: #f1f5f9; padding: 6px; border-radius: 4px;"><strong>Notas:</strong> ${notas}</p>` : ''}

        <div class="signatures">
          <div class="sig-box">Entregó (Almacén / Embarques)</div>
          <div class="sig-box">Recibió (Fletera / Chofer)</div>
          <div class="sig-box">Autorizó (Seguridad / Rampa)</div>
        </div>
        <script>window.onload = () => { window.print(); }</script>
      </body></html>
    `);
    printWindow.document.close();
    toast.success('Generando Hoja de Embarque');
  };

  return (
    <div className="space-y-6 animate-fade-in text-xs">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <KpiIcon icon={WmsIcon.Shipping} gradient="from-slate-800 to-indigo-950" />
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Embarques, Fleteras & Salida de Almacén</h1>
            <p className="text-slate-500 text-xs">
              Protocolo de las 4 etiquetas oficiales, pesaje volumétrico, captura de guía física sellada y tracking digital
            </p>
          </div>
        </div>

        {/* Pestañas Superiores */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start md:self-auto border border-slate-200">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📦 Facturados ({orders?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('in_transit')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'in_transit'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🚚 En Tránsito ({inTransitShipments?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🗓️ Calendario de Rutas
          </button>
        </div>
      </div>

      {/* TAB 1: FACTURADOS PENDIENTES DE DESPACHO */}
      {activeTab === 'pending' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Pedidos */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Listos para Embarque ({orders?.length || 0})
              </h2>
              <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Factura Emitida
              </span>
            </div>

            {!orders?.length ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 shadow-xs">
                <Truck size={36} className="mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-600">No hay pedidos facturados pendientes</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Los pedidos aparecerán aquí al concluir facturación CFDI</p>
              </div>
            ) : (
              orders.map((o: any) => (
                <div
                  key={o.id}
                  onClick={() => loadDetail(o.id)}
                  className={`w-full text-left bg-white rounded-2xl border p-4 hover:shadow-md transition-all cursor-pointer ${
                    selectedOrder?.id === o.id
                      ? 'border-indigo-600 ring-2 ring-indigo-100 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {o.codigo}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      {o.tiempoPromesaSlaHoras ? `⏱️ SLA ${o.tiempoPromesaSlaHoras}h` : 'SLA 48h'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 mt-2 truncate">{o.client?.nombre}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span>{o.client?.poblacion || 'Guadalajara'}</span>
                    <span className="font-mono font-bold text-slate-900">
                      ${Number(o.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Formulario de Despacho y Etiquetado */}
          <div className="lg:col-span-2">
            {!selectedOrder ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 shadow-xs">
                <WmsIcon.Shipping size={48} className="mx-auto mb-3 text-slate-300" />
                <p className="font-bold text-sm text-slate-700">Selecciona un pedido para preparar su embarque</p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Podrás elegir entre las 4 etiquetas oficiales, ingresar peso/dimensiones para Paquetexpress y adjuntar la foto de la guía firmada.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
                {/* Header del pedido seleccionado */}
                <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900">{selectedOrder.codigo}</h2>
                      {selectedOrder.facturaRef && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-md border border-emerald-200">
                          CFDI: {selectedOrder.facturaRef}
                        </span>
                      )}
                      {selectedOrder.carritoCorte && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 font-bold text-[10px] rounded-md border border-amber-200 flex items-center gap-1">
                          🛒 {selectedOrder.carritoCorte}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">{selectedOrder.client?.nombre}</p>
                    <p className="text-[11px] text-slate-400">
                      RFC: {selectedOrder.client?.rfc || '—'} · Destino: {selectedOrder.client?.direccion || 'Domicilio Fiscal'} ({selectedOrder.client?.poblacion || ''})
                    </p>
                  </div>
                  <button onClick={() => setSelectedOrder(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                    <X size={18} />
                  </button>
                </div>

                {/* Paso 1: Selección de las 4 Etiquetas Oficiales */}
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2 block flex items-center gap-1.5">
                    <Layers size={14} className="text-indigo-600" />
                    Paso 1: Selecciona la Etiqueta Oficial de Embarque
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {LABEL_TYPES.map(lbl => (
                      <div
                        key={lbl.id}
                        onClick={() => setLabelType(lbl.id)}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          labelType === lbl.id
                            ? `${lbl.color} ring-2 ring-indigo-200 font-bold shadow-xs`
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black">{lbl.label}</span>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            labelType === lbl.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                          }`}>
                            {labelType === lbl.id && <Check size={10} />}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-tight">{lbl.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Paso 2: Datos de Transporte & Fletera */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">Transportista / Fletera *</label>
                    <input
                      value={transportista}
                      onChange={e => setTransportista(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      placeholder="Paquetexpress, Travisa, Castores, Camioneta Propia..."
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">Número de Guía / Folio de Tracking</label>
                    <input
                      value={guia}
                      onChange={e => setGuia(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      placeholder="Ej. PE-89210948..."
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">Nombre del Chofer / Transportista</label>
                    <input
                      value={chofer}
                      onChange={e => setChofer(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      placeholder="Chofer asignado..."
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">Placas de la Unidad (Opcional)</label>
                    <input
                      value={placas}
                      onChange={e => setPlacas(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 text-slate-900 font-mono"
                      placeholder="Ej. JZ-4921-A"
                    />
                  </div>
                </div>

                {/* Paso 3: Medidas y Peso (Requerido para Paquetexpress / Paqueterías) */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  labelType === 'PAQUETERIA' ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <Scale size={14} className={labelType === 'PAQUETERIA' ? 'text-amber-600' : 'text-slate-500'} />
                      Peso Real & Dimensiones Volumétricas {labelType === 'PAQUETERIA' ? '(Obligatorio para Paquetexpress)' : '(Opcional)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 mb-0.5 block">Peso (kg) *</label>
                      <input
                        type="number"
                        step="0.1"
                        value={pesoKg}
                        onChange={e => setPesoKg(e.target.value)}
                        placeholder="Ej: 24.5"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 mb-0.5 block">Largo (cm)</label>
                      <input
                        type="number"
                        value={largoCm}
                        onChange={e => setLargoCm(e.target.value)}
                        placeholder="Ej: 140"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 mb-0.5 block">Ancho (cm)</label>
                      <input
                        type="number"
                        value={anchoCm}
                        onChange={e => setAnchoCm(e.target.value)}
                        placeholder="Ej: 30"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 mb-0.5 block">Alto (cm)</label>
                      <input
                        type="number"
                        value={altoCm}
                        onChange={e => setAltoCm(e.target.value)}
                        placeholder="Ej: 30"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Paso 4: Evidencia Fotográfica de la Guía Sellada */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <Camera size={14} className="text-blue-600" />
                      Captura Digital de la Guía Física Sellada (Sustituye fotos de WhatsApp)
                    </span>
                    {evidenciaFotoUrl && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 size={12} /> Foto adjunta
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-2 shrink-0">
                      <Upload size={14} />
                      <span>Tomar Foto / Subir Imagen</span>
                      <input type="file" accept="image/*" capture="environment" onChange={handleSimulatePhotoUpload} className="hidden" />
                    </label>
                    <input
                      type="text"
                      value={evidenciaFotoUrl}
                      onChange={e => setEvidenciaFotoUrl(e.target.value)}
                      placeholder="O pega URL de imagen de la guía..."
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                    />
                  </div>

                  {evidenciaFotoUrl && (
                    <div className="mt-2 p-2 bg-white rounded-lg border border-slate-200 flex items-center gap-3">
                      <img src={evidenciaFotoUrl} alt="Guía sellada" className="w-16 h-16 object-cover rounded-md border" />
                      <div className="text-[11px] text-slate-600">
                        <p className="font-bold text-slate-900">Evidencia de acuse lista para archivo</p>
                        <p className="text-slate-400">Esta fotografía quedará ligada al pedido y visible para ATC y el cliente.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notas y Checklist */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 block">Notas de Embarque</label>
                  <textarea
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                    placeholder="Observaciones de estiba, sello de seguridad o instrucciones..."
                  />
                </div>

                <label className="flex items-center gap-3 p-3 bg-amber-50/80 border border-amber-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={firmaRecibido}
                    onChange={e => setFirmaRecibido(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-amber-900 font-semibold">
                    Confirmo que los bultos fueron inspeccionados físicamente, etiquetados con "{LABEL_TYPES.find(l => l.id === labelType)?.label}" y entregados completos.
                  </span>
                </label>

                {/* Acciones */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={printSalida}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Printer size={15} /> Imprimir Hoja de Salida
                  </button>
                  <button
                    type="button"
                    onClick={dispatch}
                    disabled={!firmaRecibido || !transportista || isSubmitting}
                    className="flex-1 py-2.5 bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 text-white rounded-xl font-black text-xs disabled:opacity-40 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                  >
                    <WmsIcon.Dispatched size={16} />
                    <span>{isSubmitting ? 'Despachando...' : 'Confirmar Despacho y Salida'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ENVÍOS EN TRÁNSITO & SUBIDA DE ACUSES */}
      {activeTab === 'in_transit' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">Envíos en Tránsito ({inTransitShipments.length})</h2>
              <p className="text-slate-500 text-xs">Carga de acuses de recibo para choferes locales y fleteras foráneas</p>
            </div>
            <button
              onClick={() => refetchShipments()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Clock size={14} /> Actualizar
            </button>
          </div>

          {!inTransitShipments.length ? (
            <div className="text-center py-12 text-slate-400">
              <Truck size={40} className="mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-slate-600">No hay envíos en tránsito actualmente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold text-[11px]">
                    <th className="py-2.5 px-3">Folio Envío</th>
                    <th className="py-2.5 px-3">Pedido</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Transportista</th>
                    <th className="py-2.5 px-3">Guía Oficial</th>
                    <th className="py-2.5 px-3">Etiqueta</th>
                    <th className="py-2.5 px-3">Acuse / Evidencia</th>
                    <th className="py-2.5 px-3 text-right">Acción Chofer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inTransitShipments.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 font-mono font-bold text-indigo-700">{s.codigo}</td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-800">{s.order?.codigo}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{s.order?.client?.nombre || '—'}</td>
                      <td className="py-3 px-3 text-slate-700 font-medium">{s.transportista || '—'}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{s.guiaEnvio || 'Sin guía'}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {s.labelType || 'LOCAL_INFERIOR'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {s.evidenciaFotoUrl ? (
                          <a
                            href={s.evidenciaFotoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:underline"
                          >
                            <Eye size={12} /> Ver Acuse
                          </a>
                        ) : (
                          <span className="text-amber-600 font-semibold text-[11px]">Pendiente acuse</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setEvidenceModalShipment(s);
                            setEvidenceTracking(s.guiaEnvio || '');
                            setEvidenceInputUrl(s.evidenciaFotoUrl || '');
                          }}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-[11px] cursor-pointer"
                        >
                          📷 Subir Acuse
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CALENDARIO OFICIAL DE RUTAS & HORARIOS */}
      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <Truck size={18} />
              </span>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Ruta Ocotlán / Poncitlán (Fija)</h3>
                <p className="text-[11px] text-slate-500">Salidas Martes y Jueves en la mañana</p>
              </div>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
              <p>• <strong>Días de salida:</strong> Martes y Jueves a primera hora (08:30 hrs).</p>
              <p>• <strong>Corte de surtido y empaque:</strong> Lunes y Miércoles antes de las 18:00 hrs.</p>
              <p>• <strong>Regla:</strong> Si un pedido concluye el lunes después de las 18:00, se programa obligatoriamente para el jueves.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-100 text-purple-800">
                <MapPin size={18} />
              </span>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Ruta Arandas / Altos de Jalisco</h3>
                <p className="text-[11px] text-slate-500">Salida Miércoles en la mañana</p>
              </div>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-[11px] text-purple-900 space-y-1">
              <p>• <strong>Día de salida:</strong> Miércoles en la mañana.</p>
              <p>• <strong>Corte de preparación:</strong> Martes antes del cierre de turno.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                <Clock size={18} />
              </span>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Paqueterías Externas (Paquetexpress, Travisa, Tres Guerras)</h3>
                <p className="text-[11px] text-slate-500">Corte diario de preparación a las 14:00 hrs</p>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
              <p>• <strong>Corte de recolección:</strong> 14:00 hrs diarias.</p>
              <p>• <strong>Requisito Paquetexpress:</strong> Etiquetado con peso real (kg) y dimensiones (cm) en báscula.</p>
              <p>• <strong>Corte posterior a 14:00 hrs:</strong> Se recolecta hasta el siguiente día hábil.</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal para subir evidencia en envíos en tránsito */}
      {evidenceModalShipment && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-black text-sm text-slate-900">Subir Acuse Sellado de Fletera</h3>
                <p className="text-[11px] text-slate-500">Envío {evidenceModalShipment.codigo} · Pedido {evidenceModalShipment.order?.codigo}</p>
              </div>
              <button onClick={() => setEvidenceModalShipment(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 mb-1 block">Folio de Guía / Tracking Oficial</label>
                <input
                  type="text"
                  value={evidenceTracking}
                  onChange={e => setEvidenceTracking(e.target.value)}
                  placeholder="Número de guía..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 mb-1 block">Fotografía del Acuse de Recibo</label>
                <input
                  type="text"
                  value={evidenceInputUrl}
                  onChange={e => setEvidenceInputUrl(e.target.value)}
                  placeholder="URL o captura de la foto..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 mb-2"
                />
                <label className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl font-bold text-slate-700 text-xs flex items-center justify-center gap-2 cursor-pointer transition-all">
                  <Camera size={14} /> Tomar Foto con Cámara
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = ev => setEvidenceInputUrl(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {evidenceInputUrl && (
                <div className="p-2 border rounded-lg bg-slate-50">
                  <img src={evidenceInputUrl} alt="Acuse preview" className="w-full h-32 object-contain rounded" />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEvidenceModalShipment(null)}
                className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEvidence}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md"
              >
                Guardar Acuse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import {
  Building2, Truck, Clock, CheckCircle2, Search, Copy, Check,
  FileText, Plus, AlertTriangle, ArrowRight, RefreshCw, X,
  Sparkles, Printer, Mail, Package, CheckSquare, Square
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import NuevaRequisicionTelaresModal, { type RequisicionLine } from './NuevaRequisicionTelaresModal';

function formatStoDate(dateInput?: string | Date): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const day = String(d.getDate()).padStart(2, '0');
  const mon = months[d.getMonth()] || 'Oct';
  const yr = d.getFullYear();
  return `${day}/${mon}/${yr}`;
}

export function printOrdenCompraTelaresPdf(req: any) {
  const printWindow = window.open('', '_blank', 'width=920,height=780');
  if (!printWindow) {
    toast.error('Habilita las ventanas emergentes para descargar/imprimir el PDF');
    return;
  }

  const empresa = (req.empresaEmisora || 'FORMATEX').toUpperCase();
  const folio = req.folioSto || req.codigo || 'STO 7177';
  const fechaStr = formatStoDate(req.createdAt);
  const proveedorNombre = req.proveedorNombre || 'TELARES Y TEJIDOS';
  const proveedorRfc = req.proveedorRfc || 'TTE140429HZ6';
  const proveedorDomicilio =
    req.proveedorDomicilio ||
    'Avenida Dr. Roberto Michel 2903, El Mirador Álamo, C.P. 44895, Guadalajara, Jalisco';
  const domicilioEntrega = req.domicilioEntrega || 'Clz. J. Gonzalez Gallo 1505 Col. Atlas';
  const referencia = req.referencia || 'PRIORIDAD #1';
  const observaciones = req.notas || '';

  const rowsHtml = (req.lineas || [])
    .map((l: any) => {
      const concepto = (
        l.notas ||
        `${l.sku?.nombre || 'TELA'}${l.sku?.color ? ` ${l.sku.color}` : ''}`
      ).toUpperCase();
      const cantidad = Number(l.metrajeTotal || (l.cantidadRollos || 1) * 50);
      return `
        <tr>
          <td class="col-concepto">${concepto}</td>
          <td class="col-num">${cantidad}</td>
          <td class="col-unit">METRO</td>
          <td class="col-val"></td>
          <td class="col-desc"></td>
          <td class="col-imp">IVA - 0,</td>
          <td class="col-tot"></td>
        </tr>
      `;
    })
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Orden de Compra ${folio} — ${proveedorNombre}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          margin: 18mm 16mm;
          color: #111827;
          font-size: 12px;
          line-height: 1.45;
        }
        .top-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 26px;
        }
        .brand-logo {
          font-size: 46px;
          font-weight: 900;
          letter-spacing: 6px;
          color: #111827;
          line-height: 1;
        }
        .brand-sub {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 2.5px;
          text-align: right;
          margin-top: 4px;
          color: #1f2937;
        }
        .doc-box {
          width: 280px;
        }
        .doc-title {
          font-size: 22px;
          font-weight: 800;
          text-align: center;
          margin-bottom: 14px;
          color: #111827;
        }
        .doc-meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 4px;
        }
        .doc-meta-label {
          font-weight: 700;
          color: #111827;
        }
        .doc-meta-val {
          font-weight: 700;
          color: #111827;
          text-align: right;
        }
        .section-block {
          margin-bottom: 14px;
        }
        .section-heading {
          font-size: 12px;
          font-weight: 800;
          color: #111827;
          margin-bottom: 4px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 95px 1fr;
          row-gap: 3px;
          font-size: 12px;
        }
        .info-label {
          font-weight: 700;
          color: #1f2937;
        }
        .info-val {
          font-weight: 700;
          color: #111827;
        }
        .info-val-normal {
          font-weight: 500;
          color: #1f2937;
        }
        table.items-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
          margin-bottom: 24px;
        }
        table.items-table thead th {
          font-size: 11px;
          font-weight: 800;
          color: #111827;
          padding: 8px 6px;
          border-bottom: 1.5px solid #111827;
          text-align: left;
        }
        table.items-table tbody td {
          padding: 10px 6px;
          font-size: 11.5px;
          color: #1f2937;
        }
        .col-concepto { width: 42%; font-weight: 600; }
        .col-num { width: 10%; text-align: right; font-weight: 600; padding-right: 16px !important; }
        .col-unit { width: 10%; text-align: left; font-weight: 600; }
        .col-val { width: 11%; text-align: right; }
        .col-desc { width: 10%; text-align: right; }
        .col-imp { width: 10%; text-align: center; font-weight: 500; }
        .col-tot { width: 7%; text-align: right; }
        .footer-split {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-top: 1px solid #d1d5db;
          padding-top: 16px;
          margin-top: 20px;
        }
        .footer-left {
          width: 60%;
          font-size: 12px;
        }
        .footer-left-row {
          margin-bottom: 8px;
        }
        .footer-right {
          width: 32%;
          font-size: 12px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-weight: 800;
        }
        @media print {
          @page { size: letter; margin: 14mm; }
        }
      </style>
    </head>
    <body>
      <div class="top-header">
        <div>
          <div class="brand-logo">${empresa}</div>
          <div class="brand-sub">${empresa === 'DICATEX' ? 'EST. 2010' : 'WMS 360°'}</div>
        </div>
        <div class="doc-box">
          <div class="doc-title">Orden de Compra</div>
          <div class="doc-meta-row">
            <span class="doc-meta-label">Folio:</span>
            <span class="doc-meta-val">${folio}</span>
          </div>
          <div class="doc-meta-row">
            <span class="doc-meta-label">Fecha:</span>
            <span class="doc-meta-val">${fechaStr}</span>
          </div>
        </div>
      </div>

      <div class="section-block">
        <div class="section-heading">Datos del proveedor</div>
        <div class="info-grid">
          <div class="info-label">Proveedor:</div>
          <div class="info-val">${proveedorNombre}</div>
          <div class="info-label">RFC:</div>
          <div class="info-val">${proveedorRfc}</div>
          <div class="info-label">Domicilio:</div>
          <div class="info-val-normal">${proveedorDomicilio}</div>
        </div>
      </div>

      <div class="section-block">
        <div class="section-heading">Datos de Entrega</div>
        <div class="info-grid">
          <div class="info-label">Domicilio:</div>
          <div class="info-val">${domicilioEntrega}</div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th class="col-concepto" style="text-align: center;">Concepto / Descripción</th>
            <th class="col-num">Cantidad</th>
            <th class="col-unit">Unidad</th>
            <th class="col-val">Valor unitario</th>
            <th class="col-desc">Descuentos</th>
            <th class="col-imp">Impuestos</th>
            <th class="col-tot">Importe</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="footer-split">
        <div class="footer-left">
          <div class="footer-left-row">
            <div style="font-weight: 800;">Importe con letra:</div>
            <div>cero Pesos 00/100 M.N.</div>
          </div>
          <div class="footer-left-row" style="display: grid; grid-template-columns: 110px 1fr;">
            <span style="font-weight: 800;">Referencia:</span>
            <span>${referencia}</span>
          </div>
          <div class="footer-left-row" style="display: grid; grid-template-columns: 110px 1fr;">
            <span style="font-weight: 800;">Observaciones:</span>
            <span>${observaciones}</span>
          </div>
        </div>

        <div class="footer-right">
          <div class="totals-row"><span>Subtotal:</span><span></span></div>
          <div class="totals-row"><span>Descuentos:</span><span></span></div>
          <div class="totals-row"><span>Impuestos Trasladados:</span><span></span></div>
          <div class="totals-row"><span>Total:</span><span></span></div>
        </div>
      </div>

      <script>window.onload = () => { window.print(); };</script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

export default function RequisicionesTelaresTab({ onRefresh }: { onRefresh?: () => void }) {
  const [activeSubTab, setActiveSubTab] = useState<'ordenes' | 'backorders'>('backorders');
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<'all' | 'CONFIRMADA' | 'EN_TRANSITO' | 'COMPLETADA'>('all');
  const [showNuevaReq, setShowNuevaReq] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedOrdenPdf, setSelectedOrdenPdf] = useState<any | null>(null);
  const [emailModalReq, setEmailModalReq] = useState<any | null>(null);
  const [emailInput, setEmailInput] = useState('encargada.telares@telaresytejidos.com.mx');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Monitor de Backorders state
  const [boFilter, setBoFilter] = useState<'BACKORDER' | 'CUBIERTO' | 'ALL'>('BACKORDER');
  const [boSearch, setBoSearch] = useState('');
  const [selectedBoIds, setSelectedBoIds] = useState<string[]>([]);

  // Sugerencia 8 Meses (Levantamiento Israel / Almacén)
  const [showSugerenciaModal, setShowSugerenciaModal] = useState(false);
  const [sugerenciaData, setSugerenciaData] = useState<any | null>(null);
  const [loadingSugerencia, setLoadingSugerencia] = useState(false);
  const [initialLineasForNewReq, setInitialLineasForNewReq] = useState<RequisicionLine[]>([]);
  const [initialRefForNewReq, setInitialRefForNewReq] = useState('PRIORIDAD #1');

  const { data: requisiciones, isLoading, refetch, isFetching } = useApi<any[]>(
    ['requisiciones-telares', search, filterEstado],
    '/purchasing/requisiciones-telares',
    {
      search: search || undefined,
      estado: filterEstado === 'all' ? undefined : filterEstado,
    }
  );

  const {
    data: backordersMonitor,
    isLoading: loadingBoMonitor,
    refetch: refetchBoMonitor,
  } = useApi<any>(['backorders-monitor-warehouse'], '/purchasing/requisiciones-telares/backorders-monitor');

  const boItems: any[] = backordersMonitor?.items || [];
  const filteredBoItems = boItems.filter((item) => {
    if (boFilter === 'BACKORDER' && !item.esBackorder) return false;
    if (boFilter === 'CUBIERTO' && item.esBackorder) return false;
    if (boSearch.trim()) {
      const q = boSearch.toLowerCase();
      return (
        item.orderCodigo?.toLowerCase().includes(q) ||
        item.clienteNombre?.toLowerCase().includes(q) ||
        item.skuNombre?.toLowerCase().includes(q) ||
        item.skuCodigo?.toLowerCase().includes(q) ||
        item.skuColor?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const toggleSelectBoItem = (id: string) => {
    setSelectedBoIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleGenerateReqFromBackorders = (itemsToUse?: any[]) => {
    const sourceItems = itemsToUse || boItems.filter((i) => selectedBoIds.includes(i.id));
    if (!sourceItems.length) {
      toast.error('Selecciona al menos una partida en Backorder para generar la requisición a Telares');
      return;
    }

    // Consolidar por SKU sumando metros requeridos
    const grouped = new Map<string, RequisicionLine>();
    for (const it of sourceItems) {
      const existing = grouped.get(it.skuId);
      const metros = Number(it.metrosASolicitarTelares || it.metrajeRequerido || 100);
      const concepto = `${it.skuNombre || ''}${it.skuColor ? ` ${it.skuColor}` : ''}`.trim().toUpperCase();
      if (existing) {
        const nuevoMetraje = existing.metrajeTotal + metros;
        existing.metrajeTotal = nuevoMetraje;
        existing.cantidadRollos = Math.max(1, Math.ceil(nuevoMetraje / 50));
      } else {
        grouped.set(it.skuId, {
          skuId: it.skuId,
          skuLabel: `${it.skuNombre}${it.skuColor ? ` ${it.skuColor}` : ''}`,
          skuColor: it.skuColor,
          metrajeTotal: metros,
          cantidadRollos: Math.max(1, Math.ceil(metros / 50)),
          conceptoOverride: concepto,
        });
      }
    }

    setInitialLineasForNewReq(Array.from(grouped.values()));
    setInitialRefForNewReq('PRIORIDAD #1');
    setShowNuevaReq(true);
  };

  const handleSendEmailToTelares = async () => {
    if (!emailModalReq) return;
    setSendingEmail(true);
    try {
      await api.post(`/purchasing/requisiciones-telares/${emailModalReq.id}/send-email`, {
        emailTelares: emailInput,
      });
    } catch {
      // ignore if backend is still deploying
    } finally {
      setSendingEmail(false);
    }

    const folio = emailModalReq.folioSto || emailModalReq.codigo;
    const linesSummary = (emailModalReq.lineas || [])
      .map(
        (l: any) =>
          `- ${(l.notas || `${l.sku?.nombre || ''} ${l.sku?.color || ''}`).trim().toUpperCase()}: ${l.metrajeTotal} METRO`
      )
      .join('%0D%0A');

    const subject = encodeURIComponent(`Orden de Compra ${folio} - Requisicion de Tela a Telares y Tejidos`);
    const body =
      `Estimada encargada de Telares y Tejidos,%0D%0A%0D%0A` +
      `Adjunto Orden de Compra / Requisicion de Almacen con Folio ${folio} (${emailModalReq.referencia || 'PRIORIDAD #1'}).%0D%0A%0D%0A` +
      `Proveedor: TELARES Y TEJIDOS (TTE140429HZ6)%0D%0A` +
      `Domicilio de Entrega: ${emailModalReq.domicilioEntrega || 'Clz. J. Gonzalez Gallo 1505 Col. Atlas'}%0D%0A%0D%0A` +
      `Conceptos solicitados:%0D%0A${linesSummary}%0D%0A%0D%0A` +
      `Saludos cordiales,%0D%0A${emailModalReq.solicitante || 'Jefe de Almacen Formatex'}`;

    window.open(`mailto:${emailInput}?subject=${subject}&body=${body}`, '_blank');
    toast.success(`Orden de Compra ${folio} preparada para envío a ${emailInput}`);
    setEmailModalReq(null);
    refetch();
  };

  const handleCopyWhatsApp = (req: any) => {
    const lines = req.lineas || [];
    const fabricList = lines
      .map(
        (l: any) =>
          `• *${(l.notas || `${l.sku?.nombre || 'Tela'} ${l.sku?.color || ''}`).trim()}*: *${l.metrajeTotal} METRO* (${l.cantidadRollos} rollos)`
      )
      .join('\n');

    const text =
      `🏢 *ORDEN DE COMPRA / REQUISICIÓN A TELARES Y TEJIDOS*\n` +
      `📋 *Folio:* ${req.folioSto || req.codigo}\n` +
      `👤 *Solicitado por:* ${req.solicitante || 'Israel (Jefe de Almacén)'}\n` +
      `📍 *Entrega:* ${req.domicilioEntrega || 'Clz. J. Gonzalez Gallo 1505 Col. Atlas'}\n` +
      `⚡ *Referencia:* ${req.referencia || 'PRIORIDAD #1'}\n\n` +
      `*CONCEPTOS SOLICITADOS:*\n${fabricList}\n\n` +
      `*Total:* ${req.totalMetros?.toLocaleString() || 0} METRO (${req.totalRollos || 0} rollos)`;

    navigator.clipboard.writeText(text);
    setCopiedId(req.id);
    toast.success('Orden copiada al portapapeles');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleStatusChange = async (id: string, nuevoEstado: 'EN_TRANSITO' | 'COMPLETADA') => {
    try {
      await api.put(`/purchasing/requisiciones-telares/${id}/status`, { estado: nuevoEstado });
      toast.success(
        nuevoEstado === 'EN_TRANSITO'
          ? 'Requisición en ruta — Camioneta en trayecto desde Telares'
          : 'Requisición recibida y completada en Almacén'
      );
      refetch();
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al actualizar estatus');
    }
  };

  const filtered = (requisiciones || []).filter((r: any) => {
    if (filterEstado !== 'all' && r.estado !== filterEstado) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchCode = r.codigo?.toLowerCase().includes(q) || r.folioSto?.toLowerCase().includes(q);
      const matchSolicitante = r.solicitante?.toLowerCase().includes(q);
      const matchNotas = r.notas?.toLowerCase().includes(q);
      const matchLine = r.lineas?.some(
        (l: any) =>
          l.notas?.toLowerCase().includes(q) ||
          l.sku?.nombre?.toLowerCase().includes(q) ||
          l.sku?.codigo?.toLowerCase().includes(q) ||
          l.sku?.color?.toLowerCase().includes(q)
      );
      if (!matchCode && !matchSolicitante && !matchNotas && !matchLine) return false;
    }
    return true;
  });

  const handleLoadSugerencia = async () => {
    setLoadingSugerencia(true);
    setShowSugerenciaModal(true);
    try {
      const res = await api.get('/purchasing/requisiciones-telares/sugerencia-8-meses');
      setSugerenciaData(res.data);
    } catch {
      toast.error('Error al calcular la sugerencia de 8 meses');
    } finally {
      setLoadingSugerencia(false);
    }
  };

  const handleCreateFromSugerencia = () => {
    if (!sugerenciaData?.sugerencias?.length) return;
    const initialLines: RequisicionLine[] = sugerenciaData.sugerencias.slice(0, 12).map((s: any) => ({
      skuId: s.skuId,
      skuLabel: `${s.skuNombre}${s.color ? ` ${s.color}` : ''}`,
      skuColor: s.color,
      cantidadRollos: s.rollosSugeridos,
      metrajeTotal: s.rollosSugeridos * s.metrajePorRollo,
      conceptoOverride: `${s.skuNombre || ''}${s.color ? ` ${s.color}` : ''}`.trim().toUpperCase(),
    }));
    setInitialLineasForNewReq(initialLines);
    setInitialRefForNewReq('PRIORIDAD #1');
    setShowSugerenciaModal(false);
    setShowNuevaReq(true);
  };

  return (
    <div className="space-y-5 animate-fade-in text-xs">
      {/* Banner Principal Jefe de Almacén */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-400/20 flex items-center justify-center text-amber-300 border border-amber-400/30 shrink-0">
              <Building2 size={22} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                  Módulo Exclusivo Jefe de Almacén
                </span>
                <span className="text-white/80 text-xs font-semibold">
                  Proveedor: TELARES Y TEJIDOS (RFC: TTE140429HZ6)
                </span>
              </div>
              <h3 className="text-lg font-black tracking-tight text-white mt-1">
                Monitoreo de Backorders y Requisiciones (Orden de Compra a Telares)
              </h3>
              <p className="text-white/80 text-xs mt-0.5 max-w-3xl">
                El Jefe de Almacén monitorea qué pedidos están en <strong>Backorder</strong> y cuáles tienen stock cubierto, genera la <strong>Orden de Compra / Requisición oficial en PDF</strong> (formato STO) y la envía por correo a la encargada de Telares.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleLoadSugerencia}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-amber-300 border border-amber-300/30 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles size={15} />
              <span>Proyección 8 Meses</span>
            </button>
            <button
              onClick={() => {
                setInitialLineasForNewReq([]);
                setInitialRefForNewReq('PRIORIDAD #1');
                setShowNuevaReq(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 rounded-xl font-black shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Nueva Orden de Compra a Telares</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selector de Pestañas del Jefe de Almacén */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveSubTab('backorders')}
            className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'backorders'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle size={15} className={activeSubTab === 'backorders' ? 'text-amber-400' : 'text-amber-600'} />
            <span>
              1. Monitor de Backorders vs. En Firme ({backordersMonitor?.totalEnBackorder || 0} en Backorder)
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('ordenes')}
            className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'ordenes'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText size={15} className={activeSubTab === 'ordenes' ? 'text-amber-400' : 'text-indigo-600'} />
            <span>2. Órdenes de Compra / Requisiciones a Telares ({requisiciones?.length || 0})</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-semibold px-2">
          ⏰ Corte diario Almacén: <strong>13:00 hrs</strong> · Envío correo a Telares: <strong>14:00 hrs</strong>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* PESTAÑA 1: MONITOR DE BACKORDERS VS PEDIDOS CON STOCK (JEFE ALMACÉN) */}
      {/* ===================================================================== */}
      {activeSubTab === 'backorders' && (
        <div className="space-y-4">
          {/* KPIs rápidos de Backorder vs Cubiertos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-rose-200 p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider">
                  🔴 En Backorder / Sin Stock Local
                </span>
                <p className="text-2xl font-black text-rose-700 mt-0.5">
                  {backordersMonitor?.totalEnBackorder || 0} partidas
                </p>
                <p className="text-[11px] text-slate-500">Requieren solicitar Orden de Compra a Telares</p>
              </div>
              <button
                onClick={() => {
                  const allBo = boItems.filter((i) => i.esBackorder);
                  handleGenerateReqFromBackorders(allBo);
                }}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-[11px] cursor-pointer shadow-xs"
              >
                + Requisitar Todos
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-emerald-200 p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">
                  🟢 Cubiertos en Almacén (No Backorder)
                </span>
                <p className="text-2xl font-black text-emerald-700 mt-0.5">
                  {backordersMonitor?.totalCubiertos || 0} partidas
                </p>
                <p className="text-[11px] text-slate-500">Tienen rollos disponibles en Formatex Zapopan</p>
              </div>
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>

            <div className="bg-white rounded-2xl border border-indigo-200 p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                  📋 Selección para Orden a Telares
                </span>
                <p className="text-2xl font-black text-indigo-900 mt-0.5">
                  {selectedBoIds.length} seleccionados
                </p>
                <p className="text-[11px] text-slate-500">Marca casillas abajo para armar el PDF STO</p>
              </div>
              <button
                onClick={() => handleGenerateReqFromBackorders()}
                disabled={selectedBoIds.length === 0}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl font-black text-[11px] cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <FileText size={14} /> Crear OC ({selectedBoIds.length})
              </button>
            </div>
          </div>

          {/* Barra de filtro de Backorders */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={boSearch}
                onChange={(e) => setBoSearch(e.target.value)}
                placeholder="Buscar por pedido (PED-...), cliente, tela o color..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setBoFilter('BACKORDER')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
                  boFilter === 'BACKORDER'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                🔴 En Backorder ({backordersMonitor?.totalEnBackorder || 0})
              </button>
              <button
                onClick={() => setBoFilter('CUBIERTO')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
                  boFilter === 'CUBIERTO'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                🟢 Con Stock / No Backorder ({backordersMonitor?.totalCubiertos || 0})
              </button>
              <button
                onClick={() => setBoFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
                  boFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Todos ({boItems.length})
              </button>
              <button
                onClick={() => refetchBoMonitor()}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 cursor-pointer"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Tabla de Monitoreo de Backorders */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {loadingBoMonitor ? (
              <div className="p-12 text-center text-slate-400">Cargando monitoreo de backorders...</div>
            ) : filteredBoItems.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                No hay partidas en este filtro. Cambia a "Todos" o "Con Stock".
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">Sel.</th>
                      <th className="py-3 px-3">Estatus Backorder</th>
                      <th className="py-3 px-3">Pedido / Cliente</th>
                      <th className="py-3 px-3">Concepto / Tela Solicitada</th>
                      <th className="py-3 px-3 text-right">Pedido Cliente</th>
                      <th className="py-3 px-3 text-right">Stock Formatex</th>
                      <th className="py-3 px-3 text-right">A Pedir a Telares</th>
                      <th className="py-3 px-3 text-right">Acción Directa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredBoItems.map((item) => {
                      const isSelected = selectedBoIds.includes(item.id);
                      return (
                        <tr
                          key={item.id}
                          onClick={() => toggleSelectBoItem(item.id)}
                          className={`hover:bg-slate-50/90 cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50/60' : ''
                          }`}
                        >
                          <td className="py-3 px-3 text-center">
                            {isSelected ? (
                              <CheckSquare size={16} className="text-indigo-600 mx-auto" />
                            ) : (
                              <Square size={16} className="text-slate-300 mx-auto" />
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {item.esBackorder ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                                🔴 EN BACKORDER
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                🟢 CON STOCK LOCAL
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-mono font-black text-indigo-700">{item.orderCodigo}</div>
                            <div className="text-[11px] font-semibold text-slate-800 truncate max-w-[190px]">
                              {item.clienteNombre}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-black text-slate-900 uppercase">
                              {item.skuNombre} {item.skuColor ? item.skuColor : ''}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">{item.skuCodigo}</div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                            {item.metrajeRequerido} METRO
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-slate-600">
                            {item.stockDisponibleFormatex} m
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              {item.metrosASolicitarTelares} METRO
                            </span>
                          </td>
                          <td
                            className="py-3 px-3 text-right"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateReqFromBackorders([item]);
                            }}
                          >
                            <button
                              type="button"
                              className="px-2.5 py-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-[11px] rounded-lg cursor-pointer"
                            >
                              + Pedir a Telares
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PESTAÑA 2: ÓRDENES DE COMPRA / REQUISICIONES A TELARES (PDF & CORREO) */}
      {/* ===================================================================== */}
      {activeSubTab === 'ordenes' && (
        <div className="space-y-4">
          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por folio (STO 7177, REQ-TNT-...), tela, color o solicitante..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setFilterEstado('all')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  filterEstado === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todas ({requisiciones?.length || 0})
              </button>

              <button
                onClick={() => setFilterEstado('CONFIRMADA')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  filterEstado === 'CONFIRMADA'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                🟡 Solicitadas a Telares
              </button>

              <button
                onClick={() => setFilterEstado('EN_TRANSITO')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  filterEstado === 'EN_TRANSITO'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                🚚 En Ruta Camioneta
              </button>

              <button
                onClick={() => setFilterEstado('COMPLETADA')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  filterEstado === 'COMPLETADA'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                ✅ Recibidas en Almacén
              </button>

              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="p-2 text-gray-500 hover:text-gray-800 bg-gray-50 border border-gray-200 rounded-xl transition-colors cursor-pointer"
                title="Refrescar"
              >
                <RefreshCw size={14} className={isFetching ? 'animate-spin text-blue-600' : ''} />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-2xl border p-12 text-center text-gray-400 animate-pulse">
              <Truck size={36} className="mx-auto mb-2 text-blue-300 animate-bounce" />
              <p className="font-semibold text-gray-600">Cargando órdenes de requisición a Telares...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center text-gray-400">
              <Building2 size={40} className="mx-auto mb-2 text-gray-300" />
              <h4 className="font-bold text-gray-700 text-sm">No hay órdenes de requisición registradas</h4>
              <p className="text-gray-400 mt-1 max-w-md mx-auto">
                Genera una nueva Orden de Compra / Requisición hacia Telares y Tejidos desde aquí o desde el Monitor de Backorders.
              </p>
              <button
                onClick={() => setShowNuevaReq(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                + Crear Orden de Compra a Telares
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((req: any) => {
                const isSolicitada = req.estado === 'CONFIRMADA' || req.estado === 'BORRADOR';
                const isEnRuta = req.estado === 'EN_TRANSITO';
                const isCompletada = req.estado === 'COMPLETADA';

                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all"
                  >
                    {/* Cabecera de la Orden de Compra a Telares */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-black text-xs shrink-0">
                          OC
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-gray-900 text-base">
                              {req.folioSto || req.codigo}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px] border border-slate-200">
                              {req.empresaEmisora || 'FORMATEX'} ➔ TELARES Y TEJIDOS (TTE140429HZ6)
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                isSolicitada
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : isEnRuta
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {isSolicitada && '🟡 Solicitada a Telares'}
                              {isEnRuta && '🚚 En Ruta de Camioneta'}
                              {isCompletada && '✅ Recibida en Almacén'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Ref: {req.referencia || 'PRIORIDAD #1'}
                            </span>
                            {req.enviadoCorreoAt && (
                              <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✉️ Enviada por correo a Telares
                              </span>
                            )}
                          </div>
                          <p className="text-gray-500 text-[11px] mt-1 flex flex-wrap items-center gap-2">
                            <span>
                              Solicitó: <strong className="text-gray-800">{req.solicitante}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Entrega: <strong className="text-gray-700">{req.domicilioEntrega}</strong>
                            </span>
                            <span>•</span>
                            <span>Fecha: {formatStoDate(req.createdAt)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right self-end md:self-auto bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">
                          Total Orden de Compra
                        </span>
                        <span className="font-black text-indigo-800 text-sm">
                          {req.totalMetros?.toLocaleString('es-MX')} METRO
                        </span>
                        <span className="text-slate-500 font-medium ml-1">({req.totalRollos} rollos)</span>
                      </div>
                    </div>

                    {/* Tabla compacta estilo Orden de Compra */}
                    <div className="my-3 border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Concepto / Descripción</th>
                            <th className="py-2 px-3 text-right">Cantidad</th>
                            <th className="py-2 px-3">Unidad</th>
                            <th className="py-2 px-3 text-center">Impuestos</th>
                            <th className="py-2 px-3 text-right">Rollos Est.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(req.lineas || []).map((l: any) => {
                            const concepto = (
                              l.notas ||
                              `${l.sku?.nombre || 'TELA'}${l.sku?.color ? ` ${l.sku.color}` : ''}`
                            ).toUpperCase();
                            return (
                              <tr key={l.id} className="hover:bg-slate-50/70">
                                <td className="py-2 px-3 font-bold text-slate-900">{concepto}</td>
                                <td className="py-2 px-3 text-right font-mono font-black text-indigo-700">
                                  {l.metrajeTotal}
                                </td>
                                <td className="py-2 px-3 font-mono text-slate-600">METRO</td>
                                <td className="py-2 px-3 text-center font-mono text-slate-500">IVA - 0,</td>
                                <td className="py-2 px-3 text-right text-slate-500">{l.cantidadRollos} rollos</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Acciones principales: Ver/Descargar Orden de Compra PDF + Enviar por Correo */}
                    <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setSelectedOrdenPdf(req)}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <FileText size={14} className="text-amber-400" />
                          <span>Ver Orden de Compra PDF (Formato Telares)</span>
                        </button>

                        <button
                          onClick={() => printOrdenCompraTelaresPdf(req)}
                          className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Printer size={14} />
                          <span>Imprimir / Guardar PDF</span>
                        </button>

                        <button
                          onClick={() => {
                            setEmailModalReq(req);
                            setEmailInput(req.emailTelares || 'encargada.telares@telaresytejidos.com.mx');
                          }}
                          className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Mail size={14} />
                          <span>Enviar por Correo a Encargada de Telares</span>
                        </button>

                        <button
                          onClick={() => handleCopyWhatsApp(req)}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {copiedId === req.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          <span>{copiedId === req.id ? 'Copiado' : 'Copiar Resumen'}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSolicitada && (
                          <button
                            onClick={() => handleStatusChange(req.id, 'EN_TRANSITO')}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <Truck size={13} />
                            <span>Marcar en Ruta</span>
                          </button>
                        )}

                        {isEnRuta && (
                          <button
                            onClick={() => handleStatusChange(req.id, 'COMPLETADA')}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <CheckCircle2 size={13} />
                            <span>Confirmar Entrada Almacén</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL NUEVA ORDEN DE COMPRA / REQUISICIÓN A TELARES */}
      {showNuevaReq && (
        <NuevaRequisicionTelaresModal
          onClose={() => {
            setShowNuevaReq(false);
            setInitialLineasForNewReq([]);
          }}
          initialLineas={initialLineasForNewReq}
          initialReferencia={initialRefForNewReq}
          onCreated={(created) => {
            setShowNuevaReq(false);
            setInitialLineasForNewReq([]);
            setSelectedBoIds([]);
            setActiveSubTab('ordenes');
            refetch();
            if (onRefresh) onRefresh();
            if (created) {
              setSelectedOrdenPdf({
                ...created,
                folioSto: created.codigo,
                empresaEmisora: 'FORMATEX',
                proveedorNombre: 'TELARES Y TEJIDOS',
                proveedorRfc: 'TTE140429HZ6',
                proveedorDomicilio:
                  'Avenida Dr. Roberto Michel 2903, El Mirador Álamo, C.P. 44895, Guadalajara, Jalisco',
                domicilioEntrega: 'Clz. J. Gonzalez Gallo 1505 Col. Atlas',
                referencia: initialRefForNewReq || 'PRIORIDAD #1',
              });
            }
          }}
        />
      )}

      {/* MODAL VISTA PREVIA DE LA ORDEN DE COMPRA PDF (FORMATO EXACTO DICATEX / FORMATEX ➔ TELARES) */}
      {selectedOrdenPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-300 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Barra de herramientas superior */}
            <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText size={18} className="text-amber-400" />
                <div>
                  <span className="font-black text-sm">
                    Vista Previa Oficial — Orden de Compra ({selectedOrdenPdf.folioSto || selectedOrdenPdf.codigo})
                  </span>
                  <span className="text-xs text-slate-400 block">
                    Formato oficial para enviar por correo a la encargada de Telares y Tejidos
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEmailModalReq(selectedOrdenPdf);
                    setEmailInput(selectedOrdenPdf.emailTelares || 'encargada.telares@telaresytejidos.com.mx');
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Mail size={14} /> Enviar por Correo a Telares
                </button>
                <button
                  onClick={() => printOrdenCompraTelaresPdf(selectedOrdenPdf)}
                  className="px-4 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl font-black text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} /> Descargar / Imprimir PDF
                </button>
                <button
                  onClick={() => setSelectedOrdenPdf(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Hoja de Papel A4 simulando exactamente el documento físico de referencia */}
            <div className="p-8 overflow-y-auto bg-slate-100 flex-1">
              <div className="bg-white max-w-3xl mx-auto p-10 rounded-xl shadow-md border border-slate-200 text-slate-900 space-y-6">
                {/* Encabezado Logo + Orden de Compra */}
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-4xl font-black tracking-[0.22em] text-slate-900">
                      {(selectedOrdenPdf.empresaEmisora || 'FORMATEX').toUpperCase()}
                    </div>
                    <div className="text-xs font-extrabold tracking-widest text-slate-700 text-right mt-1">
                      {selectedOrdenPdf.empresaEmisora === 'DICATEX' ? 'EST. 2010' : 'EST. 2010 · WMS 360°'}
                    </div>
                  </div>

                  <div className="w-64">
                    <h2 className="text-xl font-black text-center text-slate-900 mb-3">Orden de Compra</h2>
                    <div className="flex justify-between text-xs py-0.5">
                      <span className="font-bold">Folio:</span>
                      <span className="font-black font-mono">
                        {selectedOrdenPdf.folioSto || selectedOrdenPdf.codigo}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs py-0.5">
                      <span className="font-bold">Fecha:</span>
                      <span className="font-bold">{formatStoDate(selectedOrdenPdf.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Datos del proveedor */}
                <div className="space-y-1 text-xs">
                  <div className="font-black text-slate-900">Datos del proveedor</div>
                  <div className="grid grid-cols-12 gap-y-1">
                    <span className="col-span-2 font-bold text-slate-700">Proveedor:</span>
                    <span className="col-span-10 font-black text-slate-900">
                      {selectedOrdenPdf.proveedorNombre || 'TELARES Y TEJIDOS'}
                    </span>
                    <span className="col-span-2 font-bold text-slate-700">RFC:</span>
                    <span className="col-span-10 font-black text-slate-900">
                      {selectedOrdenPdf.proveedorRfc || 'TTE140429HZ6'}
                    </span>
                    <span className="col-span-2 font-bold text-slate-700">Domicilio:</span>
                    <span className="col-span-10 text-slate-800">
                      {selectedOrdenPdf.proveedorDomicilio ||
                        'Avenida Dr. Roberto Michel 2903, El Mirador Álamo, C.P. 44895, Guadalajara, Jalisco'}
                    </span>
                  </div>
                </div>

                {/* Datos de Entrega */}
                <div className="space-y-1 text-xs">
                  <div className="font-black text-slate-900">Datos de Entrega</div>
                  <div className="grid grid-cols-12 gap-y-1">
                    <span className="col-span-2 font-bold text-slate-700">Domicilio:</span>
                    <span className="col-span-10 font-black text-slate-900">
                      {selectedOrdenPdf.domicilioEntrega || 'Clz. J. Gonzalez Gallo 1505 Col. Atlas'}
                    </span>
                  </div>
                </div>

                {/* Tabla de Conceptos idéntica al documento físico */}
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-slate-900 font-black text-[11px]">
                      <th className="py-2 px-2 text-center w-[42%]">Concepto / Descripción</th>
                      <th className="py-2 px-2 text-right">Cantidad</th>
                      <th className="py-2 px-2">Unidad</th>
                      <th className="py-2 px-2 text-right">Valor unitario</th>
                      <th className="py-2 px-2 text-right">Descuentos</th>
                      <th className="py-2 px-2 text-center">Impuestos</th>
                      <th className="py-2 px-2 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedOrdenPdf.lineas || []).map((l: any) => {
                      const concepto = (
                        l.notas ||
                        `${l.sku?.nombre || 'TELA'}${l.sku?.color ? ` ${l.sku.color}` : ''}`
                      ).toUpperCase();
                      return (
                        <tr key={l.id}>
                          <td className="py-2.5 px-2 font-semibold text-slate-900">{concepto}</td>
                          <td className="py-2.5 px-2 text-right font-semibold text-slate-900 pr-4">
                            {l.metrajeTotal}
                          </td>
                          <td className="py-2.5 px-2 font-semibold text-slate-800">METRO</td>
                          <td className="py-2.5 px-2 text-right"></td>
                          <td className="py-2.5 px-2 text-right"></td>
                          <td className="py-2.5 px-2 text-center text-slate-700">IVA - 0,</td>
                          <td className="py-2.5 px-2 text-right"></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pie de página idéntico al documento físico */}
                <div className="pt-6 border-t border-slate-300 flex justify-between items-start text-xs">
                  <div className="space-y-2 w-2/3">
                    <div>
                      <div className="font-black text-slate-900">Importe con letra:</div>
                      <div className="text-slate-800">cero Pesos 00/100 M.N.</div>
                    </div>
                    <div className="grid grid-cols-12">
                      <span className="col-span-3 font-black text-slate-900">Referencia:</span>
                      <span className="col-span-9 font-semibold text-slate-900">
                        {selectedOrdenPdf.referencia || 'PRIORIDAD #1'}
                      </span>
                    </div>
                    <div className="grid grid-cols-12">
                      <span className="col-span-3 font-black text-slate-900">Observaciones:</span>
                      <span className="col-span-9 text-slate-700">{selectedOrdenPdf.notas || ''}</span>
                    </div>
                  </div>

                  <div className="w-56 space-y-1 font-black text-slate-900">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span></span>
                    </div>
                    <div className="flex justify-between">
                      <span>Descuentos:</span>
                      <span></span>
                    </div>
                    <div className="flex justify-between">
                      <span>Impuestos Trasladados:</span>
                      <span></span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ENVIAR POR CORREO A LA ENCARGADA DE TELARES */}
      {emailModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    Enviar Orden de Compra a Encargada de Telares
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Folio: {emailModalReq.folioSto || emailModalReq.codigo}
                  </p>
                </div>
              </div>
              <button onClick={() => setEmailModalReq(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Correo electrónico de la Encargada de Telares:
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-[11px] text-slate-600">
                <p>
                  <strong>Proveedor:</strong> TELARES Y TEJIDOS (TTE140429HZ6)
                </p>
                <p>
                  <strong>Partidas:</strong> {emailModalReq.lineas?.length || 0} telas ({emailModalReq.totalMetros}{' '}
                  METRO)
                </p>
                <p>
                  <strong>Referencia:</strong> {emailModalReq.referencia || 'PRIORIDAD #1'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => printOrdenCompraTelaresPdf(emailModalReq)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} /> 1. Descargar PDF
              </button>
              <button
                type="button"
                onClick={handleSendEmailToTelares}
                disabled={sendingEmail || !emailInput}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Mail size={14} /> 2. Abrir y Enviar Correo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUGERENCIA DE RESURTIDO (META 8 MESES ISRAEL) */}
      {showSugerenciaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Sugerencia de Resurtido a Telares — Meta de 8 Meses
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Levantamiento oficial con Israel (Jefe de Almacén).
                  </p>
                </div>
              </div>
              <button onClick={() => setShowSugerenciaModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400">
                <X size={18} />
              </button>
            </div>

            {loadingSugerencia ? (
              <div className="text-center py-12 text-slate-400">
                <RefreshCw size={28} className="animate-spin mx-auto mb-2 text-indigo-600" />
                <p className="font-bold text-slate-700">Calculando proyección de 8 meses de stock...</p>
              </div>
            ) : !sugerenciaData ? (
              <div className="text-center py-8 text-slate-400">
                <p>No se encontraron datos de proyección.</p>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold text-[10px]">
                      <tr>
                        <th className="py-2 px-3">SKU / Tela</th>
                        <th className="py-2 px-2 text-center">Stock Actual</th>
                        <th className="py-2 px-2 text-center">Meta 8 Meses</th>
                        <th className="py-2 px-2 text-center">Faltante</th>
                        <th className="py-2 px-3 text-right">Rollos a Pedir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {sugerenciaData.sugerencias?.map((s: any) => (
                        <tr key={s.skuId} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900">{s.skuNombre}</span>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {s.skuCodigo} {s.color ? `· ${s.color}` : ''}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center font-semibold text-slate-700">
                            {s.stockFisicoMetros}m
                          </td>
                          <td className="py-2.5 px-2 text-center text-indigo-700 font-bold">
                            {s.meta8MesesMetros}m
                          </td>
                          <td className="py-2.5 px-2 text-center text-amber-700 font-bold">
                            {s.faltanteMetros}m
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="px-2 py-0.5 rounded-full font-black text-xs bg-amber-100 text-amber-900 border border-amber-300">
                              +{s.rollosSugeridos} rollos
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setShowSugerenciaModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleCreateFromSugerencia}
                disabled={!sugerenciaData?.sugerencias?.length}
                className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 rounded-xl font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Plus size={14} />
                <span>Generar Orden de Compra con estos SKUs</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

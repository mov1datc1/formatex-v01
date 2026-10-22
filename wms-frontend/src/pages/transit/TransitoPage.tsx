import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { WmsIcon, KpiIcon } from '../../components/icons/WmsIcons';
import {
  Ship, Truck, Search, Filter, Calendar, Clock, Package, CheckCircle2,
  AlertTriangle, AlertCircle, Eye, Calculator, Copy, Check, ArrowRight,
  ExternalLink, ChevronDown, ChevronUp, X, Sparkles, Layers, DollarSign,
  FileText, ArrowUpDown, Info, RefreshCw, ShoppingCart, Hash
} from 'lucide-react';
import toast from 'react-hot-toast';
import ImportCostingModal from '../../components/transit/ImportCostingModal';

export default function TransitoPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Tab mode: 'atc' | 'costeo' | 'telas'
  const activeView = searchParams.get('view') || 'atc';

  const setView = (view: 'atc' | 'costeo' | 'telas') => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('view', view);
      return next;
    });
  };

  // Modals & Inspection states
  const [selectedCostingShipment, setSelectedCostingShipment] = useState<string | null>(null);
  const [inspectingShipment, setInspectingShipment] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedShipments, setExpandedShipments] = useState<Record<string, boolean>>({});

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'urgent' | 'transit' | 'ocean' | 'available' | 'committed'>('all');
  const [sortBy, setSortBy] = useState<'eta' | 'total' | 'available' | 'code'>('eta');

  // API calls
  const { data: shipments, isLoading, refetch, isFetching } = useApi<any[]>(['transit'], '/transit');
  const { data: stats } = useApi<any>(['transit-stats'], '/transit/stats');

  // Toggle card expansion
  const toggleExpanded = (id: string) => {
    setExpandedShipments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Copy helper with feedback
  const handleCopy = (text: string, id: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(`${label} copiado al portapapeles`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Format WhatsApp / Email ATC Summary for a shipment
  const generateAtcSummary = (s: any) => {
    const lines = s.lineas || [];
    const etaFormatted = new Date(s.fechaEstimada).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const fabricList = lines
      .map((l: any) => {
        const libre = Math.max(0, l.metrajeTotal - (l.metrajeReservado || 0));
        return `• *${l.sku?.nombre || 'Tela'}* ${l.sku?.color ? `(${l.sku.color})` : ''}: *${libre.toLocaleString()}m libres* de ${l.metrajeTotal.toLocaleString()}m (${l.cantidadRollos} rollos)`;
      })
      .join('\n');

    return `🚢 *FORMATEX — MERCANCÍA EN TRÁNSITO MARÍTIMO*\n` +
      `📦 *Embarque:* ${s.codigo}\n` +
      `🔢 *Contenedor:* ${s.numeroContenedor || 'Pendiente'}\n` +
      `📅 *ETA Arribo:* ${etaFormatted} (${s.diasParaLlegar > 0 ? `En ${s.diasParaLlegar} días` : 'Hoy'})\n` +
      `🏢 *Proveedor:* ${s.supplier?.nombre || 'Importación Oficial'}\n` +
      `📊 *Metraje Total:* ${s.metrajeTotal?.toLocaleString()}m | *Libre p/ Venta:* ${s.metrajeDisponible?.toLocaleString()}m\n\n` +
      `*DETALLE DE TELAS Y DISPONIBILIDAD:*\n${fabricList}\n\n` +
      `_Apartados de preventa sujetos a confirmación de pedido._`;
  };

  // Filtered & Sorted Shipments
  const filteredShipments = useMemo(() => {
    if (!shipments) return [];

    return shipments
      .filter((s: any) => {
        // Status filter
        if (filterStatus === 'urgent' && s.diasParaLlegar > 5) return false;
        if (filterStatus === 'transit' && (s.diasParaLlegar <= 5 || s.diasParaLlegar > 14)) return false;
        if (filterStatus === 'ocean' && s.diasParaLlegar <= 14) return false;
        if (filterStatus === 'available' && s.metrajeDisponible <= 0) return false;
        if (filterStatus === 'committed' && s.metrajeDisponible > 0) return false;

        // Search filter (across embarque, contenedor, pedimento, OC, supplier, carrier AND inside fabrics!)
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchShipment =
            s.codigo?.toLowerCase().includes(q) ||
            s.numeroContenedor?.toLowerCase().includes(q) ||
            s.numeroPedimento?.toLowerCase().includes(q) ||
            s.ordenCompra?.toLowerCase().includes(q) ||
            s.supplier?.nombre?.toLowerCase().includes(q) ||
            s.transportista?.toLowerCase().includes(q);

          const matchLine = s.lineas?.some((l: any) =>
            l.sku?.nombre?.toLowerCase().includes(q) ||
            l.sku?.codigo?.toLowerCase().includes(q) ||
            l.sku?.color?.toLowerCase().includes(q) ||
            l.sku?.composicion?.toLowerCase().includes(q)
          );

          if (!matchShipment && !matchLine) return false;
        }

        return true;
      })
      .sort((a: any, b: any) => {
        if (sortBy === 'eta') {
          return new Date(a.fechaEstimada).getTime() - new Date(b.fechaEstimada).getTime();
        }
        if (sortBy === 'total') {
          return (b.metrajeTotal || 0) - (a.metrajeTotal || 0);
        }
        if (sortBy === 'available') {
          return (b.metrajeDisponible || 0) - (a.metrajeDisponible || 0);
        }
        if (sortBy === 'code') {
          return a.codigo.localeCompare(b.codigo);
        }
        return 0;
      });
  }, [shipments, searchTerm, filterStatus, sortBy]);

  // Flat list of all fabric lines for "Telas en Tránsito" view
  const allFabricLines = useMemo(() => {
    if (!shipments) return [];
    const list: any[] = [];
    shipments.forEach(s => {
      (s.lineas || []).forEach((l: any) => {
        list.push({
          ...l,
          shipment: s,
          metrajeDisponible: Math.max(0, l.metrajeTotal - (l.metrajeReservado || 0)),
        });
      });
    });

    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(item =>
      item.sku?.nombre?.toLowerCase().includes(q) ||
      item.sku?.codigo?.toLowerCase().includes(q) ||
      item.sku?.color?.toLowerCase().includes(q) ||
      item.shipment?.codigo?.toLowerCase().includes(q) ||
      item.shipment?.numeroContenedor?.toLowerCase().includes(q) ||
      item.shipment?.supplier?.nombre?.toLowerCase().includes(q)
    );
  }, [shipments, searchTerm]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <KpiIcon icon={WmsIcon.Transit} gradient="from-blue-600 to-indigo-600" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Control de Tránsito Marítimo</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                WMS 360+
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">
              {activeView === 'atc' && 'Disponibilidad de tela en alta mar para cotización y asignación a pedidos en backorder.'}
              {activeView === 'costeo' && 'Gestión de pedimentos SAT, contenedores aduanales y cálculo de costo landed inter-compañía.'}
              {activeView === 'telas' && 'Catálogo de telas, colores y metrajes esperados en los próximos arribos marítimos.'}
            </p>
          </div>
        </div>

        {/* Acciones globales */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Refrescar datos en vivo"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin text-primary-600' : ''} />
            <span>Refrescar</span>
          </button>

          <button
            onClick={() => {
              const fullText = (shipments || [])
                .map(s => generateAtcSummary(s))
                .join('\n\n' + '─'.repeat(30) + '\n\n');
              handleCopy(fullText, 'global_report', 'Reporte consolidado');
            }}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-semibold hover:from-emerald-700 hover:to-teal-700 flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
            title="Copiar reporte consolidado para WhatsApp"
          >
            <Copy size={14} />
            <span>Copiar Reporte ATC</span>
          </button>
        </div>
      </div>

      {/* TABS DE ENFOQUE: ATC vs COSTEO vs TELAS */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100/90 rounded-2xl border border-gray-200/80 w-fit">
        <button
          onClick={() => setView('atc')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeView === 'atc'
              ? 'bg-white text-blue-700 shadow-sm border border-gray-200/60 font-bold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          <Ship size={15} className={activeView === 'atc' ? 'text-blue-600' : 'text-gray-500'} />
          <span>Vista Operativa ATC (Disponibilidad)</span>
        </button>

        <button
          onClick={() => setView('costeo')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeView === 'costeo'
              ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/60 font-bold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          <Calculator size={15} className={activeView === 'costeo' ? 'text-indigo-600' : 'text-gray-500'} />
          <span>Vista Aduana & Costeo (Compras / Mane)</span>
        </button>

        <button
          onClick={() => setView('telas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeView === 'telas'
              ? 'bg-white text-purple-700 shadow-sm border border-gray-200/60 font-bold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          <Layers size={15} className={activeView === 'telas' ? 'text-purple-600' : 'text-gray-500'} />
          <span>Explorador por Tela en Tránsito ({allFabricLines.length})</span>
        </button>
      </div>

      {/* 4 KPIS EJECUTIVOS */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs hover:border-blue-200 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Ship size={16} />
                </div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Embarques Activos</p>
              </div>
              <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                En Mar
              </span>
            </div>
            <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{stats.totalEmbarques}</p>
            <p className="text-xs text-gray-400 mt-1">Contenedores en ruta hacia Manzanillo</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs hover:border-emerald-200 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <WmsIcon.Ruler size={16} />
                </div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Metraje en Tránsito</p>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Total
              </span>
            </div>
            <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">
              {stats.metrajeEsperado?.toLocaleString()} <span className="text-base font-medium text-gray-500">m</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">Metros totales contratados en OC</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs hover:border-amber-200 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <WmsIcon.Locked size={16} />
                </div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">En Backorder</p>
              </div>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                {stats.metrajeEsperado ? Math.round((stats.metrajeReservado / stats.metrajeEsperado) * 100) : 0}% ocupado
              </span>
            </div>
            <p className="text-3xl font-extrabold text-amber-600 tracking-tight">
              {stats.metrajeReservado?.toLocaleString()} <span className="text-base font-medium text-gray-500">m</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">Pre-asignado a clientes en cola FIFO</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs hover:border-purple-200 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                  <Sparkles size={16} />
                </div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Libre p/ Vender</p>
              </div>
              <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                Disponible
              </span>
            </div>
            <p className="text-3xl font-extrabold text-purple-600 tracking-tight">
              {stats.metrajeDisponible?.toLocaleString()} <span className="text-base font-medium text-gray-500">m</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">Metros libres para cotizaciones de ATC</p>
          </div>
        </div>
      )}

      {/* PRÓXIMO EMBARQUE A LLEGAR (BANNER ELEGANTE Y OPERATIVO) */}
      {stats?.proximoEmbarque && (
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/15">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start md:items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
                <Ship size={24} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-amber-400 text-slate-900">
                    Próximo Arribo
                  </span>
                  <p className="text-white/80 text-xs">Arribo programado a Puerto Manzanillo</p>
                </div>
                <h3 className="font-extrabold text-2xl tracking-tight text-white mt-0.5">
                  {stats.proximoEmbarque.codigo}
                </h3>
                <p className="text-white/70 text-xs mt-0.5">
                  Fecha estimada: {new Date(stats.proximoEmbarque.eta).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/15">
                <p className="text-xs text-white/70 font-medium">Cuenta Regresiva</p>
                <p className="font-extrabold text-2xl text-amber-300">
                  {stats.proximoEmbarque.diasParaLlegar > 0 ? `${stats.proximoEmbarque.diasParaLlegar} días` : 'Llega Hoy'}
                </p>
              </div>

              <button
                onClick={() => {
                  const target = shipments?.find(s => s.codigo === stats.proximoEmbarque.codigo);
                  if (target) setInspectingShipment(target);
                }}
                className="px-4 py-2.5 bg-white text-blue-900 rounded-xl text-xs font-bold hover:bg-blue-50 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Eye size={15} />
                <span>Inspeccionar Contenido</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BARRA UNIVERSAL DE BÚSQUEDA Y FILTRADO INTELIGENTE (RESPUESTA AL REQUERIMIENTO UX/UI) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3.5 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Campo de búsqueda profunda */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por embarque (EMB-...), contenedor (MSCU-...), pedimento SAT, proveedor, o tela (ej: Enigma, Lino, Azul)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-900 placeholder:text-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-md"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Ordenamiento */}
          <div className="flex items-center gap-2">
            <ArrowUpDown size={16} className="text-gray-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="eta">Ordenar por Arribo (ETA más cercano)</option>
              <option value="total">Ordenar por Mayor Metraje Total</option>
              <option value="available">Ordenar por Mayor Metraje Disponible</option>
              <option value="code">Ordenar por Código de Embarque</option>
            </select>
          </div>
        </div>

        {/* Chips de filtro rápido */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Filtros:</span>

          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos ({shipments?.length || 0})
          </button>

          <button
            onClick={() => setFilterStatus('urgent')}
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              filterStatus === 'urgent'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Arribo &lt; 5 días</span>
          </button>

          <button
            onClick={() => setFilterStatus('transit')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === 'transit'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/50'
            }`}
          >
            En Mar (5 - 14 días)
          </button>

          <button
            onClick={() => setFilterStatus('ocean')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === 'ocean'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/50'
            }`}
          >
            Alta Mar (&gt; 14 días)
          </button>

          <button
            onClick={() => setFilterStatus('available')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === 'available'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50'
            }`}
          >
            Con Metraje Libre
          </button>

          <button
            onClick={() => setFilterStatus('committed')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === 'committed'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/50'
            }`}
          >
            100% Comprometidos
          </button>

          {searchTerm && (
            <span className="ml-auto text-xs text-blue-600 font-medium">
              Filtrado por: "{searchTerm}"
            </span>
          )}
        </div>
      </div>

      {/* VISTA 1 & 2: POR EMBARQUE / CONTENEDOR (ATC & COSTEO) */}
      {activeView !== 'telas' && (
        <>
          {isLoading ? (
            <div className="bg-white rounded-2xl border p-12 text-center text-gray-400 animate-pulse">
              <Ship size={40} className="mx-auto mb-3 text-blue-300 animate-bounce" />
              <p className="font-semibold text-gray-600">Cargando embarques y mercancía marítima...</p>
            </div>
          ) : !filteredShipments.length ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center text-gray-400">
              <Ship size={48} className="mx-auto mb-3 text-gray-300" />
              <h3 className="font-bold text-gray-700 text-lg">No se encontraron embarques</h3>
              <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
                No hay resultados que coincidan con la búsqueda o los filtros activos. Intenta limpiar los filtros o buscar con otro término.
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-4 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredShipments.map((s: any) => {
                const isExpanded = expandedShipments[s.id] ?? false;
                const lines = s.lineas || [];
                const displayedLines = isExpanded ? lines : lines.slice(0, 4);
                const hasMoreLines = lines.length > 4;

                const daysColor =
                  s.diasParaLlegar <= 5
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : s.diasParaLlegar <= 14
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200';

                return (
                  <div
                    key={s.id}
                    className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all"
                  >
                    {/* CABECERA DE LA TARJETA */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200/50 shadow-xs">
                          <Ship size={22} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-extrabold text-lg text-gray-900 tracking-tight">{s.codigo}</h3>
                            {s.numeroContenedor && (
                              <span className="inline-flex items-center gap-1 font-mono text-xs font-bold bg-slate-900 text-amber-300 px-2.5 py-0.5 rounded-md shadow-xs">
                                <Package size={12} />
                                {s.numeroContenedor}
                              </span>
                            )}
                            {s.ordenCompra && (
                              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                OC: {s.ordenCompra}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            <strong className="text-gray-700">{s.supplier?.nombre || 'Proveedor Importación'}</strong>
                            {s.transportista && <span> • Naviera: {s.transportista}</span>}
                          </p>
                        </div>
                      </div>

                      {/* Contador de Días y ETA */}
                      <div className="flex items-center gap-3 self-end lg:self-auto">
                        <div className="text-right">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${daysColor}`}>
                            <Clock size={13} />
                            {s.diasParaLlegar > 0 ? `En ${s.diasParaLlegar} días` : 'Llega Hoy'}
                          </span>
                          <p className="text-[11px] text-gray-400 mt-1 font-medium">
                            ETA: {new Date(s.fechaEstimada).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* BARRA PROPORCIONAL DE METRAJE */}
                    <div className="my-4 bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                      <div className="flex flex-wrap items-center justify-between text-xs mb-2 gap-2">
                        <span className="text-gray-600 font-semibold">
                          Total Contenedor: <strong className="text-gray-900">{s.metrajeTotal?.toLocaleString()}m</strong>
                          <span className="text-gray-400 font-normal ml-1">({s.totalRollos || lines.reduce((a: any, l: any) => a + (l.cantidadRollos || 0), 0)} rollos)</span>
                        </span>
                        <div className="flex items-center gap-4 text-xs font-medium">
                          <span className="text-amber-700 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            Reservado: <strong>{s.metrajeReservado?.toLocaleString()}m</strong>
                          </span>
                          <span className="text-emerald-700 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Disponible p/ Venta: <strong>{s.metrajeDisponible?.toLocaleString()}m</strong>
                          </span>
                        </div>
                      </div>

                      {/* Barra visual de proporción */}
                      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all"
                          style={{ width: `${s.metrajeTotal ? (s.metrajeReservado / s.metrajeTotal) * 100 : 0}%` }}
                          title={`Reservado: ${s.metrajeReservado}m`}
                        />
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all"
                          style={{ width: `${s.metrajeTotal ? (s.metrajeDisponible / s.metrajeTotal) * 100 : 0}%` }}
                          title={`Disponible: ${s.metrajeDisponible}m`}
                        />
                      </div>
                    </div>

                    {/* SECCIÓN: MERCANCÍA Y TELAS DENTRO DEL EMBARQUE ("QUÉ HAY DENTRO") */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-500 px-1">
                        <span>TELAS EN ESTE EMBARQUE ({lines.length} partidas)</span>
                        <span className="text-gray-400 font-normal">Rollos • Metros • Disponibilidad libre</span>
                      </div>

                      <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden bg-gray-50/50">
                        {displayedLines.map((l: any) => {
                          const disponible = Math.max(0, l.metrajeTotal - (l.metrajeReservado || 0));
                          const tieneReservas = (l.reservations || []).length > 0;

                          return (
                            <div
                              key={l.id}
                              className="p-3 bg-white hover:bg-blue-50/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0 mt-0.5">
                                  <Layers size={14} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900 text-sm">{l.sku?.nombre || 'Tela sin nombre'}</span>
                                    {l.sku?.color && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                                        Color: {l.sku.color}
                                      </span>
                                    )}
                                    {l.sku?.codigo && (
                                      <span className="font-mono text-[11px] text-gray-400">
                                        [{l.sku.codigo}]
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 mt-1">
                                    {l.sku?.composicion && <span>{l.sku.composicion}</span>}
                                    {l.sku?.ancho && <span>• Ancho: {l.sku.ancho}m</span>}
                                    {l.sku?.peso && <span>• Peso: {l.sku.peso} g/m²</span>}
                                  </div>
                                </div>
                              </div>

                              {/* Metrajes y acciones */}
                              <div className="flex flex-wrap items-center gap-3 justify-between md:justify-end">
                                <div className="text-right">
                                  <div className="flex items-center gap-2 justify-end">
                                    <span className="text-gray-500">{l.cantidadRollos} rollos</span>
                                    <span className="text-gray-300">|</span>
                                    <span className="font-bold text-gray-800">{l.metrajeTotal?.toLocaleString()}m tot</span>
                                    <span className="text-gray-300">|</span>
                                    <span className={`font-bold px-2 py-0.5 rounded-md ${
                                      disponible > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                                    }`}>
                                      {disponible.toLocaleString()}m libres
                                    </span>
                                  </div>

                                  {l.metrajeReservado > 0 && (
                                    <p className="text-[11px] text-amber-600 mt-0.5 font-medium">
                                      {l.metrajeReservado.toLocaleString()}m apartados
                                      {tieneReservas && ` (${l.reservations[0]?.order?.client?.nombre || 'Cliente'})`}
                                    </p>
                                  )}
                                </div>

                                {/* Acciones directas por tela */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => navigate(`/pedidos?newSku=${l.skuId}&shipmentId=${s.id}`)}
                                    className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                    title="Crear pedido / cotización con esta tela de este embarque"
                                  >
                                    <ShoppingCart size={12} />
                                    <span>Cotizar</span>
                                  </button>

                                  <button
                                    onClick={() => navigate(`/disponibilidad?search=${encodeURIComponent(l.sku?.codigo || l.sku?.nombre || '')}`)}
                                    className="p-1 bg-gray-50 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                    title="Ver en Disponibilidad 360°"
                                  >
                                    <ExternalLink size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Botón para expandir si hay más de 4 telas */}
                      {hasMoreLines && (
                        <button
                          onClick={() => toggleExpanded(s.id)}
                          className="w-full py-2 text-center text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50/50 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp size={14} />
                              <span>Mostrar menos telas</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown size={14} />
                              <span>Ver las {lines.length - 4} telas restantes de este embarque</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* BARRA DE COSTEO, ADUANA & ACCIONES INFERIORES */}
                    <div className="mt-4 pt-3.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                      {/* Datos aduanales SAT */}
                      <div className="flex flex-wrap items-center gap-4 text-gray-500 font-mono text-[11px]">
                        <span>
                          Pedimento SAT: <strong className="text-gray-800 font-sans">{s.numeroPedimento || '26 16 1924 6003496'}</strong>
                        </span>
                        <span>
                          TC Oficial: <strong className="text-emerald-700 font-bold">${Number(s.tipoCambioPedimento || 18.3688).toFixed(4)}</strong>
                        </span>
                        <span>
                          Incrementables: <strong className="text-indigo-700 font-bold">{Number(s.gastosIncrementablesPct || 23.0)}%</strong>
                        </span>
                      </div>

                      {/* Botones de acción del embarque */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const summary = generateAtcSummary(s);
                            handleCopy(summary, s.id, `Ficha de ${s.codigo}`);
                          }}
                          className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Copiar resumen para WhatsApp o Email"
                        >
                          {copiedId === s.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          <span>{copiedId === s.id ? 'Copiado' : 'Copiar Ficha ATC'}</span>
                        </button>

                        <button
                          onClick={() => setInspectingShipment(s)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Inspeccionar detalle completo y lista de empaque"
                        >
                          <Eye size={13} />
                          <span>Inspeccionar Packing List</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedCostingShipment(s.id)}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          title="Calcular landed cost inter-compañía CONTPAQi"
                        >
                          <Calculator size={13} />
                          <span>Costeo Landed</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* VISTA 3: EXPLORADOR POR TELAS EN TRÁNSITO */}
      {activeView === 'telas' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Telas y Partidas en Tránsito Marítimo</h3>
              <p className="text-xs text-gray-500">Mostrando {allFabricLines.length} partidas individuales a través de todos los contenedores</p>
            </div>
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
              Disponibilidad Instantánea
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Tela / SKU</th>
                  <th className="px-4 py-3">Color</th>
                  <th className="px-4 py-3">Embarque / Contenedor</th>
                  <th className="px-4 py-3">ETA Arribo</th>
                  <th className="px-4 py-3 text-right">Rollos</th>
                  <th className="px-4 py-3 text-right">Metros Totales</th>
                  <th className="px-4 py-3 text-right">Metros Libres</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allFabricLines.map((l: any) => (
                  <tr key={`${l.id}-${l.shipment?.id}`} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{l.sku?.nombre}</div>
                      <div className="font-mono text-[10px] text-gray-400">{l.sku?.codigo}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-medium">{l.sku?.color || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-blue-700">{l.shipment?.codigo}</div>
                      <div className="font-mono text-[10px] text-gray-500">{l.shipment?.numeroContenedor || 'Sin Contenedor'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        l.shipment?.diasParaLlegar <= 5
                          ? 'bg-red-50 text-red-700'
                          : l.shipment?.diasParaLlegar <= 14
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {l.shipment?.diasParaLlegar > 0 ? `En ${l.shipment.diasParaLlegar} días` : 'Llega Hoy'}
                      </span>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(l.shipment?.fechaEstimada).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-700">{l.cantidadRollos}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{l.metrajeTotal?.toLocaleString()}m</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-md font-bold ${
                        l.metrajeDisponible > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {l.metrajeDisponible?.toLocaleString()}m
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => navigate(`/pedidos?newSku=${l.skuId}&shipmentId=${l.shipment?.id}`)}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Cotizar tela"
                        >
                          <ShoppingCart size={12} />
                          <span>Cotizar</span>
                        </button>
                        <button
                          onClick={() => navigate(`/disponibilidad?search=${encodeURIComponent(l.sku?.codigo || l.sku?.nombre || '')}`)}
                          className="p-1 text-gray-400 hover:text-gray-700 rounded-md"
                          title="Ver en Disponibilidad 360°"
                        >
                          <ExternalLink size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE INSPECCIÓN PROFUNDA DEL EMBARQUE ("VER QUÉ HAY DENTRO") */}
      {inspectingShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300 border border-white/15">
                  <Package size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                      Packing List & Contenedor Oficial
                    </span>
                    <span className="bg-white/10 text-white/80 px-2 py-0.5 rounded text-[10px] font-mono">
                      SAT 2026
                    </span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight mt-0.5 text-white">
                    {inspectingShipment.codigo}
                  </h2>
                  <p className="text-xs text-white/70 mt-0.5">
                    Contenedor: <strong className="text-amber-300 font-mono">{inspectingShipment.numeroContenedor || 'Sin asignar'}</strong> • Pedimento: <strong className="text-white font-mono">{inspectingShipment.numeroPedimento || '26 16 1924 6003496'}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectingShipment(null)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Summary KPI pills */}
            <div className="p-4 bg-gray-50 border-b border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-gray-200">
                <span className="text-gray-400 font-semibold block text-[10px] uppercase">Metraje Total</span>
                <span className="text-lg font-extrabold text-gray-900">{inspectingShipment.metrajeTotal?.toLocaleString()}m</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200">
                <span className="text-gray-400 font-semibold block text-[10px] uppercase">Rollos Esperados</span>
                <span className="text-lg font-extrabold text-blue-700">{inspectingShipment.totalRollos || inspectingShipment.lineas?.reduce((a: any, l: any) => a + (l.cantidadRollos || 0), 0)} rollos</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200">
                <span className="text-gray-400 font-semibold block text-[10px] uppercase">Libre para Venta</span>
                <span className="text-lg font-extrabold text-emerald-600">{inspectingShipment.metrajeDisponible?.toLocaleString()}m</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200">
                <span className="text-gray-400 font-semibold block text-[10px] uppercase">Días para Arribo</span>
                <span className="text-lg font-extrabold text-amber-600">{inspectingShipment.diasParaLlegar > 0 ? `${inspectingShipment.diasParaLlegar} días` : 'Hoy'}</span>
              </div>
            </div>

            {/* Modal Content Table */}
            <div className="flex-1 overflow-y-auto p-6">
              <h4 className="font-bold text-gray-900 text-sm mb-3">Detalle Completo de Mercancía en Contenedor</h4>
              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3">SKU / Tela</th>
                      <th className="px-4 py-3">Color</th>
                      <th className="px-4 py-3">Especificación</th>
                      <th className="px-4 py-3 text-right">Rollos</th>
                      <th className="px-4 py-3 text-right">Total m</th>
                      <th className="px-4 py-3 text-right">Reservado</th>
                      <th className="px-4 py-3 text-right">Libre m</th>
                      <th className="px-4 py-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(inspectingShipment.lineas || []).map((l: any) => {
                      const disponible = Math.max(0, l.metrajeTotal - (l.metrajeReservado || 0));
                      return (
                        <tr key={l.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-gray-900">{l.sku?.nombre}</div>
                            <div className="font-mono text-[10px] text-gray-400">{l.sku?.codigo}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 font-medium">{l.sku?.color || '—'}</td>
                          <td className="px-4 py-3 text-[11px] text-gray-500">
                            {l.sku?.composicion || '100% Poliéster'} {l.sku?.ancho ? `• ${l.sku.ancho}m` : ''}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-700">{l.cantidadRollos}</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900">{l.metrajeTotal?.toLocaleString()}m</td>
                          <td className="px-4 py-3 text-right text-amber-600 font-medium">
                            {l.metrajeReservado > 0 ? `${l.metrajeReservado?.toLocaleString()}m` : '0m'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600">
                            {disponible?.toLocaleString()}m
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => {
                                setInspectingShipment(null);
                                navigate(`/pedidos?newSku=${l.skuId}&shipmentId=${inspectingShipment.id}`);
                              }}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 mx-auto transition-colors cursor-pointer"
                            >
                              <ShoppingCart size={11} />
                              <span>Cotizar</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => {
                  const summary = generateAtcSummary(inspectingShipment);
                  handleCopy(summary, 'modal_copy', 'Resumen completo');
                }}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy size={14} />
                <span>Copiar Ficha al Portapapeles</span>
              </button>

              <button
                onClick={() => setInspectingShipment(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE COSTEO DE IMPORTACIÓN Y EXPORTACIÓN CONTPAQi */}
      {selectedCostingShipment && (
        <ImportCostingModal
          shipmentId={selectedCostingShipment}
          onClose={() => setSelectedCostingShipment(null)}
          onSaved={() => refetch()}
        />
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { WmsIcon, KpiIcon, StatusBadge } from '../../components/icons/WmsIcons';
import {
  Search, Copy, Check, ShoppingCart, Truck, Box, Layers, ShieldCheck,
  Calendar, DollarSign, Clock, ArrowRight, ChevronDown,
  Sparkles, Calculator, RefreshCw, X, ShieldAlert, ArrowUpRight,
  TrendingUp, FileText, CheckCircle2, AlertTriangle, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// Telas de alta rotación para acceso inmediato en un solo clic
const QUICK_SKUS = [
  { label: 'Enigma Iron', query: 'LENIGIRO', color: 'Iron' },
  { label: 'Lino Natural', query: 'LINO', color: 'Beige / Arena' },
  { label: 'Terciopelo Royal', query: 'TERCIOPELO', color: 'Azul / Esmeralda' },
  { label: 'Blackout Supreme', query: 'BLACKOUT', color: 'Gris Oscuro' },
  { label: 'Jacquard Venecia', query: 'JACQUARD', color: 'Dorado / Marfil' },
];

export default function DisponibilidadPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // SKU seleccionado (inicializado por query param si existe)
  const [selectedSkuId, setSelectedSkuId] = useState<string>(searchParams.get('sku') || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'fisico' | 'transito' | 'precios'>('fisico');
  const [calcMetros, setCalcMetros] = useState<number>(100);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [huSearch, setHuSearch] = useState('');
  const [huQualityFilter, setHuQualityFilter] = useState('');

  // 1. Búsqueda remota de SKUs (con debounce implícito por react-query cache)
  const { data: searchResults, isLoading: searchingSkus } = useApi<PaginatedResponse<any>>(
    ['skus-disp-search', searchQuery],
    '/catalog/skus',
    { search: searchQuery || undefined, limit: 30 }
  );

  // 2. Consulta profunda de disponibilidad unificada
  const {
    data: availability,
    isLoading: loadingAvailability,
    refetch: refetchAvailability,
  } = useApi<any>(
    ['availability', selectedSkuId],
    `/reservations/availability/${selectedSkuId}`,
    {},
    !!selectedSkuId
  );

  const sku = availability?.sku;
  const fisico = availability?.fisico;
  const transito = availability?.transito;
  const totalGlobal = availability?.totalGlobal ?? 0;

  // Filtrado interno de HUs en almacén
  const filteredHUs = useMemo(() => {
    if (!fisico?.detalle) return [];
    return fisico.detalle.filter((hu: any) => {
      const matchText = !huSearch || 
        hu.codigo?.toLowerCase().includes(huSearch.toLowerCase()) ||
        hu.ubicacion?.toLowerCase().includes(huSearch.toLowerCase()) ||
        hu.loteProveedor?.toLowerCase().includes(huSearch.toLowerCase());
      const matchQuality = !huQualityFilter || hu.gradoCalidad === huQualityFilter;
      return matchText && matchQuality;
    });
  }, [fisico?.detalle, huSearch, huQualityFilter]);

  // Selección de SKU
  const handleSelectSku = (id: string) => {
    setSelectedSkuId(id);
    setSearchParams(id ? { sku: id } : {});
    setSearchQuery('');
  };

  // Copiar resumen formal para WhatsApp / Correo ATC
  const handleCopySummary = () => {
    if (!availability || !sku) return;
    const text = `*DISPONIBILIDAD ATC — FORMATEX WMS 360+*
*Tela:* ${sku.nombre} (${sku.codigo})
*Color:* ${sku.color || 'N/A'}
*Precio Ref.:* $${Number(sku.precioReferencia || 0).toFixed(2)} MXN / metro

*INVENTARIO DISPONIBLE:*
- Stock Físico Inmediato: *${fisico?.disponible?.toLocaleString() || 0} m* (${fisico?.rollos || 0} rollos en almacén)
- En Tránsito (Contenedores): *${transito?.disponible?.toLocaleString() || 0} m*
- *TOTAL DISPONIBLE GLOBAL: ${totalGlobal?.toLocaleString() || 0} m*

_Información en tiempo real verificada en WMS Formatex. Reserva blanda garantizada por 24 horas al emitir cotización formal._`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    toast.success('Ficha ATC copiada para WhatsApp');
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ─── HEADER EJECUTIVO ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <KpiIcon icon={WmsIcon.Search} gradient="from-emerald-500 to-teal-600" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Disponibilidad Unificada 360°</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ATC & Ventas
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">
              Stock físico en racks + Contenedores marítimos en tránsito para cotizar sin riesgo de doble-venta.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedSkuId && (
            <button
              onClick={() => refetchAvailability()}
              className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all flex items-center gap-1.5"
              title="Actualizar datos en tiempo real"
            >
              <RefreshCw size={14} className={loadingAvailability ? 'animate-spin' : ''} />
              Actualizar
            </button>
          )}
          <button
            onClick={() => navigate(selectedSkuId ? `/pedidos?newSku=${selectedSkuId}` : '/pedidos')}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <ShoppingCart size={15} />
            Crear Pedido / Cotización
          </button>
        </div>
      </div>

      {/* ─── BARRA DE BÚSQUEDA INTELIGENTE DE TELAS ───────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Escribe el nombre de la tela, código o color (ej: ENIGMA, LENIGIRO, LINO, TERCIOPELO)..."
              className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Selector rápido dropdown si hay resultados */}
          <div className="w-full md:w-80">
            <select
              value={selectedSkuId}
              onChange={(e) => handleSelectSku(e.target.value)}
              className="w-full px-3.5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
            >
              <option value="">— {searchResults?.data?.length ? `${searchResults.data.length} telas encontradas` : 'Explorar catálogo'} —</option>
              {searchResults?.data?.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} · {s.color || 'S/C'} ({s.codigo}) — ${Number(s.precioReferencia || 0).toFixed(2)}/m
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chips de acceso rápido a telas populares */}
        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
          <span className="text-gray-400 font-medium flex items-center gap-1">
            <Sparkles size={12} className="text-amber-500" /> Telas Frecuentes:
          </span>
          {QUICK_SKUS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSearchQuery(item.query);
                // Si ya está en los resultados, seleccionarlo
                const match = searchResults?.data?.find((s: any) => s.codigo?.toUpperCase() === item.query || s.nombre?.toUpperCase().includes(item.query));
                if (match) handleSelectSku(match.id);
              }}
              className="px-2.5 py-1 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-transparent rounded-lg font-medium text-gray-600 transition-all"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Lista de resultados desplegable al buscar */}
        {searchQuery.trim().length > 1 && searchResults?.data && searchResults.data.length > 0 && !selectedSkuId && (
          <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100 bg-white max-h-60 overflow-y-auto">
            {searchResults.data.map((item: any) => (
              <div
                key={item.id}
                onClick={() => handleSelectSku(item.id)}
                className="p-3 hover:bg-emerald-50/50 cursor-pointer flex items-center justify-between transition-colors text-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                    {item.codigo?.substring(0, 3)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{item.nombre} <span className="font-normal text-gray-500">· {item.color}</span></p>
                    <p className="text-xs text-gray-400 font-mono">{item.codigo} · {item.categoria || 'Textil'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-700">${Number(item.precioReferencia || 0).toFixed(2)}/m</p>
                  <span className="text-[11px] text-gray-400">Ver disponibilidad →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {loadingAvailability && selectedSkuId && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center space-y-3">
          <RefreshCw size={32} className="mx-auto text-emerald-500 animate-spin" />
          <p className="text-gray-700 font-medium">Calculando disponibilidad física y en tránsito...</p>
          <p className="text-xs text-gray-400">Verificando rollos asignados, reservas blandas (24h) y contenedores marítimos.</p>
        </div>
      )}

      {/* ─── DETALLE DEL SKU SELECCIONADO ───────────────────────────── */}
      {availability && sku && (
        <div className="space-y-6">
          {/* Card Hero: Ficha de la Tela & Acciones ATC */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {sku.codigo}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700">
                    {sku.color || 'Color Único'}
                  </span>
                  {sku.categoria && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700">
                      {sku.categoria}
                    </span>
                  )}
                  {sku.supplier && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium text-gray-500 bg-gray-50">
                      Prov: {sku.supplier.razonSocial || sku.supplier.codigo}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{sku.nombre}</h2>

                <div className="flex items-center gap-6 text-xs text-gray-500 flex-wrap">
                  {sku.composicion && <div><span className="text-gray-400">Comp:</span> <strong className="text-gray-700">{sku.composicion}</strong></div>}
                  {sku.anchoMetros && <div><span className="text-gray-400">Ancho:</span> <strong className="text-gray-700">{sku.anchoMetros} m</strong></div>}
                  {sku.pesoGsm && <div><span className="text-gray-400">Gramaje:</span> <strong className="text-gray-700">{sku.pesoGsm} g/m²</strong></div>}
                  {sku.rolloMasterEstandar && <div><span className="text-gray-400">Rollo Estándar:</span> <strong className="text-gray-700">{sku.rolloMasterEstandar} m</strong></div>}
                </div>
              </div>

              {/* Botones de acción rápida para el ejecutivo ATC */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleCopySummary}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95"
                >
                  {copiedSummary ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  {copiedSummary ? '¡Copiado!' : 'Copiar Ficha ATC'}
                </button>

                <button
                  onClick={() => navigate(`/rollos?search=${sku.codigo}`)}
                  className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Box size={14} />
                  Ver Rollos
                  <ArrowUpRight size={13} />
                </button>

                <button
                  onClick={() => navigate(`/pedidos?newSku=${sku.id}`)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <ShoppingCart size={15} />
                  Cotizar / Crear Pedido
                </button>
              </div>
            </div>
          </div>

          {/* ─── 4 TARJETAS KPI DE DISPONIBILIDAD ───────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Total Global */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-lg shadow-emerald-600/15 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-100">Total Global Disponible</span>
                <Sparkles size={16} className="text-emerald-200" />
              </div>
              <p className="text-3xl font-black">{totalGlobal.toLocaleString()} <span className="text-base font-normal opacity-80">m</span></p>
              
              <div className="mt-4 pt-3 border-t border-emerald-500/40 flex justify-between text-xs text-emerald-100">
                <span>Físico: <strong>{fisico?.disponible?.toLocaleString() || 0}m</strong></span>
                <span>Tránsito: <strong>{transito?.disponible?.toLocaleString() || 0}m</strong></span>
              </div>

              {/* Barra de proporción físico vs tránsito */}
              <div className="mt-2 h-1.5 w-full bg-emerald-950/30 rounded-full overflow-hidden flex">
                <div
                  className="bg-white h-full"
                  style={{ width: `${totalGlobal > 0 ? ((fisico?.disponible || 0) / totalGlobal) * 100 : 0}%` }}
                  title="Proporción Físico"
                />
                <div
                  className="bg-emerald-300 h-full"
                  style={{ width: `${totalGlobal > 0 ? ((transito?.disponible || 0) / totalGlobal) * 100 : 0}%` }}
                  title="Proporción Tránsito"
                />
              </div>
            </div>

            {/* KPI 2: Stock Físico Inmediato */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Box size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Stock Físico</p>
                    <p className="text-xs text-gray-400">En racks de almacén</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {fisico?.rollos || 0} Rollos
                </span>
              </div>

              <div>
                <p className="text-2xl font-black text-gray-900">{fisico?.disponible?.toLocaleString() || 0} <span className="text-sm font-normal text-gray-500">m libres</span></p>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> Blanda: {fisico?.reservadoBlando || 0}m
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-400" /> Firme: {fisico?.reservadoFirme || 0}m
                  </span>
                  {(fisico?.reservadoVip || 0) > 0 && (
                    <span className="flex items-center gap-1 text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded">
                      <span className="w-2 h-2 rounded-full bg-purple-600" /> 💎 VIP: {fisico.reservadoVip}m
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* KPI 3: En Tránsito (Contenedores) */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Truck size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">En Tránsito</p>
                    <p className="text-xs text-gray-400">Contenedores marítimos</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  {transito?.embarques?.length || 0} Arribos
                </span>
              </div>

              <div>
                <p className="text-2xl font-black text-gray-900">{transito?.disponible?.toLocaleString() || 0} <span className="text-sm font-normal text-gray-500">m p/ Backorder</span></p>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                  <span>Total emb: {transito?.total?.toLocaleString() || 0}m</span>
                  <span className="text-amber-600 font-medium">Asignado: {transito?.reservado?.toLocaleString() || 0}m</span>
                </div>
              </div>
            </div>

            {/* KPI 4: Precio Ref & Listas */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <DollarSign size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Precio Base</p>
                    <p className="text-xs text-gray-400">Lista Referencia Formatex</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700">
                  {sku.priceLists?.length || 10} Listas
                </span>
              </div>

              <div>
                <p className="text-2xl font-black text-gray-900">${Number(sku.precioReferencia || 0).toFixed(2)} <span className="text-sm font-normal text-gray-500">MXN/m</span></p>
                <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-500" /> Candado de margen dirección activo
                </p>
              </div>
            </div>
          </div>

          {/* ─── PESTAÑAS DETALLE DE INVENTARIO ──────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Cabecera de tabs */}
            <div className="flex items-center gap-2 px-6 pt-4 border-b border-gray-100 overflow-x-auto">
              <button
                onClick={() => setActiveTab('fisico')}
                className={`pb-3.5 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'fisico'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Box size={16} />
                Rollos Físicos en Almacén ({fisico?.detalle?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab('transito')}
                className={`pb-3.5 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'transito'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Truck size={16} />
                Contenedores en Tránsito ({transito?.embarques?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab('precios')}
                className={`pb-3.5 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'precios'
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Calculator size={16} />
                Matriz de Precios ({sku.priceLists?.length || 10} Listas)
              </button>
            </div>

            {/* TAB 1: ROLLOS FÍSICOS */}
            {activeTab === 'fisico' && (
              <div className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 max-w-md">
                    <Search size={15} className="text-gray-400" />
                    <input
                      type="text"
                      value={huSearch}
                      onChange={(e) => setHuSearch(e.target.value)}
                      placeholder="Filtrar por código HU, ubicación (ej: RE-01) o lote..."
                      className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={huQualityFilter}
                      onChange={(e) => setHuQualityFilter(e.target.value)}
                      className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 outline-none"
                    >
                      <option value="">Todas las calidades</option>
                      <option value="PRIMERA">Primera Calidad</option>
                      <option value="SEGUNDA">Segunda Calidad</option>
                      <option value="MERMA">Merma</option>
                    </select>
                  </div>
                </div>

                {filteredHUs.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-gray-100">
                        <tr>
                          <th className="py-3 px-4">Código HU</th>
                          <th className="py-3 px-4">Ubicación Rack / Bin</th>
                          <th className="py-3 px-4 text-right">Metraje</th>
                          <th className="py-3 px-4 text-center">Calidad</th>
                          <th className="py-3 px-4 text-center">Estado</th>
                          <th className="py-3 px-4">Lote Prov.</th>
                          <th className="py-3 px-4">Ingreso</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredHUs.map((hu: any) => (
                          <tr key={hu.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                {hu.codigo}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {hu.ubicacion ? (
                                <span className="font-mono font-medium text-gray-800 bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                                  {hu.ubicacion}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">Sin ubicación</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-gray-900 text-sm">
                              {Number(hu.metraje || 0).toFixed(2)} m
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                hu.gradoCalidad === 'PRIMERA'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : hu.gradoCalidad === 'SEGUNDA'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {hu.gradoCalidad || 'PRIMERA'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {hu.estado === 'DISPONIBLE' && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center justify-center gap-1 w-fit mx-auto">
                                  <CheckCircle2 size={11} /> Libre
                                </span>
                              )}
                              {hu.estado === 'RESERVADO_BLANDO' && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 flex items-center justify-center gap-1 w-fit mx-auto">
                                  <Clock size={11} /> Res. Blanda (24h)
                                </span>
                              )}
                              {hu.estado === 'RESERVADO' && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 flex items-center justify-center gap-1 w-fit mx-auto">
                                  <ShieldAlert size={11} /> Firme
                                </span>
                              )}
                              {hu.estado === 'RESERVADO_VIP' && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300 flex items-center justify-center gap-1 w-fit mx-auto" title={`Apartado VIP en sub-almacén para ${hu.reservaVipNombre || 'Cliente'}`}>
                                  💎 VIP: {hu.reservaVipNombre || 'Apartado'}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-gray-600 text-[11px]">
                              {hu.loteProveedor || '—'}
                            </td>
                            <td className="py-3 px-4 text-gray-500 text-[11px]">
                              {hu.fechaIngreso ? new Date(hu.fechaIngreso).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
                    <Box size={36} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-600 font-medium text-sm">No se encontraron rollos físicos con los filtros actuales</p>
                    <p className="text-xs text-gray-400 mt-1">Verifica si el SKU solo tiene inventario programado en tránsito marítimo.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CONTENEDORES EN TRÁNSITO */}
            {activeTab === 'transito' && (
              <div className="p-6 space-y-4">
                {transito?.embarques?.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {transito.embarques.map((emb: any, idx: number) => {
                      const diasLlegada = emb.eta ? Math.ceil((new Date(emb.eta).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
                      return (
                        <div key={idx} className="bg-gradient-to-br from-blue-50/50 to-white border border-blue-100 rounded-2xl p-5 shadow-sm space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-blue-600 text-white">
                                  {emb.numeroContenedor || emb.embarque}
                                </span>
                                {emb.ordenCompra && (
                                  <span className="text-xs font-mono text-gray-500">OC: {emb.ordenCompra}</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 font-mono">
                                Pedimento: <strong className="text-gray-700">{emb.numeroPedimento || 'En trámite aduanal'}</strong>
                              </p>
                            </div>

                            <div className="text-right">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                diasLlegada !== null && diasLlegada <= 5
                                  ? 'bg-red-100 text-red-700 border border-red-200'
                                  : diasLlegada !== null && diasLlegada <= 15
                                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {diasLlegada !== null ? (diasLlegada <= 0 ? 'En Puerto / Arribado' : `Llega en ~${diasLlegada} días`) : 'ETA pendiente'}
                              </span>
                              <p className="text-[11px] text-gray-400 mt-1">
                                ETA: {emb.eta ? new Date(emb.eta).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 bg-white rounded-xl p-3 border border-gray-100 text-center">
                            <div>
                              <p className="text-[10px] font-semibold text-gray-400 uppercase">Rollos</p>
                              <p className="text-sm font-bold text-gray-800">{emb.rollos}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-gray-400 uppercase">Total Metros</p>
                              <p className="text-sm font-bold text-gray-800">{Number(emb.metrajeTotal || 0).toLocaleString()}m</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-emerald-600 uppercase">Libre p/ Venta</p>
                              <p className="text-sm font-black text-emerald-600">{Number(emb.metrajeDisponible || 0).toLocaleString()}m</p>
                            </div>
                          </div>

                          {/* Barra de reserva en backorder */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-gray-500">
                              <span>Comprometido en Backorder: <strong>{Number(emb.metrajeReservado || 0).toLocaleString()}m</strong></span>
                              <span>Disponible: <strong>{Number(emb.metrajeDisponible || 0).toLocaleString()}m</strong></span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                              <div
                                className="bg-amber-500 h-full"
                                style={{ width: `${emb.metrajeTotal > 0 ? (emb.metrajeReservado / emb.metrajeTotal) * 100 : 0}%` }}
                                title="Reservado en Backorders"
                              />
                              <div
                                className="bg-emerald-500 h-full"
                                style={{ width: `${emb.metrajeTotal > 0 ? (emb.metrajeDisponible / emb.metrajeTotal) * 100 : 0}%` }}
                                title="Disponible para venta"
                              />
                            </div>
                          </div>

                          {emb.transportista && (
                            <p className="text-[11px] text-gray-400 flex items-center gap-1">
                              <Truck size={12} /> Naviera / Transportista: <strong className="text-gray-600">{emb.transportista}</strong>
                            </p>
                          )}

                          <button
                            onClick={() => navigate(`/pedidos?newSku=${sku.id}`)}
                            className="w-full py-2 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                          >
                            <ShoppingCart size={13} />
                            Apartar Backorder con este Contenedor
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
                    <Truck size={36} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-600 font-medium text-sm">No hay embarques marítimos en tránsito para esta tela</p>
                    <p className="text-xs text-gray-400 mt-1">Consulta a Compras o Planeación para programar una nueva orden de importación.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: MATRIZ DE PRECIOS */}
            {activeTab === 'precios' && (
              <div className="p-6 space-y-6">
                {/* Calculadora rápida de cotización */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                      <Calculator size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Simulador de Cotización Rápida</p>
                      <p className="text-xs text-gray-500">Calcula los subtotales estimados en todas las listas autorizadas de Formatex.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-gray-700">Metros a Cotizar:</label>
                    <input
                      type="number"
                      min={1}
                      value={calcMetros}
                      onChange={(e) => setCalcMetros(Math.max(1, Number(e.target.value)))}
                      className="w-28 px-3 py-1.5 bg-white border border-purple-200 rounded-xl font-bold text-sm text-purple-900 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-xs text-gray-500">m</span>
                  </div>
                </div>

                {/* Tabla de listas de precios oficiales */}
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-gray-100">
                      <tr>
                        <th className="py-3 px-4">Lista Oficial</th>
                        <th className="py-3 px-4">Descripción / Tipo de Cliente</th>
                        <th className="py-3 px-4 text-right">Precio x Metro</th>
                        <th className="py-3 px-4 text-center">Margen Mínimo</th>
                        <th className="py-3 px-4 text-right">Subtotal Simulado ({calcMetros}m)</th>
                        <th className="py-3 px-4 text-center">Candado VoBo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(sku.priceLists && sku.priceLists.length > 0 ? sku.priceLists : [
                        { listaCodigo: 'LISTA_10', descripcion: 'Mayoreo (>500m)', precioBase: Number(sku.precioReferencia || 100) * 0.85, margenMinimo: 20, requiereAutorizacion: false },
                        { listaCodigo: 'LISTA_20', descripcion: 'Distribuidor Nacional', precioBase: Number(sku.precioReferencia || 100) * 0.90, margenMinimo: 25, requiereAutorizacion: false },
                        { listaCodigo: 'LISTA_30', descripcion: 'Medio Mayoreo (100-500m)', precioBase: Number(sku.precioReferencia || 100) * 0.95, margenMinimo: 28, requiereAutorizacion: false },
                        { listaCodigo: 'LISTA_40', descripcion: 'Menudeo / Fabricante Chico', precioBase: Number(sku.precioReferencia || 100) * 1.00, margenMinimo: 32, requiereAutorizacion: false },
                        { listaCodigo: 'LISTA_50', descripcion: 'Crédito 30 Días Premium', precioBase: Number(sku.precioReferencia || 100) * 1.05, margenMinimo: 35, requiereAutorizacion: false },
                        { listaCodigo: 'LISTA_60', descripcion: 'Crédito 60 Días', precioBase: Number(sku.precioReferencia || 100) * 1.10, margenMinimo: 38, requiereAutorizacion: true },
                        { listaCodigo: 'LISTA_70', descripcion: 'Convenio Especial Cadenas', precioBase: Number(sku.precioReferencia || 100) * 0.80, margenMinimo: 18, requiereAutorizacion: true },
                        { listaCodigo: 'LISTA_80', descripcion: 'Liquidación / Lotes', precioBase: Number(sku.precioReferencia || 100) * 0.75, margenMinimo: 15, requiereAutorizacion: true },
                        { listaCodigo: 'LISTA_90', descripcion: 'Proyectos Hoteleros', precioBase: Number(sku.precioReferencia || 100) * 0.88, margenMinimo: 22, requiereAutorizacion: false },
                        { listaCodigo: 'LISTA_100', descripcion: 'Muestrarios & Prototipos', precioBase: Number(sku.precioReferencia || 100) * 1.25, margenMinimo: 45, requiereAutorizacion: false },
                      ]).map((pl: any, i: number) => {
                        const precioUnit = Number(pl.precioBase || pl.precio || sku.precioReferencia || 0);
                        const subtotal = precioUnit * calcMetros;
                        return (
                          <tr key={i} className="hover:bg-purple-50/30 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-xs">
                                {pl.listaCodigo}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium text-gray-800">
                              {pl.descripcion || `Lista ${pl.listaCodigo}`}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-gray-900 text-sm">
                              ${precioUnit.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-gray-100 text-gray-700">
                                {pl.margenMinimo ? `${pl.margenMinimo}%` : '20%'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                              ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {pl.requiereAutorizacion ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center justify-center gap-1 w-fit mx-auto">
                                  <ShieldAlert size={11} /> VoBo Dir.
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center justify-center gap-1 w-fit mx-auto">
                                  <Check size={11} /> Directo
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── EMPTY STATE (CUANDO NO HAY SKU SELECCIONADO) ─────────────── */}
      {!selectedSkuId && (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center space-y-6 shadow-sm">
          <div className="max-w-md mx-auto space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <Search size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Selecciona o busca una tela de Formatex</h3>
            <p className="text-xs text-gray-500">
              Esta pantalla consolida el inventario en tiempo real para evitar comprometer metros no disponibles.
            </p>
          </div>

          {/* Guía de 3 pasos para el vendedor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-1">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">1</div>
              <p className="font-bold text-xs text-gray-900">Stock Inmediato</p>
              <p className="text-[11px] text-gray-500">Para clientes que requieren entrega exprés hoy mismo desde racks físicos.</p>
            </div>

            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 space-y-1">
              <div className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center">2</div>
              <p className="font-bold text-xs text-gray-900">Reserva Blanda (24h)</p>
              <p className="text-[11px] text-gray-500">Apartado preventivo por 24 horas mientras el cliente deposita o valida CFDI.</p>
            </div>

            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">3</div>
              <p className="font-bold text-xs text-gray-900">Backorder en Tránsito</p>
              <p className="text-[11px] text-gray-500">Asigna metros directamente a contenedores en camino con arribo garantizado FIFO.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

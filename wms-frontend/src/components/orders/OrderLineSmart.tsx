import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { api } from '../../config/api';
import {
  Scroll, Scissors, Search, TrendingDown, Truck,
  MapPin, AlertTriangle, Check, ChevronDown, X, Sparkles, CalendarClock,
  Package, Layers, Target, ShieldAlert, Lock, Loader2,
} from 'lucide-react';

interface OrderLineSmartProps {
  index: number;
  clientId?: string;
  line: { skuId: string; metrajeRequerido: number; precioUnitario: number; selectedHuId?: string; listaPrecios?: string; descuentoPct?: number };
  skus: any[];
  onChange: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

export default function OrderLineSmart({ index, clientId, line, skus, onChange, onRemove, canRemove }: OrderLineSmartProps) {
  const [skuSearch, setSkuSearch] = useState('');
  const [showSkuDropdown, setShowSkuDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [viewMode, setViewMode] = useState<'plan' | 'individual'>('plan');
  const [pricingInfo, setPricingInfo] = useState<any>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const skuRef = useRef<HTMLDivElement>(null);
  const suggRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<any>(null);
  const priceDebounceRef = useRef<any>(null);

  const selectedSku = skus.find((s: any) => s.id === line.skuId);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Detección de Muestras / Muestrarios / Carpetas (Unidades PZA)
  const isMuestrario = Boolean(
    selectedSku?.tipoArticulo === 'MUESTRARIO' ||
    selectedSku?.unidadMedida === 'PZA' ||
    selectedSku?.categoria?.toLowerCase().includes('muestra') ||
    selectedSku?.nombre?.toLowerCase().includes('muestrario') ||
    selectedSku?.nombre?.toLowerCase().includes('carpeta')
  );

  // Candado Estricto de Precios (Directriz de Sesión #2 Andrea & Santiago):
  // Prohíbe alteración manual cuando proviene de lista oficial o convenio especial para evitar pérdidas comerciales
  const isPriceLocked = Boolean(
    pricingInfo?.esPrecioEspecial || 
    (line.listaPrecios && pricingInfo?.precioUnitario !== undefined)
  );

  // Auto-resolución de lista y precio exacto según Matriz Oficial Formatex (Rollo vs Corte y Tipo de Cliente)
  const fetchPricing = useCallback((overrideLista?: string) => {
    if (!line.skuId) {
      setPricingInfo(null);
      return;
    }
    setLoadingPrice(true);
    api.get('/catalog/pricing/resolve', {
      params: {
        skuId: line.skuId,
        clientId,
        metraje: line.metrajeRequerido || 50,
        lista: overrideLista !== undefined ? overrideLista : line.listaPrecios,
      },
    })
      .then(res => {
        const data = res.data;
        setPricingInfo(data);
        if (data?.esPrecioEspecial) {
          onChangeRef.current(index, 'precioUnitario', Number(data.precioUnitario));
          onChangeRef.current(index, 'listaPrecios', 'ESPECIAL');
          onChangeRef.current(index, 'descuentoPct', 0);
        } else if (data?.precioUnitario !== undefined) {
          onChangeRef.current(index, 'precioUnitario', Number(data.precioUnitario));
          if (data.listaCodigo) {
            onChangeRef.current(index, 'listaPrecios', data.listaCodigo);
          }
          if (!overrideLista && (!line.listaPrecios || line.listaPrecios === 'ESPECIAL')) {
            onChangeRef.current(index, 'descuentoPct', 0);
          }
        }
      })
      .catch(() => {
        setPricingInfo(null);
      })
      .finally(() => {
        setLoadingPrice(false);
      });
  }, [index, clientId, line.skuId, line.metrajeRequerido, line.listaPrecios]);

  useEffect(() => {
    if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current);
    if (line.skuId) {
      priceDebounceRef.current = setTimeout(() => {
        fetchPricing();
      }, 250);
    } else {
      setPricingInfo(null);
    }
    return () => clearTimeout(priceDebounceRef.current);
  }, [clientId, line.skuId, line.metrajeRequerido, fetchPricing]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (skuRef.current && !skuRef.current.contains(e.target as Node)) setShowSkuDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [remoteSkus, setRemoteSkus] = useState<any[]>([]);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);

  useEffect(() => {
    if (!skuSearch || skuSearch.trim().length < 2) {
      setRemoteSkus([]);
      return;
    }
    const timer = setTimeout(() => {
      setIsSearchingRemote(true);
      api.get('/catalog/skus', { params: { search: skuSearch.trim(), limit: 40 } })
        .then(res => {
          setRemoteSkus(res.data?.data || []);
        })
        .catch(() => setRemoteSkus([]))
        .finally(() => setIsSearchingRemote(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [skuSearch]);

  const filteredSkus = useMemo(() => {
    const q = (skuSearch || '').toLowerCase().trim();
    const inMemory = (skus || []).filter((s: any) => {
      if (!q) return true;
      return s.nombre?.toLowerCase().includes(q) || s.codigo?.toLowerCase().includes(q) || s.color?.toLowerCase().includes(q);
    });

    if (remoteSkus.length === 0) return inMemory;

    const map = new Map<string, any>();
    inMemory.forEach((s: any) => map.set(s.id, s));
    remoteSkus.forEach((s: any) => {
      if (!map.has(s.id)) map.set(s.id, s);
    });
    return Array.from(map.values());
  }, [skus, skuSearch, remoteSkus]);

  const lastFetchedRef = useRef('');

  const fetchSuggestions = useCallback(async (skuId: string, metraje: number) => {
    if (!skuId || !metraje || metraje <= 0 || isMuestrario) { setSuggestions(null); return; }

    // Prevent re-fetching the same params (avoids infinite loop)
    const key = `${skuId}-${metraje}`;
    if (lastFetchedRef.current === key) return;
    lastFetchedRef.current = key;

    setLoadingSugg(true);
    try {
      const resp = await api.get('/inventory/suggest-hus', { params: { skuId, metraje, limit: 20 } });
      setSuggestions(resp.data);
      setShowSuggestions(true);

      // Auto-select fulfillment plan HUs for the order
      const plan = resp.data?.fulfillmentPlan;
      if (plan?.items?.length > 0) {
        const selectedHUs = plan.items
          .filter((item: any) => item.source === 'FISICO')
          .map((item: any) => ({ huId: item.id, metrajeTomar: item.metrajeTomar }));
        onChangeRef.current(index, 'selectedHUs', selectedHUs);
      } else {
        onChangeRef.current(index, 'selectedHUs', []);
      }
    } catch { setSuggestions(null); }
    setLoadingSugg(false);
  }, [index, isMuestrario]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (line.skuId && line.metrajeRequerido > 0 && !isMuestrario) {
      debounceRef.current = setTimeout(() => fetchSuggestions(line.skuId, line.metrajeRequerido), 400);
    }
    return () => clearTimeout(debounceRef.current);
  }, [line.skuId, line.metrajeRequerido, isMuestrario, fetchSuggestions]);

  const selectSku = (sku: any) => {
    onChange(index, 'skuId', sku.id);
    if (!specialPriceInfo) {
      onChange(index, 'precioUnitario', Number(sku.precioReferencia) || 0);
    }
    onChange(index, 'selectedHUs', []);
    setSkuSearch(''); setShowSkuDropdown(false);
  };

  const descPct = line.descuentoPct || 0;
  const precioConDescuento = line.precioUnitario * (1 - descPct / 100);
  const importe = line.metrajeRequerido * precioConDescuento;
  const plan = suggestions?.fulfillmentPlan;

  // Status visual para el plan de surtido (cero emojis genéricos)
  const statusConfig: Record<string, { bg: string; text: string; label: string; icon: any }> = {
    COMPLETO: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Demanda cubierta al 100%', icon: Check },
    PARCIAL: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Cobertura parcial', icon: AlertTriangle },
    SIN_STOCK: { bg: 'bg-amber-50/80 border border-amber-200', text: 'text-amber-800', label: 'Mercancía en Transición / Piso (Sin HUs en sistema)', icon: Package },
  };

  return (
    <div className="bg-gray-50/80 rounded-xl border border-gray-100 p-4 space-y-3 hover:border-gray-200 transition-colors">
      {/* Row 1: SKU + Metraje + Price + Amount */}
      <div className="grid grid-cols-12 gap-3 items-end">
        {/* SKU Search/Select */}
        <div className="col-span-3" ref={skuRef}>
          <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Tela</label>
          <div className="relative">
            <div
              className={`w-full px-3 py-2 bg-white border rounded-lg text-sm cursor-pointer flex items-center justify-between ${
                showSkuDropdown ? 'ring-2 ring-indigo-400 border-indigo-400' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setShowSkuDropdown(!showSkuDropdown)}
            >
              {selectedSku ? (
                <span className="truncate">
                  <span className="font-medium">{selectedSku.nombre}</span>
                  <span className="text-gray-400"> — {selectedSku.color}</span>
                </span>
              ) : (
                <span className="text-gray-400">Buscar tela...</span>
              )}
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${showSkuDropdown ? 'rotate-180' : ''}`} />
            </div>

            {showSkuDropdown && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-hidden">
                <div className="p-2 border-b sticky top-0 bg-white">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={skuSearch} onChange={(e) => setSkuSearch(e.target.value)}
                      placeholder="Buscar por nombre, código o color..."
                      className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-400" autoFocus />
                  </div>
                </div>
                <div className="overflow-y-auto max-h-48">
                  {filteredSkus.map((sku: any) => (
                    <button key={sku.id} onClick={() => selectSku(sku)}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-indigo-50 transition-colors flex items-center justify-between ${
                        line.skuId === sku.id ? 'bg-indigo-50 text-indigo-700' : ''
                      }`}>
                      <div>
                        <p className="font-medium">{sku.nombre}</p>
                        <p className="text-[11px] text-gray-400">{sku.codigo} · {sku.color} · {sku.composicion || ''}</p>
                      </div>
                      <span className="text-xs text-emerald-600 font-mono font-semibold">${Number(sku.precioReferencia || 0).toFixed(2)}/m</span>
                    </button>
                  ))}
                  {filteredSkus.length === 0 && <p className="text-center text-xs text-gray-400 py-4">No se encontraron telas</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Metraje o Piezas */}
        <div className="col-span-1">
          <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide truncate">
            {isMuestrario ? 'Piezas' : 'Metros'}
          </label>
          <input type="number" min={1} value={line.metrajeRequerido}
            onChange={(e) => onChange(index, 'metrajeRequerido', +e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400" />
        </div>

        {/* Lista de Precios Oficial Formatex */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-violet-600 mb-1 uppercase tracking-wide flex items-center justify-between">
            <span>Lista Asignada</span>
            {loadingPrice && <span className="text-[10px] text-gray-400 animate-pulse">Calculando...</span>}
          </label>
          <select
            value={pricingInfo?.esPrecioEspecial ? 'ESPECIAL' : (line.listaPrecios || '')}
            disabled={pricingInfo?.esPrecioEspecial}
            onChange={(e) => {
              const nuevaLista = e.target.value;
              if (nuevaLista === 'ESPECIAL') {
                onChange(index, 'listaPrecios', 'ESPECIAL');
                onChange(index, 'precioUnitario', Number(pricingInfo?.precioUnitario || 0));
                onChange(index, 'descuentoPct', 0);
              } else {
                fetchPricing(nuevaLista);
              }
            }}
            className={`w-full px-2.5 py-2 bg-white border rounded-lg text-xs focus:ring-2 focus:ring-violet-400 font-medium ${
              pricingInfo?.esPrecioEspecial ? 'border-violet-300 bg-violet-50/50 text-violet-800' :
              pricingInfo?.requiereAprobacion ? 'border-amber-300 bg-amber-50/30 text-amber-900' : 'border-violet-200'
            }`}
          >
            <option value="">Auto (Matriz Rollo/Corte)</option>
            {pricingInfo?.esPrecioEspecial && (
              <option value="ESPECIAL">
                Convenio Especial Directivo — ${Number(pricingInfo.precioUnitario).toFixed(2)}/m
              </option>
            )}
            {[
              { code: 'F0', name: 'Público General Rollo', req: false },
              { code: 'F1', name: 'Público General Corte', req: false },
              { code: 'F2', name: 'Casa Decoradora Rollo', req: false },
              { code: 'F3', name: 'Tienda Rollo / Casa Dec Corte', req: true },
              { code: 'F4', name: 'Tienda Especial Rollo', req: false },
              { code: 'F5', name: 'Fabricante Rollo', req: true },
              { code: 'F6', name: 'Distribuidor Rollo', req: false },
              { code: 'F7', name: 'Distribuidor Corte', req: true },
              { code: 'F8', name: 'Cliente Premium Rollo', req: false },
              { code: 'F9', name: 'Precio Dirección / Mayorista', req: true },
              { code: 'F10', name: 'Venta Web / Catálogo Especial', req: false },
            ].map(l => {
              const price = pricingInfo?.todasLasListas?.[l.code];
              const priceLabel = price !== undefined ? ` ($${Number(price).toFixed(2)}/m)` : '';
              const lockLabel = l.req ? ' 🔒' : '';
              return (
                <option key={l.code} value={l.code}>
                  {l.code} — {l.name}{priceLabel}{lockLabel}
                </option>
              );
            })}
          </select>
        </div>

        {/* Descuento Adicional % */}
        <div className="col-span-1">
          <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Desc %</label>
          <input type="number" step={0.5} min={0} max={50}
            disabled={pricingInfo?.esPrecioEspecial}
            value={line.descuentoPct || 0}
            onChange={(e) => onChange(index, 'descuentoPct', +e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100 disabled:opacity-60" />
        </div>

        {/* Precio Unitario */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide flex items-center justify-between">
            <span>{isMuestrario ? '$/PZA' : '$/m'}</span>
            {isPriceLocked ? (
              <span className="text-[10px] text-indigo-700 font-semibold flex items-center gap-0.5" title="Precio bloqueado por lista oficial o convenio especial">
                <Lock size={9} /> Bloqueado
              </span>
            ) : pricingInfo?.esPrecioEspecial ? (
              <span className="text-[10px] text-violet-600 font-semibold">Pactado</span>
            ) : line.listaPrecios ? (
              <span className="text-[10px] text-indigo-600 font-semibold">{line.listaPrecios}</span>
            ) : null}
          </label>
          <div className="relative">
            <input type="number" step={0.01} value={line.precioUnitario}
              disabled={isPriceLocked}
              readOnly={isPriceLocked}
              onChange={(e) => onChange(index, 'precioUnitario', +e.target.value)}
              className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 ${
                isPriceLocked ? 'border-gray-200 bg-gray-100 text-gray-700 cursor-not-allowed font-medium pr-7' :
                pricingInfo?.esPrecioEspecial ? 'border-violet-300 bg-violet-50 text-violet-900 font-bold' :
                pricingInfo?.requiereAprobacion ? 'border-amber-300 bg-amber-50/20 text-amber-900 font-semibold' : 'border-gray-200'
              }`} />
            {isPriceLocked && (
              <Lock size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            )}
          </div>
        </div>

        {/* Importe */}
        <div className="col-span-2 text-right">
          <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Importe</label>
          <p className="text-sm font-bold text-emerald-600 py-2">${importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          {descPct > 0 && (
            <p className="text-[10px] text-gray-400 -mt-1">${precioConDescuento.toFixed(2)}/{isMuestrario ? 'pza' : 'm'} (-{descPct}%)</p>
          )}
        </div>

        {/* Remove */}
        <div className="col-span-1 flex justify-center">
          {canRemove && (
            <button onClick={() => onRemove(index)} className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Banner de Muestrario / Producto Terminado */}
      {isMuestrario && (
        <div className="flex items-center justify-between px-3 py-2 bg-blue-50/90 border border-blue-200 rounded-lg text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <Package size={15} className="text-blue-600 shrink-0" />
            <span>
              <strong>Muestrario / Producto Terminado (PZA):</strong> Artículo unitario terminado ({line.metrajeRequerido} PZA). No requiere proceso de corte de rollo ni genera merma.
            </span>
          </div>
          <span className="text-[10px] bg-blue-200 text-blue-900 px-2 py-0.5 rounded font-bold uppercase">
            Unitario PZA
          </span>
        </div>
      )}

      {/* Banners Inteligentes de Precios Formatex */}
      {pricingInfo?.esPrecioEspecial && (
        <div className="flex items-center justify-between px-3 py-2 bg-violet-50/90 border border-violet-200 rounded-lg text-xs text-violet-900">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Precio Especial Autorizado por Dirección:</span>
            <span className="font-bold text-violet-950 font-mono">${Number(pricingInfo.precioUnitario).toFixed(2)}/{isMuestrario ? 'pza' : 'm'}</span>
            {pricingInfo.referenciaProyecto && (
              <span className="text-violet-600">· {pricingInfo.referenciaProyecto}</span>
            )}
            {pricingInfo.autorizadoPor && (
              <span className="text-violet-500 text-[11px]">({pricingInfo.autorizadoPor})</span>
            )}
          </div>
          <span className="text-[10px] bg-violet-200/80 text-violet-800 px-2 py-0.5 rounded font-medium">
            Tarifa Protegida 🔒
          </span>
        </div>
      )}

      {!pricingInfo?.esPrecioEspecial && pricingInfo?.requiereAprobacion && (
        <div className="flex items-center justify-between px-3 py-2 bg-amber-50/90 border border-amber-200 rounded-lg text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <ShieldAlert size={14} className="text-amber-600 shrink-0" />
            <span>
              <strong>Candado Gerencial:</strong> La lista <strong>{line.listaPrecios}</strong> requiere autorización de Dirección General antes de surtir.
            </span>
          </div>
          <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-semibold">
            Requiere Aprobación
          </span>
        </div>
      )}

      {!pricingInfo?.esPrecioEspecial && pricingInfo?.modalidad && (
        <div className="flex items-center justify-between px-2.5 py-1 bg-gray-100/70 rounded-md text-[11px] text-gray-600">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-gray-800">Matriz Oficial Formatex:</span>
            <span>Cliente <strong>{pricingInfo.nombreTipoCliente || pricingInfo.tipoCliente}</strong></span>
            <span>· Modalidad <strong>{pricingInfo.modalidad === 'CORTE' ? 'Corte (<50m)' : 'Rollo Completo (≥50m)'}</strong></span>
            <span>· Sugerida: <strong>{pricingInfo.listaSugerida}</strong></span>
          </div>
          {line.listaPrecios && line.listaPrecios !== pricingInfo.listaSugerida && (
            <span className="text-indigo-600 font-semibold text-[10px]">
              (Modificada a {line.listaPrecios})
            </span>
          )}
        </div>
      )}

      {/* Row 2: Smart Fulfillment Plan */}
      {line.skuId && line.metrajeRequerido > 0 && !isMuestrario && (
        <div ref={suggRef}>
          {/* Toggle bar */}
          <button
            onClick={() => {
              if (!suggestions) fetchSuggestions(line.skuId, line.metrajeRequerido);
              else setShowSuggestions(!showSuggestions);
            }}
            className="w-full flex items-center justify-between px-3 py-2 bg-indigo-50/70 hover:bg-indigo-50 rounded-lg text-xs transition-all group"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-500" />
              <span className="font-medium text-indigo-700">
                {loadingSugg ? 'Buscando plan óptimo...' :
                  plan ? (
                    plan.status === 'COMPLETO'
                      ? <>Plan de surtido: <span className="font-bold">{plan.items.length} HUs</span> cubren {line.metrajeRequerido}m</>
                      : plan.status === 'PARCIAL'
                        ? <>Cobertura parcial: <span className="font-bold">{plan.coberturaPct}%</span> ({plan.totalCubierto}m de {plan.metrajeRequerido}m)</>
                        : <>Mercancía en Transición / Piso · <span className="font-semibold text-amber-700">Cotización Habilitada</span></>
                  ) : 'Ver plan inteligente de surtido'
                }
              </span>
            </div>
            <div className="flex items-center gap-2">
              {plan && (
                <span className="text-[10px] text-indigo-500 font-medium">
                  {plan.totalHUsFisicos} físico{plan.totalHUsTransito > 0 ? ` + ${plan.totalHUsTransito} tránsito` : ''} 
                  · {suggestions?.totalAvailable} HUs disp.
                </span>
              )}
              <ChevronDown size={14} className={`text-indigo-400 transition-transform ${showSuggestions ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Fulfillment Plan View */}
          {showSuggestions && plan && (
            <div className="mt-2 space-y-2 animate-fade-in">
              {/* Status Banner */}
              {(() => {
                const cfg = statusConfig[plan.status] || statusConfig.SIN_STOCK;
                return (
                  <div className={`${cfg.bg} rounded-xl p-3`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${cfg.text}`}>{cfg.label}</span>
                      <span className={`text-xs font-mono font-bold ${cfg.text}`}>{plan.totalCubierto}m / {plan.metrajeRequerido}m</span>
                    </div>
                    {/* Coverage bar */}
                    <div className="mt-2 h-2 bg-white/50 rounded-full overflow-hidden flex">
                      {plan.metrajeFisico > 0 && (
                        <div className="h-full bg-emerald-500 rounded-l-full" 
                          style={{ width: `${(plan.metrajeFisico / plan.metrajeRequerido) * 100}%` }} />
                      )}
                      {plan.metrajeTransito > 0 && (
                        <div className="h-full bg-blue-400" 
                          style={{ width: `${(plan.metrajeTransito / plan.metrajeRequerido) * 100}%` }} />
                      )}
                    </div>
                    <div className="flex gap-4 mt-1.5 text-[10px]">
                      {plan.metrajeFisico > 0 && (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Físico: {plan.metrajeFisico}m ({plan.totalHUsFisicos} HUs)
                        </span>
                      )}
                      {plan.metrajeTransito > 0 && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Tránsito: {plan.metrajeTransito}m ({plan.totalHUsTransito} embarques)
                        </span>
                      )}
                      {plan.gap > 0 && (
                        <span className="flex items-center gap-1 text-red-500">
                          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Faltante: {plan.gap}m
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* View Toggle */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                <button onClick={() => setViewMode('plan')}
                  className={`flex-1 px-3 py-1 rounded-md text-[11px] font-medium transition ${viewMode === 'plan' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>
                  <Layers size={12} className="inline mr-1 -mt-0.5" /> Plan de Surtido ({plan.items.length})
                </button>
                <button onClick={() => setViewMode('individual')}
                  className={`flex-1 px-3 py-1 rounded-md text-[11px] font-medium transition ${viewMode === 'individual' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>
                  <Package size={12} className="inline mr-1 -mt-0.5" /> Todos los HUs ({suggestions?.totalAvailable})
                </button>
              </div>

              {/* === PLAN VIEW === */}
              {viewMode === 'plan' && (
                <div className="space-y-1.5">
                  {plan.items.map((item: any, i: number) => (
                    <div key={item.id + '-' + i} className={`px-3 py-2.5 rounded-lg border text-xs transition-all ${
                      item.source === 'TRANSITO' 
                        ? 'bg-blue-50/60 border-blue-200' 
                        : 'bg-white border-gray-100'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {/* Step number */}
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                            item.source === 'TRANSITO' ? 'bg-blue-500' : 'bg-emerald-500'
                          }`}>{i + 1}</span>

                          {/* Type icon */}
                          {item.source === 'TRANSITO' ? (
                            <Truck size={14} className="text-blue-500" />
                          ) : item.tipoRollo === 'RETAZO' ? (
                            <Scissors size={14} className="text-amber-500" />
                          ) : (
                            <Scroll size={14} className="text-blue-500" />
                          )}

                          {/* Code & type */}
                          <div>
                            <span className="font-mono font-bold text-gray-800">{item.codigo}</span>
                            {item.source === 'TRANSITO' ? (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">Tránsito</span>
                            ) : (
                              <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                item.tipoRollo === 'RETAZO' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                              }`}>{item.tipoRollo}</span>
                            )}
                            {item.requiereCorte && (
                              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700">Requiere Corte</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* ETA for transit */}
                          {item.source === 'TRANSITO' && item.eta && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                              <CalendarClock size={10} /> {item.diasParaLlegar <= 0 ? 'Hoy' : `${item.diasParaLlegar}d`}
                            </span>
                          )}

                          {/* Metraje to take */}
                          <div className="text-right">
                            <span className="font-bold text-emerald-600">
                              <Target size={10} className="inline -mt-0.5 mr-0.5" />{item.metrajeTomar}m
                            </span>
                            {item.metrajeActual !== item.metrajeTomar && (
                              <span className="text-[10px] text-gray-400 ml-1">(de {item.metrajeActual}m)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Details row */}
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2">
                          {item.rol === 'PRIMERO' && <span className="text-[10px] text-emerald-600 font-medium">Primer corte</span>}
                          {item.rol === 'COMPLEMENTO' && <span className="text-[10px] text-indigo-600 font-medium">Complemento</span>}
                          {item.rol === 'COMPLETO' && <span className="text-[10px] text-emerald-600 font-medium">Rollo completo</span>}
                          {item.rol === 'PARCIAL' && <span className="text-[10px] text-amber-600 font-medium">Corte parcial</span>}
                          {item.rol === 'CIERRE' && <span className="text-[10px] text-purple-600 font-medium">Cierre (retazo)</span>}
                          {item.rol === 'TRANSITO' && <span className="text-[10px] text-blue-600 font-medium">En camino</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          {item.source === 'TRANSITO' ? (
                            <span className="flex items-center gap-1 text-[10px] text-blue-500">
                              {item.proveedor && <>{item.proveedor} · </>}
                              {item.transportista || ''}
                            </span>
                          ) : item.ubicacion ? (
                            <span className="flex items-center gap-1 text-[10px] text-gray-400">
                              <MapPin size={10} /> {item.ubicacion.codigo}
                            </span>
                          ) : null}
                          {item.sobrante > 0 && (
                            <span className="text-[10px] text-gray-400">
                              <TrendingDown size={10} className="inline -mt-0.5" /> {item.sobrante.toFixed(1)}m restante
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {plan.items.length === 0 && (
                    <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                          <Package size={15} className="text-amber-600" />
                          <span>Cotización con SKU y Precio (Fase de Transición / Piso)</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900">
                          100% Cotizable
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Esta tela no tiene rollos (HUs) etiquetados en el sistema en este momento. <strong>Puedes cotizar y guardar normalmente</strong> con el precio y descuento acordados. Los rollos físicos serán etiquetados o vinculados en tiempo real por el Champion mediante <em>Alta Express</em> o al momento de surtir y cortar.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60 text-[10px] text-amber-700">
                        <span className="flex items-center gap-1 font-medium bg-white/80 px-2 py-0.5 rounded border border-amber-200">
                          ✓ Precio ${precioConDescuento.toFixed(2)}/m
                        </span>
                        <span className="flex items-center gap-1 font-medium bg-white/80 px-2 py-0.5 rounded border border-amber-200">
                          ✓ Importe: ${importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="flex items-center gap-1 font-medium bg-white/80 px-2 py-0.5 rounded border border-amber-200">
                          ✓ Alta Express disponible al surtir
                        </span>
                      </div>
                    </div>
                  )}

                  {plan.gap > 0 && plan.items.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 rounded-lg text-amber-700 text-xs">
                      <AlertTriangle size={14} />
                      <div>
                        <p className="font-semibold">Faltan {plan.gap}m para completar el pedido</p>
                        <p className="text-[10px] text-amber-600 mt-0.5">
                          Se cubrieron {plan.totalCubierto}m de {plan.metrajeRequerido}m requeridos.
                          {suggestions?.transitAvailable === 0 && ' No hay mercancía en tránsito para esta tela.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* === INDIVIDUAL HU VIEW === */}
              {viewMode === 'individual' && suggestions?.suggestions?.length > 0 && (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {suggestions.suggestions.map((hu: any) => (
                    <div key={hu.id} className={`px-3 py-2.5 rounded-lg border text-xs transition-all ${
                      hu.source === 'TRANSITO'
                        ? 'bg-blue-50/60 border-blue-200'
                        : hu.fits ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100 opacity-60'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {hu.source === 'TRANSITO' ? (
                            <Truck size={14} className="text-blue-500" />
                          ) : hu.tipoRollo === 'RETAZO' ? (
                            <Scissors size={14} className="text-amber-500" />
                          ) : (
                            <Scroll size={14} className="text-blue-500" />
                          )}
                          <span className="font-mono font-bold text-gray-800">{hu.codigo}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            hu.source === 'TRANSITO' ? 'bg-blue-100 text-blue-700'
                              : hu.tipoRollo === 'RETAZO' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}>{hu.source === 'TRANSITO' ? 'Tránsito' : hu.tipoRollo}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {hu.source === 'TRANSITO' && hu.diasParaLlegar != null && (
                            <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                              {hu.diasParaLlegar <= 0 ? 'Hoy' : `${hu.diasParaLlegar}d`}
                            </span>
                          )}
                          <span className="font-bold text-gray-800">{hu.metrajeActual}m</span>
                          {hu.fits && hu.waste > 0 && (
                            <span className="text-[10px] text-gray-400">
                              <TrendingDown size={10} className="inline -mt-0.5" /> {hu.waste.toFixed(1)}m sobrante
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] text-gray-500">{hu.tag}</span>
                        {hu.ubicacion && (
                          <span className="flex items-center gap-1 text-[10px] text-gray-400">
                            <MapPin size={10} /> {hu.ubicacion.codigo}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

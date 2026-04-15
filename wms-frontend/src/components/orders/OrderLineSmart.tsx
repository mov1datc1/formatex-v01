import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../config/api';
import {
  Scroll, Scissors, Search, TrendingDown, Truck,
  MapPin, AlertTriangle, Check, ChevronDown, X, Sparkles, CalendarClock,
  Package, Layers, Target,
} from 'lucide-react';

interface OrderLineSmartProps {
  index: number;
  line: { skuId: string; metrajeRequerido: number; precioUnitario: number; selectedHuId?: string };
  skus: any[];
  onChange: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

export default function OrderLineSmart({ index, line, skus, onChange, onRemove, canRemove }: OrderLineSmartProps) {
  const [skuSearch, setSkuSearch] = useState('');
  const [showSkuDropdown, setShowSkuDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [viewMode, setViewMode] = useState<'plan' | 'individual'>('plan');
  const skuRef = useRef<HTMLDivElement>(null);
  const suggRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<any>(null);

  const selectedSku = skus.find((s: any) => s.id === line.skuId);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (skuRef.current && !skuRef.current.contains(e.target as Node)) setShowSkuDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredSkus = skus.filter((s: any) => {
    if (!skuSearch) return true;
    const q = skuSearch.toLowerCase();
    return s.nombre?.toLowerCase().includes(q) || s.codigo?.toLowerCase().includes(q) || s.color?.toLowerCase().includes(q);
  });

  const fetchSuggestions = useCallback(async (skuId: string, metraje: number) => {
    if (!skuId || !metraje || metraje <= 0) { setSuggestions(null); return; }
    setLoadingSugg(true);
    try {
      const resp = await api.get('/inventory/suggest-hus', { params: { skuId, metraje, limit: 20 } });
      setSuggestions(resp.data);
      setShowSuggestions(true);
    } catch { setSuggestions(null); }
    setLoadingSugg(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (line.skuId && line.metrajeRequerido > 0) {
      debounceRef.current = setTimeout(() => fetchSuggestions(line.skuId, line.metrajeRequerido), 400);
    }
    return () => clearTimeout(debounceRef.current);
  }, [line.skuId, line.metrajeRequerido, fetchSuggestions]);

  const selectSku = (sku: any) => {
    onChange(index, 'skuId', sku.id);
    onChange(index, 'precioUnitario', Number(sku.precioReferencia) || 0);
    setSkuSearch(''); setShowSkuDropdown(false);
  };

  const importe = line.metrajeRequerido * line.precioUnitario;
  const plan = suggestions?.fulfillmentPlan;

  // Status colors for the plan
  const statusConfig: Record<string, { bg: string; text: string; label: string; icon: any }> = {
    COMPLETO: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '✅ Demanda cubierta al 100%', icon: Check },
    PARCIAL: { bg: 'bg-amber-50', text: 'text-amber-700', label: '⚠️ Cobertura parcial', icon: AlertTriangle },
    SIN_STOCK: { bg: 'bg-red-50', text: 'text-red-700', label: '❌ Sin stock disponible', icon: X },
  };

  return (
    <div className="bg-gray-50/80 rounded-xl border border-gray-100 p-4 space-y-3 hover:border-gray-200 transition-colors">
      {/* Row 1: SKU + Metraje + Price + Amount */}
      <div className="grid grid-cols-12 gap-3 items-end">
        {/* SKU Search/Select */}
        <div className="col-span-5" ref={skuRef}>
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

        {/* Metraje */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Metros</label>
          <input type="number" min={1} value={line.metrajeRequerido}
            onChange={(e) => onChange(index, 'metrajeRequerido', +e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400" />
        </div>

        {/* Precio */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">$/m</label>
          <input type="number" step={0.01} value={line.precioUnitario}
            onChange={(e) => onChange(index, 'precioUnitario', +e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400" />
        </div>

        {/* Importe */}
        <div className="col-span-2 text-right">
          <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Importe</label>
          <p className="text-sm font-bold text-emerald-600 py-2">${importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
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

      {/* Row 2: Smart Fulfillment Plan */}
      {line.skuId && line.metrajeRequerido > 0 && (
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
                      ? <>✅ Plan de surtido: <span className="font-bold">{plan.items.length} HUs</span> cubren {line.metrajeRequerido}m</>
                      : plan.status === 'PARCIAL'
                        ? <>⚠️ Cobertura parcial: <span className="font-bold">{plan.coberturaPct}%</span> ({plan.totalCubierto}m de {plan.metrajeRequerido}m)</>
                        : '❌ Sin stock disponible'
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
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">🚛 TRÁNSITO</span>
                            ) : (
                              <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                item.tipoRollo === 'RETAZO' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                              }`}>{item.tipoRollo}</span>
                            )}
                            {item.requiereCorte && (
                              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700">✂️ Cortar</span>
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
                          {item.rol === 'PRIMERO' && <span className="text-[10px] text-emerald-600">🎯 Primer corte</span>}
                          {item.rol === 'COMPLEMENTO' && <span className="text-[10px] text-indigo-600">➕ Complemento</span>}
                          {item.rol === 'COMPLETO' && <span className="text-[10px] text-emerald-600">📦 Rollo completo</span>}
                          {item.rol === 'PARCIAL' && <span className="text-[10px] text-amber-600">✂️ Corte parcial</span>}
                          {item.rol === 'CIERRE' && <span className="text-[10px] text-purple-600">🔒 Cierre (retazo)</span>}
                          {item.rol === 'TRANSITO' && <span className="text-[10px] text-blue-600">🚛 En camino</span>}
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
                    <div className="flex items-center gap-2 px-3 py-3 bg-red-50 rounded-lg text-red-700 text-xs">
                      <AlertTriangle size={14} /> Sin inventario disponible para esta tela.
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
                  {suggestions.suggestions.map((hu: any, i: number) => (
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
                          }`}>{hu.source === 'TRANSITO' ? '🚛 TRÁNSITO' : hu.tipoRollo}</span>
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

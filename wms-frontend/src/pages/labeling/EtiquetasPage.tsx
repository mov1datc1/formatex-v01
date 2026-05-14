import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import { WmsIcon, KpiIcon, StatusBadge } from '../../components/icons/WmsIcons';
import PrintDialog from '../../components/labels/PrintDialog';
import { CheckCircle2, Circle, Printer, Package, Filter, Layers, ChevronDown } from 'lucide-react';

export default function EtiquetasPage() {
  const [search, setSearch] = useState('');
  const [filterEtiquetado, setFilterEtiquetado] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterReceiptId, setFilterReceiptId] = useState('');
  const [selectedHus, setSelectedHus] = useState<Set<string>>(new Set());
  const [previewHu, setPreviewHu] = useState<any>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [showReceiptDropdown, setShowReceiptDropdown] = useState(false);

  // Fetch HUs with all filters
  const { data: resp, refetch } = useApi<PaginatedResponse<any>>(
    ['etiquetas-hus', search, filterEtiquetado, filterTipo, filterReceiptId],
    '/inventory/hus',
    {
      search: search || undefined,
      etiquetaImpresa: filterEtiquetado === 'SI' ? 'true' : filterEtiquetado === 'NO' ? 'false' : undefined,
      tipoRollo: filterTipo || undefined,
      receiptId: filterReceiptId || undefined,
      limit: 100,
    }
  );
  const hus = resp?.data || [];

  // Fetch recent receipts for quick filtering
  const { data: receiptsResp } = useApi<PaginatedResponse<any>>(['recent-receipts'], '/reception', { limit: 20 });
  const recentReceipts = receiptsResp?.data || [];

  const toggleSelect = (id: string) => {
    const next = new Set(selectedHus);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedHus(next);
  };

  const selectAll = () => {
    if (selectedHus.size === hus.length) {
      setSelectedHus(new Set());
    } else {
      setSelectedHus(new Set(hus.map((h: any) => h.id)));
    }
  };

  const selectUnlabeled = () => {
    const unlabeled = hus.filter((h: any) => !h.etiquetaImpresa);
    setSelectedHus(new Set(unlabeled.map((h: any) => h.id)));
    if (unlabeled.length > 0) toast.success(`${unlabeled.length} rollos sin etiqueta seleccionados`);
    else toast('Todos ya tienen etiqueta', { icon: '✓' });
  };

  const markPrinted = async () => {
    if (selectedHus.size === 0) return toast.error('Selecciona al menos un HU');
    try {
      for (const id of selectedHus) {
        await api.put(`/inventory/hus/${id}/relocate`, { etiquetaImpresa: true, fechaEtiquetado: new Date().toISOString() });
      }
      toast.success(`${selectedHus.size} etiquetas marcadas como impresas`);
      setSelectedHus(new Set());
      refetch();
    } catch { toast.error('Error al marcar etiquetas'); }
  };

  const selectedHuList = hus.filter((h: any) => selectedHus.has(h.id));
  const unlabeledCount = hus.filter((h: any) => !h.etiquetaImpresa).length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <KpiIcon icon={WmsIcon.Label} gradient="from-violet-500 to-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Etiquetado</h1>
            <p className="text-gray-500 text-sm">Generación e impresión de etiquetas para rollos y retazos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={markPrinted} disabled={selectedHus.size === 0} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 flex items-center gap-2 shadow-sm hover:bg-emerald-700 transition-colors">
            <CheckCircle2 size={16} /> Marcar Impresas ({selectedHus.size})
          </button>
          <button onClick={() => { if (selectedHus.size > 0) setShowPrint(true); else toast.error('Selecciona HUs'); }} className="px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 transition-all">
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>

      {/* Smart Filters Row */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 max-w-sm">
          <WmsIcon.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por código HU o SKU..." className="w-full pl-9 pr-4 py-2.5 bg-white border rounded-xl text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all" />
        </div>
        <select value={filterEtiquetado} onChange={(e) => setFilterEtiquetado(e.target.value)} className="px-3 py-2.5 bg-white border rounded-xl text-sm">
          <option value="">Todos</option>
          <option value="NO">🏷️ Sin Etiqueta</option>
          <option value="SI">✅ Con Etiqueta</option>
        </select>
        <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className="px-3 py-2.5 bg-white border rounded-xl text-sm">
          <option value="">Todos los tipos</option>
          <option value="ENTERO">Enteros</option>
          <option value="RETAZO">Retazos</option>
        </select>

        {/* OC/Receipt Quick Selector */}
        <div className="relative">
          <button
            onClick={() => setShowReceiptDropdown(!showReceiptDropdown)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 border transition-all ${filterReceiptId ? 'bg-violet-50 border-violet-300 text-violet-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <Package size={15} />
            {filterReceiptId ? `OC: ${recentReceipts.find((r: any) => r.id === filterReceiptId)?.ordenCompra || recentReceipts.find((r: any) => r.id === filterReceiptId)?.codigo || 'Seleccionada'}` : 'Filtrar por OC'}
            <ChevronDown size={14} className={`transition-transform ${showReceiptDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showReceiptDropdown && (
            <div className="absolute top-full mt-1 left-0 bg-white border rounded-xl shadow-xl z-40 w-80 max-h-72 overflow-y-auto animate-fade-in">
              <div className="p-2 border-b">
                <button onClick={() => { setFilterReceiptId(''); setShowReceiptDropdown(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg transition-colors">
                  Todas las recepciones
                </button>
              </div>
              <div className="p-2 space-y-0.5">
                {recentReceipts.map((r: any) => {
                  const husInReceipt = r.lineas?.reduce((s: number, l: any) => s + (l.handlingUnits?.length || 0), 0) || 0;
                  const unlabeledInReceipt = r.lineas?.reduce((s: number, l: any) => s + (l.handlingUnits?.filter((h: any) => !h.etiquetaImpresa)?.length || 0), 0) || 0;
                  return (
                    <button
                      key={r.id}
                      onClick={() => { setFilterReceiptId(r.id); setShowReceiptDropdown(false); setSelectedHus(new Set()); }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${filterReceiptId === r.id ? 'bg-violet-100 text-violet-800' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-semibold text-primary-600">{r.codigo}</span>
                          {r.ordenCompra && <span className="ml-2 text-gray-400">({r.ordenCompra})</span>}
                        </div>
                        {unlabeledInReceipt > 0 && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{unlabeledInReceipt} sin etiqueta</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>{r.supplier?.nombre}</span>
                        <span>•</span>
                        <span>{husInReceipt} rollos</span>
                        <span>•</span>
                        <span>{new Date(r.createdAt).toLocaleDateString('es-MX')}</span>
                      </div>
                    </button>
                  );
                })}
                {recentReceipts.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No hay recepciones recientes</p>}
              </div>
            </div>
          )}
        </div>

        {/* Quick Action: Select all unlabeled */}
        {unlabeledCount > 0 && (
          <button onClick={selectUnlabeled} className="px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors flex items-center gap-2">
            <Layers size={15} /> Seleccionar {unlabeledCount} sin etiqueta
          </button>
        )}
      </div>

      {/* Close dropdown on outside click */}
      {showReceiptDropdown && <div className="fixed inset-0 z-30" onClick={() => setShowReceiptDropdown(false)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-3 py-3"><input type="checkbox" checked={selectedHus.size === hus.length && hus.length > 0} onChange={selectAll} className="w-4 h-4 rounded" /></th>
                <th className="px-3 py-3 text-left">HU</th>
                <th className="px-3 py-3 text-left">Tela</th>
                <th className="px-3 py-3 text-center">Metraje</th>
                <th className="px-3 py-3 text-center">Tipo</th>
                <th className="px-3 py-3 text-left">Ubicación</th>
                <th className="px-3 py-3 text-center">OC</th>
                <th className="px-3 py-3 text-center">Etiqueta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {hus.map((hu: any) => (
                <tr key={hu.id} className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedHus.has(hu.id) ? 'bg-blue-50' : ''}`} onClick={() => setPreviewHu(hu)}>
                  <td className="px-3 py-2" onClick={(e) => { e.stopPropagation(); toggleSelect(hu.id); }}><input type="checkbox" checked={selectedHus.has(hu.id)} readOnly className="w-4 h-4 rounded" /></td>
                  <td className="px-3 py-2 font-mono text-xs text-primary-600 font-semibold">{hu.codigo}</td>
                  <td className="px-3 py-2"><p className="font-medium text-xs">{hu.sku?.nombre}</p><p className="text-[10px] text-gray-400">{hu.sku?.codigo}</p></td>
                  <td className="px-3 py-2 text-center font-semibold">{hu.metrajeActual}m</td>
                  <td className="px-3 py-2 text-center">
                    <StatusBadge
                      icon={hu.tipoRollo === 'ENTERO' ? WmsIcon.Rolls : WmsIcon.Remnant}
                      label={hu.tipoRollo}
                      bgClass={hu.tipoRollo === 'ENTERO' ? 'bg-blue-100' : 'bg-orange-100'}
                      textClass={hu.tipoRollo === 'ENTERO' ? 'text-blue-700' : 'text-orange-700'}
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px]">{hu.ubicacion?.codigo || '—'}</td>
                  <td className="px-3 py-2 text-center">
                    {hu.receiptLine?.receipt?.ordenCompra ? (
                      <span className="text-[10px] font-mono bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded">{hu.receiptLine.receipt.ordenCompra}</span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {hu.etiquetaImpresa
                      ? <CheckCircle2 size={16} className="mx-auto text-emerald-500" />
                      : <Circle size={16} className="mx-auto text-gray-300" />
                    }
                  </td>
                </tr>
              ))}
              {hus.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No hay rollos</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Label Preview */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <WmsIcon.Label size={16} className="text-gray-500" />
            Vista Previa de Etiqueta
          </h3>
          {!previewHu ? (
            <div className="text-center text-gray-400 py-12">
              <WmsIcon.Label size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Selecciona un rollo</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Modernized Label */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm" id="label-preview">
                {/* Header band */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-2 flex items-center justify-between">
                  <div>
                    <p className="text-white text-xs font-bold tracking-wide">FORMATEX</p>
                    <p className="text-gray-400 text-[8px]">WMS 360+ · Control de Inventario</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-[9px]">{new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>

                <div className="p-4">
                  {/* QR + Info */}
                  <div className="flex gap-3 mb-3">
                    <div className="w-[72px] h-[72px] flex-shrink-0">
                      <QRModern data={previewHu.codigo} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base text-gray-900 tracking-tight">{previewHu.codigo}</p>
                      <div className="mt-1 space-y-px text-[10px]">
                        <p className="text-gray-600 truncate"><span className="text-gray-400">Tela:</span> {previewHu.sku?.nombre}</p>
                        <p className="text-gray-600"><span className="text-gray-400">SKU:</span> <span className="font-mono">{previewHu.sku?.codigo}</span></p>
                        <p className="text-gray-600"><span className="text-gray-400">Color:</span> {previewHu.sku?.color || '—'}</p>
                        <p className="text-gray-600"><span className="text-gray-400">Ancho:</span> {previewHu.anchoMetros || previewHu.sku?.anchoMetros || 1.5}m</p>
                      </div>
                    </div>
                  </div>

                  {/* Metraje Badge */}
                  <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-xl p-3 text-center mb-3">
                    <p className="text-gray-400 text-[9px] uppercase tracking-widest mb-0.5">Metraje Actual</p>
                    <p className="text-white text-3xl font-black tracking-tight">{previewHu.metrajeActual}<span className="text-base font-medium text-gray-400 ml-0.5">m</span></p>
                  </div>

                  {/* Barcode */}
                  <div className="bg-white border border-gray-100 rounded-xl p-3 text-center mb-3">
                    <BarcodeModern code={previewHu.sku?.codigoBarras || previewHu.codigo} />
                    <p className="text-[9px] font-mono text-gray-500 mt-1.5 tracking-[0.2em]">{previewHu.sku?.codigoBarras || previewHu.codigo}</p>
                  </div>

                  {/* Footer: Location + Type */}
                  <div className="flex justify-between items-center">
                    <div className="bg-blue-50 border border-blue-100 text-blue-800 px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold flex items-center gap-1">
                      <WmsIcon.Location size={10} /> {previewHu.ubicacion?.codigo || 'SIN UBICAR'}
                    </div>
                    <StatusBadge
                      icon={previewHu.tipoRollo === 'ENTERO' ? WmsIcon.Rolls : WmsIcon.Remnant}
                      label={previewHu.tipoRollo}
                      bgClass={previewHu.tipoRollo === 'ENTERO' ? 'bg-emerald-100' : 'bg-orange-100'}
                      textClass={previewHu.tipoRollo === 'ENTERO' ? 'text-emerald-800' : 'text-orange-800'}
                    />
                  </div>

                  {previewHu.parentHuId && (
                    <div className="mt-2 text-[9px] text-gray-400 border-t pt-1.5">
                      Origen: {previewHu.parentHu?.codigo || 'HU padre'} · Generación: {previewHu.generacion}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={() => { toggleSelect(previewHu.id); toast.success(selectedHus.has(previewHu.id) ? 'Removido de selección' : 'Agregado a selección'); }} className="flex-1 px-3 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-colors">
                  <CheckCircle2 size={14} /> {selectedHus.has(previewHu.id) ? 'Deseleccionar' : 'Seleccionar'}
                </button>
                <button onClick={() => { setSelectedHus(new Set([previewHu.id])); setShowPrint(true); }} className="flex-1 px-3 py-2.5 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 hover:from-gray-700 hover:to-gray-800 transition-all">
                  <Printer size={14} /> Imprimir Esta
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print Dialog */}
      <PrintDialog open={showPrint} onClose={() => setShowPrint(false)} hus={selectedHuList} />
    </div>
  );
}

/* ========= MODERN QR CODE SIMULATION ========= */
function QRModern({ data }: { data: string }) {
  const seed = data.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  const size = 21;
  const grid: boolean[][] = [];

  for (let r = 0; r < size; r++) {
    grid[r] = [];
    for (let c = 0; c < size; c++) {
      grid[r][c] = false;
    }
  }

  // Finder patterns (7x7 squares at 3 corners)
  const drawFinder = (sr: number, sc: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const border = r === 0 || r === 6 || c === 0 || c === 6;
        const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[sr + r][sc + c] = border || inner;
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  // Alignment pattern (5x5 at center area)
  const ap = size - 9;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const border = Math.abs(r) === 2 || Math.abs(c) === 2;
      const center = r === 0 && c === 0;
      if (ap + r >= 0 && ap + c >= 0 && ap + r < size && ap + c < size) {
        grid[ap + r][ap + c] = border || center;
      }
    }
  }

  // Data fill (deterministic from seed)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Skip finder + timing zones
      const inFinder = (r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8);
      const inTiming = r === 6 || c === 6;
      if (!inFinder && !inTiming) {
        grid[r][c] = ((seed * (r * size + c + 1) * 7 + r * 13 + c * 17) % 100) > 42;
      }
    }
  }

  const cellSize = 72 / size;

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="rounded-lg">
      <rect width="72" height="72" fill="white" />
      {grid.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect key={`${r}-${c}`} x={c * cellSize} y={r * cellSize} width={cellSize + 0.3} height={cellSize + 0.3} fill="#1a1a2e" rx={cellSize > 3.5 ? 0.4 : 0} />
          ) : null
        )
      )}
    </svg>
  );
}

/* ========= MODERN BARCODE (CODE 128-STYLE) ========= */
function BarcodeModern({ code }: { code: string }) {
  // Generate deterministic barcode pattern from code string
  const seed = code.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);

  // Code 128-like pattern: alternating bars and spaces
  const bars: { width: number; filled: boolean }[] = [];
  // Start guard
  bars.push({ width: 2, filled: true }, { width: 1, filled: false }, { width: 2, filled: true }, { width: 1, filled: false });

  // Data bars
  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    const v = (seed * (i + 1) * charCode) % 100;
    // Each character generates a group of bars
    bars.push({ width: v > 70 ? 3 : v > 40 ? 2 : 1, filled: true });
    bars.push({ width: v > 60 ? 2 : 1, filled: false });
    bars.push({ width: v > 50 ? 2 : v > 20 ? 1 : 2, filled: true });
    bars.push({ width: v > 30 ? 1 : 2, filled: false });
  }

  // End guard
  bars.push({ width: 2, filled: true }, { width: 1, filled: false }, { width: 2, filled: true });

  const totalWidth = bars.reduce((s, b) => s + b.width, 0);
  const barHeight = 36;

  return (
    <svg width="100%" height={barHeight} viewBox={`0 0 ${totalWidth} ${barHeight}`} preserveAspectRatio="xMidYMid meet" className="mx-auto" style={{ maxWidth: '240px' }}>
      {(() => {
        let x = 0;
        return bars.map((bar, i) => {
          const rect = bar.filled ? (
            <rect key={i} x={x} y={0} width={bar.width} height={barHeight} fill="#1a1a2e" />
          ) : null;
          x += bar.width;
          return rect;
        });
      })()}
    </svg>
  );
}

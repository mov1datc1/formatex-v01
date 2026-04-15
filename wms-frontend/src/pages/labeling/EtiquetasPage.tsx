import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import { WmsIcon, KpiIcon, StatusBadge } from '../../components/icons/WmsIcons';
import PrintDialog from '../../components/labels/PrintDialog';
import { CheckCircle2, Circle, Printer } from 'lucide-react';

export default function EtiquetasPage() {
  const [search, setSearch] = useState('');
  const [filterEtiquetado, setFilterEtiquetado] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [selectedHus, setSelectedHus] = useState<Set<string>>(new Set());
  const [previewHu, setPreviewHu] = useState<any>(null);
  const [showPrint, setShowPrint] = useState(false);

  const { data: resp, refetch } = useApi<PaginatedResponse<any>>(['etiquetas-hus', search, filterEtiquetado, filterTipo], '/inventory/hus', {
    search: search || undefined,
    etiquetaImpresa: filterEtiquetado === 'SI' ? 'true' : filterEtiquetado === 'NO' ? 'false' : undefined,
    tipoRollo: filterTipo || undefined,
    limit: 50,
  });
  const hus = resp?.data || [];

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

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <KpiIcon icon={WmsIcon.Label} gradient="from-violet-500 to-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Etiquetado</h1>
            <p className="text-gray-500 text-sm">Generación e impresión de etiquetas para rollos y retazos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={markPrinted} disabled={selectedHus.size === 0} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 flex items-center gap-2 shadow-sm">
            <CheckCircle2 size={16} /> Marcar Impresas ({selectedHus.size})
          </button>
          <button onClick={() => { if (selectedHus.size > 0) setShowPrint(true); else toast.error('Selecciona HUs'); }} className="px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-primary-600">
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <WmsIcon.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por código HU o SKU..." className="w-full pl-9 pr-4 py-2 bg-white border rounded-xl text-sm" />
        </div>
        <select value={filterEtiquetado} onChange={(e) => setFilterEtiquetado(e.target.value)} className="px-3 py-2 bg-white border rounded-xl text-sm">
          <option value="">Todos</option>
          <option value="NO">Sin Etiqueta</option>
          <option value="SI">Con Etiqueta</option>
        </select>
        <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className="px-3 py-2 bg-white border rounded-xl text-sm">
          <option value="">Todos los tipos</option>
          <option value="ENTERO">Enteros</option>
          <option value="RETAZO">Retazos</option>
        </select>
      </div>

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
                    {hu.etiquetaImpresa
                      ? <CheckCircle2 size={16} className="mx-auto text-emerald-500" />
                      : <Circle size={16} className="mx-auto text-gray-300" />
                    }
                  </td>
                </tr>
              ))}
              {hus.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No hay rollos</td></tr>}
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
              {/* Simulated Label */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50" id="label-preview">
                <div className="flex items-center justify-between border-b pb-2 mb-2">
                  <div><p className="text-xs font-bold">FORMATEX</p><p className="text-[9px] text-gray-500">WMS 360+</p></div>
                  <div className="text-right"><p className="text-[9px] text-gray-500">{new Date().toLocaleDateString()}</p></div>
                </div>

                <div className="flex gap-3 mb-2">
                  <div className="w-20 h-20 bg-white border rounded-lg flex items-center justify-center flex-shrink-0">
                    <QRSimulation data={previewHu.codigo} />
                  </div>
                  <div className="flex-1 text-[10px] space-y-0.5">
                    <p className="font-bold text-sm text-primary-700">{previewHu.codigo}</p>
                    <p className="text-gray-600"><b>Tela:</b> {previewHu.sku?.nombre}</p>
                    <p className="text-gray-600"><b>SKU:</b> {previewHu.sku?.codigo}</p>
                    <p className="text-gray-600"><b>Color:</b> {previewHu.sku?.color || '—'}</p>
                    <p className="text-gray-600"><b>Ancho:</b> {previewHu.anchoMetros || previewHu.sku?.anchoMetros}m</p>
                  </div>
                </div>

                <div className="bg-gray-900 text-white rounded-lg p-2 text-center mb-2">
                  <p className="text-[9px] uppercase tracking-wider">Metraje Actual</p>
                  <p className="text-2xl font-black">{previewHu.metrajeActual}m</p>
                </div>

                <div className="bg-white border rounded-lg p-2 text-center mb-2">
                  <BarcodeSimulation code={previewHu.sku?.codigoBarras || previewHu.codigo} />
                  <p className="text-[8px] font-mono mt-1">{previewHu.sku?.codigoBarras || previewHu.codigo}</p>
                </div>

                <div className="flex justify-between text-[10px]">
                  <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-lg font-mono font-bold flex items-center gap-1">
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
                  <div className="mt-2 text-[9px] text-gray-500 border-t pt-1">
                    Origen: {previewHu.parentHu?.codigo || 'HU padre'} · Gen: {previewHu.generacion}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={() => { toggleSelect(previewHu.id); toast.success('Agregado a selección'); }} className="flex-1 px-3 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={14} /> Seleccionar
                </button>
                <button onClick={() => { setSelectedHus(new Set([previewHu.id])); setShowPrint(true); }} className="flex-1 px-3 py-2.5 bg-gray-800 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5">
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

function QRSimulation({ data }: { data: string }) {
  const hash = data.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  const bits = Array.from({ length: 81 }, (_, i) => ((hash * (i + 1) * 7) % 100) > 35);
  return (
    <div className="w-16 h-16 grid grid-cols-9 grid-rows-9 gap-0 mx-auto">
      {bits.map((filled, i) => {
        const row = Math.floor(i / 9);
        const col = i % 9;
        const isCorner = (row < 3 && col < 3) || (row < 3 && col > 5) || (row > 5 && col < 3);
        return <div key={i} className={`${isCorner || filled ? 'bg-black' : 'bg-white'}`} />;
      })}
    </div>
  );
}

function BarcodeSimulation({ code }: { code: string }) {
  const hash = code.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  const bars = Array.from({ length: 40 }, (_, i) => ((hash * (i + 1) * 13) % 100) > 40);
  return (
    <div className="flex items-end justify-center h-8 gap-px">
      {bars.map((thick, i) => (
        <div key={i} className={`bg-black ${thick ? 'w-[2px]' : 'w-[1px]'}`} style={{ height: `${20 + (i % 5) * 3}px` }} />
      ))}
    </div>
  );
}

import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import { Tag, Printer, CheckCircle2, Search } from 'lucide-react';

export default function PwaEtiquetasView() {
  const [search, setSearch] = useState('');
  const { data: resp, refetch } = useApi<PaginatedResponse<any>>(['pwa-hus-label'], '/inventory/hus', { limit: 50, etiquetaImpresa: 'false' });
  const hus = resp?.data || [];

  const markPrinted = async (huId: string) => {
    try {
      await api.put(`/inventory/hus/${huId}`, { etiquetaImpresa: true });
      toast.success('✅ Etiqueta marcada como impresa');
      refetch();
    } catch { toast.error('Error'); }
  };

  const filtered = search ? hus.filter((h: any) =>
    h.codigo?.toLowerCase().includes(search.toLowerCase()) ||
    h.sku?.nombre?.toLowerCase().includes(search.toLowerCase())
  ) : hus;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center">
          <Tag size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Etiquetas</h1>
          <p className="text-xs text-gray-400">{hus.length} pendientes</p>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm"
          placeholder="Buscar HU o tela..." />
      </div>

      <div className="space-y-2 max-h-[70vh] overflow-y-auto">
        {!filtered.length ? (
          <div className="text-center py-12">
            <CheckCircle2 size={48} className="mx-auto mb-3 text-emerald-700" />
            <p className="text-gray-500">Todas las etiquetas están impresas</p>
          </div>
        ) : filtered.map((hu: any) => (
          <div key={hu.id} className="bg-gray-900 rounded-xl border border-gray-800 p-3 flex items-center justify-between">
            <div>
              <p className="font-mono font-bold text-sm text-amber-400">{hu.codigo}</p>
              <p className="text-xs text-gray-400">{hu.sku?.nombre} · {hu.metrajeActual}m</p>
              <p className="text-[10px] text-gray-600">{hu.ubicacion?.codigo || 'SIN UBICAR'}</p>
            </div>
            <button onClick={() => markPrinted(hu.id)}
              className="px-3 py-2 bg-amber-600 text-white rounded-xl text-xs font-medium active:scale-95 transition-transform flex items-center gap-1.5">
              <Printer size={14} /> Imprimir
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

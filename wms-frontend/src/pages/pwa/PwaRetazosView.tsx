import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { Scissors, Search, MapPin } from 'lucide-react';

export default function PwaRetazosView() {
  const [search, setSearch] = useState('');
  const { data: resp } = useApi<PaginatedResponse<any>>(['pwa-retazos'], '/inventory/hus', { tipoRollo: 'RETAZO', limit: 100, search: search || undefined });
  const hus = resp?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-pink-500 flex items-center justify-center">
          <Scissors size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Retazos</h1>
          <p className="text-xs text-gray-400">{resp?.total || 0} retazos</p>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm"
          placeholder="Buscar retazo, tela..." />
      </div>

      <div className="space-y-1.5 max-h-[70vh] overflow-y-auto">
        {!hus.length ? (
          <div className="text-center py-12">
            <Scissors size={48} className="mx-auto mb-3 text-gray-700" />
            <p className="text-gray-500">No se encontraron retazos</p>
          </div>
        ) : hus.map((hu: any) => (
          <div key={hu.id} className="bg-gray-900 rounded-xl border border-gray-800 p-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-mono font-bold text-sm text-pink-400">{hu.codigo}</p>
                <span className="text-[9px] bg-pink-900/40 text-pink-300 px-1.5 py-0.5 rounded font-medium">Gen {hu.generacion}</span>
              </div>
              <p className="text-xs text-gray-400">{hu.sku?.nombre} · {hu.sku?.color}</p>
              {hu.huOrigenCodigo && <p className="text-[10px] text-gray-600">Origen: {hu.huOrigenCodigo}</p>}
            </div>
            <div className="text-right">
              <p className="font-bold text-sm">{hu.metrajeActual}m</p>
              <div className="flex items-center gap-1 text-[10px] text-gray-500">
                <MapPin size={10} />
                <span>{hu.ubicacion?.codigo || '—'}</span>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                hu.estadoHu === 'DISPONIBLE' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-gray-800 text-gray-500'
              }`}>{hu.estadoHu}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

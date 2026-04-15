import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse, HU } from '../../hooks/useApi';
import {
  Scissors, Search, MapPin, Package,
  Scroll, BarChart3,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  DISPONIBLE: 'bg-emerald-100 text-emerald-700',
  RESERVADO: 'bg-amber-100 text-amber-700',
  EN_PICKING: 'bg-blue-100 text-blue-700',
  EN_CORTE: 'bg-purple-100 text-purple-700',
  EN_EMPAQUE: 'bg-indigo-100 text-indigo-700',
  DESPACHADO: 'bg-gray-100 text-gray-600',
  AGOTADO: 'bg-red-100 text-red-700',
};

export default function RetazosPage() {
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [page, setPage] = useState(1);
  const [selectedHU, setSelectedHU] = useState<string | null>(null);

  // Only fetch RETAZO type
  const { data: resp, isLoading } = useApi<PaginatedResponse<HU>>(
    ['retazos', search, filterEstado, String(page)],
    '/inventory/hus',
    { search: search || undefined, tipoRollo: 'RETAZO', estadoHu: filterEstado || undefined, page, limit: 15 },
  );

  const { data: detail } = useApi<any>(['retazo-detail', selectedHU], `/inventory/hus/${selectedHU}`, {}, !!selectedHU);

  // Stats
  const retazos = resp?.data || [];
  const totalMetraje = retazos.reduce((s, r) => s + r.metrajeActual, 0);
  const disponibles = retazos.filter(r => r.estadoHu === 'DISPONIBLE').length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Scissors className="w-5 h-5 text-white" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Retazos</h1>
            <p className="text-gray-500 text-sm">Piezas remanentes de cortes — {resp?.total || 0} retazos</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Scissors size={18} className="text-amber-600" />
            <span className="text-2xl font-bold text-amber-600">{resp?.total || 0}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Total retazos</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-emerald-600" />
            <span className="text-2xl font-bold text-emerald-600">{disponibles}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Disponibles</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-600" />
            <span className="text-2xl font-bold text-blue-600">{totalMetraje.toFixed(1)}m</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Metraje en página</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar retazo por código o tela..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400" />
        </div>
        <select value={filterEstado} onChange={(e) => { setFilterEstado(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
          <option value="">Todos los estados</option>
          <option value="DISPONIBLE">Disponible</option>
          <option value="RESERVADO">Reservado</option>
          <option value="EN_PICKING">En Picking</option>
          <option value="EN_CORTE">En Corte</option>
          <option value="AGOTADO">Agotado</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Cargando retazos...</div>
          ) : !resp?.data?.length ? (
            <div className="p-8 text-center text-gray-400">
              <Scissors size={48} className="mx-auto mb-2 text-gray-300" />
              <p className="font-medium text-gray-500">No hay retazos</p>
              <p className="text-xs mt-1">Los retazos se generan al realizar operaciones de corte</p>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Código</th>
                    <th className="px-4 py-3 text-left">Tela</th>
                    <th className="px-4 py-3 text-right">Metraje</th>
                    <th className="px-4 py-3 text-center">Gen.</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-left">Ubicación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {resp.data.map((hu) => (
                    <tr key={hu.id} 
                      className={`hover:bg-amber-50/50 cursor-pointer transition-colors ${selectedHU === hu.id ? 'bg-amber-50' : ''}`} 
                      onClick={() => setSelectedHU(hu.id)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Scissors size={14} className="text-amber-500" />
                          <span className="font-mono text-xs font-medium text-amber-600">{hu.codigo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-xs">{hu.sku?.nombre}</p>
                        {hu.sku?.color && <p className="text-xs text-gray-400">{hu.sku.color}</p>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-amber-600">{hu.metrajeActual}m</span>
                        <span className="text-[10px] text-gray-400 ml-1">/ {hu.metrajeOriginal}m</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-gray-500">G{hu.generacion}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[hu.estadoHu] || 'bg-gray-100'}`}>
                          {hu.estadoHu}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {hu.ubicacion?.codigo ? (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin size={10} /> {hu.ubicacion.codigo}
                          </span>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Pág {resp.page} de {resp.totalPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs bg-gray-100 rounded-lg disabled:opacity-40">← Anterior</button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page >= (resp.totalPages || 1)} className="px-3 py-1 text-xs bg-gray-100 rounded-lg disabled:opacity-40">Siguiente →</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Detail Panel */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          {!selectedHU ? (
            <div className="text-center text-gray-400 py-12">
              <Scissors size={40} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Selecciona un retazo</p>
              <p className="text-xs mt-1">para ver su detalle y genealogía</p>
            </div>
          ) : !detail ? (
            <div className="text-center text-gray-400 py-12">Cargando...</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors size={18} className="text-amber-500" />
                  <h3 className="font-bold text-lg">{detail.codigo}</h3>
                </div>
                <button onClick={() => setSelectedHU(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
              </div>

              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-3xl font-bold text-amber-600">{detail.metrajeActual}m</p>
                <p className="text-xs text-amber-700">de {detail.metrajeOriginal}m originales</p>
                {/* Usage bar */}
                <div className="mt-2 h-2 bg-amber-200 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(detail.metrajeActual / detail.metrajeOriginal) * 100}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400 block text-xs">Tela</span><span className="font-medium">{detail.sku?.nombre}</span></div>
                <div><span className="text-gray-400 block text-xs">Color</span><span className="font-medium">{detail.sku?.color || '—'}</span></div>
                <div><span className="text-gray-400 block text-xs">Estado</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[detail.estadoHu]}`}>{detail.estadoHu}</span>
                </div>
                <div><span className="text-gray-400 block text-xs">Generación</span><span className="font-medium">G{detail.generacion}</span></div>
                <div className="col-span-2"><span className="text-gray-400 block text-xs">Ubicación</span>
                  <span className="font-mono">{detail.ubicacion?.codigo || 'Sin ubicar'} {detail.ubicacion?.zone?.nombre ? `(${detail.ubicacion.zone.nombre})` : ''}</span>
                </div>
              </div>

              {/* Genealogy */}
              {(detail.parentHu || detail.childHus?.length > 0) && (
                <div className="border-t pt-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Genealogía (Trazabilidad)</h4>
                  {detail.parentHu && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg text-xs mb-1">
                      <Scroll size={14} className="text-blue-500" />
                      <span>Originado de: <span className="font-mono font-bold text-blue-600">{detail.parentHu.codigo}</span></span>
                      <span className="text-gray-400">({detail.parentHu.metrajeOriginal}m)</span>
                    </div>
                  )}
                  {detail.childHus?.map((c: any) => (
                    <div key={c.id} className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg text-xs mb-1">
                      <Scissors size={14} className="text-orange-500" />
                      <span>Sub-retazo: <span className="font-mono font-bold text-orange-600">{c.codigo}</span></span>
                      <span className="text-gray-400">({c.metrajeActual}m — {c.estadoHu})</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Movements */}
              {detail.movimientos?.length > 0 && (
                <div className="border-t pt-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Últimos Movimientos</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {detail.movimientos.slice(0, 5).map((m: any) => (
                      <div key={m.id} className="text-xs flex justify-between p-1.5 bg-gray-50 rounded">
                        <span className="font-medium">{m.tipo}</span>
                        <span className="text-gray-400">{new Date(m.createdAt).toLocaleDateString('es-MX')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

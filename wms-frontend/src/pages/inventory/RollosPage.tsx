import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse, HU } from '../../hooks/useApi';

const STATUS_COLORS: Record<string, string> = {
  DISPONIBLE: 'bg-emerald-100 text-emerald-700',
  RESERVADO: 'bg-amber-100 text-amber-700',
  EN_PICKING: 'bg-blue-100 text-blue-700',
  EN_CORTE: 'bg-purple-100 text-purple-700',
  EN_EMPAQUE: 'bg-indigo-100 text-indigo-700',
  DESPACHADO: 'bg-gray-100 text-gray-600',
  AGOTADO: 'bg-red-100 text-red-700',
};

export default function RollosPage() {
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [page, setPage] = useState(1);
  const [selectedHU, setSelectedHU] = useState<string | null>(null);

  const { data: resp, isLoading } = useApi<PaginatedResponse<HU>>(
    ['hus'], '/inventory/hus',
    { search: search || undefined, tipoRollo: filterTipo || undefined, estadoHu: filterEstado || undefined, page, limit: 15 },
  );

  const { data: detail } = useApi<any>(['hu-detail', selectedHU], `/inventory/hus/${selectedHU}`, {}, !!selectedHU);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rollos (HUs)</h1>
          <p className="text-gray-500 text-sm">Gestión de Handling Units — {resp?.total || 0} registros</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por código HU..." className="flex-1 min-w-[200px] px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={filterTipo} onChange={(e) => { setFilterTipo(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
          <option value="">Todos los tipos</option>
          <option value="ENTERO">Entero</option>
          <option value="RETAZO">Retazo</option>
        </select>
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
            <div className="p-8 text-center text-gray-400">Cargando...</div>
          ) : !resp?.data?.length ? (
            <div className="p-8 text-center text-gray-400">
              <p className="text-4xl mb-2">📦</p>
              <p>No hay rollos registrados aún</p>
              <p className="text-xs mt-1">Registra una recepción para crear HUs</p>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Código HU</th>
                    <th className="px-4 py-3 text-left">SKU</th>
                    <th className="px-4 py-3 text-right">Metraje</th>
                    <th className="px-4 py-3 text-center">Tipo</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-left">Ubicación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {resp.data.map((hu) => (
                    <tr key={hu.id} className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${selectedHU === hu.id ? 'bg-blue-50' : ''}`} onClick={() => setSelectedHU(hu.id)}>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-blue-600">{hu.codigo}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-xs">{hu.sku?.nombre}</p>
                        {hu.sku?.color && <p className="text-xs text-gray-400">{hu.sku.color}</p>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{hu.metrajeActual}m</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${hu.tipoRollo === 'ENTERO' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {hu.tipoRollo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[hu.estadoHu] || 'bg-gray-100'}`}>
                          {hu.estadoHu}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{hu.ubicacion?.codigo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Pág {resp.page} de {resp.totalPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs bg-gray-100 rounded-lg disabled:opacity-40">← Anterior</button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={page >= (resp.totalPages || 1)} className="px-3 py-1 text-xs bg-gray-100 rounded-lg disabled:opacity-40">Siguiente →</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Detail Panel */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          {!selectedHU ? (
            <div className="text-center text-gray-400 py-12">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm">Selecciona un rollo para ver detalle</p>
            </div>
          ) : !detail ? (
            <div className="text-center text-gray-400 py-12">Cargando...</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">{detail.codigo}</h3>
                <button onClick={() => setSelectedHU(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400 block text-xs">SKU</span><span className="font-medium">{detail.sku?.nombre}</span></div>
                <div><span className="text-gray-400 block text-xs">Color</span><span className="font-medium">{detail.sku?.color || '—'}</span></div>
                <div><span className="text-gray-400 block text-xs">Metraje Actual</span><span className="font-semibold text-lg text-blue-600">{detail.metrajeActual}m</span></div>
                <div><span className="text-gray-400 block text-xs">Original</span><span className="font-medium">{detail.metrajeOriginal}m</span></div>
                <div><span className="text-gray-400 block text-xs">Tipo</span><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${detail.tipoRollo === 'ENTERO' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{detail.tipoRollo}</span></div>
                <div><span className="text-gray-400 block text-xs">Generación</span><span className="font-medium">{detail.generacion}</span></div>
                <div className="col-span-2"><span className="text-gray-400 block text-xs">Ubicación</span><span className="font-mono">{detail.ubicacion?.codigo || 'Sin ubicar'} {detail.ubicacion?.zone?.nombre ? `(${detail.ubicacion.zone.nombre})` : ''}</span></div>
              </div>
              {/* Genealogy */}
              {(detail.parentHu || detail.childHus?.length > 0) && (
                <div className="border-t pt-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Genealogía</h4>
                  {detail.parentHu && <p className="text-xs text-gray-600">↑ Padre: <span className="font-mono text-blue-600">{detail.parentHu.codigo}</span> ({detail.parentHu.metrajeOriginal}m)</p>}
                  {detail.childHus?.map((c: any) => (
                    <p key={c.id} className="text-xs text-gray-600">↓ Hijo: <span className="font-mono text-orange-600">{c.codigo}</span> ({c.metrajeActual}m - {c.estadoHu})</p>
                  ))}
                </div>
              )}
              {/* Recent Movements */}
              {detail.movimientos?.length > 0 && (
                <div className="border-t pt-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Últimos Movimientos</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {detail.movimientos.slice(0, 5).map((m: any) => (
                      <div key={m.id} className="text-xs flex justify-between items-center p-1.5 bg-gray-50 rounded">
                        <span className="font-medium">{m.tipo}</span>
                        <span className="text-gray-400">{new Date(m.createdAt).toLocaleDateString()}</span>
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

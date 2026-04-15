import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import {
  MapPin, Search, Scroll, Scissors,
  Lock, Boxes, Package,
} from 'lucide-react';

export default function UbicacionesPage() {
  const { data: zones } = useApi<any[]>(['wh-zones'], '/warehouse/zones');

  // Location state
  const [locSearch, setLocSearch] = useState('');
  const [locZone, setLocZone] = useState('');
  const [locEstado, setLocEstado] = useState('');
  const [locPage, setLocPage] = useState(1);
  const { data: locsResp } = useApi<PaginatedResponse<any>>(
    ['locations', locZone, locEstado, locSearch, String(locPage)],
    '/warehouse/locations',
    { zoneId: locZone || undefined, estado: locEstado || undefined, search: locSearch || undefined, page: locPage, limit: 42 },
  );

  // Location detail
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);
  const [locDetail, setLocDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadLocationDetail = async (id: string) => {
    setSelectedLocId(id);
    setLoadingDetail(true);
    try {
      const resp = await api.get(`/warehouse/locations/${id}`);
      setLocDetail(resp.data);
    } catch {
      toast.error('Error al cargar ubicación');
    }
    setLoadingDetail(false);
  };

  const ESTADO_COLORS: Record<string, { bg: string; ring: string; text: string; label: string }> = {
    LIBRE:     { bg: 'bg-emerald-50', ring: 'ring-emerald-300', text: 'text-emerald-700', label: 'Libre' },
    PARCIAL:   { bg: 'bg-amber-50',   ring: 'ring-amber-300',   text: 'text-amber-700',   label: 'Parcial' },
    OCUPADA:   { bg: 'bg-red-50',     ring: 'ring-red-300',     text: 'text-red-700',     label: 'Ocupada' },
    BLOQUEADA: { bg: 'bg-gray-100',   ring: 'ring-gray-300',   text: 'text-gray-500',    label: 'Bloqueada' },
  };

  const locations = locsResp?.data || [];
  const totalPages = locsResp?.totalPages || 1;

  // Count by status
  const libre = locations.filter((l: any) => l.estado === 'LIBRE').length;
  const parcial = locations.filter((l: any) => l.estado === 'PARCIAL').length;
  const ocupada = locations.filter((l: any) => l.estado === 'OCUPADA').length;
  const bloqueada = locations.filter((l: any) => l.estado === 'BLOQUEADA').length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
          <MapPin className="w-5 h-5 text-white" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ubicaciones</h1>
          <p className="text-gray-500 text-sm">Mapa de ubicaciones del almacén — {locsResp?.total || 0} ubicaciones</p>
        </div>
      </div>

      {/* Status legend */}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400 inline-block" /> Libre ({libre})</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Parcial ({parcial})</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400 inline-block" /> Ocupada ({ocupada})</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-300 inline-block" /> Bloqueada ({bloqueada})</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={locSearch} onChange={e => { setLocSearch(e.target.value); setLocPage(1); }}
            placeholder="Buscar ubicación..." className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-400" />
        </div>
        <select value={locZone} onChange={e => { setLocZone(e.target.value); setLocPage(1); }}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm">
          <option value="">Todas las zonas</option>
          {zones?.map((z: any) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
        </select>
        <select value={locEstado} onChange={e => { setLocEstado(e.target.value); setLocPage(1); }}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm">
          <option value="">Todos</option>
          <option value="LIBRE">Libre</option>
          <option value="PARCIAL">Parcial</option>
          <option value="OCUPADA">Ocupada</option>
          <option value="BLOQUEADA">Bloqueada</option>
        </select>
      </div>

      {/* Grid + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Location Grid */}
        <div className="lg:col-span-3 bg-white rounded-xl border p-4">
          <div className="grid grid-cols-7 sm:grid-cols-8 md:grid-cols-9 gap-2">
            {locations.map((loc: any) => {
              const est = ESTADO_COLORS[loc.estado] || ESTADO_COLORS.LIBRE;
              const isSelected = selectedLocId === loc.id;
              return (
                <button
                  key={loc.id}
                  onClick={() => loadLocationDetail(loc.id)}
                  className={`
                    aspect-square rounded-xl border-2 flex flex-col items-center justify-center text-center
                    transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer
                    ${est.bg} ${isSelected ? `ring-2 ${est.ring} border-transparent shadow-lg scale-105` : 'border-transparent'}
                  `}
                >
                  <span className={`text-[11px] font-bold ${est.text} leading-tight`}>{loc.codigo}</span>
                  {loc.estado === 'BLOQUEADA' && <Lock size={10} className="text-gray-400 mt-0.5" />}
                  {loc._count?.handlingUnits > 0 && (
                    <span className="text-[9px] text-gray-400 mt-0.5">{loc._count.handlingUnits} HU</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <span className="text-xs text-gray-400">Pág {locPage} de {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setLocPage(p => Math.max(1, p - 1))} disabled={locPage <= 1}
                  className="px-3 py-1 text-xs bg-gray-100 rounded-lg disabled:opacity-40">← Anterior</button>
                <button onClick={() => setLocPage(p => p + 1)} disabled={locPage >= totalPages}
                  className="px-3 py-1 text-xs bg-gray-100 rounded-lg disabled:opacity-40">Siguiente →</button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="bg-white rounded-xl border p-4">
          {!selectedLocId ? (
            <div className="text-center text-gray-400 py-12">
              <MapPin size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Selecciona una ubicación</p>
              <p className="text-xs mt-1">Haz clic en un cuadro para ver su contenido</p>
            </div>
          ) : loadingDetail ? (
            <div className="text-center text-gray-400 py-12">Cargando...</div>
          ) : locDetail ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg font-mono">{locDetail.codigo}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${ESTADO_COLORS[locDetail.estado]?.bg} ${ESTADO_COLORS[locDetail.estado]?.text}`}>
                  {locDetail.estado}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-400">Zona</span><p className="font-medium">{locDetail.zone?.nombre || '—'}</p></div>
                <div><span className="text-gray-400">Tipo</span><p className="font-medium">{locDetail.tipo}</p></div>
                <div><span className="text-gray-400">Capacidad</span><p className="font-medium">{locDetail.capacidad} HUs</p></div>
                <div><span className="text-gray-400">Ocupación</span><p className="font-medium">{locDetail.handlingUnits?.length || 0} / {locDetail.capacidad}</p></div>
              </div>

              {/* HUs in this location */}
              {locDetail.handlingUnits?.length > 0 && (
                <div className="border-t pt-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    <Package size={12} className="inline mr-1 -mt-0.5" /> Contenido ({locDetail.handlingUnits.length} HUs)
                  </h4>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {locDetail.handlingUnits.map((hu: any) => (
                      <div key={hu.id} className="p-2.5 bg-gray-50 rounded-lg text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {hu.tipoRollo === 'RETAZO' ? <Scissors size={12} className="text-amber-500" /> : <Scroll size={12} className="text-blue-500" />}
                            <span className="font-mono font-bold">{hu.codigo}</span>
                          </div>
                          <span className="font-bold text-emerald-600">{hu.metrajeActual}m</span>
                        </div>
                        <p className="text-gray-400 mt-0.5">{hu.sku?.nombre} — {hu.sku?.color}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${hu.tipoRollo === 'RETAZO' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                            {hu.tipoRollo}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${hu.estadoHu === 'DISPONIBLE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {hu.estadoHu}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!locDetail.handlingUnits || locDetail.handlingUnits.length === 0) && (
                <div className="border-t pt-3 text-center text-gray-400 py-4">
                  <Boxes size={24} className="mx-auto mb-1 text-gray-300" />
                  <p className="text-xs">Ubicación vacía</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

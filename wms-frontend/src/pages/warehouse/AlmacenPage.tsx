import { useState } from 'react';
import { useApi, useMutationApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import { WmsIcon, KpiIcon, PipelineIcon } from '../../components/icons/WmsIcons';
import {
  Warehouse, MapPin, Grid3X3, BarChart3, Ruler,
  Plus, X, Layers, PackageCheck, Box,
  ChevronLeft, ChevronRight, Scroll, Scissors, Search,
  Lock, CircleDot, ArrowRight, Boxes,
} from 'lucide-react';

type Tab = 'overview' | 'warehouses' | 'zones' | 'locations' | 'merma';

export default function AlmacenPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const { data: stats } = useApi<any>(['wh-stats'], '/warehouse/stats');
  const { data: warehouses } = useApi<any[]>(['warehouses'], '/warehouse/warehouses');
  const { data: zones } = useApi<any[]>(['wh-zones'], '/warehouse/zones');
  const { data: mermaRanges } = useApi<any[]>(['merma-ranges'], '/warehouse/merma-ranges');

  // Location state
  const [locSearch, setLocSearch] = useState('');
  const [locZone, setLocZone] = useState('');
  const [locEstado, setLocEstado] = useState('');
  const [locPage, setLocPage] = useState(1);
  const { data: locsResp } = useApi<PaginatedResponse<any>>(['locations', locZone, locEstado, locSearch, locPage], '/warehouse/locations', { zoneId: locZone || undefined, estado: locEstado || undefined, search: locSearch || undefined, page: locPage, limit: 30 });

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

  // Forms
  const [showWhForm, setShowWhForm] = useState(false);
  const [whForm, setWhForm] = useState<any>({ nombre: '', codigo: '', tipo: 'FISICO', descripcion: '' });
  const whMut = useMutationApi('/warehouse/warehouses');

  const [showZoneForm, setShowZoneForm] = useState(false);
  const [zoneForm, setZoneForm] = useState<any>({ warehouseId: '', nombre: '', codigo: '', tipo: 'ROLLOS_ENTEROS' });
  const zoneMut = useMutationApi('/warehouse/zones');

  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkForm, setBulkForm] = useState<any>({ zoneId: '', prefijoPasillo: 'P', pasilloInicio: 1, pasilloFin: 3, nivelesInicio: 1, nivelesFin: 3, posicionesInicio: 1, posicionesFin: 5, tipo: 'RACK', capacidad: 2 });
  const bulkMut = useMutationApi('/warehouse/locations/bulk');

  const handleCreateWh = async () => {
    try { await whMut.mutateAsync(whForm); toast.success('✅ Almacén creado'); setShowWhForm(false); } catch (e: any) { toast.error(e?.response?.data?.message || 'Error'); }
  };
  const handleCreateZone = async () => {
    try { await zoneMut.mutateAsync(zoneForm); toast.success('✅ Zona creada'); setShowZoneForm(false); } catch (e: any) { toast.error(e?.response?.data?.message || 'Error'); }
  };
  const handleBulkCreate = async () => {
    try { const r: any = await bulkMut.mutateAsync(bulkForm); toast.success(`✅ ${r.created} ubicaciones creadas`); setShowBulkForm(false); } catch (e: any) { toast.error(e?.response?.data?.message || 'Error'); }
  };

  const TABS = [
    { key: 'overview' as Tab, label: 'Resumen', Icon: BarChart3 },
    { key: 'warehouses' as Tab, label: 'Almacenes', Icon: Warehouse },
    { key: 'zones' as Tab, label: 'Zonas', Icon: Layers },
    { key: 'merma' as Tab, label: 'Rangos Merma', Icon: Ruler },
  ];

  const ESTADO_COLORS: Record<string, { bg: string; ring: string; text: string; label: string }> = {
    LIBRE:     { bg: 'bg-emerald-50', ring: 'ring-emerald-300', text: 'text-emerald-700', label: 'Libre' },
    PARCIAL:   { bg: 'bg-amber-50',   ring: 'ring-amber-300',   text: 'text-amber-700',   label: 'Parcial' },
    OCUPADA:   { bg: 'bg-red-50',     ring: 'ring-red-300',     text: 'text-red-700',     label: 'Ocupada' },
    BLOQUEADA: { bg: 'bg-gray-100',   ring: 'ring-gray-300',    text: 'text-gray-500',    label: 'Bloqueada' },
  };

  const ESTADO_DOT: Record<string, string> = {
    LIBRE: 'bg-emerald-400', PARCIAL: 'bg-amber-400', OCUPADA: 'bg-red-400', BLOQUEADA: 'bg-gray-400',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <KpiIcon icon={WmsIcon.Warehouse} gradient="from-indigo-500 to-purple-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Almacén</h1>
          <p className="text-gray-500 text-sm">Configuración de almacenes, zonas y ubicaciones</p>
        </div>
      </div>

      {/* Tabs — Lucide icons */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSelectedLocId(null); setLocDetail(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.Icon size={16} strokeWidth={tab === t.key ? 2.5 : 2} />
            {t.label}
          </button>
        ))}
      </div>

      {/* === OVERVIEW === */}
      {tab === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard Icon={Warehouse} label="Almacenes" value={stats?.totalWarehouses || 0} gradient="from-blue-500 to-blue-600" />
          <KpiCard Icon={Layers} label="Zonas" value={stats?.totalZones || 0} gradient="from-violet-500 to-violet-600" />
          <KpiCard Icon={Grid3X3} label="Ubicaciones" value={stats?.totalLocations || 0} gradient="from-emerald-500 to-emerald-600" />
          <KpiCard Icon={BarChart3} label="Ocupación" value={`${stats?.occupancy || 0}%`} gradient="from-amber-500 to-orange-500" />
          <KpiCard Icon={CircleDot} label="Libres" value={stats?.freeLocations || 0} gradient="from-emerald-400 to-green-500" />
          <KpiCard Icon={Boxes} label="Parciales" value={stats?.partialLocations || 0} gradient="from-amber-400 to-yellow-500" />
          <KpiCard Icon={Lock} label="Ocupadas" value={stats?.occupiedLocations || 0} gradient="from-red-400 to-red-500" />
        </div>
      )}

      {/* === WAREHOUSES === */}
      {tab === 'warehouses' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowWhForm(!showWhForm)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              <Plus size={16} /> Nuevo Almacén
            </button>
          </div>
          {showWhForm && (
            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h2 className="font-semibold flex items-center gap-2"><Warehouse size={18} className="text-indigo-500" /> Nuevo Almacén / Bodega</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FI label="Nombre *" value={whForm.nombre} onChange={(v) => setWhForm({ ...whForm, nombre: v })} />
                <FI label="Código *" value={whForm.codigo} onChange={(v) => setWhForm({ ...whForm, codigo: v })} placeholder="NAV-002" />
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tipo *</label>
                  <select value={whForm.tipo} onChange={(e) => setWhForm({ ...whForm, tipo: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                    <option value="FISICO">🏭 Físico</option>
                    <option value="VIRTUAL">💻 Virtual (Bodega Cliente)</option>
                  </select>
                </div>
                <FI label="Descripción" value={whForm.descripcion || ''} onChange={(v) => setWhForm({ ...whForm, descripcion: v })} />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowWhForm(false)} className="px-4 py-2 text-sm text-gray-500 rounded-lg hover:bg-gray-100">Cancelar</button>
                <button onClick={handleCreateWh} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Crear</button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warehouses?.map((w: any) => (
              <div key={w.id} className="bg-white rounded-xl border p-5 hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <PipelineIcon icon={w.tipo === 'VIRTUAL' ? Box : Warehouse} bgClass={w.tipo === 'VIRTUAL' ? 'bg-purple-100' : 'bg-blue-100'} iconClass={w.tipo === 'VIRTUAL' ? 'text-purple-600' : 'text-blue-600'} />
                    <div>
                      <p className="font-semibold text-gray-900">{w.nombre}</p>
                      <p className="text-xs text-gray-400 font-mono">{w.codigo}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${w.tipo === 'VIRTUAL' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                    {w.tipo}
                  </span>
                </div>
                {w.clienteAsignado && <p className="text-sm text-purple-600 mb-2 flex items-center gap-1"><Box size={12} /> Cliente: {w.clienteAsignado}</p>}
                <p className="text-sm text-gray-500">{w._count?.zones || 0} zonas · {w.metrosCuad || 0} m²</p>
              </div>
            ))}
            {(!warehouses || warehouses.length === 0) && <div className="col-span-2 p-8 text-center text-gray-400">No hay almacenes</div>}
          </div>
        </div>
      )}

      {/* === ZONES === */}
      {tab === 'zones' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowZoneForm(!showZoneForm)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              <Plus size={16} /> Nueva Zona
            </button>
          </div>
          {showZoneForm && (
            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h2 className="font-semibold flex items-center gap-2"><Layers size={18} className="text-indigo-500" /> Nueva Zona</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Almacén *</label>
                  <select value={zoneForm.warehouseId} onChange={(e) => setZoneForm({ ...zoneForm, warehouseId: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm">
                    <option value="">Seleccionar...</option>
                    {warehouses?.map((w: any) => <option key={w.id} value={w.id}>{w.nombre}</option>)}
                  </select>
                </div>
                <FI label="Nombre *" value={zoneForm.nombre} onChange={(v) => setZoneForm({ ...zoneForm, nombre: v })} />
                <FI label="Código *" value={zoneForm.codigo} onChange={(v) => setZoneForm({ ...zoneForm, codigo: v })} placeholder="RE-07" />
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
                  <select value={zoneForm.tipo} onChange={(e) => setZoneForm({ ...zoneForm, tipo: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm">
                    <option value="ROLLOS_ENTEROS">Rollos Enteros</option>
                    <option value="MERMA">Merma</option>
                    <option value="RECIBO">Recibo</option>
                    <option value="CORTE">Corte</option>
                    <option value="EMPAQUE">Empaque</option>
                    <option value="EMBARQUE">Embarque</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowZoneForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button onClick={handleCreateZone} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Crear</button>
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Zona</th>
                  <th className="px-4 py-3 text-left">Código</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Almacén</th>
                  <th className="px-4 py-3 text-center">Ubicaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {zones?.map((z: any) => (
                  <tr key={z.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{z.nombre}</td>
                    <td className="px-4 py-3 font-mono text-xs text-indigo-600">{z.codigo}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 font-medium">{z.tipo}</span></td>
                    <td className="px-4 py-3 text-gray-500">{z.warehouse?.nombre || '—'}</td>
                    <td className="px-4 py-3 text-center font-semibold">{z._count?.locations || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === LOCATIONS — The redesigned section === */}
      {tab === 'locations' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={locSearch} onChange={(e) => { setLocSearch(e.target.value); setLocPage(1); }} placeholder="Buscar ubicación..." className="pl-9 pr-4 py-2 bg-white border rounded-lg text-sm w-56 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" />
              </div>
              <select value={locZone} onChange={(e) => { setLocZone(e.target.value); setLocPage(1); }} className="px-3 py-2 bg-white border rounded-lg text-sm">
                <option value="">Todas las zonas</option>
                {zones?.map((z: any) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
              </select>
              <select value={locEstado} onChange={(e) => { setLocEstado(e.target.value); setLocPage(1); }} className="px-3 py-2 bg-white border rounded-lg text-sm">
                <option value="">Todos</option>
                <option value="LIBRE">🟢 Libre</option>
                <option value="PARCIAL">🟡 Parcial</option>
                <option value="OCUPADA">🔴 Ocupada</option>
                <option value="BLOQUEADA">⬜ Bloqueada</option>
              </select>
            </div>
            <button onClick={() => setShowBulkForm(!showBulkForm)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
              <Plus size={16} /> Crear Masivas
            </button>
          </div>

          {/* Bulk Form */}
          {showBulkForm && (
            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h2 className="font-semibold flex items-center gap-2"><Grid3X3 size={18} className="text-emerald-500" /> Crear Ubicaciones Masivas</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div><label className="block text-xs text-gray-500 mb-1">Zona *</label><select value={bulkForm.zoneId} onChange={(e) => setBulkForm({ ...bulkForm, zoneId: e.target.value })} className="w-full px-2 py-1.5 bg-gray-50 border rounded text-sm"><option value="">Seleccionar...</option>{zones?.map((z: any) => <option key={z.id} value={z.id}>{z.nombre}</option>)}</select></div>
                <FI label="Prefijo Pasillo" value={bulkForm.prefijoPasillo} onChange={(v) => setBulkForm({ ...bulkForm, prefijoPasillo: v })} />
                <FI label="Pasillo Inicio" type="number" value={bulkForm.pasilloInicio} onChange={(v) => setBulkForm({ ...bulkForm, pasilloInicio: +v })} />
                <FI label="Pasillo Fin" type="number" value={bulkForm.pasilloFin} onChange={(v) => setBulkForm({ ...bulkForm, pasilloFin: +v })} />
                <FI label="Niveles Inicio" type="number" value={bulkForm.nivelesInicio} onChange={(v) => setBulkForm({ ...bulkForm, nivelesInicio: +v })} />
                <FI label="Niveles Fin" type="number" value={bulkForm.nivelesFin} onChange={(v) => setBulkForm({ ...bulkForm, nivelesFin: +v })} />
                <FI label="Posiciones Inicio" type="number" value={bulkForm.posicionesInicio} onChange={(v) => setBulkForm({ ...bulkForm, posicionesInicio: +v })} />
                <FI label="Posiciones Fin" type="number" value={bulkForm.posicionesFin} onChange={(v) => setBulkForm({ ...bulkForm, posicionesFin: +v })} />
                <FI label="Capacidad" type="number" value={bulkForm.capacidad} onChange={(v) => setBulkForm({ ...bulkForm, capacidad: +v })} />
              </div>
              <p className="text-xs text-gray-400 font-mono">
                → {(bulkForm.pasilloFin - bulkForm.pasilloInicio + 1) * (bulkForm.nivelesFin - bulkForm.nivelesInicio + 1) * (bulkForm.posicionesFin - bulkForm.posicionesInicio + 1)} ubicaciones
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowBulkForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button onClick={handleBulkCreate} className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium">Crear</button>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-6 text-xs text-gray-500">
            {Object.entries(ESTADO_COLORS).map(([key, val]) => (
              <span key={key} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-sm ${ESTADO_DOT[key]}`}></span>
                {val.label}
              </span>
            ))}
            <span className="ml-auto font-medium text-gray-600">{locsResp?.total || 0} ubicaciones</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Location Grid — big tiles */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border p-5">
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-8 gap-2.5">
                  {locsResp?.data?.map((loc: any) => {
                    const huCount = loc._count?.handlingUnits || 0;
                    const isSelected = selectedLocId === loc.id;
                    const st = ESTADO_COLORS[loc.estado] || ESTADO_COLORS.LIBRE;
                    // Extract short code — last part after last dash or last 5 chars
                    const parts = loc.codigo.split('-');
                    const shortCode = parts.length >= 3
                      ? `${parts[parts.length - 2]}-${parts[parts.length - 1]}`
                      : loc.codigo.slice(-6);

                    return (
                      <button
                        key={loc.id}
                        onClick={() => loadLocationDetail(loc.id)}
                        className={`
                          relative rounded-xl p-2 flex flex-col items-center justify-center min-h-[72px]
                          cursor-pointer transition-all duration-200 border-2
                          ${st.bg} hover:shadow-lg hover:scale-[1.05]
                          ${isSelected
                            ? `${st.ring} ring-2 border-indigo-500 shadow-lg scale-[1.08]`
                            : 'border-transparent hover:border-gray-300'
                          }
                        `}
                        title={`${loc.codigo}\n${loc.zone?.nombre || ''}\n${loc.estado}\n${huCount} HUs`}
                      >
                        <span className={`font-mono text-[11px] font-bold leading-tight text-center ${st.text}`}>
                          {shortCode}
                        </span>
                        {huCount > 0 && (
                          <span className="mt-1 px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-[9px] font-bold leading-none">
                            {huCount}
                          </span>
                        )}
                        {loc.estado === 'BLOQUEADA' && (
                          <Lock size={10} className="absolute top-1 right-1 text-gray-400" />
                        )}
                      </button>
                    );
                  })}
                  {(!locsResp?.data || locsResp.data.length === 0) && (
                    <div className="col-span-full py-12 text-center text-gray-400">
                      <Grid3X3 className="mx-auto mb-2 text-gray-300" size={40} />
                      <p className="text-sm">No hay ubicaciones</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pagination */}
              {locsResp && locsResp.totalPages > 1 && (
                <div className="flex justify-center gap-3 mt-4">
                  <button onClick={() => setLocPage((p) => Math.max(1, p - 1))} disabled={locPage === 1} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    <ChevronLeft size={14} /> Anterior
                  </button>
                  <span className="text-xs text-gray-500 py-1.5 font-medium">Pág {locPage} de {locsResp.totalPages}</span>
                  <button onClick={() => setLocPage((p) => p + 1)} disabled={locPage >= locsResp.totalPages} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    Siguiente <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Detail Panel */}
            <div className="lg:col-span-1">
              {!selectedLocId ? (
                <div className="bg-white rounded-xl border p-8 text-center text-gray-400 sticky top-6">
                  <MapPin className="mx-auto mb-3 text-gray-300" size={40} />
                  <p className="font-medium text-gray-500 text-sm">Selecciona una ubicación</p>
                  <p className="text-xs text-gray-400 mt-1">Haz clic en un cuadro para ver su contenido</p>
                </div>
              ) : loadingDetail ? (
                <div className="bg-white rounded-xl border p-8 text-center">
                  <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-sm text-gray-500">Cargando...</p>
                </div>
              ) : locDetail ? (
                <LocationDetailPanel loc={locDetail} estadoColors={ESTADO_COLORS} onClose={() => { setSelectedLocId(null); setLocDetail(null); }} />
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* === MERMA RANGES === */}
      {tab === 'merma' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-center">Min (m)</th>
                <th className="px-4 py-3 text-center">Max (m)</th>
                <th className="px-4 py-3 text-left">Zona Destino</th>
                <th className="px-4 py-3 text-center">Orden</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mermaRanges?.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.nombre}</td>
                  <td className="px-4 py-3 text-center">{r.minMetros}m</td>
                  <td className="px-4 py-3 text-center">{r.maxMetros}m</td>
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600">{r.zonaCodigo}</td>
                  <td className="px-4 py-3 text-center">{r.orden}</td>
                </tr>
              ))}
              {(!mermaRanges || mermaRanges.length === 0) && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No hay rangos configurados</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============================================================ */
/* Location Detail Panel                                         */
/* ============================================================ */
function LocationDetailPanel({ loc, estadoColors, onClose }: { loc: any; estadoColors: any; onClose: () => void }) {
  const st = estadoColors[loc.estado] || estadoColors.LIBRE;
  const totalMetraje = loc.handlingUnits?.reduce((sum: number, hu: any) => sum + (hu.metrajeActual || 0), 0) || 0;

  return (
    <div className="bg-white rounded-xl border shadow-lg sticky top-6 overflow-hidden">
      {/* Header */}
      <div className={`px-5 py-4 ${st.bg} border-b`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-gray-900 font-mono">{loc.codigo}</h3>
            <p className={`text-xs font-semibold ${st.text}`}>{st.label}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/50 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="px-5 py-3 border-b bg-gray-50/50 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-gray-400 uppercase font-semibold">Zona</p>
          <p className="font-medium text-gray-700">{loc.zone?.nombre}</p>
        </div>
        <div>
          <p className="text-gray-400 uppercase font-semibold">Almacén</p>
          <p className="font-medium text-gray-700">{loc.zone?.warehouse?.nombre || '—'}</p>
        </div>
        <div>
          <p className="text-gray-400 uppercase font-semibold">Tipo Zona</p>
          <p className="font-medium text-indigo-600">{loc.zone?.tipo}</p>
        </div>
        <div>
          <p className="text-gray-400 uppercase font-semibold">Capacidad</p>
          <p className="font-medium text-gray-700">{loc.capacidad || '—'} HUs</p>
        </div>
      </div>

      {/* Summary */}
      <div className="px-5 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PackageCheck size={16} className="text-indigo-500" />
          <span className="text-sm font-semibold text-gray-700">{loc._count?.handlingUnits || 0} rollos</span>
        </div>
        <span className="text-sm font-bold text-indigo-600">{totalMetraje.toLocaleString()}m</span>
      </div>

      {/* HU List */}
      <div className="px-5 py-3 max-h-[400px] overflow-y-auto space-y-2.5">
        {loc.handlingUnits?.length > 0 ? (
          loc.handlingUnits.map((hu: any) => (
            <div key={hu.id} className="rounded-lg border border-gray-100 p-3 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-xs font-bold text-indigo-600">{hu.codigo}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  hu.tipoRollo === 'ENTERO' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {hu.tipoRollo === 'ENTERO' ? 'ENTERO' : 'RETAZO'}
                </span>
              </div>
              {hu.sku && (
                <div className="mb-1.5">
                  <p className="text-sm font-medium text-gray-800">{hu.sku.nombre}</p>
                  <p className="text-[11px] text-gray-400">{hu.sku.codigo} · {hu.sku.color || '—'}</p>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Scroll size={12} className="text-gray-400" />
                  <span><span className="font-bold text-gray-700">{hu.metrajeActual}m</span> / {hu.metrajeOriginal}m</span>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  hu.estadoHu === 'DISPONIBLE' ? 'bg-emerald-50 text-emerald-600'
                    : hu.estadoHu === 'RESERVADO' ? 'bg-amber-50 text-amber-600'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {hu.estadoHu}
                </span>
              </div>
              {/* Metraje Bar */}
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${hu.metrajeActual === hu.metrajeOriginal ? 'bg-indigo-400' : 'bg-amber-400'}`}
                  style={{ width: `${hu.metrajeOriginal > 0 ? (hu.metrajeActual / hu.metrajeOriginal) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-gray-400">
            <MapPin className="mx-auto mb-2 text-gray-300" size={28} />
            <p className="text-xs">Ubicación vacía</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================ */
/* KPI / Stat Card                                                */
/* ============================================================ */
function KpiCard({ Icon, label, value, gradient }: { Icon: any; label: string; value: any; gradient: string }) {
  return (
    <div className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon size={18} className="text-white" strokeWidth={2} />
        </div>
        <span className="text-xs text-gray-400 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

/* ============================================================ */
/* Form Input helper                                              */
/* ============================================================ */
function FI({ label, value, onChange, placeholder, type = 'text' }: any) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
    </div>
  );
}

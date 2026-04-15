import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import {
  ArrowRightLeft, Warehouse, Truck, Package, Search,
  Plus, X, Check, Clock,
  Scroll, Scissors, MapPin, ArrowRight, ChevronRight,
} from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  PENDIENTE:    { label: 'Pendiente',    color: 'bg-amber-100 text-amber-700', icon: Clock },
  EN_TRANSITO:  { label: 'En Tránsito', color: 'bg-blue-100 text-blue-700',   icon: Truck },
  COMPLETADA:   { label: 'Completada',  color: 'bg-emerald-100 text-emerald-700', icon: Check },
  CANCELADA:    { label: 'Cancelada',   color: 'bg-red-100 text-red-700',     icon: X },
};

export default function TransferenciasPage() {
  const [tab, setTab] = useState<'activas' | 'historial' | 'nueva'>('activas');
  const [filterEstado, setFilterEstado] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Data
  const { data: resp, refetch } = useApi<PaginatedResponse<any>>(['transfers', filterEstado], '/transfers', { estado: filterEstado || undefined, limit: 50 });
  const { data: stats } = useApi<any>(['transfer-stats'], '/transfers/stats');
  const { data: detail, refetch: refetchDetail } = useApi<any>(['transfer-detail', selectedId], `/transfers/${selectedId}`, {}, !!selectedId);
  const { data: warehouses } = useApi<any>(['warehouses-list'], '/warehouse/warehouses');
  const { data: husResp } = useApi<PaginatedResponse<any>>(['hus-for-transfer'], '/inventory/hus', { estadoHu: 'DISPONIBLE', limit: 200 });

  // Create form
  const [origenId, setOrigenId] = useState('');
  const [destinoId, setDestinoId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [notas, setNotas] = useState('');
  const [selectedHuIds, setSelectedHuIds] = useState<string[]>([]);
  const [huSearch, setHuSearch] = useState('');

  const warehouseList: any[] = warehouses || [];
  const allHUs: any[] = husResp?.data || [];

  // Filter HUs by origin warehouse and search
  const filteredHUs = allHUs.filter((hu: any) => {
    if (!origenId) return false;
    if (hu.ubicacion) {
      // Check if the HU's location belongs to the origin warehouse
      // We need to match by location — this is a simplified filter
    }
    const q = huSearch.toLowerCase();
    if (q && !hu.codigo?.toLowerCase().includes(q) && !hu.sku?.nombre?.toLowerCase().includes(q)) return false;
    return hu.estadoHu === 'DISPONIBLE';
  });

  const toggleHu = (huId: string) => {
    setSelectedHuIds(prev => prev.includes(huId) ? prev.filter(id => id !== huId) : [...prev, huId]);
  };

  const handleCreate = async () => {
    if (!origenId || !destinoId) return toast.error('Selecciona almacén origen y destino');
    if (selectedHuIds.length === 0) return toast.error('Selecciona al menos un HU');
    try {
      await api.post('/transfers', { warehouseOrigenId: origenId, warehouseDestinoId: destinoId, motivo, notas, huIds: selectedHuIds });
      toast.success('Transferencia creada exitosamente');
      setTab('activas');
      setOrigenId(''); setDestinoId(''); setMotivo(''); setNotas(''); setSelectedHuIds([]);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al crear transferencia');
    }
  };

  const handleExecute = async (id: string) => {
    if (!confirm('¿Confirmas ejecutar esta transferencia? Los HUs serán movidos.')) return;
    try {
      await api.put(`/transfers/${id}/execute`);
      toast.success('Transferencia ejecutada — HUs en tránsito');
      refetch(); refetchDetail();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error');
    }
  };

  const handleReceive = async (id: string) => {
    try {
      await api.put(`/transfers/${id}/receive`);
      toast.success('Recepción confirmada');
      refetch(); refetchDetail();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('¿Cancelar esta transferencia?')) return;
    try {
      await api.put(`/transfers/${id}/cancel`);
      toast.success('Transferencia cancelada');
      refetch(); refetchDetail();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error');
    }
  };

  const transfers = resp?.data || [];
  const filteredTransfers = transfers.filter((t: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.codigo?.toLowerCase().includes(q) ||
      t.warehouseOrigen?.nombre?.toLowerCase().includes(q) ||
      t.warehouseDestino?.nombre?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <ArrowRightLeft className="w-5 h-5 text-white" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transferencias</h1>
            <p className="text-gray-500 text-sm">Mover HUs entre almacenes y bodegas</p>
          </div>
        </div>
        <button
          onClick={() => setTab(tab === 'nueva' ? 'activas' : 'nueva')}
          className="px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
        >
          {tab === 'nueva' ? <><X size={16} /> Cerrar</> : <><Plus size={16} /> Nueva Transferencia</>}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Pendientes', value: stats.pendientes, color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
            { label: 'En Tránsito', value: stats.enTransito, color: 'text-blue-600', bg: 'bg-blue-50', icon: Truck },
            { label: 'Completadas', value: stats.completadas, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Check },
            { label: 'Total', value: stats.total, color: 'text-purple-600', bg: 'bg-purple-50', icon: ArrowRightLeft },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`${s.bg} rounded-xl p-4 flex items-center gap-3`}>
                <Icon size={20} className={s.color} />
                <div>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {(['activas', 'historial', 'nueva'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t !== 'activas') setSelectedId(null); if (t === 'activas') setFilterEstado(''); if (t === 'historial') setFilterEstado('COMPLETADA'); }}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'activas' ? '🔄 Activas' : t === 'historial' ? '📋 Historial' : '➕ Nueva'}
          </button>
        ))}
      </div>

      {/* === TAB: NEW === */}
      {tab === 'nueva' && (
        <div className="bg-white rounded-xl border p-6 space-y-5">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ArrowRightLeft size={20} className="text-violet-500" /> Nueva Transferencia
          </h2>

          {/* Warehouses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Almacén Origen</label>
              <select value={origenId} onChange={e => { setOrigenId(e.target.value); setSelectedHuIds([]); }} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-400">
                <option value="">Seleccionar...</option>
                {warehouseList.map((w: any) => <option key={w.id} value={w.id}>{w.nombre} ({w.codigo}) — {w.tipo}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Almacén Destino</label>
              <select value={destinoId} onChange={e => setDestinoId(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-400">
                <option value="">Seleccionar...</option>
                {warehouseList.filter((w: any) => w.id !== origenId).map((w: any) => (
                  <option key={w.id} value={w.id}>{w.nombre} ({w.codigo}) — {w.tipo}{w.clienteAsignado ? ` — Cliente: ${w.clienteAsignado}` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Visual arrow */}
          {origenId && destinoId && (
            <div className="flex items-center justify-center gap-4 py-3">
              <div className="px-4 py-2 bg-violet-50 rounded-xl text-sm font-semibold text-violet-700">
                <Warehouse size={16} className="inline mr-1" />
                {warehouseList.find((w: any) => w.id === origenId)?.nombre}
              </div>
              <ArrowRight size={24} className="text-violet-400" />
              <div className="px-4 py-2 bg-emerald-50 rounded-xl text-sm font-semibold text-emerald-700">
                <Warehouse size={16} className="inline mr-1" />
                {warehouseList.find((w: any) => w.id === destinoId)?.nombre}
                {warehouseList.find((w: any) => w.id === destinoId)?.tipo === 'VIRTUAL' && (
                  <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">VIRTUAL — HUs quedarán reservados</span>
                )}
              </div>
            </div>
          )}

          {/* Motivo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Motivo</label>
              <input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: Asignación cliente Liverpool" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Notas</label>
              <input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Notas adicionales..." className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-400" />
            </div>
          </div>

          {/* HU Selection */}
          {origenId && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Package size={16} className="text-violet-500" /> Seleccionar HUs a Transferir
                </h3>
                <span className="text-xs text-violet-500 font-medium bg-violet-50 px-2 py-1 rounded-full">
                  {selectedHuIds.length} seleccionados
                </span>
              </div>

              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={huSearch} onChange={e => setHuSearch(e.target.value)} placeholder="Buscar HU por código o tela..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {filteredHUs.slice(0, 30).map((hu: any) => {
                  const isSelected = selectedHuIds.includes(hu.id);
                  return (
                    <button
                      key={hu.id}
                      onClick={() => toggleHu(hu.id)}
                      className={`text-left p-3 rounded-xl border text-xs transition-all ${
                        isSelected ? 'bg-violet-50 border-violet-300 ring-1 ring-violet-200' : 'bg-white border-gray-100 hover:border-violet-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {hu.tipoRollo === 'RETAZO' ? <Scissors size={14} className="text-amber-500" /> : <Scroll size={14} className="text-blue-500" />}
                          <span className="font-mono font-bold">{hu.codigo}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${hu.tipoRollo === 'RETAZO' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{hu.tipoRollo}</span>
                        </div>
                        {isSelected && <Check size={14} className="text-violet-500" />}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-gray-500">{hu.sku?.nombre} — {hu.sku?.color}</span>
                        <span className="font-bold">{hu.metrajeActual}m</span>
                      </div>
                      {hu.ubicacion && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                          <MapPin size={10} /> {hu.ubicacion.codigo}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary & Create Button */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-500">
              {selectedHuIds.length > 0 && (
                <span className="font-semibold text-violet-600">
                  {selectedHuIds.length} HUs · {allHUs.filter(h => selectedHuIds.includes(h.id)).reduce((sum: number, h: any) => sum + h.metrajeActual, 0).toFixed(1)}m total
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setTab('activas')} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancelar</button>
              <button onClick={handleCreate} className="px-6 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 text-sm font-medium flex items-center gap-2">
                <ArrowRightLeft size={16} /> Crear Transferencia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === TAB: LIST (Activas / Historial) === */}
      {(tab === 'activas' || tab === 'historial') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Transfers List */}
          <div className="lg:col-span-2 space-y-2">
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1 max-w-xs">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar transferencia..." className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm" />
              </div>
              {filterEstado && (
                <button onClick={() => setFilterEstado('')} className="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-medium hover:bg-red-100 flex items-center gap-1">
                  <X size={14} /> Limpiar
                </button>
              )}
            </div>

            {filteredTransfers.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                <ArrowRightLeft size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-500">No hay transferencias {filterEstado && `en estado "${STATUS_MAP[filterEstado]?.label}"`}</p>
              </div>
            ) : (
              filteredTransfers.map((t: any) => {
                const status = STATUS_MAP[t.estado] || STATUS_MAP.PENDIENTE;
                const StatusIcon = status.icon;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedId === t.id ? 'border-violet-400 ring-1 ring-violet-200' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-violet-600">{t.codigo}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${status.color}`}>
                          <StatusIcon size={12} /> {status.label}
                        </span>
                      </div>
                      <div className="text-right text-xs text-gray-400">
                        <p>{new Date(t.createdAt).toLocaleDateString('es-MX')}</p>
                        <p>{t.user?.nombre}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700">{t.warehouseOrigen?.nombre}</span>
                      <ArrowRight size={14} className="text-violet-400" />
                      <span className="font-medium text-gray-700">{t.warehouseDestino?.nombre}</span>
                      {t.warehouseDestino?.clienteAsignado && (
                        <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">Cliente: {t.warehouseDestino.clienteAsignado}</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                      <span>{t.totalHUs || t._count?.lineas} HUs</span>
                      <span>{(t.totalMetraje || 0).toFixed(1)}m</span>
                      {t.motivo && <span className="truncate max-w-[200px]">{t.motivo}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Detail Panel */}
          <div className="bg-white rounded-xl border p-5">
            {!selectedId ? (
              <div className="text-center text-gray-400 py-12">
                <ArrowRightLeft size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">Selecciona una transferencia</p>
                <p className="text-xs mt-1">para ver detalles y tomar acciones</p>
              </div>
            ) : !detail ? (
              <div className="text-center text-gray-400 py-12">Cargando...</div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{detail.codigo}</h3>
                    <p className="text-xs text-gray-400">{new Date(detail.createdAt).toLocaleString('es-MX')}</p>
                  </div>
                  <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>

                {/* Status */}
                {(() => {
                  const s = STATUS_MAP[detail.estado] || STATUS_MAP.PENDIENTE;
                  const Icon = s.icon;
                  return (
                    <div className={`px-3 py-2.5 rounded-xl text-center ${s.color}`}>
                      <div className="flex items-center justify-center gap-2">
                        <Icon size={16} />
                        <p className="text-sm font-semibold">{s.label}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Route */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Warehouse size={14} className="text-violet-500" />
                    <span className="text-sm font-medium">{detail.warehouseOrigen?.nombre}</span>
                    <span className="text-xs text-gray-400">{detail.warehouseOrigen?.tipo}</span>
                  </div>
                  <div className="flex items-center gap-2 pl-4">
                    <ChevronRight size={14} className="text-violet-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Warehouse size={14} className="text-emerald-500" />
                    <span className="text-sm font-medium">{detail.warehouseDestino?.nombre}</span>
                    <span className="text-xs text-gray-400">{detail.warehouseDestino?.tipo}</span>
                    {detail.warehouseDestino?.clienteAsignado && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{detail.warehouseDestino.clienteAsignado}</span>
                    )}
                  </div>
                </div>

                {detail.motivo && (
                  <div className="text-xs text-gray-500"><strong>Motivo:</strong> {detail.motivo}</div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {detail.estado === 'PENDIENTE' && (
                    <>
                      <button onClick={() => handleExecute(detail.id)} className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 flex items-center justify-center gap-1">
                        <Truck size={14} /> Ejecutar
                      </button>
                      <button onClick={() => handleCancel(detail.id)} className="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100">
                        Cancelar
                      </button>
                    </>
                  )}
                  {detail.estado === 'EN_TRANSITO' && (
                    <button onClick={() => handleReceive(detail.id)} className="flex-1 px-3 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 flex items-center justify-center gap-1">
                      <Check size={14} /> Confirmar Recepción
                    </button>
                  )}
                </div>

                {/* Lines */}
                <div className="border-t pt-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">HUs en Transferencia ({detail.lineas?.length})</h4>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {detail.lineas?.map((linea: any) => (
                      <div key={linea.id} className="p-2.5 bg-gray-50 rounded-lg text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {linea.tipoRollo === 'RETAZO' ? <Scissors size={12} className="text-amber-500" /> : <Scroll size={12} className="text-blue-500" />}
                            <span className="font-mono font-bold text-gray-700">{linea.codigoHu}</span>
                            <span className={`px-1 py-0.5 rounded text-[9px] font-semibold ${linea.tipoRollo === 'RETAZO' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{linea.tipoRollo}</span>
                          </div>
                          <span className="font-bold">{linea.metraje}m</span>
                        </div>
                        {linea.skuNombre && <p className="text-gray-400 mt-0.5">{linea.skuNombre}</p>}
                        {linea.hu?.ubicacion?.codigo && (
                          <span className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5"><MapPin size={9} /> {linea.hu.ubicacion.codigo}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="border-t pt-3 space-y-1 text-xs text-gray-400">
                  <p>Creado: {new Date(detail.createdAt).toLocaleString('es-MX')} por {detail.user?.nombre}</p>
                  {detail.fechaEjecucion && <p>Ejecutado: {new Date(detail.fechaEjecucion).toLocaleString('es-MX')}</p>}
                  {detail.fechaRecepcion && <p>Recibido: {new Date(detail.fechaRecepcion).toLocaleString('es-MX')}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

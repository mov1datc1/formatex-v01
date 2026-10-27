import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import {
  ShieldAlert, Clock, CheckCircle2, AlertTriangle, Search, Plus,
  X, Unlock, Box, Layers, User, Calendar, DollarSign, RefreshCw,
  Sparkles, ChevronDown, ChevronRight, FileText
} from 'lucide-react';

interface SubalmacenesVipTabProps {
  currentUserId?: string;
  currentUserName?: string;
}

export default function SubalmacenesVipTab({ currentUserId, currentUserName }: SubalmacenesVipTabProps) {
  const [search, setSearch] = useState('');
  const [filterSemaforo, setFilterSemaforo] = useState<'ALL' | 'VERDE' | 'AMARILLO' | 'ROJO'>('ALL');
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState<any>(null);
  const [releasing, setReleasing] = useState(false);
  const [motivoLiberacion, setMotivoLiberacion] = useState('Plazo vencido sin pago de anticipo (15+ días)');

  // Form New VIP Reservation
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedHuIds, setSelectedHuIds] = useState<string[]>([]);
  const [diasVigencia, setDiasVigencia] = useState(15);
  const [anticipoPorcentaje, setAnticipoPorcentaje] = useState(20);
  const [anticipoMonto, setAnticipoMonto] = useState<number>(0);
  const [autorizadoPor, setAutorizadoPor] = useState('César / Dirección General');
  const [notasVip, setNotasVip] = useState('');
  const [creating, setCreating] = useState(false);
  const [huSearch, setHuSearch] = useState('');

  // Queries
  const { data: vipData, isLoading, refetch } = useApi<any>(
    ['reservations-vip'],
    '/reservations/vip'
  );

  const { data: clientsResp } = useApi<any>(
    ['catalog-clients-vip'],
    '/catalog/clients',
    { limit: 100 }
  );
  const clients = clientsResp?.data || [];

  const { data: availableHusResp, isLoading: loadingHus } = useApi<any>(
    ['available-hus-for-vip', huSearch],
    '/inventory/hus',
    { estadoHu: 'DISPONIBLE', search: huSearch || undefined, limit: 50 },
    showCreateModal
  );
  const availableHus = availableHusResp?.data || [];

  const toggleClient = (clientKey: string) => {
    setExpandedClients(prev => ({ ...prev, [clientKey]: !prev[clientKey] }));
  };

  const handleOpenReleaseModal = (target: {
    reservationId?: string;
    virtualWarehouseId?: string;
    clienteId?: string;
    clienteNombre: string;
    codigoHu?: string;
    metraje: number;
    isGroup?: boolean;
  }) => {
    setShowReleaseModal(target);
    setMotivoLiberacion('Plazo vencido sin pago de anticipo (15+ días)');
  };

  const handleExecuteRelease = async () => {
    if (!showReleaseModal) return;
    setReleasing(true);
    try {
      const resp = await api.put('/reservations/vip/release', {
        reservationId: showReleaseModal.reservationId,
        virtualWarehouseId: showReleaseModal.virtualWarehouseId,
        clienteId: showReleaseModal.clienteId,
        liberadoPor: currentUserName || 'César / Dirección',
        motivo: motivoLiberacion,
      });

      toast.success(resp.data?.mensaje || 'Inventario descongelado y devuelto a venta general', {
        icon: '🔓',
        duration: 4000,
      });
      setShowReleaseModal(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al liberar reserva VIP');
    }
    setReleasing(false);
  };

  const handleToggleHuSelect = (hu: any) => {
    const isSelected = selectedHuIds.includes(hu.id);
    let updated: string[];
    if (isSelected) {
      updated = selectedHuIds.filter(id => id !== hu.id);
    } else {
      updated = [...selectedHuIds, hu.id];
    }
    setSelectedHuIds(updated);

    // Calcular anticipo estimado
    const selectedList = availableHus.filter((h: any) => updated.includes(h.id));
    const totalM = selectedList.reduce((acc: number, h: any) => acc + (h.metrajeActual || 0), 0);
    const avgPrice = 110; // precio estimado promedio
    const totalValor = totalM * avgPrice;
    setAnticipoMonto(Math.round((totalValor * (anticipoPorcentaje / 100))));
  };

  const handleCreateVipReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return toast.error('Selecciona un cliente VIP');
    if (selectedHuIds.length === 0) return toast.error('Selecciona al menos un rollo disponible');

    setCreating(true);
    try {
      await api.post('/reservations/vip', {
        clientId: selectedClientId,
        huIds: selectedHuIds,
        diasVigencia,
        anticipoPorcentaje,
        anticipoMonto,
        autorizadoPor,
        notas: notasVip,
      });

      toast.success(`🎉 Apartado VIP creado exitosamente (${selectedHuIds.length} rollos asignados al sub-almacén)`, {
        icon: '💎',
        duration: 4500,
      });
      setShowCreateModal(false);
      setSelectedHuIds([]);
      setSelectedClientId('');
      setNotasVip('');
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al crear reserva VIP');
    }
    setCreating(false);
  };

  // Filtrado
  const clientes = (vipData?.porCliente || []).filter((c: any) => {
    const matchSearch = !search ||
      c.clienteNombre?.toLowerCase().includes(search.toLowerCase()) ||
      c.virtualWarehouseId?.toLowerCase().includes(search.toLowerCase()) ||
      c.reservas?.some((r: any) => r.skuNombre?.toLowerCase().includes(search.toLowerCase()) || r.huCodigo?.toLowerCase().includes(search.toLowerCase()));

    const matchSemaforo = filterSemaforo === 'ALL' || c.peorSemaforo === filterSemaforo;
    return matchSearch && matchSemaforo;
  });

  const totalRojo = (vipData?.detalle || []).filter((r: any) => r.semaforo === 'ROJO').length;
  const totalAmarillo = (vipData?.detalle || []).filter((r: any) => r.semaforo === 'AMARILLO').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Informativo con Regla de Negocio */}
      <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-gray-900 border border-purple-500/30 rounded-3xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">💎</span>
              <h2 className="text-xl font-black text-white tracking-wide">
                Sub-Almacenes Virtuales VIP y Reservas Especiales
              </h2>
              <span className="bg-purple-500/20 text-purple-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-500/40">
                Regla Seth (500m – 1,000m+)
              </span>
            </div>
            <p className="text-xs text-gray-300 max-w-3xl leading-relaxed">
              Resuelve el cuello de botella comercial de clientes de alto volumen que tardan semanas en pagar. Permite apartados extendidos con candado gerencial en sub-almacén virtual, evitando que el cron de 24h cancele la cotización, pero con <strong>semáforos de cobranza a 7 y 15 días</strong> y descongelamiento a 1-click para no bloquear inventario a otros vendedores.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl border border-gray-700 transition-colors"
              title="Refrescar datos"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 active:scale-95 transition-transform"
            >
              <Plus size={16} /> Nueva Reserva Especial VIP
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metraje Total */}
        <div className="bg-gray-800/80 border border-gray-700 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase">
            <span>Metros Congelados VIP</span>
            <Layers size={16} className="text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white">
            {Number(vipData?.totalMetrosGlobal || 0).toLocaleString()} <span className="text-xs font-normal text-gray-400">metros</span>
          </p>
          <p className="text-[11px] text-gray-400">En sub-almacenes virtuales activos</p>
        </div>

        {/* Rollos Físicos */}
        <div className="bg-gray-800/80 border border-gray-700 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase">
            <span>Rollos Físicos Apartados</span>
            <Box size={16} className="text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-indigo-300">
            {vipData?.totalRollosGlobal || 0} <span className="text-xs font-normal text-gray-400">rollos</span>
          </p>
          <p className="text-[11px] text-gray-400">En {vipData?.porCliente?.length || 0} cliente(s) VIP</p>
        </div>

        {/* Valor Cartera */}
        <div className="bg-gray-800/80 border border-gray-700 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase">
            <span>Valor Estimado Mercancía</span>
            <DollarSign size={16} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">
            ${Number(vipData?.totalValorGlobal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-gray-400">Precio de referencia de lista</p>
        </div>

        {/* Semáforo Crítico */}
        <div className={`rounded-2xl p-4 border shadow-sm space-y-1 ${
          totalRojo > 0 ? 'bg-red-950/30 border-red-500/50' : 'bg-gray-800/80 border-gray-700'
        }`}>
          <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase">
            <span>Semáforo de Antigüedad</span>
            <ShieldAlert size={16} className={totalRojo > 0 ? 'text-red-400 animate-pulse' : 'text-gray-400'} />
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-black text-red-400">{totalRojo}</span>
            <span className="text-xs text-red-300">Críticos (15d+)</span>
            <span className="text-gray-500">|</span>
            <span className="text-lg font-bold text-amber-400">{totalAmarillo}</span>
            <span className="text-xs text-amber-300">Alerta (7d+)</span>
          </div>
          <p className="text-[11px] text-gray-400">Decisión ejecutiva de descongelar</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-gray-800/90 border border-gray-700 rounded-2xl p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente, SKU o rollo..."
            className="w-full pl-10 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] text-gray-400 font-bold uppercase mr-1">Semáforo:</span>
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'VERDE', label: '🟢 Normal (1-7d)' },
            { id: 'AMARILLO', label: '🟡 Alerta (8-14d)' },
            { id: 'ROJO', label: '🔴 Crítico (15d+)' },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setFilterSemaforo(s.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                filterSemaforo === s.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700/60 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Clientes VIP con Apartados */}
      {isLoading ? (
        <div className="bg-gray-800/60 rounded-3xl p-12 text-center border border-gray-700 space-y-3">
          <RefreshCw size={28} className="mx-auto text-purple-400 animate-spin" />
          <p className="text-gray-300 text-sm font-medium">Cargando sub-almacenes virtuales VIP...</p>
        </div>
      ) : clientes.length === 0 ? (
        <div className="bg-gray-800/40 rounded-3xl p-12 text-center border border-dashed border-gray-700 space-y-2">
          <span className="text-4xl">💎</span>
          <p className="text-gray-200 font-bold text-base">No hay apartados VIP activos con los filtros actuales</p>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Usa el botón "+ Nueva Reserva Especial VIP" para congelar rollos para un cliente de alto volumen como Seth sin riesgo de auto-expiración a 24 horas.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {clientes.map((c: any) => {
            const isExpanded = expandedClients[c.clienteId || c.clienteNombre] !== false; // default open
            const peorSemaforo = c.peorSemaforo;

            return (
              <div
                key={c.clienteId || c.clienteNombre}
                className="bg-gray-800/90 border border-gray-700 rounded-3xl overflow-hidden shadow-lg transition-all"
              >
                {/* Header de la Tarjeta del Cliente VIP */}
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-800/40 border-b border-gray-700/60">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleClient(c.clienteId || c.clienteNombre)}
                      className="p-1.5 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-300"
                    >
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-base">{c.clienteNombre}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-900/60 text-purple-300 border border-purple-500/40">
                          {c.virtualWarehouseId ? `Almacén Virtual: ${c.virtualWarehouseId.slice(0, 8)}` : 'Sub-Almacén VIP'}
                        </span>
                        {peorSemaforo === 'ROJO' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/50 flex items-center gap-1 animate-pulse">
                            🔴 CRÍTICO: {c.maxDiasTranscurridos} DÍAS SIN PAGO
                          </span>
                        )}
                        {peorSemaforo === 'AMARILLO' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1">
                            🟡 ALERTA PREVENTIVA: {c.maxDiasTranscurridos} DÍAS
                          </span>
                        )}
                        {peorSemaforo === 'VERDE' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            🟢 VIGENTE ({c.maxDiasTranscurridos}d)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {c.totalRollos} rollo(s) asignados · <strong className="text-white">{Number(c.totalMetros || 0).toFixed(1)}m</strong> en reserva · Valor est.: <strong className="text-emerald-400">${Number(c.valorTotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Acciones de Grupo */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenReleaseModal({
                        virtualWarehouseId: c.virtualWarehouseId,
                        clienteId: c.clienteId,
                        clienteNombre: c.clienteNombre,
                        metraje: c.totalMetros,
                        isGroup: true,
                      })}
                      className="px-3.5 py-2 bg-red-900/40 hover:bg-red-800/60 text-red-200 border border-red-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Unlock size={14} /> Liberar Todo a Venta General
                    </button>
                  </div>
                </div>

                {/* Tabla de Rollos en este Sub-Almacén */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-900/60 text-gray-400 border-b border-gray-700/60 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Rollo (HU)</th>
                          <th className="py-3 px-4">Tela / SKU</th>
                          <th className="py-3 px-4">Color</th>
                          <th className="py-3 px-4 text-right">Metraje</th>
                          <th className="py-3 px-4">Ubicación Rack</th>
                          <th className="py-3 px-4 text-center">Antigüedad</th>
                          <th className="py-3 px-4 text-center">Anticipo</th>
                          <th className="py-3 px-4">Autorizado Por</th>
                          <th className="py-3 px-4 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {c.reservas.map((r: any) => (
                          <tr key={r.id} className="hover:bg-gray-750/50 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-purple-300">
                              {r.huCodigo || r.huId?.slice(0, 8)}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-white">{r.skuNombre || 'Tela'}</span>
                              <span className="block font-mono text-[10px] text-gray-400">{r.skuCodigo}</span>
                            </td>
                            <td className="py-3 px-4 text-gray-300">
                              {r.color || 'Único'}
                            </td>
                            <td className="py-3 px-4 text-right font-black text-white text-sm">
                              {Number(r.metraje || 0).toFixed(1)} m
                            </td>
                            <td className="py-3 px-4 font-mono text-gray-400">
                              {r.ubicacion}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.semaforo === 'ROJO'
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                                  : r.semaforo === 'AMARILLO'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              }`}>
                                {r.diasTranscurridos}d ({r.diasRestantes > 0 ? `${r.diasRestantes}d rest.` : 'Vencido'})
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-[11px] text-emerald-300 font-bold">
                                {r.anticipoPorcentaje > 0 ? `${r.anticipoPorcentaje}%` : '0%'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-400 text-[11px]">
                              {r.autorizadoPor || 'César'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleOpenReleaseModal({
                                  reservationId: r.id,
                                  clienteNombre: c.clienteNombre,
                                  codigoHu: r.huCodigo,
                                  metraje: r.metraje,
                                  isGroup: false,
                                })}
                                className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 mx-auto transition-colors"
                              >
                                <Unlock size={11} /> Liberar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: NUEVA RESERVA ESPECIAL VIP */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-purple-500/40 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">💎</span>
                <h3 className="text-lg font-bold text-white">Nueva Reserva Especial VIP en Sub-Almacén</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateVipReservation} className="space-y-4">
              {/* Cliente */}
              <div>
                <label className="text-xs text-gray-300 font-bold block mb-1">Cliente VIP (Seth / Liverpool / Mayorista):</label>
                <select
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                  className="w-full py-2.5 px-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-xs focus:border-purple-500 focus:outline-none"
                  required
                >
                  <option value="">-- Seleccionar cliente VIP --</option>
                  {clients.map((cli: any) => (
                    <option key={cli.id} value={cli.id}>
                      {cli.nombre} {cli.codigo ? `(${cli.codigo})` : ''} {cli.esVip ? '★ VIP' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Rollos Disponibles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300 font-bold">Seleccionar Rollos Físicos a Congelar:</label>
                  <span className="text-xs text-purple-400 font-bold">
                    {selectedHuIds.length} seleccionados (
                    {availableHus
                      .filter((h: any) => selectedHuIds.includes(h.id))
                      .reduce((acc: number, h: any) => acc + (h.metrajeActual || 0), 0)
                      .toFixed(1)}m)
                  </span>
                </div>

                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={huSearch}
                    onChange={e => setHuSearch(e.target.value)}
                    placeholder="Filtrar rollos por código o SKU..."
                    className="w-full pl-9 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs placeholder:text-gray-500"
                  />
                </div>

                <div className="border border-gray-700 rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-800 bg-gray-800/40">
                  {loadingHus ? (
                    <div className="p-4 text-center text-xs text-gray-400">Buscando rollos disponibles...</div>
                  ) : availableHus.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-500">No hay rollos disponibles</div>
                  ) : (
                    availableHus.map((hu: any) => {
                      const isChecked = selectedHuIds.includes(hu.id);
                      return (
                        <div
                          key={hu.id}
                          onClick={() => handleToggleHuSelect(hu)}
                          className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                            isChecked ? 'bg-purple-900/30' : 'hover:bg-gray-700/40'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded border-gray-600 text-purple-600 focus:ring-0"
                            />
                            <div>
                              <span className="font-mono font-bold text-white">{hu.codigo}</span>
                              <span className="text-gray-300 ml-2">{hu.sku?.nombre} · {hu.sku?.color}</span>
                              <span className="text-gray-500 block text-[10px]">{hu.ubicacion?.codigo || 'Sin ubic.'}</span>
                            </div>
                          </div>
                          <span className="font-black text-purple-300">{hu.metrajeActual}m</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Plazo y Anticipo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-300 font-bold block mb-1">Días de Vigencia del Apartado:</label>
                  <select
                    value={diasVigencia}
                    onChange={e => setDiasVigencia(Number(e.target.value))}
                    className="w-full py-2 px-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-xs"
                  >
                    <option value={7}>7 días (Semáforo preventivo a los 7d)</option>
                    <option value={15}>15 días (Recomendado estándar VIP)</option>
                    <option value={21}>21 días (Autorización especial)</option>
                    <option value={30}>30 días (Máximo caso Seth 1,000m)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-300 font-bold block mb-1">Anticipo Pactado (%):</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={anticipoPorcentaje}
                    onChange={e => setAnticipoPorcentaje(Number(e.target.value))}
                    className="w-full py-2 px-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-xs"
                    placeholder="20"
                  />
                </div>
              </div>

              {/* Autorizado Por */}
              <div>
                <label className="text-xs text-gray-300 font-bold block mb-1">Autorizado Por (Candado Gerencial):</label>
                <input
                  type="text"
                  value={autorizadoPor}
                  onChange={e => setAutorizadoPor(e.target.value)}
                  className="w-full py-2 px-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-xs"
                  required
                />
              </div>

              {/* Justificación / Notas */}
              <div>
                <label className="text-xs text-gray-300 font-bold block mb-1">Notas / Justificación Comercial:</label>
                <textarea
                  rows={2}
                  value={notasVip}
                  onChange={e => setNotasVip(e.target.value)}
                  placeholder="Ej: Pedido de alto volumen para apertura de sucursales Seth. Se pactó 20% anticipo y liquidación en 15 días."
                  className="w-full py-2 px-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating || !selectedClientId || selectedHuIds.length === 0}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold disabled:opacity-40"
                >
                  {creating ? 'Guardando en Sub-Almacén...' : 'Confirmar Reserva VIP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMAR DESCONGELAMIENTO (1-CLICK RELEASE) */}
      {showReleaseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-red-500/50 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center">
                <Unlock size={22} />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Descongelar a Venta General</h3>
                <p className="text-xs text-red-300">Liberación inmediata de inventario</p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-3 text-xs space-y-1">
              <p className="text-gray-300">
                <strong>Cliente:</strong> {showReleaseModal.clienteNombre}
              </p>
              {showReleaseModal.codigoHu && (
                <p className="text-gray-300">
                  <strong>Rollo:</strong> <span className="font-mono text-purple-300">{showReleaseModal.codigoHu}</span>
                </p>
              )}
              <p className="text-gray-300">
                <strong>Metraje a liberar:</strong> <span className="font-black text-emerald-400">{Number(showReleaseModal.metraje || 0).toFixed(1)}m</span>
              </p>
            </div>

            <div>
              <label className="text-xs text-gray-300 font-bold block mb-1">Motivo de la Liberación:</label>
              <select
                value={motivoLiberacion}
                onChange={e => setMotivoLiberacion(e.target.value)}
                className="w-full py-2 px-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-xs"
              >
                <option value="Plazo vencido sin pago de anticipo (15+ días)">Plazo vencido sin pago de anticipo (15+ días)</option>
                <option value="Cancelación solicitada por el cliente">Cancelación solicitada por el cliente</option>
                <option value="Reasignación comercial prioritaria por César">Reasignación comercial prioritaria por César</option>
                <option value="Pedido formalizado por otra vía / Facturado">Pedido formalizado por otra vía / Facturado</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReleaseModal(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteRelease}
                disabled={releasing}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
              >
                {releasing ? 'Liberando...' : 'Confirmar y Descongelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

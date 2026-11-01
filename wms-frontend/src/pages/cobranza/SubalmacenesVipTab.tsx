import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import {
  ShieldAlert, Clock, CheckCircle2, AlertTriangle, AlertCircle, Search, Plus,
  X, Unlock, Box, Layers, User, Calendar, DollarSign, RefreshCw,
  Sparkles, ChevronDown, ChevronRight, FileText, Crown, Gem, ShieldCheck,
  BadgeDollarSign, Check
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

      toast.success(`Apartado VIP creado exitosamente (${selectedHuIds.length} rollos asignados al sub-almacén)`, {
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
    <div className="space-y-5 animate-fade-in">
      {/* Header Informativo con Regla de Negocio */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-5 relative overflow-hidden shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
                <Crown size={18} strokeWidth={2} />
              </div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                Sub-Almacenes Virtuales VIP y Reservas Especiales
              </h2>
              <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-200/60 flex items-center gap-1">
                <ShieldCheck size={13} /> Regla Seth (500m – 1,000m+)
              </span>
            </div>
            <p className="text-xs text-gray-600 max-w-3xl leading-relaxed">
              Resuelve el cuello de botella comercial de clientes de alto volumen que tardan semanas en pagar. Permite apartados extendidos con candado gerencial en sub-almacén virtual, evitando que el cron de 24h cancele la cotización, con <strong>semáforos de cobranza a 7 y 15 días</strong> y descongelamiento a 1-click para no bloquear inventario a otros vendedores.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => refetch()}
              className="p-2.5 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 rounded-xl border border-gray-200 shadow-2xs transition-colors"
              title="Refrescar datos"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus size={15} /> Nueva Reserva Especial VIP
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metraje Total */}
        <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
            <span>Metros Congelados VIP</span>
            <Layers size={15} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {Number(vipData?.totalMetrosGlobal || 0).toLocaleString()} <span className="text-xs font-normal text-gray-400">metros</span>
          </p>
          <p className="text-[11px] text-gray-400">En sub-almacenes virtuales activos</p>
        </div>

        {/* Rollos Físicos */}
        <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
            <span>Rollos Físicos Apartados</span>
            <Box size={15} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {vipData?.totalRollosGlobal || 0} <span className="text-xs font-normal text-gray-400">rollos</span>
          </p>
          <p className="text-[11px] text-gray-400">En {vipData?.porCliente?.length || 0} cliente(s) VIP</p>
        </div>

        {/* Valor Cartera */}
        <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
            <span>Valor Estimado Mercancía</span>
            <BadgeDollarSign size={15} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            ${Number(vipData?.totalValorGlobal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-gray-400">Precio de referencia de lista</p>
        </div>

        {/* Semáforo Crítico */}
        <div className={`rounded-xl p-4 border shadow-sm space-y-1 ${
          totalRojo > 0 ? 'bg-rose-50/40 border-rose-200' : 'bg-white border-gray-200/80'
        }`}>
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
            <span>Semáforo de Antigüedad</span>
            <ShieldAlert size={15} className={totalRojo > 0 ? 'text-rose-500' : 'text-gray-400'} />
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-2xl font-bold text-rose-600">{totalRojo}</span>
            <span className="text-xs font-medium text-rose-700">Críticos (15d+)</span>
            <span className="text-gray-300">|</span>
            <span className="text-lg font-bold text-amber-600">{totalAmarillo}</span>
            <span className="text-xs font-medium text-amber-700">Alerta (7d+)</span>
          </div>
          <p className="text-[11px] text-gray-400">Decisión ejecutiva de descongelar</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white border border-gray-200/80 rounded-xl p-3 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente, SKU o rollo..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-xs placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] text-gray-500 font-semibold uppercase mr-1">Semáforo:</span>
          {[
            { id: 'ALL', label: 'Todos', icon: null },
            { id: 'VERDE', label: 'Normal (1-7d)', icon: CheckCircle2, color: 'emerald' },
            { id: 'AMARILLO', label: 'Alerta (8-14d)', icon: AlertTriangle, color: 'amber' },
            { id: 'ROJO', label: 'Crítico (15d+)', icon: AlertCircle, color: 'rose' },
          ].map(s => {
            const Icon = s.icon;
            const isSelected = filterSemaforo === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setFilterSemaforo(s.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? s.id === 'ALL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : s.color === 'emerald'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : s.color === 'amber'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-rose-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {Icon && <Icon size={12} className={isSelected ? 'text-white' : ''} />}
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Clientes VIP con Apartados */}
      {isLoading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200/80 shadow-sm space-y-3">
          <RefreshCw size={24} className="mx-auto text-blue-600 animate-spin" />
          <p className="text-gray-600 text-sm font-medium">Cargando sub-almacenes virtuales VIP...</p>
        </div>
      ) : clientes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-1">
            <Crown size={24} />
          </div>
          <p className="text-gray-900 font-bold text-base">No hay apartados VIP activos con los filtros actuales</p>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
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
                className="bg-white border border-gray-200/80 rounded-xl overflow-hidden shadow-sm transition-all"
              >
                {/* Header de la Tarjeta del Cliente VIP */}
                <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-50/70 border-b border-gray-200/80">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleClient(c.clienteId || c.clienteNombre)}
                      className="p-1.5 rounded-lg bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 shadow-2xs"
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-base">{c.clienteNombre}</h3>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
                          {c.virtualWarehouseId ? `Almacén Virtual: ${c.virtualWarehouseId.slice(0, 8)}` : 'Sub-Almacén VIP'}
                        </span>
                        {peorSemaforo === 'ROJO' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                            <AlertCircle size={12} className="text-rose-600 shrink-0" />
                            CRÍTICO: {c.maxDiasTranscurridos} DÍAS SIN PAGO
                          </span>
                        )}
                        {peorSemaforo === 'AMARILLO' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                            <AlertTriangle size={12} className="text-amber-600 shrink-0" />
                            ALERTA PREVENTIVA: {c.maxDiasTranscurridos} DÍAS
                          </span>
                        )}
                        {peorSemaforo === 'VERDE' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                            VIGENTE ({c.maxDiasTranscurridos}d)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {c.totalRollos} rollo(s) asignados · <strong className="text-gray-900 font-semibold">{Number(c.totalMetros || 0).toFixed(1)}m</strong> en reserva · Valor est.: <strong className="text-emerald-600 font-semibold">${Number(c.valorTotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
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
                      className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Unlock size={13} /> Liberar Todo a Venta General
                    </button>
                  </div>
                </div>

                {/* Tabla de Rollos en este Sub-Almacén */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase tracking-wider text-[10px] font-semibold">
                        <tr>
                          <th className="py-2.5 px-4">Rollo (HU)</th>
                          <th className="py-2.5 px-4">Tela / SKU</th>
                          <th className="py-2.5 px-4">Color</th>
                          <th className="py-2.5 px-4 text-right">Metraje</th>
                          <th className="py-2.5 px-4">Ubicación Rack</th>
                          <th className="py-2.5 px-4 text-center">Antigüedad</th>
                          <th className="py-2.5 px-4 text-center">Anticipo</th>
                          <th className="py-2.5 px-4">Autorizado Por</th>
                          <th className="py-2.5 px-4 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {c.reservas.map((r: any) => (
                          <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-blue-700 text-xs">
                              {r.huCodigo || r.huId?.slice(0, 8)}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-gray-900">{r.skuNombre || 'Tela'}</span>
                              <span className="block font-mono text-[10px] text-gray-400">{r.skuCodigo}</span>
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {r.color || 'Único'}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-gray-900 text-xs">
                              {Number(r.metraje || 0).toFixed(1)} m
                            </td>
                            <td className="py-3 px-4 font-mono text-gray-500">
                              {r.ubicacion}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                r.semaforo === 'ROJO'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : r.semaforo === 'AMARILLO'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {r.diasTranscurridos}d ({r.diasRestantes > 0 ? `${r.diasRestantes}d rest.` : 'Vencido'})
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-[11px] text-emerald-700 font-semibold">
                                {r.anticipoPorcentaje > 0 ? `${r.anticipoPorcentaje}%` : '0%'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-600 text-[11px]">
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
                                className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-semibold flex items-center gap-1 mx-auto transition-colors shadow-2xs"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Crown size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Nueva Reserva Especial VIP en Sub-Almacén</h3>
                  <p className="text-xs text-gray-500">Apartado extendido con candado gerencial</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateVipReservation} className="space-y-4">
              {/* Cliente */}
              <div>
                <label className="text-xs text-gray-700 font-semibold block mb-1">Cliente VIP (Seth / Liverpool / Mayorista):</label>
                <select
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                  className="w-full py-2.5 px-3 bg-white border border-gray-300 rounded-xl text-gray-900 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">-- Seleccionar cliente VIP --</option>
                  {clients.map((cli: any) => (
                    <option key={cli.id} value={cli.id}>
                      {cli.nombre} {cli.codigo ? `(${cli.codigo})` : ''} {cli.esVip ? '(VIP)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Rollos Disponibles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-700 font-semibold">Seleccionar Rollos Físicos a Congelar:</label>
                  <span className="text-xs text-blue-600 font-semibold">
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
                    className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-xs placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-100 bg-white">
                  {loadingHus ? (
                    <div className="p-4 text-center text-xs text-gray-400">Buscando rollos disponibles...</div>
                  ) : availableHus.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400">No hay rollos disponibles</div>
                  ) : (
                    availableHus.map((hu: any) => {
                      const isChecked = selectedHuIds.includes(hu.id);
                      return (
                        <div
                          key={hu.id}
                          onClick={() => handleToggleHuSelect(hu)}
                          className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                            isChecked ? 'bg-blue-50/70' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                              <span className="font-mono font-bold text-blue-700">{hu.codigo}</span>
                              <span className="text-gray-800 ml-2">{hu.sku?.nombre} · {hu.sku?.color}</span>
                              <span className="text-gray-400 block text-[10px]">{hu.ubicacion?.codigo || 'Sin ubic.'}</span>
                            </div>
                          </div>
                          <span className="font-bold text-gray-900">{hu.metrajeActual}m</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Plazo y Anticipo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-700 font-semibold block mb-1">Días de Vigencia del Apartado:</label>
                  <select
                    value={diasVigencia}
                    onChange={e => setDiasVigencia(Number(e.target.value))}
                    className="w-full py-2 px-3 bg-white border border-gray-300 rounded-xl text-gray-900 text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value={7}>7 días (Semáforo preventivo a los 7d)</option>
                    <option value={15}>15 días (Recomendado estándar VIP)</option>
                    <option value={21}>21 días (Autorización especial)</option>
                    <option value={30}>30 días (Máximo caso Seth 1,000m)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-700 font-semibold block mb-1">Anticipo Pactado (%):</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={anticipoPorcentaje}
                    onChange={e => setAnticipoPorcentaje(Number(e.target.value))}
                    className="w-full py-2 px-3 bg-white border border-gray-300 rounded-xl text-gray-900 text-xs focus:border-blue-500 focus:outline-none"
                    placeholder="20"
                  />
                </div>
              </div>

              {/* Autorizado Por */}
              <div>
                <label className="text-xs text-gray-700 font-semibold block mb-1">Autorizado Por (Candado Gerencial):</label>
                <input
                  type="text"
                  value={autorizadoPor}
                  onChange={e => setAutorizadoPor(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-gray-300 rounded-xl text-gray-900 text-xs focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* Justificación / Notas */}
              <div>
                <label className="text-xs text-gray-700 font-semibold block mb-1">Notas / Justificación Comercial:</label>
                <textarea
                  rows={2}
                  value={notasVip}
                  onChange={e => setNotasVip(e.target.value)}
                  placeholder="Ej: Pedido de alto volumen para apertura de sucursales Seth. Se pactó 20% anticipo y liquidación en 15 días."
                  className="w-full py-2 px-3 bg-white border border-gray-300 rounded-xl text-gray-900 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating || !selectedClientId || selectedHuIds.length === 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold disabled:opacity-40 transition-colors shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                <Unlock size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Descongelar a Venta General</h3>
                <p className="text-xs text-rose-700">Liberación inmediata de inventario</p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-3.5 text-xs space-y-1.5 text-gray-700">
              <p>
                <strong className="text-gray-900">Cliente:</strong> {showReleaseModal.clienteNombre}
              </p>
              {showReleaseModal.codigoHu && (
                <p>
                  <strong className="text-gray-900">Rollo:</strong> <span className="font-mono text-blue-700 font-bold">{showReleaseModal.codigoHu}</span>
                </p>
              )}
              <p>
                <strong className="text-gray-900">Metraje a liberar:</strong> <span className="font-bold text-emerald-600">{Number(showReleaseModal.metraje || 0).toFixed(1)}m</span>
              </p>
            </div>

            <div>
              <label className="text-xs text-gray-700 font-semibold block mb-1">Motivo de la Liberación:</label>
              <select
                value={motivoLiberacion}
                onChange={e => setMotivoLiberacion(e.target.value)}
                className="w-full py-2 px-3 bg-white border border-gray-300 rounded-xl text-gray-900 text-xs focus:border-blue-500 focus:outline-none"
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
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteRelease}
                disabled={releasing}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition-colors"
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

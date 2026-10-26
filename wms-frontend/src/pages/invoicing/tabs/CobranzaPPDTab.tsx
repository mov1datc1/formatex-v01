import { useState, useMemo } from 'react';
import { useApi } from '../../../hooks/useApi';
import { api } from '../../../config/api';
import toast from 'react-hot-toast';
import {
  CreditCard, AlertTriangle, Clock, CheckCircle2,
  DollarSign, Search, X, FileCheck, Loader2,
  Download, FileText, Printer, Users, Eye, Filter,
  Calendar, Ban, ArrowRight, RefreshCw, ChevronRight, ShieldAlert, Info,
} from 'lucide-react';

export default function CobranzaPPDTab() {
  const [subTab, setSubTab] = useState<'cartera' | 'facturas' | 'complementos'>('cartera');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL'); // ALL, VENCIDAS, POR_VENCER, EN_PLAZO, PARCIALES
  const [complementFilter, setComplementFilter] = useState<'ALL' | 'PENDING_EMISSION' | 'EMITTED'>('ALL');
  const [emittingComplement, setEmittingComplement] = useState<string | null>(null);

  // Clients catalog for dropdown
  const { data: clientsResp } = useApi<any>(['clients-catalog-cobranza'], '/catalog/clients', { limit: 250 });
  const clientsList = clientsResp?.data || clientsResp || [];

  // Dashboard KPIs
  const { data: dashboard, refetch: refetchDashboard } = useApi<any>(['ppd-dashboard'], '/invoicing/ppd-dashboard');

  // Cartera disgregada por cliente
  const { data: cartera, isLoading: loadingCartera, refetch: refetchCartera } = useApi<any[]>(
    ['cartera-clientes'],
    '/invoicing/cartera-clientes',
  );

  // ALL PPD invoices with client filter
  const { data: resp, isLoading: loadingInvoices, refetch: refetchInvoices } = useApi<any>(
    ['invoice-history', 'ppd-all', clientSearch, selectedClientId],
    '/invoicing/history',
    {
      metodoPago: 'PPD',
      search: clientSearch || undefined,
      clientId: selectedClientId || undefined,
      limit: 100,
    },
  );

  // List of emitted complements
  const { data: complements, isLoading: loadingComplements, refetch: refetchComplements } = useApi<any[]>(
    ['complements-list', clientSearch, selectedClientId],
    '/invoicing/complements',
    {
      search: clientSearch || undefined,
      clientId: selectedClientId || undefined,
    },
  );

  const rawInvoices = (resp?.data || []).filter((i: any) => i.metodoPagoCfdi === 'PPD' && i.estadoPago !== 'NA');

  // Filter invoices by status
  const invoices = useMemo(() => {
    const now = new Date();
    const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return rawInvoices.filter((inv: any) => {
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'PAGADA') return inv.estadoPago === 'PAGADA';
      if (statusFilter === 'PARCIAL') return inv.estadoPago === 'PARCIAL';
      if (statusFilter === 'VENCIDAS') {
        return inv.estadoPago !== 'PAGADA' && inv.fechaVencimiento && new Date(inv.fechaVencimiento) < now;
      }
      if (statusFilter === 'POR_VENCER') {
        if (inv.estadoPago === 'PAGADA' || !inv.fechaVencimiento) return false;
        const d = new Date(inv.fechaVencimiento);
        return d >= now && d <= endOfWeek;
      }
      if (statusFilter === 'EN_PLAZO') {
        if (inv.estadoPago === 'PAGADA' || !inv.fechaVencimiento) return false;
        return new Date(inv.fechaVencimiento) >= now;
      }
      return true;
    });
  }, [rawInvoices, statusFilter]);

  const pendingInvoices = invoices.filter((i: any) => i.estadoPago !== 'PAGADA');
  const paidInvoices = rawInvoices.filter((i: any) => i.estadoPago === 'PAGADA');

  // Check if an order already has a complement
  const complementMap = useMemo(() => {
    const map = new Map<string, any>();
    (complements || []).forEach((c: any) => map.set(c.orderId, c));
    return map;
  }, [complements]);

  // Cartera filtrada
  const filteredCartera = useMemo(() => {
    if (!cartera) return [];
    return cartera.filter((item: any) => {
      const matchClient = !selectedClientId || item.client?.id === selectedClientId;
      const matchSearch = !clientSearch ||
        item.client?.nombre?.toLowerCase().includes(clientSearch.toLowerCase()) ||
        item.client?.codigo?.toLowerCase().includes(clientSearch.toLowerCase()) ||
        item.client?.rfc?.toLowerCase().includes(clientSearch.toLowerCase());
      return matchClient && matchSearch;
    });
  }, [cartera, selectedClientId, clientSearch]);

  const toggleSelect = (id: string) => {
    setSelectedOrders(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getStatusColor = (inv: any) => {
    if (inv.estadoPago === 'PAGADA') return 'bg-emerald-100 text-emerald-700';
    if (inv.fechaVencimiento && new Date(inv.fechaVencimiento) < new Date()) return 'bg-red-100 text-red-700';
    if (inv.estadoPago === 'PARCIAL') return 'bg-amber-100 text-amber-700';
    return 'bg-blue-100 text-blue-700';
  };

  const getStatusLabel = (inv: any) => {
    if (inv.estadoPago === 'PAGADA') return '✅ Pagada';
    if (inv.fechaVencimiento && new Date(inv.fechaVencimiento) < new Date()) return '🔴 Vencida';
    if (inv.estadoPago === 'PARCIAL') return '🟡 Parcial';
    return '🔵 Pendiente';
  };

  const handleEmitComplement = async (orderId: string) => {
    setEmittingComplement(orderId);
    try {
      const res = await api.post(`/invoicing/orders/${orderId}/complement`);
      toast.success(`✅ Complemento CFDI-P emitido — UUID: ${res.data.complementUuid || 'OK'}`);
      refetchInvoices();
      refetchComplements();
      refetchDashboard();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al emitir complemento de pago');
    } finally {
      setEmittingComplement(null);
    }
  };

  const downloadComplement = async (complementId: string, type: 'pdf' | 'xml', code: string) => {
    try {
      const res = await api.get(`/invoicing/complements/${complementId}/${type}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `complemento-${code}.${type}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`📄 ${type.toUpperCase()} descargado`);
    } catch {
      toast.error(`Error al descargar ${type.toUpperCase()}`);
    }
  };

  const openPayForClient = (facturas: any[]) => {
    const ids = facturas.map(f => f.id);
    setSelectedOrders(ids);
    setShowPayModal(true);
  };

  const viewClientInvoices = (cId: string) => {
    setSelectedClientId(cId);
    setSubTab('facturas');
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Pendientes', val: dashboard?.pendientes?.count || 0, monto: dashboard?.pendientes?.monto || 0, color: 'blue', icon: Clock },
          { label: 'Parciales', val: dashboard?.parciales?.count || 0, monto: dashboard?.parciales?.monto || 0, color: 'amber', icon: CreditCard },
          { label: 'Por vencer (7d)', val: dashboard?.porVencerSemana?.count || 0, monto: dashboard?.porVencerSemana?.monto || 0, color: 'orange', icon: AlertTriangle },
          { label: 'Vencidas', val: dashboard?.vencidas?.count || 0, monto: dashboard?.vencidas?.monto || 0, color: 'red', icon: AlertTriangle },
          { label: 'Cobrado este mes', val: dashboard?.cobradoMes?.count || 0, monto: dashboard?.cobradoMes?.monto || 0, color: 'emerald', icon: CheckCircle2 },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-xl border p-4 shadow-2xs">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={`text-${kpi.color}-500`} />
                <p className="text-xs text-gray-400 font-medium">{kpi.label}</p>
              </div>
              <p className="text-xl font-bold text-gray-900">{kpi.val}</p>
              <p className={`text-sm font-semibold text-${kpi.color}-600 mt-0.5 font-mono`}>
                ${Number(kpi.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
          );
        })}
      </div>

      {/* Regla Fiscal SAT & César */}
      <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-start sm:items-center gap-2.5 text-amber-950">
          <ShieldAlert size={18} className="text-amber-600 flex-shrink-0 mt-0.5 sm:mt-0" />
          <p className="leading-relaxed">
            <strong className="text-amber-900">Regla Fiscal SAT (César):</strong> Toda factura <strong>PPD</strong> (Crédito) requiere por ley timbrar un <strong>Complemento de Pago (REP)</strong> individual por <em>cada abono bancario recibido</em>. En facturas <strong>PUE</strong> (Contado) el pago es inmediato y queda <em>prohibido emitir REP</em>. Tolerancia de redondeo: <strong>±$10.00 MXN</strong>.
          </p>
        </div>
      </div>

      {/* Selector de Sub-Vistas de Cobranza (César) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setSubTab('cartera')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              subTab === 'cartera'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users size={15} />
            <span>Disgregado por Cliente (Cartera)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              subTab === 'cartera' ? 'bg-amber-700 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {filteredCartera.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('facturas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              subTab === 'facturas'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CreditCard size={15} />
            <span>Facturas PPD & Abonos</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              subTab === 'facturas' ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {pendingInvoices.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('complementos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              subTab === 'complementos'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileCheck size={15} />
            <span>Complementos de Pago (CFDI-P)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              subTab === 'complementos' ? 'bg-violet-700 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {(complements || []).length}
            </span>
          </button>
        </div>

        {selectedOrders.length > 0 && subTab === 'facturas' && (
          <button
            onClick={() => setShowPayModal(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-xs shrink-0"
          >
            <DollarSign size={15} />
            <span>Registrar Pago ({selectedOrders.length} factura{selectedOrders.length > 1 ? 's' : ''})</span>
          </button>
        )}
      </div>

      {/* Barra de Filtros Unificada (Cliente, Búsqueda, Estado) */}
      <div className="bg-white p-3 rounded-2xl border space-y-3 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Selector de Cliente */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Filtrar por Cliente</label>
            <div className="relative">
              <select
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary-500"
              >
                <option value="">— Todos los Clientes —</option>
                {clientsList.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.codigo})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Buscador de Texto */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Búsqueda rápida</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                placeholder="Buscar pedido, folio, UUID, RFC, cliente..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Filtro de Estatus en Facturas */}
          {subTab === 'facturas' ? (
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Estatus de Cobranza</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
              >
                <option value="ALL">Todas las Facturas PPD</option>
                <option value="VENCIDAS">🔴 Solo Vencidas (Fuera de Plazo)</option>
                <option value="POR_VENCER">⏳ Por Vencer (Próximos 7 días)</option>
                <option value="EN_PLAZO">🔵 En Plazo / Vigentes</option>
                <option value="PARCIAL">🟡 Con Abono Parcial</option>
                <option value="PAGADA">✅ Liquidadas / Pagadas</option>
              </select>
            </div>
          ) : subTab === 'complementos' ? (
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Filtro de Complementos</label>
              <select
                value={complementFilter}
                onChange={e => setComplementFilter(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
              >
                <option value="ALL">Todos los Registros</option>
                <option value="PENDING_EMISSION">⏳ Pendientes de Emitir CFDI-P</option>
                <option value="EMITTED">✅ Complementos Emitidos y Timbrados</option>
              </select>
            </div>
          ) : (
            <div className="flex items-end">
              {selectedClientId && (
                <button
                  onClick={() => setSelectedClientId('')}
                  className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <X size={13} /> Limpiar Filtro de Cliente
                </button>
              )}
            </div>
          )}
        </div>

        {/* Badge de filtro activo */}
        {selectedClientId && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-primary-50 border border-primary-200 rounded-xl text-xs text-primary-900">
            <span>
              Filtrando cartera y facturas de: <strong>{clientsList.find((c: any) => c.id === selectedClientId)?.nombre}</strong>
            </span>
            <button
              onClick={() => setSelectedClientId('')}
              className="text-primary-700 hover:text-primary-900 font-bold text-[11px] flex items-center gap-1"
            >
              <X size={12} /> Mostrar todos los clientes
            </button>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* VISTA 1: DISGREGADO POR CLIENTE (CARTERA CONSOLIDADA)               */}
      {/* =================================================================== */}
      {subTab === 'cartera' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border overflow-hidden shadow-2xs">
            <div className="px-5 py-3.5 bg-gray-50/80 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-amber-600" />
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                  Cartera Consolidada por Cliente ({filteredCartera.length} deudores)
                </h3>
              </div>
              <button
                onClick={() => { refetchCartera(); refetchDashboard(); }}
                className="p-1 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
                title="Actualizar Cartera"
              >
                <RefreshCw size={13} />
              </button>
            </div>

            {loadingCartera ? (
              <div className="p-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-amber-500" /> Calculando saldos de cartera por cliente...
              </div>
            ) : filteredCartera.length === 0 ? (
              <div className="p-12 text-center text-gray-400 space-y-2">
                <CheckCircle2 size={36} className="mx-auto text-emerald-400" />
                <p className="text-sm font-bold text-gray-700">Sin cartera vencida ni saldos pendientes</p>
                <p className="text-xs text-gray-400">Todos los clientes de crédito se encuentran al corriente.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                    <tr>
                      <th className="p-3.5">Cliente</th>
                      <th className="p-3.5">Condiciones Crédito</th>
                      <th className="p-3.5 text-center">Facturas</th>
                      <th className="p-3.5 text-right">Saldo Insoluto Total</th>
                      <th className="p-3.5 text-right">Saldo Vencido</th>
                      <th className="p-3.5 text-center">Estatus Cobranza</th>
                      <th className="p-3.5 text-center">Acciones César</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCartera.map((row: any) => {
                      const client = row.client;
                      const hasVencidas = row.vencidasCount > 0;
                      const isBlocked = client.creditConfig?.bloqueado;

                      return (
                        <tr key={client.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-3.5">
                            <div className="font-bold text-gray-900 text-sm">{client.nombre}</div>
                            <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                              {client.codigo} · RFC: {client.rfc || '—'} {client.telefono ? `· Tel: ${client.telefono}` : ''}
                            </div>
                          </td>

                          <td className="p-3.5">
                            {client.creditConfig?.creditoHabilitado ? (
                              <div className="space-y-0.5">
                                <span className="font-semibold text-gray-700">
                                  Plazo: {client.creditConfig.plazoDefault} días
                                </span>
                                <div className="text-[10px] text-gray-400">
                                  Límite: ${Number(client.creditConfig.montoMaximo || 0).toLocaleString('es-MX')} MXN
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">Contado Inmediato</span>
                            )}
                          </td>

                          <td className="p-3.5 text-center">
                            <span className="font-bold text-gray-800 text-xs px-2 py-0.5 bg-gray-100 rounded-lg">
                              {row.facturasCount} pendiente{row.facturasCount > 1 ? 's' : ''}
                            </span>
                          </td>

                          <td className="p-3.5 text-right font-mono font-bold text-sm text-gray-900">
                            ${Number(row.totalPendiente).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="p-3.5 text-right font-mono font-bold text-sm">
                            {hasVencidas ? (
                              <span className="text-red-600 font-bold">
                                ${Number(row.montoVencido).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-medium">$0.00</span>
                            )}
                          </td>

                          <td className="p-3.5 text-center">
                            {isBlocked ? (
                              <span className="px-2.5 py-1 bg-red-100 text-red-800 font-bold rounded-lg text-[10px] inline-flex items-center gap-1">
                                <Ban size={11} /> BLOQUEADO
                              </span>
                            ) : hasVencidas ? (
                              <span className="px-2.5 py-1 bg-red-50 text-red-700 font-bold rounded-lg text-[10px] border border-red-200 inline-flex items-center gap-1">
                                <AlertTriangle size={11} /> {row.vencidasCount} Vencida{row.vencidasCount > 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-[10px] border border-emerald-200 inline-flex items-center gap-1">
                                <CheckCircle2 size={11} /> Al Corriente
                              </span>
                            )}
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => viewClientInvoices(client.id)}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                                title="Ver facturas individuales de este cliente"
                              >
                                <Eye size={12} /> Facturas
                              </button>

                              <button
                                onClick={() => openPayForClient(row.facturas)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs"
                                title="Registrar pago / abono a este cliente"
                              >
                                <DollarSign size={12} /> Cobrar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VISTA 2: FACTURAS INDIVIDUALES PPD & ABONOS                         */}
      {/* =================================================================== */}
      {subTab === 'facturas' && (
        <div className="bg-white rounded-2xl border overflow-hidden shadow-2xs">
          <div className="px-5 py-3 bg-gray-50/80 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-blue-500" />
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Facturas PPD — Pendientes de Cobro ({pendingInvoices.length})
              </h4>
            </div>
            {selectedOrders.length > 0 && (
              <span className="text-xs text-emerald-600 font-bold">
                {selectedOrders.length} factura(s) seleccionada(s) para abono grupal
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={pendingInvoices.length > 0 && selectedOrders.length === pendingInvoices.length}
                      onChange={e => setSelectedOrders(e.target.checked ? pendingInvoices.map((i: any) => i.id) : [])}
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-600 uppercase">Pedido / Folio</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 uppercase">Cliente</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-right">Total</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-right">Saldo Insoluto</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-center">Plazo</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-left">Vencimiento</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-center">Estatus</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 uppercase text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingInvoices ? (
                  <tr><td colSpan={9} className="text-center py-12 text-gray-400">Cargando facturas PPD...</td></tr>
                ) : pendingInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400">
                      <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-300" />
                      <p className="text-sm font-semibold text-gray-700">Sin facturas pendientes con los filtros seleccionados</p>
                    </td>
                  </tr>
                ) : (
                  pendingInvoices.map((inv: any) => {
                    const isSelected = selectedOrders.includes(inv.id);
                    const isVencida = inv.fechaVencimiento && new Date(inv.fechaVencimiento) < new Date();

                    return (
                      <tr
                        key={inv.id}
                        className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-emerald-50/70' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={isSelected}
                            onChange={() => toggleSelect(inv.id)}
                          />
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-primary-600">{inv.codigo}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-800">{inv.client?.nombre || '—'}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{inv.client?.codigo}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-600">
                          ${Number(inv.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-red-600 text-sm">
                          ${Number(inv.saldoPendiente || inv.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500 font-medium">
                          {inv.plazoDias ? `${inv.plazoDias}d` : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <div>
                            {inv.fechaVencimiento ? new Date(inv.fechaVencimiento).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </div>
                          {isVencida && (
                            <span className="text-[10px] font-bold text-red-600">Vencida</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(inv)}`}>
                            {getStatusLabel(inv)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => { setSelectedOrders([inv.id]); setShowPayModal(true); }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors inline-flex items-center gap-1"
                          >
                            <DollarSign size={12} /> Cobrar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VISTA 3: COMPLEMENTOS DE PAGO (CFDI-P) & FACTURAS PAGADAS          */}
      {/* =================================================================== */}
      {subTab === 'complementos' && (
        <div className="space-y-4">
          {/* Subsección 1: Facturas Pagadas que requieren emisión de complemento */}
          {(complementFilter === 'ALL' || complementFilter === 'PENDING_EMISSION') && paidInvoices.length > 0 && (
            <div className="bg-white rounded-2xl border overflow-hidden shadow-2xs">
              <div className="px-5 py-3.5 bg-emerald-50/80 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck size={16} className="text-emerald-600" />
                  <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                    Facturas Pagadas — Emisión de Complemento (CFDI-P)
                  </h4>
                </div>
                <span className="text-xs font-semibold text-emerald-700">
                  {paidInvoices.filter((i: any) => !complementMap.has(i.id)).length} pendiente(s) de timbrar
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                    <tr>
                      <th className="p-3">Pedido</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3 text-right">Total Liquidado</th>
                      <th className="p-3 text-center">Estatus Complemento</th>
                      <th className="p-3">UUID Complemento</th>
                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paidInvoices.map((inv: any) => {
                      const comp = complementMap.get(inv.id);
                      const hasComplement = !!comp;

                      if (complementFilter === 'PENDING_EMISSION' && hasComplement) return null;

                      return (
                        <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3 font-mono font-bold text-primary-600">{inv.codigo}</td>
                          <td className="p-3 font-medium text-gray-800">{inv.client?.nombre || '—'}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-600">
                            ${Number(inv.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-center">
                            {hasComplement ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 size={11} /> Emitido
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                ⏳ Pendiente Timbrado
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {hasComplement ? (
                              <span className="font-mono text-[11px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                {comp.complementoUuid?.substring(0, 18)}...
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {hasComplement ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => downloadComplement(comp.complementoFacturapiId, 'pdf', inv.codigo)}
                                  title="Descargar PDF"
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                                >
                                  <Download size={14} />
                                </button>
                                <button
                                  onClick={() => downloadComplement(comp.complementoFacturapiId, 'xml', inv.codigo)}
                                  title="Descargar XML"
                                  className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                                >
                                  <FileText size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEmitComplement(inv.id)}
                                disabled={emittingComplement === inv.id}
                                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                              >
                                {emittingComplement === inv.id ? (
                                  <><Loader2 size={12} className="animate-spin" /> Emitiendo...</>
                                ) : (
                                  <><FileCheck size={12} /> Emitir CFDI-P</>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subsección 2: Historial General de Complementos Emitidos */}
          {(complementFilter === 'ALL' || complementFilter === 'EMITTED') && (
            <div className="bg-white rounded-2xl border overflow-hidden shadow-2xs">
              <div className="px-5 py-3.5 bg-violet-50/80 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck size={16} className="text-violet-600" />
                  <h4 className="text-xs font-bold text-violet-800 uppercase tracking-wide">
                    Historial de Complementos de Pago Timbrados (CFDI-P)
                  </h4>
                </div>
                <span className="text-xs font-semibold text-violet-600">
                  {(complements || []).length} emitido(s)
                </span>
              </div>

              {loadingComplements ? (
                <div className="p-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Cargando complementos...
                </div>
              ) : (complements || []).length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  No hay complementos emitidos con los filtros actuales.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                      <tr>
                        <th className="p-3">Pedido</th>
                        <th className="p-3">Cliente</th>
                        <th className="p-3">UUID Complemento</th>
                        <th className="p-3 text-right">Monto Aplicado</th>
                        <th className="p-3 text-center">Forma de Pago</th>
                        <th className="p-3 text-center">Estatus SAT</th>
                        <th className="p-3 text-left">Fecha Emisión</th>
                        <th className="p-3 text-center">Descargar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(complements || []).map((c: any) => (
                        <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3 font-mono font-bold text-primary-600">{c.orderCode}</td>
                          <td className="p-3 font-medium text-gray-800">{c.clientName}</td>
                          <td className="p-3">
                            <span className="font-mono text-[11px] text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-100">
                              {c.complementoUuid?.substring(0, 24)}...
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-600">
                            ${Number(c.montoAplicado || c.monto || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-center text-gray-600 font-medium">
                            {c.formaPago === '03' ? '03-Transferencia' : c.formaPago === '01' ? '01-Efectivo' : c.formaPago || '—'}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.complementoStatus === 'valid' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {c.complementoStatus === 'valid' ? <><CheckCircle2 size={10} /> Vigente</> : c.complementoStatus}
                            </span>
                          </td>
                          <td className="p-3 text-gray-500">
                            {c.complementoEmitidoAt ? new Date(c.complementoEmitidoAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => downloadComplement(c.complementoFacturapiId, 'pdf', c.orderCode)}
                                title="Descargar PDF"
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                              >
                                <Download size={14} />
                              </button>
                              <button
                                onClick={() => downloadComplement(c.complementoFacturapiId, 'xml', c.orderCode)}
                                title="Descargar XML"
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                              >
                                <FileText size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <PaymentModal
          orderIds={selectedOrders}
          onClose={() => {
            setShowPayModal(false);
            setSelectedOrders([]);
            refetchInvoices();
            refetchComplements();
            refetchCartera();
            refetchDashboard();
          }}
        />
      )}
    </div>
  );
}

// ====== MODAL DE PAGO ======
function PaymentModal({ orderIds, onClose }: { orderIds: string[]; onClose: () => void }) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const [fechaPago, setFechaPago] = useState(today);
  const [monto, setMonto] = useState('');
  const [formaPago, setFormaPago] = useState('03');
  const [referencia, setReferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!monto || Number(monto) <= 0) return toast.error('Ingresa un monto válido');
    if (!fechaPago) return toast.error('Selecciona la fecha del pago');
    setLoading(true);
    try {
      const res = await api.post('/invoicing/payments', {
        orderIds,
        monto: Number(monto),
        formaPago,
        fechaPago,
        referencia: referencia || undefined,
        registradoPor: 'César Cobranza',
        notas: notas || undefined,
      });
      toast.success(`💰 Pago registrado — ${res.data.payments?.length || 0} factura(s) actualizadas`);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al registrar pago');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <DollarSign size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Registrar Cobranza / Abono</h3>
              <p className="text-xs text-gray-500">{orderIds.length} factura(s) seleccionada(s)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2">
          <Clock size={15} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong>Regla FIFO de Cobranza:</strong> El abono se aplica automáticamente en orden cronológico (de la factura más antigua a la más reciente).
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700">Fecha del pago *</label>
              <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} max={today}
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700">Monto del pago *</label>
              <input type="number" step="0.01" value={monto} onChange={e => setMonto(e.target.value)}
                placeholder="$0.00" className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Forma de pago SAT *</label>
            <select value={formaPago} onChange={e => setFormaPago(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium">
              <option value="03">03 — Transferencia electrónica SPEI</option>
              <option value="01">01 — Efectivo</option>
              <option value="02">02 — Cheque nominativo</option>
              <option value="04">04 — Tarjeta de crédito</option>
              <option value="28">28 — Tarjeta de débito</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Referencia / Rastreo SPEI</label>
            <input value={referencia} onChange={e => setReferencia(e.target.value)}
              placeholder="Ej: Clave de rastreo o autorización" className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Notas internas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
              placeholder="Notas opcionales..." className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs resize-none" />
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <button onClick={onClose} className="flex-1 px-4 py-2 border rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shadow-xs">
            {loading ? <><Loader2 size={13} className="animate-spin" /> Procesando...</> : 'Confirmar Cobro'}
          </button>
        </div>
      </div>
    </div>
  );
}

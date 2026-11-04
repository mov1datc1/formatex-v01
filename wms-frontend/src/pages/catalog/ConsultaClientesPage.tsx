import { useState, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import { usePermission } from '../../hooks/usePermission';
import toast from 'react-hot-toast';
import {
  Users, Search, Phone, Mail, MapPin, UserCheck, Building2,
  Eye, FileText, AlertTriangle, CheckCircle2, ShieldAlert,
  Loader2, X, Sparkles, Filter, CreditCard, Edit3, Check,
} from 'lucide-react';

export default function ConsultaClientesPage() {
  const { user, isAdmin } = usePermission();
  const userRole = (user?.role?.nombre || user?.role || '').toUpperCase();
  const isVendedor = userRole === 'VENDEDOR' || userRole === 'VENTAS';

  const isAlmaOrManager = useMemo(() => {
    return (
      isAdmin ||
      ['ADMIN', 'DIRECTOR_OPERACIONES', 'JEFE_ATC', 'GERENTE_VENTAS', 'GERENCIA'].includes(userRole)
    );
  }, [isAdmin, userRole]);

  const canAssignVendor = useMemo(() => {
    return (
      isAdmin ||
      ['ADMIN', 'DIRECTOR_OPERACIONES', 'JEFE_ATC', 'GERENTE_VENTAS', 'GERENCIA', 'ATC'].includes(userRole)
    );
  }, [isAdmin, userRole]);

  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [debtFilter, setDebtFilter] = useState<'ALL' | 'WITH_DEBT' | 'OVERDUE'>('ALL');
  const [page, setPage] = useState(1);
  const limit = 250;

  // Modal de Estado de Cuenta / Adeudos de Facturas Anteriores (Solo Consulta)
  const [selectedClientForDebt, setSelectedClientForDebt] = useState<any>(null);
  const [loadingDebtModal, setLoadingDebtModal] = useState(false);
  const [clientPendingInvoices, setClientPendingInvoices] = useState<any[]>([]);
  const [clientCreditInfo, setClientCreditInfo] = useState<any>(null);

  // Modal / Edición rápida de Ejecutivo Asignado (para Alma / ATC / Gerente Ventas)
  const [editingVendorClientId, setEditingVendorClientId] = useState<string | null>(null);
  const [selectedNewVendorId, setSelectedNewVendorId] = useState<string>('');
  const [savingVendor, setSavingVendor] = useState(false);

  const { data: clientsResp, isLoading, refetch } = useApi<PaginatedResponse<any>>(
    ['clients-directory', page, limit],
    '/catalog/clients',
    { page, limit }
  );

  const { data: vendorsResp } = useApi<PaginatedResponse<any>>(
    ['vendors-directory'],
    '/catalog/vendors',
    { limit: 100 }
  );

  const vendorsList = vendorsResp?.data || [];
  const allClients = clientsResp?.data || [];

  // Si es VENDEDOR, resolver su vendorId para que solo vea los clientes de su propia cartera
  const myVendorId = useMemo(() => {
    if (!isVendedor || !vendorsList.length || !user) return undefined;
    const uEmail = (user.email || '').toLowerCase().trim();
    const uName = (user.nombre || '').replace(/\s*\(.*?\)\s*/g, '').toLowerCase().trim();
    const match = vendorsList.find((v: any) => {
      const vEmail = (v.email || '').toLowerCase().trim();
      const vName = (v.nombre || '').toLowerCase().trim();
      return (uEmail && vEmail && uEmail === vEmail) || (uName && vName && vName === uName);
    }) || vendorsList.find((v: any) => {
      const vName = (v.nombre || '').toLowerCase().trim();
      return Boolean(uName && vName && (vName.includes(uName) || uName.includes(vName)));
    });
    return match?.id;
  }, [isVendedor, vendorsList, user]);

  // Filtrado instantáneo en memoria mientras escribe el agente cuando entra una llamada
  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allClients.filter((c: any) => {
      if (isVendedor) {
        if (!myVendorId || c.vendor?.id !== myVendorId) return false;
      } else if (vendorFilter) {
        if (vendorFilter === 'UNASSIGNED') {
          if (c.vendor?.id) return false;
        } else if (c.vendor?.id !== vendorFilter) {
          return false;
        }
      }

      if (debtFilter === 'WITH_DEBT' && (!c.deudaSummary || c.deudaSummary.facturasPendientes === 0)) {
        return false;
      }
      if (debtFilter === 'OVERDUE' && (!c.deudaSummary || c.deudaSummary.facturasVencidas === 0)) {
        return false;
      }

      if (!q) return true;
      return (
        c.nombre?.toLowerCase().includes(q) ||
        c.codigo?.toLowerCase().includes(q) ||
        c.rfc?.toLowerCase().includes(q) ||
        c.telefono?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.direccion?.toLowerCase().includes(q) ||
        c.poblacion?.toLowerCase().includes(q) ||
        c.estado?.toLowerCase().includes(q) ||
        c.vendor?.nombre?.toLowerCase().includes(q) ||
        c.ultimoAtcNombre?.toLowerCase().includes(q)
      );
    });
  }, [allClients, search, vendorFilter, debtFilter, isVendedor, myVendorId]);

  const stats = useMemo(() => {
    const baseList = isVendedor ? allClients.filter((c: any) => myVendorId && c.vendor?.id === myVendorId) : allClients;
    const total = baseList.length;
    const conEjecutivo = baseList.filter((c: any) => Boolean(c.vendor?.nombre || c.ultimoAtcNombre)).length;
    const conDeuda = baseList.filter((c: any) => (c.deudaSummary?.facturasPendientes || 0) > 0).length;
    const conPreciosEsp = baseList.filter((c: any) => (c._count?.specialPrices || 0) > 0).length;
    return { total, conEjecutivo, conDeuda, conPreciosEsp };
  }, [allClients, isVendedor, myVendorId]);

  const openDebtConsultationModal = async (client: any) => {
    setSelectedClientForDebt(client);
    setLoadingDebtModal(true);
    setClientPendingInvoices([]);
    setClientCreditInfo(null);
    try {
      const [pendingRes, creditRes] = await Promise.all([
        api.get(`/invoicing/client/${client.id}/pending`).catch(() => ({ data: [] })),
        api.get(`/invoicing/credit/${client.id}/check`).catch(() => ({ data: null })),
      ]);
      setClientPendingInvoices(pendingRes.data || []);
      setClientCreditInfo(creditRes.data || null);
    } finally {
      setLoadingDebtModal(false);
    }
  };

  const handleSaveVendorAssignment = async (clientId: string) => {
    setSavingVendor(true);
    try {
      await api.put(`/catalog/clients/${clientId}`, {
        vendorId: selectedNewVendorId || null,
      });
      toast.success('Ejecutivo / Vendedor asignado al cliente correctamente');
      setEditingVendorClientId(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al asignar vendedor');
    } finally {
      setSavingVendor(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Header Principal */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-indigo-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0">
              <Users size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Directorio de Consulta Rápida de Clientes & Cartera
                </h1>
                <span className="text-[10px] font-mono uppercase bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-400/30 font-bold">
                  Atención Telefónica & Ventas
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 mt-1">
                Identifica al instante <strong>quién atiende a cada cliente en Formatex</strong> (Agente de Ventas y Ejecutivo ATC), su teléfono, correo, dirección y consulta de adeudos en facturas anteriores.
              </p>
            </div>
          </div>

          {/* KPIs rápidos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="bg-white/10 border border-white/10 rounded-xl px-3.5 py-2 text-center">
              <p className="text-[10px] text-indigo-200 uppercase font-semibold">Clientes Activos</p>
              <p className="text-lg font-black text-white">{clientsResp?.total || stats.total}</p>
            </div>
            <div className="bg-emerald-500/15 border border-emerald-400/30 rounded-xl px-3.5 py-2 text-center">
              <p className="text-[10px] text-emerald-200 uppercase font-semibold">Con Atención Asignada</p>
              <p className="text-lg font-black text-emerald-300">{stats.conEjecutivo}</p>
            </div>
            <div className="bg-violet-500/15 border border-violet-400/30 rounded-xl px-3.5 py-2 text-center">
              <p className="text-[10px] text-violet-200 uppercase font-semibold">Con Precio Especial</p>
              <p className="text-lg font-black text-violet-300">{stats.conPreciosEsp}</p>
            </div>
            <div className="bg-amber-500/15 border border-amber-400/30 rounded-xl px-3.5 py-2 text-center">
              <p className="text-[10px] text-amber-200 uppercase font-semibold">Con Facturas Pend.</p>
              <p className="text-lg font-black text-amber-300">{stats.conDeuda}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda Instantánea (Para cuando entra una llamada telefónica) */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="📞 Escribe el nombre del cliente, teléfono, código, RFC o ejecutivo que lo atiende..."
              autoFocus
              className="w-full pl-11 pr-10 py-3 bg-indigo-50/40 border-2 border-indigo-200 focus:border-indigo-600 focus:bg-white rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filtro por Vendedor / Agente de Ventas */}
          <div className="flex flex-wrap items-center gap-2">
            {!isVendedor && (
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <UserCheck size={15} className="text-indigo-600 shrink-0" />
                <select
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-gray-800 focus:outline-none cursor-pointer"
                >
                  <option value="">Todos los Agentes de Ventas</option>
                  {vendorsList.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.nombre} ({v.codigo})
                    </option>
                  ))}
                  <option value="UNASSIGNED">Sin Agente Asignado</option>
                </select>
              </div>
            )}

            {/* Filtro de Adeudos */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs">
              {[
                { key: 'ALL', label: 'Todos' },
                { key: 'WITH_DEBT', label: 'Con Saldo Pendiente' },
                { key: 'OVERDUE', label: 'Con Factura Vencida' },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setDebtFilter(f.key as any)}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    debtFilter === f.key
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
          <span>
            Mostrando <strong className="text-gray-900">{filteredClients.length}</strong> clientes encontrados
            {search ? ` para "${search}"` : ''}
          </span>
          {(search || vendorFilter || debtFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setVendorFilter('');
                setDebtFilter('ALL');
              }}
              className="text-indigo-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <X size={13} /> Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla Principal de Clientes y Responsable de Atención */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-gray-400 flex flex-col items-center gap-2">
            <Loader2 size={28} className="animate-spin text-indigo-600" />
            <p className="text-xs font-medium">Cargando directorio maestro de clientes...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <Users size={36} className="mx-auto text-gray-300" />
            <p className="text-sm font-semibold text-gray-700">No se encontraron clientes con ese criterio</p>
            <p className="text-xs text-gray-400">Intenta buscar por otra parte del nombre, código o número telefónico.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 text-slate-600 uppercase font-bold tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Cliente / Empresa</th>
                  <th className="py-3.5 px-4 bg-indigo-50/60 text-indigo-950 border-x border-indigo-100">
                    ¿Quién lo Atiende en Formatex? (Ventas / ATC)
                  </th>
                  <th className="py-3.5 px-4">Teléfono & Contacto</th>
                  <th className="py-3.5 px-4">Correo Electrónico</th>
                  <th className="py-3.5 px-4">Dirección / Plaza</th>
                  <th className="py-3.5 px-4 text-center">Estatus Pagos / Facturas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClients.map((c: any) => {
                  const defaultAddr = c.addresses?.[0];
                  const displayAddress =
                    c.direccion ||
                    (defaultAddr ? `${defaultAddr.calleNumero}, ${defaultAddr.municipio || ''}` : '') ||
                    [c.colonia, c.poblacion, c.estado].filter(Boolean).join(', ') ||
                    '—';
                  const displayPhone = c.telefono || defaultAddr?.contactoTelefono || '—';
                  const debt = c.deudaSummary || { facturasPendientes: 0, saldoPendienteTotal: 0, facturasVencidas: 0 };

                  return (
                    <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors">
                      {/* 1. Cliente */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                            <Building2 size={15} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm leading-snug">{c.nombre}</p>
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                                {c.codigo}
                              </span>
                              {c.rfc && (
                                <span className="font-mono text-[10px] text-gray-500">
                                  RFC: {c.rfc}
                                </span>
                              )}
                              {c.listaPrecioDefault && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                  Lista {c.listaPrecioDefault}
                                </span>
                              )}
                              {(c._count?.specialPrices || 0) > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 flex items-center gap-0.5">
                                  <Sparkles size={10} /> {c._count.specialPrices} Precios Esp.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. QUIÉN LO ATIENDE (Columna Protagonista) */}
                      <td className="py-3 px-4 align-top bg-indigo-50/25 border-x border-indigo-100/60">
                        {editingVendorClientId === c.id ? (
                          <div className="space-y-2 bg-white p-2.5 rounded-xl border border-indigo-300 shadow-xs">
                            <label className="block text-[10px] font-bold text-indigo-900 uppercase">
                              Asignar Agente de Ventas:
                            </label>
                            <select
                              value={selectedNewVendorId}
                              onChange={(e) => setSelectedNewVendorId(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                            >
                              <option value="">-- Sin Agente Externo (Directo ATC) --</option>
                              {vendorsList.map((v: any) => (
                                <option key={v.id} value={v.id}>
                                  {v.nombre} ({v.codigo})
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingVendorClientId(null)}
                                className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded-md font-semibold"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                disabled={savingVendor}
                                onClick={() => handleSaveVendorAssignment(c.id)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[11px] font-bold flex items-center gap-1"
                              >
                                {savingVendor ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                                Guardar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              {c.vendor ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-2xs">
                                  <UserCheck size={13} />
                                  <span>{c.vendor.nombre}</span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs border border-amber-200">
                                  Atención Directa Piso / ATC
                                </span>
                              )}

                              {canAssignVendor && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingVendorClientId(c.id);
                                    setSelectedNewVendorId(c.vendor?.id || '');
                                  }}
                                  className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                  title="Asignar o cambiar Agente responsable"
                                >
                                  <Edit3 size={13} />
                                </button>
                              )}
                            </div>

                            {c.ultimoAtcNombre && (
                              <p className="text-[11px] text-slate-600 flex items-center gap-1">
                                <span className="font-semibold text-indigo-800">Ejecutivo ATC:</span>{' '}
                                <strong className="text-gray-900">{c.ultimoAtcNombre}</strong>
                                {c.ultimoPedidoCodigo && (
                                  <span className="font-mono text-[10px] text-gray-400">
                                    ({c.ultimoPedidoCodigo})
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 3. Teléfono */}
                      <td className="py-3 px-4 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-gray-900 text-xs">
                            <Phone size={13} className="text-emerald-600 shrink-0" />
                            <span>{displayPhone}</span>
                          </div>
                          {(c.contacto || defaultAddr?.contactoNombre) && (
                            <p className="text-[11px] text-gray-500">
                              Contacto: <strong>{c.contacto || defaultAddr?.contactoNombre}</strong>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 4. Correo */}
                      <td className="py-3 px-4 align-top">
                        {c.email ? (
                          <a
                            href={`mailto:${c.email}`}
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-medium break-all"
                          >
                            <Mail size={13} className="shrink-0" />
                            <span>{c.email}</span>
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">Sin correo registrado</span>
                        )}
                      </td>

                      {/* 5. Dirección */}
                      <td className="py-3 px-4 align-top max-w-xs">
                        <div className="flex items-start gap-1.5 text-gray-700">
                          <MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" />
                          <span className="leading-snug">{displayAddress}</span>
                        </div>
                        {c.cartaFletera && (
                          <p className="text-[10px] text-indigo-600 font-semibold mt-1 ml-4">
                            Fletera: {c.cartaFletera}
                          </p>
                        )}
                      </td>

                      {/* 6. Estatus de Pagos / Consulta de Deudas */}
                      <td className="py-3 px-4 align-top text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          {debt.facturasVencidas > 0 ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                              <AlertTriangle size={11} /> {debt.facturasVencidas} Vencida(s) · ${debt.saldoPendienteTotal.toLocaleString('es-MX')}
                            </span>
                          ) : debt.facturasPendientes > 0 ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <CreditCard size={11} /> {debt.facturasPendientes} Pend. · ${debt.saldoPendienteTotal.toLocaleString('es-MX')}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 size={11} /> Al Corriente
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => openDebtConsultationModal(c)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-gray-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Eye size={12} /> Consultar Facturas / Deuda
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

      {/* Modal de Consulta de Estado de Cuenta y Deudas de Facturas Anteriores (Solo Lectura) */}
      {selectedClientForDebt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelectedClientForDebt(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-fade-in space-y-4 max-h-[88vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Consulta de Facturas y Saldo del Cliente (Solo Lectura)
                  </h3>
                  <p className="text-xs text-gray-500">
                    <strong className="text-gray-800">{selectedClientForDebt.nombre}</strong> ({selectedClientForDebt.codigo}) · Atendido por:{' '}
                    <span className="font-semibold text-indigo-700">
                      {selectedClientForDebt.vendor?.nombre || selectedClientForDebt.ultimoAtcNombre || 'Atención Directa ATC'}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClientForDebt(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Resumen de Crédito */}
            {clientCreditInfo && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-gray-50 border border-gray-200/70 rounded-xl p-3">
                  <span className="text-gray-500 block">Estatus de Crédito</span>
                  <strong className={`text-sm ${clientCreditInfo.creditConfig?.bloqueado ? 'text-red-600' : 'text-emerald-700'}`}>
                    {clientCreditInfo.creditConfig?.bloqueado
                      ? 'Bloqueado en Cobranza'
                      : clientCreditInfo.creditConfig?.creditoHabilitado
                        ? `Crédito Habilitado (${clientCreditInfo.creditConfig?.plazoDefault || 30} días)`
                        : 'Contado'}
                  </strong>
                </div>
                <div className="bg-gray-50 border border-gray-200/70 rounded-xl p-3">
                  <span className="text-gray-500 block">Límite Autorizado</span>
                  <strong className="text-sm font-mono text-gray-900">
                    {clientCreditInfo.creditConfig?.montoMaximo
                      ? `$${Number(clientCreditInfo.creditConfig.montoMaximo).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                      : 'Sin tope / Contado'}
                  </strong>
                </div>
                <div className="bg-gray-50 border border-gray-200/70 rounded-xl p-3">
                  <span className="text-gray-500 block">Saldo Pendiente Total</span>
                  <strong className="text-sm font-mono text-red-600">
                    ${clientPendingInvoices.reduce((acc, inv) => acc + Number(inv.saldoPendiente ?? inv.total ?? 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>
            )}

            {/* Tabla de Facturas Anteriores Pendientes */}
            <div className="overflow-y-auto flex-1 border border-gray-100 rounded-xl min-h-[180px]">
              {loadingDebtModal ? (
                <div className="p-10 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin text-indigo-600" /> Consultando historial de facturas del cliente...
                </div>
              ) : clientPendingInvoices.length === 0 ? (
                <div className="p-10 text-center text-xs text-gray-400">
                  <CheckCircle2 size={34} className="mx-auto mb-2 text-emerald-400" />
                  <p className="font-bold text-gray-700 text-sm">Cliente al corriente — Sin adeudos pendientes</p>
                  <p className="text-gray-400 text-[11px] mt-0.5">
                    No registra facturas PPD con saldo insoluto ni vencidas en el sistema.
                  </p>
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b sticky top-0">
                    <tr>
                      <th className="p-3">Pedido / Folio</th>
                      <th className="p-3">Fecha Emisión</th>
                      <th className="p-3">Vencimiento</th>
                      <th className="p-3 text-right">Total Factura</th>
                      <th className="p-3 text-right">Saldo Pendiente</th>
                      <th className="p-3 text-center">Estatus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {clientPendingInvoices.map((inv: any) => {
                      const isVencida = inv.fechaVencimiento && new Date(inv.fechaVencimiento) < new Date();
                      return (
                        <tr key={inv.id} className="hover:bg-gray-50">
                          <td className="p-3 font-mono font-bold text-gray-900">
                            {inv.codigo}
                            {inv.facturaFolio && (
                              <span className="ml-1.5 text-[10px] text-gray-500">
                                ({inv.facturaSerie || 'WMS'}-{inv.facturaFolio})
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-gray-600">
                            {inv.facturadaAt ? new Date(inv.facturadaAt).toLocaleDateString('es-MX') : '—'}
                          </td>
                          <td className="p-3 text-gray-600">
                            {inv.fechaVencimiento ? new Date(inv.fechaVencimiento).toLocaleDateString('es-MX') : '—'}
                          </td>
                          <td className="p-3 text-right font-mono text-gray-700">
                            ${Number(inv.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-red-600">
                            ${Number(inv.saldoPendiente ?? inv.total ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-center">
                            {isVencida ? (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded text-[10px]">
                                Vencida
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-semibold rounded text-[10px]">
                                En Plazo
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className="text-[11px] text-gray-400">
                Vista informativa de consulta para Ventas y ATC (la liberación y aplicación de pagos se realiza en Cobranza con César).
              </span>
              <button
                type="button"
                onClick={() => setSelectedClientForDebt(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Cerrar Consulta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

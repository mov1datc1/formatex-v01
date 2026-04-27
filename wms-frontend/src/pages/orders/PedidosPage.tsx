import { useState } from 'react';
import { useApi, useMutationApi } from '../../hooks/useApi';
import type { PaginatedResponse, Order } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import { WmsIcon, PipelineIcon, StatusBadge } from '../../components/icons/WmsIcons';
import { X, Plus, Phone, AlertCircle, ShieldCheck, FileText, Download, Mail, Printer, Loader2 } from 'lucide-react';
import type { FC } from 'react';
import type { LucideProps } from 'lucide-react';
import OrderLineSmart from '../../components/orders/OrderLineSmart';
import { usePermission } from '../../hooks/usePermission';

// 9 estados reales del flujo Formatex
const STATUS_MAP: Record<string, { label: string; color: string; icon: FC<LucideProps>; iconBg: string; iconColor: string; area: string }> = {
  COTIZADO:       { label: 'Cotizado',        color: 'bg-slate-100 text-slate-700',    icon: WmsIcon.Quote,      iconBg: 'bg-slate-100', iconColor: 'text-slate-600', area: 'ATC' },
  POR_PAGAR:      { label: 'Por Pagar',       color: 'bg-amber-100 text-amber-700',    icon: WmsIcon.Payment,    iconBg: 'bg-amber-100', iconColor: 'text-amber-600', area: 'ATC' },
  PAGO_RECIBIDO:  { label: 'Pago Recibido',   color: 'bg-yellow-100 text-yellow-700',  icon: WmsIcon.PayReceived,iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600', area: 'Cobranza' },
  POR_SURTIR:     { label: 'Por Surtir',      color: 'bg-blue-100 text-blue-700',      icon: WmsIcon.ToFulfill,  iconBg: 'bg-blue-100', iconColor: 'text-blue-600', area: 'Almacén' },
  EN_SURTIDO:     { label: 'En Surtido',      color: 'bg-indigo-100 text-indigo-700',  icon: WmsIcon.InFulfill,  iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', area: 'Picker' },
  EN_CORTE:       { label: 'En Corte',        color: 'bg-purple-100 text-purple-700',  icon: WmsIcon.InCut,      iconBg: 'bg-purple-100', iconColor: 'text-purple-600', area: 'Cortador' },
  EMPACADO:       { label: 'Empacado',        color: 'bg-teal-100 text-teal-700',      icon: WmsIcon.Packed,     iconBg: 'bg-teal-100', iconColor: 'text-teal-600', area: 'Empaque' },
  FACTURADO:      { label: 'Facturado',       color: 'bg-emerald-100 text-emerald-700',icon: WmsIcon.Invoiced,   iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', area: 'Facturación' },
  DESPACHADO:     { label: 'Despachado',      color: 'bg-gray-200 text-gray-600',      icon: WmsIcon.Dispatched, iconBg: 'bg-gray-200', iconColor: 'text-gray-600', area: 'Despacho' },
  CANCELADO:      { label: 'Cancelado',       color: 'bg-red-100 text-red-700',        icon: WmsIcon.Cancelled,  iconBg: 'bg-red-100', iconColor: 'text-red-700', area: '—' },
};

const NEXT_STATUS: Record<string, { next: string; label: string; icon: FC<LucideProps>; confirmMsg?: string; requiredModule: string }> = {
  COTIZADO:       { next: 'POR_PAGAR',      label: 'Marcar Por Pagar',    icon: WmsIcon.Payment, requiredModule: 'orders' },
  POR_PAGAR:      { next: 'PAGO_RECIBIDO',  label: 'Registrar Pago',      icon: WmsIcon.PayReceived, requiredModule: 'orders' },
  PAGO_RECIBIDO:  { next: 'POR_SURTIR',     label: 'Aprobar (Cobranza)',   icon: WmsIcon.Verified, confirmMsg: '¿Confirmas que el pago fue verificado contra el banco?', requiredModule: 'cobranza' },
  POR_SURTIR:     { next: 'EN_SURTIDO',     label: 'Tomar Pedido (Picker)',icon: WmsIcon.InFulfill, requiredModule: 'picking' },
  EN_SURTIDO:     { next: 'EN_CORTE',       label: 'Enviar a Corte',       icon: WmsIcon.InCut, requiredModule: 'picking' },
  EN_CORTE:       { next: 'EMPACADO',       label: 'Marcar Empacado',      icon: WmsIcon.Packed, requiredModule: 'cutting' },
  // EMPACADO → FACTURADO is now handled by the Facturapi invoice flow, not a simple status change
  FACTURADO:      { next: 'DESPACHADO',     label: 'Despachar',            icon: WmsIcon.Dispatched, requiredModule: 'shipping' },
};

const PRIORITY_MAP: Record<number, { label: string; color: string }> = {
  1: { label: 'URGENTE', color: 'text-red-500' },
  2: { label: 'ALTA', color: 'text-amber-500' },
  3: { label: 'NORMAL', color: 'text-blue-500' },
  4: { label: 'BAJA', color: 'text-emerald-500' },
};

export default function PedidosPage() {
  const [showForm, setShowForm] = useState(false);
  const [filterEstado, setFilterEstado] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ orderId: string; currentStatus: string; msg: string } | null>(null);
  const [invoiceModal, setInvoiceModal] = useState<string | null>(null); // orderId to invoice
  const [invoicing, setInvoicing] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ formaPago: '03', metodoPago: 'PUE', usoCfdi: 'G03', condicionesPago: '' });
  const { canCreate, canUpdate, isAdmin } = usePermission();

  const { data: resp, isLoading } = useApi<PaginatedResponse<Order>>(['orders', search, filterEstado], '/orders', { search: search || undefined, estado: filterEstado || undefined, limit: 20 });
  const { data: detail, refetch: refetchDetail } = useApi<any>(['order-detail', selectedOrder], `/orders/${selectedOrder}`, {}, !!selectedOrder);
  const { data: clients } = useApi<PaginatedResponse<any>>(['clients'], '/catalog/clients', { limit: 100 });
  const { data: skus } = useApi<PaginatedResponse<any>>(['skus-order'], '/catalog/skus', { limit: 100 });
  const { data: vendors } = useApi<PaginatedResponse<any>>(['vendors'], '/catalog/vendors', { limit: 100 });

  const createMut = useMutationApi('/orders');

  const [clientId, setClientId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [prioridad, setPrioridad] = useState(3);
  const [reservaHoras, setReservaHoras] = useState(168);
  const [modoEntrega, setModoEntrega] = useState('COMPLETA');
  const [lineas, setLineas] = useState<any[]>([{ skuId: '', metrajeRequerido: 50, precioUnitario: 0, selectedHUs: [] }]);

  const addLinea = () => setLineas([...lineas, { skuId: '', metrajeRequerido: 50, precioUnitario: 0, selectedHUs: [] }]);

  const handleCreate = async () => {
    if (!clientId) return toast.error('Selecciona un cliente');
    if (lineas.some(l => !l.skuId || !l.metrajeRequerido)) return toast.error('Completa todas las líneas');
    try {
      await createMut.mutateAsync({
        clientId,
        vendorId: vendorId || undefined,
        prioridad,
        reservaHoras,
        modoEntrega,
        lineas: lineas.map(l => ({
          skuId: l.skuId,
          metrajeRequerido: l.metrajeRequerido,
          precioUnitario: l.precioUnitario,
          selectedHUs: l.selectedHUs?.length ? l.selectedHUs : undefined,
        })),
      });
      toast.success(`Cotización creada — HUs reservados ${reservaHoras}h · Entrega: ${modoEntrega}`);
      setShowForm(false);
      setLineas([{ skuId: '', metrajeRequerido: 50, precioUnitario: 0, selectedHUs: [] }]);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error');
    }
  };

  const advanceStatus = async (orderId: string, currentStatus: string) => {
    const transition = NEXT_STATUS[currentStatus];
    if (!transition) return;

    // If this transition needs confirmation, show custom modal instead of native confirm()
    if (transition.confirmMsg) {
      setConfirmModal({ orderId, currentStatus, msg: transition.confirmMsg });
      return;
    }

    await executeAdvance(orderId, currentStatus);
  };

  const executeAdvance = async (orderId: string, currentStatus: string) => {
    const transition = NEXT_STATUS[currentStatus];
    if (!transition) return;
    try {
      await api.put(`/orders/${orderId}/status`, { estado: transition.next });
      toast.success(`Pedido avanzado a: ${STATUS_MAP[transition.next]?.label}`);
      refetchDetail();
      setConfirmModal(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al cambiar estado');
    }
  };

  const subtotal = lineas.reduce((a, l) => a + l.metrajeRequerido * l.precioUnitario, 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <WmsIcon.Quote className="w-5 h-5 text-white" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pedidos — Flujo Formatex</h1>
            <p className="text-gray-500 text-sm">Cotización → Cobranza → Almacén → Facturación → Despacho</p>
          </div>
        </div>
        {canCreate('orders') && (
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
            {showForm ? <><X size={16} /> Cerrar</> : <><Plus size={16} /> Nueva Cotización</>}
          </button>
        )}
      </div>

      {/* Pipeline visual */}
      <div className="grid grid-cols-5 lg:grid-cols-9 gap-1.5">
        {Object.entries(STATUS_MAP).filter(([k]) => k !== 'CANCELADO').map(([key, s]) => {
          const Icon = s.icon;
          const count = resp?.data?.filter((o: any) => o.estado === key).length || 0;
          return (
            <button key={key} onClick={() => setFilterEstado(filterEstado === key ? '' : key)} className={`text-center p-2.5 rounded-xl text-xs transition-all ${filterEstado === key ? 'ring-2 ring-primary-400 shadow-md scale-[1.02]' : 'hover:shadow-sm'} ${s.color}`}>
              <PipelineIcon icon={Icon} bgClass={s.iconBg} iconClass={s.iconColor} size={16} />
              <div className="font-bold text-base mt-1.5">{count}</div>
              <div className="truncate font-medium">{s.label}</div>
            </button>
          );
        })}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <WmsIcon.Quote size={20} className="text-primary-500" />
            <h2 className="text-lg font-semibold">Nueva Cotización / Pedido</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cliente *</label>
              <select value={clientId} onChange={e => setClientId(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500">
                <option value="">Seleccionar...</option>
                {clients?.data?.map((c: any) => <option key={c.id} value={c.id}>{c.nombre} ({c.codigo})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Vendedor (callejero)</label>
              <select value={vendorId} onChange={e => setVendorId(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500">
                <option value="">Sin vendedor</option>
                {vendors?.data?.map((v: any) => <option key={v.id} value={v.id}>{v.nombre} ({v.codigo})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Prioridad</label>
              <select value={prioridad} onChange={e => setPrioridad(+e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500">
                <option value={1}>Urgente</option>
                <option value={2}>Alta</option>
                <option value={3}>Normal</option>
                <option value={4}>Baja</option>
              </select>
            </div>

            {/* Reserva + Modo Entrega */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">⏱️ Reserva Blanda (horas)</label>
                <select value={reservaHoras} onChange={e => setReservaHoras(+e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500">
                  <option value={24}>24 horas (1 día)</option>
                  <option value={48}>48 horas (2 días)</option>
                  <option value={72}>72 horas (3 días)</option>
                  <option value={168}>168 horas (7 días)</option>
                  <option value={336}>336 horas (14 días)</option>
                </select>
                <p className="text-[10px] text-gray-400 mt-0.5">HUs reservados se liberan automáticamente si no se paga</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">📦 Modo de Entrega</label>
                <select value={modoEntrega} onChange={e => setModoEntrega(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500">
                  <option value="COMPLETA">Completa — Esperar todo junto</option>
                  <option value="PARCIAL">Parcial — Entregas por separado</option>
                </select>
                <p className="text-[10px] text-gray-400 mt-0.5">{modoEntrega === 'PARCIAL' ? 'Se factura cada entrega por separado' : 'Una sola factura cuando todo esté listo'}</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <WmsIcon.Rolls size={16} className="text-indigo-500" />
                Líneas del Pedido
              </h3>
              <span className="text-[10px] text-indigo-500 font-medium bg-indigo-50 px-2 py-1 rounded-full flex items-center gap-1">
                ✨ Sugerencias inteligentes de inventario
              </span>
            </div>
            <div className="space-y-3">
              {lineas.map((l, idx) => (
                <OrderLineSmart
                  key={idx}
                  index={idx}
                  line={l}
                  skus={skus?.data || []}
                  onChange={(i, field, value) => {
                    const n = [...lineas];
                    (n[i] as any)[field] = value;
                    setLineas(n);
                  }}
                  onRemove={(i) => setLineas(lineas.filter((_, j) => j !== i))}
                  canRemove={lineas.length > 1}
                />
              ))}
            </div>
            <button onClick={addLinea} className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 mt-3 flex items-center gap-1 transition-colors"><Plus size={12} /> Agregar Línea</button>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-right">
            <p className="text-sm text-gray-500">Subtotal: <span className="font-mono font-semibold">${subtotal.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></p>
            <p className="text-sm text-gray-500">IVA 16%: <span className="font-mono font-semibold">${iva.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></p>
            <p className="text-lg font-bold text-gray-900">Total: <span className="text-emerald-600">${total.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancelar</button>
            <button onClick={handleCreate} disabled={createMut.isPending} className="px-6 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              {createMut.isPending ? <><WmsIcon.Timer size={16} className="animate-spin" /> Creando...</> : <><WmsIcon.Quote size={16} /> Crear Cotización</>}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <WmsIcon.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pedido, folio, cliente..." className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm" />
        </div>
        {filterEstado && (
          <button onClick={() => setFilterEstado('')} className="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-medium hover:bg-red-100 flex items-center gap-1">
            <X size={14} /> Limpiar filtro
          </button>
        )}
      </div>

      {/* Orders List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {isLoading ? <div className="p-8 text-center text-gray-400">Cargando...</div> : !resp?.data?.length ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
              <WmsIcon.Quote size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-500">No hay pedidos {filterEstado && `en estado "${STATUS_MAP[filterEstado]?.label}"`}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {resp.data.map((o: any) => {
                const status = STATUS_MAP[o.estado];
                const StatusIcon = status?.icon || WmsIcon.Quote;
                const prio = PRIORITY_MAP[o.prioridad];
                return (
                  <div key={o.id} onClick={() => setSelectedOrder(o.id)} className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${selectedOrder === o.id ? 'border-primary-400 ring-1 ring-primary-200' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-primary-600">{o.codigo}</span>
                        {o.folioContpaqi && <span className="text-xs text-gray-400 font-mono">({o.folioContpaqi})</span>}
                        <StatusBadge icon={StatusIcon} label={status?.label || o.estado} bgClass={status?.color?.split(' ')[0] || 'bg-gray-100'} textClass={status?.color?.split(' ')[1] || 'text-gray-600'} />
                        {prio && o.prioridad <= 2 && (
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${prio.color}`}>
                            <AlertCircle size={12} /> {prio.label}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-emerald-600">${Number(o.total || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
                        <p className="text-xs text-gray-400">{new Date(o.fechaPedido).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-sm text-gray-700">{o.client?.nombre}</span>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {o.vendor && <span className="flex items-center gap-1"><Phone size={10} /> {o.vendor.nombre}</span>}
                        <span>{o._count?.lineas || o.lineas?.length} líneas</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="bg-white rounded-xl border p-5">
          {!selectedOrder ? (
            <div className="text-center text-gray-400 py-12">
              <WmsIcon.Quote size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Selecciona un pedido</p>
              <p className="text-xs mt-1">para ver detalles y avanzar estado</p>
            </div>
          ) : !detail ? (
            <div className="text-center text-gray-400 py-12">Cargando...</div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{detail.codigo}</h3>
                  {detail.folioContpaqi && <p className="text-xs text-gray-400 font-mono">CONTPAQi: {detail.folioContpaqi}</p>}
                  <p className="text-sm text-gray-600">{detail.client?.nombre}</p>
                  {detail.client?.rfc && <p className="text-xs text-gray-400">RFC: {detail.client.rfc}</p>}
                </div>
                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>

              {/* Status badge */}
              {(() => {
                const s = STATUS_MAP[detail.estado];
                const Icon = s?.icon || WmsIcon.Quote;
                return (
                  <div className={`px-3 py-2.5 rounded-xl text-center ${s?.color || 'bg-gray-100'}`}>
                    <div className="flex items-center justify-center gap-2">
                      <Icon size={16} strokeWidth={2} />
                      <p className="text-sm font-semibold">{s?.label}</p>
                    </div>
                    <p className="text-xs opacity-70 mt-0.5">Área: {s?.area}</p>
                  </div>
                );
              })()}

              {/* Advance button — EMPACADO uses Facturapi instead */}
              {(isAdmin || canUpdate('facturacion')) && detail.estado === 'EMPACADO' && !detail.facturapiId && (
                <button
                  onClick={() => setInvoiceModal(detail.id)}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-800 text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <FileText size={16} /> 🧾 Facturar (CFDI 4.0)
                </button>
              )}
              {NEXT_STATUS[detail.estado] && (() => {
                const t = NEXT_STATUS[detail.estado];
                const Icon = t.icon;
                const hasPermission = isAdmin || canUpdate(t.requiredModule);
                if (!hasPermission) return null;
                return (
                  <button onClick={() => advanceStatus(detail.id, detail.estado)} className="w-full px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm">
                    <Icon size={16} /> {t.label}
                  </button>
                );
              })()}

              {/* Financial summary */}
              <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                <div className="flex justify-between"><span>Subtotal:</span><span className="font-mono">${Number(detail.subtotal || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></div>
                <div className="flex justify-between"><span>IVA:</span><span className="font-mono">${Number(detail.iva || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></div>
                <div className="flex justify-between font-bold text-sm"><span>Total:</span><span className="text-emerald-600">${Number(detail.total || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></div>
                {detail.referenciaPago && <div className="flex justify-between text-blue-600"><span>Ref. Pago:</span><span>{detail.referenciaPago}</span></div>}
                {detail.facturaRef && <div className="flex justify-between text-emerald-600"><span>Factura:</span><span>{detail.facturaRef}</span></div>}
              </div>

              {/* === FACTURA CFDI Section === */}
              {detail.facturapiId && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={16} className="text-emerald-600" />
                    <h4 className="text-sm font-bold text-emerald-800">Factura CFDI</h4>
                    <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold ${detail.facturaStatus === 'valid' ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}`}>
                      {detail.facturaStatus === 'valid' ? '✅ Vigente' : '❌ Cancelada'}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    {detail.uuidFiscal && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">UUID:</span>
                        <span className="font-mono text-emerald-700 text-[11px]">{detail.uuidFiscal}</span>
                      </div>
                    )}
                    {detail.facturaSerie && detail.facturaFolio && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Serie-Folio:</span>
                        <span className="font-semibold">{detail.facturaSerie}-{detail.facturaFolio}</span>
                      </div>
                    )}
                    {detail.facturadaAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Timbrada:</span>
                        <span>{new Date(detail.facturadaAt).toLocaleString('es-MX')}</span>
                      </div>
                    )}
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={async () => {
                        try {
                          const res = await api.get(`/invoicing/${detail.id}/pdf`, { responseType: 'blob' });
                          const url = window.URL.createObjectURL(new Blob([res.data]));
                          const a = document.createElement('a'); a.href = url; a.download = `factura-${detail.codigo}.pdf`; a.click();
                          window.URL.revokeObjectURL(url);
                        } catch { toast.error('Error al descargar PDF'); }
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
                    >
                      <Download size={13} /> PDF
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const res = await api.get(`/invoicing/${detail.id}/xml`, { responseType: 'blob' });
                          const url = window.URL.createObjectURL(new Blob([res.data]));
                          const a = document.createElement('a'); a.href = url; a.download = `factura-${detail.codigo}.xml`; a.click();
                          window.URL.revokeObjectURL(url);
                        } catch { toast.error('Error al descargar XML'); }
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                    >
                      <Download size={13} /> XML
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const res = await api.get(`/invoicing/${detail.id}/pdf`, { responseType: 'blob' });
                          const url = window.URL.createObjectURL(new Blob([res.data]));
                          const printWin = window.open(url);
                          printWin?.addEventListener('load', () => printWin.print());
                        } catch { toast.error('Error al imprimir'); }
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                    >
                      <Printer size={13} />
                    </button>
                    <button
                      onClick={async () => {
                        const email = detail.client?.email || prompt('Email del cliente:');
                        if (!email) return;
                        try {
                          await api.post(`/invoicing/${detail.id}/email`, { email });
                          toast.success(`📧 Factura enviada a ${email}`);
                        } catch { toast.error('Error al enviar email'); }
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 transition-colors"
                    >
                      <Mail size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* Order Lines */}
              <div className="border-t pt-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Líneas del Pedido</h4>
                {detail.lineas?.map((line: any) => (
                  <div key={line.id} className="p-3 bg-gray-50 rounded-xl mb-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{line.metrajeRequerido}m solicitados</span>
                      <span className={line.metrajeSurtido >= line.metrajeRequerido ? 'text-emerald-600 font-semibold' : 'text-amber-600'}>
                        {line.metrajeSurtido}m surtidos
                      </span>
                    </div>
                    {line.precioUnitario && <p className="text-xs text-gray-400">${Number(line.precioUnitario).toFixed(2)}/m — Importe: ${Number(line.importe || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>}
                    <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-primary-500 rounded-full transition-all" style={{ width: `${Math.min(100, (line.metrajeSurtido / line.metrajeRequerido) * 100)}%` }}></div>
                    </div>
                    {line.assignments?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {line.assignments.map((a: any) => (
                          <div key={a.id} className="flex items-center justify-between text-xs text-gray-500">
                            <span className="font-mono text-primary-600">{a.hu?.codigo}</span>
                            <span className="flex items-center gap-1">{a.metrajeTomado}m {a.cortado ? <WmsIcon.Cut size={10} /> : <WmsIcon.HU size={10} />}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Reservations */}
              {detail.reservations?.length > 0 && (
                <div className="border-t pt-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <WmsIcon.Locked size={13} className="text-amber-500" />
                    <h4 className="text-xs font-semibold text-gray-500 uppercase">Reservas Activas</h4>
                  </div>
                  {detail.reservations.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg text-xs mb-1">
                      <span className="font-mono text-primary-600">{r.hu?.codigo || 'Tránsito'}</span>
                      <span>{r.metrajeReservado}m — <span className={r.tipo === 'BLANDA' ? 'text-amber-600' : 'text-emerald-600'}>{r.tipo}</span></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* === Custom Confirmation Modal === */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConfirmModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <ShieldCheck size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Confirmar Acción</h3>
                <p className="text-xs text-gray-400">{NEXT_STATUS[confirmModal.currentStatus]?.label}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6 bg-gray-50 rounded-xl p-4">
              {confirmModal.msg}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => executeAdvance(confirmModal.orderId, confirmModal.currentStatus)}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 text-sm font-medium transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <ShieldCheck size={16} /> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === FACTURAR CFDI MODAL === */}
      {invoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => !invoicing && setInvoiceModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <FileText size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Facturar — CFDI 4.0</h3>
                <p className="text-xs text-gray-400">Timbrado automático con Facturapi</p>
              </div>
            </div>

            {/* Método de Pago */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Método de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setInvoiceForm({ ...invoiceForm, metodoPago: 'PUE', formaPago: '03' })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      invoiceForm.metodoPago === 'PUE'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-semibold">PUE — Pagado</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Pago en una sola exhibición</p>
                  </button>
                  <button
                    onClick={() => setInvoiceForm({ ...invoiceForm, metodoPago: 'PPD', formaPago: '99' })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      invoiceForm.metodoPago === 'PPD'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-semibold">PPD — Crédito</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Pago en parcialidades o diferido</p>
                  </button>
                </div>
              </div>

              {/* Forma de Pago — solo si PUE */}
              {invoiceForm.metodoPago === 'PUE' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Forma de Pago</label>
                  <select
                    value={invoiceForm.formaPago}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, formaPago: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  >
                    <option value="01">01 — Efectivo</option>
                    <option value="02">02 — Cheque nominativo</option>
                    <option value="03">03 — Transferencia electrónica</option>
                    <option value="04">04 — Tarjeta de crédito</option>
                    <option value="28">28 — Tarjeta de débito</option>
                  </select>
                </div>
              )}

              {/* Condiciones de pago — solo si PPD */}
              {invoiceForm.metodoPago === 'PPD' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Condiciones de Pago</label>
                  <input
                    type="text"
                    value={invoiceForm.condicionesPago}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, condicionesPago: e.target.value })}
                    placeholder="Ej: Crédito 30 días"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              )}

              {/* Uso CFDI */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Uso del CFDI</label>
                <select
                  value={invoiceForm.usoCfdi}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, usoCfdi: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                >
                  <option value="G01">G01 — Adquisición de mercancías</option>
                  <option value="G03">G03 — Gastos en general</option>
                  <option value="P01">P01 — Por definir</option>
                  <option value="S01">S01 — Sin efectos fiscales</option>
                </select>
              </div>
            </div>

            {/* Info */}
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
              <p>💡 Se generará un CFDI de Ingreso con timbrado automático ante el SAT. El XML y PDF estarán disponibles para descarga inmediatamente.</p>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setInvoiceModal(null)}
                disabled={invoicing}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setInvoicing(true);
                  try {
                    const { data } = await api.post(`/invoicing/${invoiceModal}/create`, invoiceForm);
                    toast.success(`✅ Factura timbrada — UUID: ${data.uuid?.substring(0, 8)}...`);
                    setInvoiceModal(null);
                    refetchDetail();
                  } catch (e: any) {
                    toast.error(e?.response?.data?.message || 'Error al facturar');
                  }
                  setInvoicing(false);
                }}
                disabled={invoicing}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-800 text-sm font-medium transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {invoicing ? (
                  <><Loader2 size={16} className="animate-spin" /> Timbrando...</>
                ) : (
                  <><FileText size={16} /> Facturar y Timbrar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

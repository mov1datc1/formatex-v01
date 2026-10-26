import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse, Order } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import {
  BadgeDollarSign, CheckCircle2, Clock, Search, Eye, X,
  CreditCard, AlertTriangle, ArrowRight, User, Upload, FileCheck,
  ShieldAlert, Send, Mail, Copy, Check, Info,
} from 'lucide-react';

type CobranzaTab = 'pendientes' | 'validados' | 'retenidos';

export default function CobranzaPage() {
  const [tab, setTab] = useState<CobranzaTab>('pendientes');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showValidateModal, setShowValidateModal] = useState<any>(null);
  const [validating, setValidating] = useState(false);

  // Form state for validation modal
  const [cobradorNombre, setCobradorNombre] = useState('');
  const [cobranzaNotas, setCobranzaNotas] = useState('');
  const [evidenciaFile, setEvidenciaFile] = useState<File | null>(null);

  // Form state for release credit hold modal (Regla César)
  const [showReleaseModal, setShowReleaseModal] = useState<any>(null);
  const [notasLiberacion, setNotasLiberacion] = useState('');
  const [releasing, setReleasing] = useState(false);

  // State for Preventive Alerts Modal (5-day warning)
  const [showPreventiveModal, setShowPreventiveModal] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const user = useSelector((state: RootState) => state.auth.user);

  // Retenidos count query for badge
  const { data: retenidosCountResp, refetch: refetchRetenidosCount } = useApi<any>(
    ['orders-retenidos-count'],
    '/orders',
    { retenidoCredito: 'true', limit: 1 },
  );
  const retenidosCount = retenidosCountResp?.total || 0;

  // Preventive alerts query (invoices expiring in 5 days)
  const { data: preventiveAlerts, refetch: refetchPreventive } = useApi<any[]>(
    ['preventive-alerts'],
    '/invoicing/preventive-alerts',
  );
  const preventiveCount = (preventiveAlerts || []).length;

  // Pendientes = PAGO_RECIBIDO | Validados = POR_SURTIR
  const estado = tab === 'pendientes' ? 'PAGO_RECIBIDO' : 'POR_SURTIR';
  const queryParams = tab === 'retenidos'
    ? { search: search || undefined, retenidoCredito: 'true', limit: 50 }
    : { search: search || undefined, estado, limit: 50 };

  const { data: resp, isLoading, refetch } = useApi<PaginatedResponse<Order>>(
    ['cobranza', tab, search],
    '/orders',
    queryParams,
  );

  const orders = resp?.data || [];

  const openValidateModal = (order: any) => {
    setShowValidateModal(order);
    setCobradorNombre(user?.nombre || '');
    setCobranzaNotas('');
    setEvidenciaFile(null);
  };

  const handleValidate = async () => {
    if (!showValidateModal) return;
    if (!cobradorNombre.trim()) {
      toast.error('Ingresa el nombre del cobrador');
      return;
    }

    setValidating(true);
    try {
      const evidenciaRef = evidenciaFile ? evidenciaFile.name : undefined;

      await api.put(`/orders/${showValidateModal.id}/status`, {
        estado: 'POR_SURTIR',
        cobradorNombre: cobradorNombre.trim(),
        cobranzaNotas: cobranzaNotas.trim() || undefined,
        cobranzaEvidencia: evidenciaRef,
      });

      toast.success('✅ Pago validado — Pedido enviado a Picking');
      setShowValidateModal(null);
      setSelectedOrder(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al validar pago');
    }
    setValidating(false);
  };

  // Regla César: Liberación por negociación o abono
  const handleReleaseCredit = async () => {
    if (!showReleaseModal) return;
    if (!notasLiberacion.trim()) {
      toast.error('Ingresa las notas de negociación o motivo de liberación');
      return;
    }

    setReleasing(true);
    try {
      await api.post(`/orders/${showReleaseModal.id}/release-credit`, {
        notasLiberacion: notasLiberacion.trim(),
      });

      toast.success(`✅ Pedido ${showReleaseModal.codigo} liberado — Enviado a POR_SURTIR`);
      setShowReleaseModal(null);
      setNotasLiberacion('');
      refetch();
      refetchRetenidosCount();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al liberar pedido');
    }
    setReleasing(false);
  };

  // Enviar correo de alerta preventiva 5 días
  const handleSendPreventive = async (orderId: string) => {
    setSendingEmailId(orderId);
    try {
      await api.post(`/invoicing/send-preventive-email/${orderId}`);
      toast.success('📧 Alerta preventiva enviada al cliente');
      refetchPreventive();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al enviar recordatorio');
    }
    setSendingEmailId(null);
  };

  const copyEmailText = (alertItem: any) => {
    const text = `Recordatorio Preventivo: Tu Factura ${alertItem.folioContpaqi || alertItem.codigo} está próxima a vencer - Formatex\n\nEstimado(a) ${alertItem.cliente?.nombre},\n\nTe recordamos que tu factura con saldo de $${alertItem.saldoPendiente?.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN vence el próximo ${new Date(alertItem.fechaVencimiento).toLocaleDateString('es-MX')}.\n\nDATOS DE PAGO:\n• Beneficiario: FORMA TEXTIL S. DE R.L. DE C.V.\n• Banco: BBVA | Cuenta: 0112345678 | CLABE: 012320001123456789\n• Ref: ${alertItem.codigo}`;
    navigator.clipboard.writeText(text);
    setCopiedId(alertItem.id);
    toast.success('Texto copiado al portapapeles');
    setTimeout(() => setCopiedId(null), 3000);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <BadgeDollarSign className="w-5 h-5 text-white" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cobranza y Crédito</h1>
            <p className="text-gray-500 text-sm">Validación de pagos · Retenciones por crédito · Cobranza preventiva</p>
          </div>
        </div>

        {/* Action Button: Preventive Alerts */}
        <button
          onClick={() => setShowPreventiveModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/20 transition-all self-start md:self-auto"
        >
          <Mail size={16} />
          <span>Cobranza Preventiva (5 Días)</span>
          {preventiveCount > 0 && (
            <span className="px-2 py-0.5 bg-white text-blue-700 text-xs font-bold rounded-full">
              {preventiveCount}
            </span>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-amber-500" />
            <p className="text-xs text-gray-400 font-medium">Por Validar (Pago Recibido)</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">
            {tab === 'pendientes' ? (resp?.total || 0) : '—'}
          </p>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <p className="text-xs text-gray-400 font-medium">Validados (Por Surtir)</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            {tab === 'validados' ? (resp?.total || 0) : '—'}
          </p>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert size={14} className="text-red-500" />
            <p className="text-xs text-gray-400 font-medium">Retenidos por Crédito (César)</p>
          </div>
          <p className="text-2xl font-bold text-red-600">
            {retenidosCount}
          </p>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={14} className="text-blue-500" />
            <p className="text-xs text-gray-400 font-medium">Alertas 5 Días (PPD)</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {preventiveCount}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setTab('pendientes'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            tab === 'pendientes'
              ? 'bg-amber-600 text-white shadow-sm font-semibold'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Clock size={14} /> Pendientes de Validar
        </button>

        <button
          onClick={() => { setTab('validados'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            tab === 'validados'
              ? 'bg-emerald-600 text-white shadow-sm font-semibold'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <CheckCircle2 size={14} /> Validados
        </button>

        <button
          onClick={() => { setTab('retenidos'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            tab === 'retenidos'
              ? 'bg-red-600 text-white shadow-sm font-semibold'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <ShieldAlert size={14} /> Retenidos por Crédito (César)
          {retenidosCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              tab === 'retenidos' ? 'bg-white text-red-700' : 'bg-red-100 text-red-700'
            }`}>
              {retenidosCount}
            </span>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tab === 'retenidos' ? "Buscar cliente, motivo o pedido retenido..." : "Buscar pedido, cliente, referencia..."}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm"
        />
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Cargando pedidos...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            {tab === 'retenidos' ? (
              <>
                <ShieldAlert size={40} className="mx-auto mb-3 text-emerald-400" />
                <p className="font-medium text-gray-700">¡Excelente! No hay pedidos retenidos por crédito</p>
                <p className="text-xs mt-1 text-gray-400">
                  Todos los clientes están al corriente o no tienen facturas PPD vencidas
                </p>
              </>
            ) : (
              <>
                <BadgeDollarSign size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-500">
                  {tab === 'pendientes' ? 'No hay pedidos pendientes de validar' : 'No hay pedidos validados aún'}
                </p>
                <p className="text-xs mt-1 text-gray-400">
                  {tab === 'pendientes' ? 'Los pedidos llegarán aquí cuando el cliente confirme su pago' : ''}
                </p>
              </>
            )}
          </div>
        ) : tab === 'retenidos' ? (
          /* =========================================================================
             TABLA DE RETENIDOS POR CRÉDITO (CÉSAR)
             ========================================================================= */
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-red-50/70 border-b border-red-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-red-900 uppercase">Pedido</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-red-900 uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-red-900 uppercase">Vendedor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-red-900 uppercase">Motivo Retención (César)</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-red-900 uppercase">Total Pedido</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-red-900 uppercase">Fecha</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-red-900 uppercase">Acción</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-red-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded">
                      {order.codigo}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{order.client?.nombre || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {order.vendor?.nombre || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg block font-medium max-w-md">
                      ⚠️ {order.motivoRetencionCredito || 'Facturas vencidas / límite rebasado'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                    ${Number(order.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {order.fechaRetencionCredito || order.createdAt ? new Date(order.fechaRetencionCredito || order.createdAt).toLocaleDateString('es-MX') : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        title="Ver detalle del pedido"
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setShowReleaseModal(order);
                          setNotasLiberacion('');
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <span>🔓 Liberar (Negociación)</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /* =========================================================================
             TABLA DE PENDIENTES / VALIDADOS
             ========================================================================= */
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Pedido</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Ref. Pago</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                {tab === 'validados' && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Cobrador</th>}
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-primary-600">{order.codigo}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      <span className="text-sm">{order.client?.nombre || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                    ${Number(order.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    {order.referenciaPago ? (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{order.referenciaPago}</span>
                    ) : (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <AlertTriangle size={10} /> Sin referencia
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-MX', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    }) : '—'}
                  </td>
                  {tab === 'validados' && (
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {order.cobradorNombre || '—'}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        title="Ver detalle"
                        className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                      {tab === 'pendientes' && (
                        <button
                          onClick={() => openValidateModal(order)}
                          title="Validar pago"
                          className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg text-xs font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-sm"
                        >
                          ✓ Validar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* =========================================================================
          MODAL: LIBERAR PEDIDO RETENIDO POR CRÉDITO (CÉSAR / NEGOCIACIÓN)
          ========================================================================= */}
      {showReleaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowReleaseModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <ShieldAlert size={22} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Liberación Discrecional de Pedido</h3>
                    <p className="text-white/80 text-xs">César / Crédito y Cobranza · {showReleaseModal.codigo}</p>
                  </div>
                </div>
                <button onClick={() => setShowReleaseModal(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-white">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3.5 space-y-2 border">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Cliente:</span>
                  <span className="font-semibold text-gray-900">{showReleaseModal.client?.nombre}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Importe del Pedido:</span>
                  <span className="font-bold text-emerald-600">${Number(showReleaseModal.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                </div>
                <div className="text-xs text-red-700 bg-red-50 p-2 rounded-lg border border-red-200">
                  <strong>Motivo de retención:</strong> {showReleaseModal.motivoRetencionCredito}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Notas de Negociación / Acuerdo de Cobranza *
                </label>
                <textarea
                  value={notasLiberacion}
                  onChange={(e) => setNotasLiberacion(e.target.value)}
                  placeholder="Ej: Cliente realizó abono de $50,000 en ventanilla y se compromete a liquidar el remanente el próximo viernes..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
                  autoFocus
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Al confirmar, el pedido cambia automáticamente a <span className="font-mono text-emerald-700 font-semibold">POR_SURTIR</span> para que Almacén inicie el picking de inmediato.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowReleaseModal(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReleaseCredit}
                  disabled={releasing || !notasLiberacion.trim()}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/25 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {releasing ? 'Liberando...' : '🔓 Confirmar y Mandar a Surtido'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: COBRANZA PREVENTIVA AUTOMATIZADA (5 DÍAS ANTES DE VENCER)
          ========================================================================= */}
      {showPreventiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowPreventiveModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Mail size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Cobranza Preventiva (Alerta a 5 Días)</h3>
                  <p className="text-white/80 text-xs">Recordatorio personalizado antes del vencimiento de facturas PPD</p>
                </div>
              </div>
              <button onClick={() => setShowPreventiveModal(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
                <Info size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-900 leading-relaxed">
                  Conforme a la regla de César y Andrea, a los clientes con facturas a crédito por vencer en los próximos 5 días naturales se les envía un correo preventivo cordial con sus datos bancarios y referencia, con copia a su asesor comercial, para evitar caer en cartera vencida.
                </p>
              </div>

              {(!preventiveAlerts || preventiveAlerts.length === 0) ? (
                <div className="p-8 text-center text-gray-400">
                  <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500" />
                  <p className="font-medium text-gray-700">No hay facturas próximas a vencer en los siguientes 5 días</p>
                  <p className="text-xs text-gray-400 mt-1">Todas las facturas a crédito están al corriente o con plazos holgados</p>
                </div>
              ) : (
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase">
                        <th className="text-left px-3 py-2.5">Factura</th>
                        <th className="text-left px-3 py-2.5">Cliente</th>
                        <th className="text-left px-3 py-2.5">Vencimiento</th>
                        <th className="text-right px-3 py-2.5">Saldo Insoluto</th>
                        <th className="text-center px-3 py-2.5">Alerta</th>
                        <th className="text-center px-3 py-2.5">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preventiveAlerts.map((item: any) => (
                        <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2.5 font-mono text-xs font-semibold text-blue-600">
                            {item.folioContpaqi || item.facturaRef || item.codigo}
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="text-xs font-medium text-gray-900">{item.cliente?.nombre}</p>
                            <p className="text-[10px] text-gray-400">Vendedor: {item.vendedor?.nombre || '—'}</p>
                          </td>
                          <td className="px-3 py-2.5 text-xs">
                            <p className="font-medium text-gray-800">
                              {item.fechaVencimiento ? new Date(item.fechaVencimiento).toLocaleDateString('es-MX') : '—'}
                            </p>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              item.esVencida ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {item.esVencida ? 'Vencida' : `${item.diasParaVencer} días`}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-gray-900">
                            ${Number(item.saldoPendiente || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {item.alerta5DiasEnviada ? (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                ✓ Enviada
                              </span>
                            ) : (
                              <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                                Pendiente
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => copyEmailText(item)}
                                title="Copiar texto del correo oficial"
                                className="p-1.5 rounded-lg border hover:bg-gray-100 text-gray-600"
                              >
                                {copiedId === item.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                              </button>
                              <button
                                onClick={() => handleSendPreventive(item.id)}
                                disabled={sendingEmailId === item.id}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1 disabled:opacity-50"
                              >
                                <Send size={12} />
                                <span>{sendingEmailId === item.id ? 'Enviando...' : 'Enviar'}</span>
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

            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <button
                onClick={() => setShowPreventiveModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-xl text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal (View only) */}
      {selectedOrder && !showValidateModal && !showReleaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
                  <BadgeDollarSign size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Pedido {selectedOrder.codigo}</h3>
                  <p className="text-xs text-gray-400">Detalle para validación de cobranza</p>
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between"><span className="text-gray-500">Cliente:</span><span className="font-medium">{selectedOrder.client?.nombre || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">RFC:</span><span className="font-mono text-xs">{selectedOrder.client?.rfc || '—'}</span></div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total:</span>
                  <span className="font-bold text-emerald-600 text-lg">${Number(selectedOrder.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {selectedOrder.retenidoCredito && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center gap-2 text-red-800 font-bold text-xs uppercase">
                    <ShieldAlert size={14} /> Retenido por Crédito (Regla César)
                  </div>
                  <p className="text-xs text-red-700">{selectedOrder.motivoRetencionCredito}</p>
                </div>
              )}

              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 mb-1"><CreditCard size={14} className="text-blue-600" /><span className="text-xs font-semibold text-blue-700 uppercase">Info de Pago</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Referencia:</span><span className="font-mono font-medium text-blue-700">{selectedOrder.referenciaPago || 'Sin referencia'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Método:</span><span>{selectedOrder.metodoPagoCfdi || selectedOrder.metodoPago || 'No especificado'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Vendedor:</span><span>{selectedOrder.vendor?.nombre || '—'}</span></div>
              </div>

              {selectedOrder.cobradorNombre && (
                <div className="bg-emerald-50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-1"><FileCheck size={14} className="text-emerald-600" /><span className="text-xs font-semibold text-emerald-700 uppercase">Validación de Cobranza</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Cobrador:</span><span className="font-medium">{selectedOrder.cobradorNombre}</span></div>
                  {selectedOrder.cobranzaNotas && <div className="flex justify-between"><span className="text-gray-500">Notas:</span><span>{selectedOrder.cobranzaNotas}</span></div>}
                  {selectedOrder.fechaAprobCobranza && <div className="flex justify-between"><span className="text-gray-500">Validado:</span><span className="text-xs">{new Date(selectedOrder.fechaAprobCobranza).toLocaleString('es-MX')}</span></div>}
                </div>
              )}

              {selectedOrder.liberadoCreditoPor && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center gap-2 text-teal-800 font-bold text-xs uppercase">
                    ✓ Liberado por César / Cobranza
                  </div>
                  <p className="text-xs text-teal-900">Por: {selectedOrder.liberadoCreditoPor} · {selectedOrder.fechaLiberacionCredito ? new Date(selectedOrder.fechaLiberacionCredito).toLocaleString('es-MX') : ''}</p>
                  <p className="text-xs text-teal-700 italic">"{selectedOrder.notasLiberacionCredito}"</p>
                </div>
              )}

              {selectedOrder.observaciones && (
                <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700"><strong>Observaciones:</strong> {selectedOrder.observaciones}</div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setSelectedOrder(null)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm font-medium">
                Cerrar
              </button>
              {tab === 'pendientes' && (
                <button
                  onClick={() => { setSelectedOrder(null); openValidateModal(selectedOrder); }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  ✅ Validar Pago
                </button>
              )}
              {selectedOrder.retenidoCredito && (
                <button
                  onClick={() => {
                    const ord = selectedOrder;
                    setSelectedOrder(null);
                    setShowReleaseModal(ord);
                  }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  🔓 Liberar Pedido
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === VALIDATION MODAL (with cobrador, evidence, notes) === */}
      {showValidateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowValidateModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-fade-in overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-700 p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <BadgeDollarSign size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Validar Pago</h3>
                  <p className="text-white/80 text-xs">Pedido {showValidateModal.codigo}</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Order summary */}
              <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">{showValidateModal.client?.nombre}</p>
                  <p className="text-xs text-gray-400">Ref: {showValidateModal.referenciaPago || 'Sin referencia'}</p>
                </div>
                <p className="text-lg font-bold text-emerald-600">
                  ${Number(showValidateModal.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Cobrador name */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Cobrador / Responsable de Validación *
                </label>
                <input
                  type="text"
                  value={cobradorNombre}
                  onChange={(e) => setCobradorNombre(e.target.value)}
                  placeholder="Nombre de quien valida"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                />
              </div>

              {/* Evidence upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Evidencia de Pago (comprobante)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setEvidenciaFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="evidencia-upload"
                  />
                  <label
                    htmlFor="evidencia-upload"
                    className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                      evidenciaFile
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-gray-200 bg-gray-50 hover:border-amber-300 hover:bg-amber-50'
                    }`}
                  >
                    {evidenciaFile ? (
                      <>
                        <FileCheck size={18} className="text-emerald-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-emerald-700 truncate">{evidenciaFile.name}</p>
                          <p className="text-[10px] text-emerald-500">{(evidenciaFile.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button
                          onClick={(e) => { e.preventDefault(); setEvidenciaFile(null); }}
                          className="p-1 rounded-lg hover:bg-emerald-100"
                        >
                          <X size={14} className="text-emerald-600" />
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload size={18} className="text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Subir comprobante</p>
                          <p className="text-[10px] text-gray-400">Imagen o PDF</p>
                        </div>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Notas de Cobranza
                </label>
                <textarea
                  value={cobranzaNotas}
                  onChange={(e) => setCobranzaNotas(e.target.value)}
                  placeholder="Observaciones adicionales (opcional)"
                  rows={2}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowValidateModal(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleValidate}
                  disabled={validating || !cobradorNombre.trim()}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-emerald-800 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {validating ? (
                    <>⏳ Validando...</>
                  ) : (
                    <><CheckCircle2 size={16} /> Confirmar Validación</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

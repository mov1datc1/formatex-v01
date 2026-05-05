import { useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { api } from '../../../config/api';
import toast from 'react-hot-toast';
import {
  CreditCard, AlertTriangle, Clock, CheckCircle2,
  DollarSign, Search, X, FileCheck, Loader2,
} from 'lucide-react';

export default function CobranzaPPDTab() {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [emittingComplement, setEmittingComplement] = useState<string | null>(null);

  // Dashboard KPIs
  const { data: dashboard } = useApi<any>(['ppd-dashboard'], '/invoicing/ppd-dashboard');

  // ALL PPD invoices (not just pending)
  const { data: resp, isLoading, refetch } = useApi<any>(
    ['invoice-history', 'ppd-all', clientSearch],
    '/invoicing/history',
    { metodoPago: 'PPD', search: clientSearch || undefined, limit: 50 },
  );

  // Show: pending + partial + pagadas without complement
  const invoices = (resp?.data || []).filter((i: any) => i.metodoPagoCfdi === 'PPD' && i.estadoPago !== 'NA');

  // Separate pending (for payment selection) from pagadas (for complement)
  const pendingInvoices = invoices.filter((i: any) => i.estadoPago !== 'PAGADA');
  const paidNoComplement = invoices.filter((i: any) => i.estadoPago === 'PAGADA');

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
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al emitir complemento de pago');
    } finally {
      setEmittingComplement(null);
    }
  };

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Pendientes', val: dashboard?.pendientes?.count || 0, monto: dashboard?.pendientes?.monto || 0, color: 'blue', icon: Clock },
          { label: 'Parciales', val: dashboard?.parciales?.count || 0, monto: dashboard?.parciales?.monto || 0, color: 'amber', icon: CreditCard },
          { label: 'Por vencer (7d)', val: dashboard?.porVencerSemana?.count || 0, monto: dashboard?.porVencerSemana?.monto || 0, color: 'orange', icon: AlertTriangle },
          { label: 'Vencidas', val: dashboard?.vencidas?.count || 0, monto: dashboard?.vencidas?.monto || 0, color: 'red', icon: AlertTriangle },
          { label: 'Cobrado este mes', val: dashboard?.cobradoMes?.count || 0, monto: dashboard?.cobradoMes?.monto || 0, color: 'emerald', icon: CheckCircle2 },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={`text-${kpi.color}-500`} />
                <p className="text-xs text-gray-400 font-medium">{kpi.label}</p>
              </div>
              <p className="text-xl font-bold text-gray-900">{kpi.val}</p>
              <p className={`text-sm font-semibold text-${kpi.color}-600 mt-0.5`}>
                ${Number(kpi.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={clientSearch} onChange={e => setClientSearch(e.target.value)}
            placeholder="Buscar cliente, pedido..." className="w-full pl-9 pr-4 py-2.5 bg-white border rounded-xl text-sm" />
        </div>
        {selectedOrders.length > 0 && (
          <button onClick={() => setShowPayModal(true)}
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2">
            <DollarSign size={16} />
            Registrar Pago ({selectedOrders.length} {selectedOrders.length === 1 ? 'factura' : 'facturas'})
          </button>
        )}
      </div>

      {/* ===== FACTURAS PENDIENTES DE PAGO ===== */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 border-b">
          <h4 className="text-xs font-semibold text-gray-600 uppercase">Facturas PPD — Pendientes de Pago</h4>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 w-10"><input type="checkbox" className="rounded"
                onChange={e => setSelectedOrders(e.target.checked ? pendingInvoices.map((i: any) => i.id) : [])} /></th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Pedido</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Cliente</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Total</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Saldo</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Plazo</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Vence</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Estado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            ) : pendingInvoices.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-300" />
                <p className="text-sm text-gray-500">Sin facturas PPD pendientes de pago</p>
              </td></tr>
            ) : pendingInvoices.map((inv: any) => (
              <tr key={inv.id} className={`border-b last:border-0 hover:bg-gray-50 transition-colors ${selectedOrders.includes(inv.id) ? 'bg-emerald-50' : ''}`}>
                <td className="px-4 py-3"><input type="checkbox" className="rounded"
                  checked={selectedOrders.includes(inv.id)} onChange={() => toggleSelect(inv.id)} /></td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-primary-600">{inv.codigo}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{inv.client?.nombre || '—'}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-600">
                  ${Number(inv.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-red-600">
                  ${Number(inv.saldoPendiente || inv.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-center text-xs text-gray-500">{inv.plazoDias ? `${inv.plazoDias}d` : '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {inv.fechaVencimiento ? new Date(inv.fechaVencimiento).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(inv)}`}>{getStatusLabel(inv)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== FACTURAS PAGADAS — EMITIR COMPLEMENTO ===== */}
      {paidNoComplement.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-4 py-2.5 bg-emerald-50 border-b">
            <h4 className="text-xs font-semibold text-emerald-700 uppercase flex items-center gap-2">
              <FileCheck size={14} /> Facturas Pagadas — Emitir Complemento de Pago (CFDI-P)
            </h4>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Pedido</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Cliente</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Total</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Estado</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Complemento</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Acción</th>
              </tr>
            </thead>
            <tbody>
              {paidNoComplement.map((inv: any) => {
                const hasComplement = inv.complementoEmitido || inv.invoicePayments?.some((p: any) => p.complementoUuid);
                return (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary-600">{inv.codigo}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{inv.client?.nombre || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-600">
                      ${Number(inv.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">✅ Pagada</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasComplement ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">📄 Emitido</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">⏳ Pendiente</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasComplement ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <button
                          onClick={() => handleEmitComplement(inv.id)}
                          disabled={emittingComplement === inv.id}
                          className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 mx-auto"
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
      )}

      {/* Payment Modal */}
      {showPayModal && <PaymentModal orderIds={selectedOrders} onClose={() => { setShowPayModal(false); setSelectedOrders([]); refetch(); }} />}
    </>
  );
}

// ====== MODAL DE PAGO ======
function PaymentModal({ orderIds, onClose }: { orderIds: string[]; onClose: () => void }) {
  const [monto, setMonto] = useState('');
  const [formaPago, setFormaPago] = useState('03');
  const [referencia, setReferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!monto || Number(monto) <= 0) return toast.error('Ingresa un monto válido');
    setLoading(true);
    try {
      const res = await api.post('/invoicing/payments', {
        orderIds,
        monto: Number(monto),
        formaPago,
        referencia: referencia || undefined,
        registradoPor: 'current-user', // TODO: get from auth
        notas: notas || undefined,
      });
      toast.success(`💰 Pago registrado — ${res.data.payments?.length || 0} factura(s) actualizadas`);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al registrar pago');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">💰 Registrar Pago</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <p className="text-xs text-gray-500">{orderIds.length} factura(s) seleccionada(s). El pago se distribuye FIFO (más antigua primero).</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Monto del pago *</label>
            <input type="number" step="0.01" value={monto} onChange={e => setMonto(e.target.value)}
              placeholder="$0.00" className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Forma de pago *</label>
            <select value={formaPago} onChange={e => setFormaPago(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm">
              <option value="01">01 — Efectivo</option>
              <option value="02">02 — Cheque</option>
              <option value="03">03 — Transferencia electrónica</option>
              <option value="04">04 — Tarjeta de crédito</option>
              <option value="28">28 — Tarjeta de débito</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Referencia bancaria</label>
            <input value={referencia} onChange={e => setReferencia(e.target.value)}
              placeholder="Ej: 38687" className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
              placeholder="Notas opcionales..." className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm resize-none" />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {loading ? 'Procesando...' : 'Registrar Pago'}
          </button>
        </div>
      </div>
    </div>
  );
}

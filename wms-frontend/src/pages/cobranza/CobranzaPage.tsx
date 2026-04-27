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
} from 'lucide-react';

type CobranzaTab = 'pendientes' | 'validados';

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

  const user = useSelector((state: RootState) => state.auth.user);

  // Pendientes = PAGO_RECIBIDO | Validados = POR_SURTIR
  const estado = tab === 'pendientes' ? 'PAGO_RECIBIDO' : 'POR_SURTIR';

  const { data: resp, isLoading, refetch } = useApi<PaginatedResponse<Order>>(
    ['cobranza', tab, search],
    '/orders',
    { search: search || undefined, estado, limit: 50 },
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
      // TODO: If evidenciaFile exists, upload it first and get URL
      // For now we store filename as reference
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

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <BadgeDollarSign className="w-5 h-5 text-white" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cobranza</h1>
          <p className="text-gray-500 text-sm">Validación de pagos recibidos</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-amber-500" />
            <p className="text-xs text-gray-400 font-medium">Por Validar</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">
            {tab === 'pendientes' ? (resp?.total || 0) : '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <p className="text-xs text-gray-400 font-medium">Validados</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            {tab === 'validados' ? (resp?.total || 0) : '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-4 md:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={14} className="text-blue-500" />
            <p className="text-xs text-gray-400 font-medium">Flujo</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">PAGO_RECIBIDO</span>
            <ArrowRight size={12} />
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">Validar Cobranza</span>
            <ArrowRight size={12} />
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">POR_SURTIR (Picking)</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => { setTab('pendientes'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            tab === 'pendientes'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Clock size={14} /> Pendientes de Validar
        </button>
        <button
          onClick={() => { setTab('validados'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            tab === 'validados'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <CheckCircle2 size={14} /> Validados
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar pedido, cliente, referencia..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm"
        />
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Cargando pedidos...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <BadgeDollarSign size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-500">
              {tab === 'pendientes' ? 'No hay pedidos pendientes de validar' : 'No hay pedidos validados aún'}
            </p>
            <p className="text-xs mt-1 text-gray-400">
              {tab === 'pendientes' ? 'Los pedidos llegarán aquí cuando el cliente confirme su pago' : ''}
            </p>
          </div>
        ) : (
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

      {/* Detail Modal (View only) */}
      {selectedOrder && !showValidateModal && (
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
              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 mb-1"><CreditCard size={14} className="text-blue-600" /><span className="text-xs font-semibold text-blue-700 uppercase">Info de Pago</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Referencia:</span><span className="font-mono font-medium text-blue-700">{selectedOrder.referenciaPago || 'Sin referencia'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Método:</span><span>{selectedOrder.metodoPago || 'No especificado'}</span></div>
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

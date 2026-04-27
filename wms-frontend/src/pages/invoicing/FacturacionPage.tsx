import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import {
  FileText, Download, Printer, Mail, Search,
  CheckCircle2, XCircle, Filter, ChevronLeft, ChevronRight,
} from 'lucide-react';

export default function FacturacionPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: resp, isLoading } = useApi<any>(
    ['invoice-history', search, statusFilter, page],
    '/invoicing/history',
    { search: search || undefined, status: statusFilter || undefined, page, limit: 15 },
  );

  const invoices = resp?.data || [];
  const totalPages = resp?.totalPages || 1;

  const downloadFile = async (orderId: string, type: 'pdf' | 'xml', orderCode: string) => {
    try {
      const res = await api.get(`/invoicing/${orderId}/${type}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${orderCode}.${type}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(`Error al descargar ${type.toUpperCase()}`);
    }
  };

  const printInvoice = async (orderId: string) => {
    try {
      const res = await api.get(`/invoicing/${orderId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const printWin = window.open(url);
      printWin?.addEventListener('load', () => printWin.print());
    } catch {
      toast.error('Error al imprimir');
    }
  };

  const sendEmail = async (orderId: string, clientEmail?: string) => {
    const email = clientEmail || prompt('Email del cliente:');
    if (!email) return;
    try {
      await api.post(`/invoicing/${orderId}/email`, { email });
      toast.success(`📧 Factura enviada a ${email}`);
    } catch {
      toast.error('Error al enviar email');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <FileText className="w-5 h-5 text-white" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturación Electrónica</h1>
          <p className="text-gray-500 text-sm">Historial de facturas CFDI emitidas — Facturapi</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 font-medium">Total Emitidas</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{resp?.total || 0}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 font-medium">Vigentes</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {invoices.filter((i: any) => i.facturaStatus === 'valid').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 font-medium">Canceladas</p>
          <p className="text-2xl font-bold text-red-500 mt-1">
            {invoices.filter((i: any) => i.facturaStatus === 'canceled').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por UUID, pedido, RFC, cliente..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm"
          />
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => { setStatusFilter(''); setPage(1); }}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              !statusFilter ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => { setStatusFilter('valid'); setPage(1); }}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1 ${
              statusFilter === 'valid' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 size={12} /> Vigentes
          </button>
          <button
            onClick={() => { setStatusFilter('canceled'); setPage(1); }}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1 ${
              statusFilter === 'canceled' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            <XCircle size={12} /> Canceladas
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Pedido</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">UUID Fiscal</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">RFC</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Total</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Timbrada</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    Cargando facturas...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <FileText size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="font-medium text-gray-500">No hay facturas emitidas</p>
                    <p className="text-xs mt-1">Las facturas aparecerán aquí cuando se timbren desde la sección de Pedidos</p>
                  </td>
                </tr>
              ) : (
                invoices.map((inv: any) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary-600">{inv.codigo}</span>
                        {inv.facturaSerie && inv.facturaFolio && (
                          <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                            {inv.facturaSerie}-{inv.facturaFolio}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] text-gray-600">
                        {inv.uuidFiscal ? `${inv.uuidFiscal.substring(0, 8)}...${inv.uuidFiscal.substring(inv.uuidFiscal.length - 4)}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{inv.client?.nombre || '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{inv.client?.rfc || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                      ${Number(inv.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${
                        inv.facturaStatus === 'valid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {inv.facturaStatus === 'valid' ? (
                          <><CheckCircle2 size={10} /> Vigente</>
                        ) : (
                          <><XCircle size={10} /> Cancelada</>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {inv.facturadaAt ? new Date(inv.facturadaAt).toLocaleDateString('es-MX', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => downloadFile(inv.id, 'pdf', inv.codigo)}
                          title="Descargar PDF"
                          className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => downloadFile(inv.id, 'xml', inv.codigo)}
                          title="Descargar XML"
                          className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                        >
                          <FileText size={14} />
                        </button>
                        <button
                          onClick={() => printInvoice(inv.id)}
                          title="Imprimir"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          onClick={() => sendEmail(inv.id, inv.client?.email)}
                          title="Enviar por email"
                          className="p-1.5 rounded-lg hover:bg-purple-100 text-purple-600 transition-colors"
                        >
                          <Mail size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-xs text-gray-500">
              Página {page} de {totalPages} — {resp?.total || 0} facturas
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

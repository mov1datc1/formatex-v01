import { useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { api } from '../../../config/api';
import { UserCheck, Search, AlertTriangle, CheckCircle2, Clock, Ban } from 'lucide-react';

export default function EstadoCuentaTab() {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  // Get clients list for dropdown
  const { data: clientsResp } = useApi<any>(['clients-list-stmt'], '/catalog/clients', { limit: 200 });
  const allClients = clientsResp?.data || clientsResp || [];
  const filteredClients = (allClients).filter((c: any) =>
    !clientSearch || c.nombre?.toLowerCase().includes(clientSearch.toLowerCase()) || c.codigo?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  // Get statement for selected client
  const { data: statement, isLoading } = useApi<any>(
    ['client-statement', selectedClientId],
    `/invoicing/client/${selectedClientId}/statement`,
    {},
    !!selectedClientId,
  );

  const resumen = statement?.resumen;
  const facturas = statement?.facturas || [];
  const credit = statement?.creditConfig;

  return (
    <>
      {/* Client selector */}
      <div className="bg-white rounded-xl border p-4">
        <label className="text-xs font-medium text-gray-600 mb-2 block">Seleccionar Cliente</label>
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={clientSearch} onChange={e => setClientSearch(e.target.value)}
              placeholder="Buscar cliente por nombre o código..."
              className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm" />
          </div>
          <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}
            className="px-3 py-2.5 border rounded-xl text-sm min-w-[200px]">
            <option value="">— Selecciona un cliente —</option>
            {filteredClients.map((c: any) => (
              <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedClientId ? (
        <div className="text-center py-16 text-gray-400">
          <UserCheck size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="font-medium text-gray-500">Selecciona un cliente para ver su estado de cuenta</p>
        </div>
      ) : isLoading ? (
        <div className="text-center py-12 text-gray-400">Cargando estado de cuenta...</div>
      ) : (
        <>
          {/* Client header + credit config */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-bold text-lg text-gray-900">{statement?.client?.nombre}</h3>
              <p className="text-sm text-gray-500">{statement?.client?.codigo} · RFC: {statement?.client?.rfc || '—'}</p>
              {credit?.bloqueado && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-200">
                  <Ban size={14} className="text-red-500" />
                  <span className="text-xs font-semibold text-red-700">BLOQUEADO: {credit.motivoBloqueo || 'Sin motivo'}</span>
                </div>
              )}
              {credit && !credit.bloqueado && (
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <div><span className="text-gray-400">Plazo</span><p className="font-bold text-gray-900">{credit.plazoDefault} días</p></div>
                  <div><span className="text-gray-400">Lista default</span><p className="font-bold text-gray-900">{credit.listaDefault || '—'}</p></div>
                  <div><span className="text-gray-400">Desc. máximo</span><p className="font-bold text-gray-900">{Number(credit.descuentoMaximo)}%</p></div>
                </div>
              )}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-400">Total Facturado</p>
                <p className="text-lg font-bold text-gray-900 mt-1">${resumen?.totalFacturado?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-400">Pagado</p>
                <p className="text-lg font-bold text-emerald-600 mt-1">${resumen?.totalPagado?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-400">Pendiente</p>
                <p className="text-lg font-bold text-red-600 mt-1">${resumen?.totalPendiente?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                {resumen?.facturasVencidas > 0 && (
                  <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1">
                    <AlertTriangle size={10} /> {resumen.facturasVencidas} vencida(s)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Invoice timeline */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-5 py-3 border-b bg-gray-50">
              <h4 className="font-semibold text-gray-700 text-sm">{resumen?.facturasTotal || 0} Facturas</h4>
            </div>
            <div className="divide-y">
              {facturas.map((f: any) => (
                <div key={f.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-primary-600">{f.codigo}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        f.metodoPago === 'PPD' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>{f.metodoPago}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        f.estadoPago === 'PAGADA' ? 'bg-emerald-100 text-emerald-700'
                        : f.estadoPago === 'PARCIAL' ? 'bg-amber-100 text-amber-700'
                        : f.vencida ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {f.estadoPago === 'PAGADA' ? '✅ Pagada' : f.vencida ? '🔴 Vencida' : f.estadoPago === 'PARCIAL' ? '🟡 Parcial' : f.estadoPago}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-gray-900">${Number(f.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                      {f.saldoPendiente > 0 && (
                        <p className="text-xs text-red-500">Saldo: ${Number(f.saldoPendiente).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                    <span>📅 {f.facturadaAt ? new Date(f.facturadaAt).toLocaleDateString('es-MX') : '—'}</span>
                    {f.fechaVencimiento && <span>⏰ Vence: {new Date(f.fechaVencimiento).toLocaleDateString('es-MX')}</span>}
                    <span>👤 {f.vendedor}</span>
                  </div>
                  {/* Payments */}
                  {f.pagos?.length > 0 && (
                    <div className="mt-2 ml-4 space-y-1">
                      {f.pagos.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-2 text-xs text-gray-500">
                          <CheckCircle2 size={12} className="text-emerald-500" />
                          <span className="font-semibold text-emerald-600">${Number(p.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                          <span>— {new Date(p.fecha).toLocaleDateString('es-MX')}</span>
                          {p.referencia && <span className="text-gray-400">Ref: {p.referencia}</span>}
                          {p.complementoUuid && <span className="px-1.5 py-0.5 bg-emerald-50 rounded text-emerald-600 font-mono text-[10px]">CFDI-P</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

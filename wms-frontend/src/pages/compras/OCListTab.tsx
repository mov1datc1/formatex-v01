import { useState } from 'react';
import { Send, FileText, Trash2, Search } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../config/api';

const estadoBadge: Record<string, string> = {
  BORRADOR: 'bg-gray-100 text-gray-600',
  CONFIRMADA: 'bg-blue-100 text-blue-700',
  ENVIADA_PROVEEDOR: 'bg-cyan-100 text-cyan-700',
  EN_TRANSITO: 'bg-indigo-100 text-indigo-700',
  EN_RECEPCION: 'bg-amber-100 text-amber-700',
  PARCIAL: 'bg-orange-100 text-orange-700',
  COMPLETADA: 'bg-emerald-100 text-emerald-700',
  CANCELADA: 'bg-red-100 text-red-700',
};

export default function OCListTab({ onRefresh }: { onRefresh: () => void }) {
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const params: any = { limit: 50 };
  if (search) params.search = search;
  if (estadoFilter) params.estado = estadoFilter;

  const { data: result, isLoading, refetch } = useApi<any>(['purchasing-orders', search, estadoFilter], '/purchasing/orders', params);
  const orders = result?.data || [];

  const handleConfirm = async (id: string) => {
    if (!confirm('¿Confirmar esta OC?')) return;
    await api.post(`/purchasing/orders/${id}/confirm`);
    refetch(); onRefresh();
  };
  const handleSendReception = async (id: string) => {
    if (!confirm('¿Enviar a recepción?')) return;
    await api.post(`/purchasing/orders/${id}/send-reception`);
    refetch(); onRefresh();
  };
  const handleCancel = async (id: string) => {
    const motivo = prompt('Motivo de cancelación:');
    if (!motivo) return;
    await api.post(`/purchasing/orders/${id}/cancel`, { motivo });
    refetch(); onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar OC, proveedor..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm placeholder:text-gray-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100" />
        </div>
        <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm focus:border-primary-400 focus:outline-none">
          <option value="">Todos los estados</option>
          {Object.keys(estadoBadge).map(e => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              {['Código', 'Proveedor', 'Fecha', 'SKUs', 'Monto Total', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No hay órdenes de compra</td></tr>
            ) : orders.map((oc: any) => (
              <tr key={oc.id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-primary-600 font-medium">{oc.codigo}</td>
                <td className="px-4 py-3 text-gray-900">{oc.supplier?.nombre}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(oc.fechaEmision).toLocaleDateString('es-MX')}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {oc.lineas?.slice(0, 3).map((l: any, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">{l.sku?.codigo}</span>
                    ))}
                    {(oc.lineas?.length || 0) > 3 && <span className="text-xs text-gray-400">+{oc.lineas.length - 3}</span>}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">${Number(oc.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${estadoBadge[oc.estado] || estadoBadge.BORRADOR}`}>
                    {oc.estado.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {oc.estado === 'BORRADOR' && (
                      <button onClick={() => handleConfirm(oc.id)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500" title="Confirmar"><FileText size={15} /></button>
                    )}
                    {oc.estado === 'CONFIRMADA' && (
                      <button onClick={() => handleSendReception(oc.id)} className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-500" title="Enviar a Recepción"><Send size={15} /></button>
                    )}
                    {!['COMPLETADA', 'CANCELADA'].includes(oc.estado) && (
                      <button onClick={() => handleCancel(oc.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Cancelar"><Trash2 size={15} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

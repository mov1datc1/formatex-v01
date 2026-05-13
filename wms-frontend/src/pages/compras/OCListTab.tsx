import { useState, useEffect } from 'react';
import { Eye, Send, Download, FileText, Trash2, Search, Filter } from 'lucide-react';
import { useApi } from '../../hooks/useApi';

const estadoBadge: Record<string, { bg: string; text: string }> = {
  BORRADOR: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  CONFIRMADA: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  ENVIADA_PROVEEDOR: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  EN_TRANSITO: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  EN_RECEPCION: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  PARCIAL: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  COMPLETADA: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  CANCELADA: { bg: 'bg-red-500/20', text: 'text-red-400' },
};

export default function OCListTab({ onRefresh }: { onRefresh: () => void }) {
  const api = useApi();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [detail, setDetail] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (search) params.search = search;
      if (estadoFilter) params.estado = estadoFilter;
      const r = await api.get('/purchasing/orders', { params });
      setOrders(r.data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [search, estadoFilter]);

  const handleConfirm = async (id: string) => {
    if (!confirm('¿Confirmar esta OC?')) return;
    await api.post(`/purchasing/orders/${id}/confirm`);
    load(); onRefresh();
  };

  const handleSendReception = async (id: string) => {
    if (!confirm('¿Enviar esta OC a la cola de recepción?')) return;
    await api.post(`/purchasing/orders/${id}/send-reception`);
    load(); onRefresh();
  };

  const handleCancel = async (id: string) => {
    const motivo = prompt('Motivo de cancelación:');
    if (!motivo) return;
    await api.post(`/purchasing/orders/${id}/cancel`, { motivo });
    load(); onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar OC, proveedor..."
            className="w-full pl-10 pr-4 py-2.5 bg-primary-800/50 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/30 focus:border-blue-500/50 focus:outline-none"
          />
        </div>
        <select
          value={estadoFilter}
          onChange={e => setEstadoFilter(e.target.value)}
          className="px-4 py-2.5 bg-primary-800/50 border border-white/10 rounded-xl text-white text-sm focus:border-blue-500/50 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          {Object.keys(estadoBadge).map(e => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-primary-800/30 border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              {['Código', 'Proveedor', 'Fecha', 'SKUs', 'Monto Total', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-white/30">Cargando...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-white/30">No hay órdenes de compra</td></tr>
            ) : orders.map(oc => {
              const badge = estadoBadge[oc.estado] || estadoBadge.BORRADOR;
              return (
                <tr key={oc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-mono text-blue-400 font-medium">{oc.codigo}</td>
                  <td className="px-4 py-3 text-white">{oc.supplier?.nombre}</td>
                  <td className="px-4 py-3 text-white/60">{new Date(oc.fechaEmision).toLocaleDateString('es-MX')}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {oc.lineas?.slice(0, 3).map((l: any, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-white/5 rounded text-xs text-white/70">{l.sku?.codigo}</span>
                      ))}
                      {(oc.lineas?.length || 0) > 3 && <span className="text-xs text-white/40">+{oc.lineas.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-white">${Number(oc.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                      {oc.estado.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {oc.estado === 'BORRADOR' && (
                        <button onClick={() => handleConfirm(oc.id)} className="p-1.5 hover:bg-blue-500/20 rounded-lg text-blue-400" title="Confirmar">
                          <FileText size={15} />
                        </button>
                      )}
                      {oc.estado === 'CONFIRMADA' && (
                        <button onClick={() => handleSendReception(oc.id)} className="p-1.5 hover:bg-amber-500/20 rounded-lg text-amber-400" title="Enviar a Recepción">
                          <Send size={15} />
                        </button>
                      )}
                      {!['COMPLETADA', 'CANCELADA'].includes(oc.estado) && (
                        <button onClick={() => handleCancel(oc.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400" title="Cancelar">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

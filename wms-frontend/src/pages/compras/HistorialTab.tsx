import { useState, useEffect } from 'react';
import { Search, FileText } from 'lucide-react';
import { useApi } from '../../hooks/useApi';

export default function HistorialTab() {
  const api = useApi();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params: any = { limit: 50 };
    if (search) params.search = search;
    api.get('/purchasing/history', { params })
      .then(r => setHistory(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/40">OC completadas y canceladas — para auditorías y revisiones</p>
        <div className="relative w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar en historial..."
            className="w-full pl-10 pr-4 py-2 bg-primary-800/50 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/30 focus:border-blue-500/50 focus:outline-none"
          />
        </div>
      </div>

      <div className="bg-primary-800/30 border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              {['Código', 'Proveedor', 'Fecha', 'SKUs', 'Monto', 'Estado', 'Recepciones'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-white/30">Cargando...</td></tr>
            ) : history.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-white/30">Sin historial</td></tr>
            ) : history.map(oc => (
              <tr key={oc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 font-mono text-blue-400">{oc.codigo}</td>
                <td className="px-4 py-3 text-white">{oc.supplier?.nombre}</td>
                <td className="px-4 py-3 text-white/60">{new Date(oc.fechaEmision).toLocaleDateString('es-MX')}</td>
                <td className="px-4 py-3">
                  {oc.lineas?.map((l: any) => l.sku?.codigo).join(', ')}
                </td>
                <td className="px-4 py-3 text-white font-medium">${Number(oc.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${oc.estado === 'COMPLETADA' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {oc.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/50">{oc.receipts?.length || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

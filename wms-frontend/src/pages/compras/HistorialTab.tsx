import { useState } from 'react';
import { Search } from 'lucide-react';
import { useApi } from '../../hooks/useApi';

export default function HistorialTab() {
  const [search, setSearch] = useState('');
  const params: any = { limit: 50 };
  if (search) params.search = search;
  const { data: result, isLoading } = useApi<any>(['purchasing-history', search], '/purchasing/history', params);
  const history = result?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">OC completadas y canceladas — para auditorías</p>
        <div className="relative w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en historial..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm placeholder:text-gray-400 focus:border-primary-400 focus:outline-none" />
        </div>
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              {['Código', 'Proveedor', 'Fecha', 'SKUs', 'Monto', 'Estado', 'Recepciones'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
            ) : history.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin historial</td></tr>
            ) : history.map((oc: any) => (
              <tr key={oc.id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-primary-600">{oc.codigo}</td>
                <td className="px-4 py-3 text-gray-900">{oc.supplier?.nombre}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(oc.fechaEmision).toLocaleDateString('es-MX')}</td>
                <td className="px-4 py-3 text-gray-500">{(oc.lineas || []).map((l: any) => l.sku?.codigo).join(', ')}</td>
                <td className="px-4 py-3 text-gray-900 font-medium">${Number(oc.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${oc.estado === 'COMPLETADA' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {oc.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{oc.receipts?.length || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

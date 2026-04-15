import { useState } from 'react';
import { useApi, useMutationApi } from '../../hooks/useApi';
import type { PaginatedResponse, CutOperation } from '../../hooks/useApi';
import toast from 'react-hot-toast';
import { WmsIcon, KpiIcon } from '../../components/icons/WmsIcons';
import { X, Plus } from 'lucide-react';

export default function CortePage() {
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const { data: resp, isLoading } = useApi<PaginatedResponse<CutOperation>>(['cuts'], '/cutting', { page, limit: 15 });
  const { data: stats } = useApi<any>(['cut-stats'], '/cutting/stats');

  // Form state
  const [huSearch, setHuSearch] = useState('');
  const [selectedHU, setSelectedHU] = useState<any>(null);
  const [metrajeCortado, setMetrajeCortado] = useState(0);
  const [notas, setNotas] = useState('');

  const { data: husResult } = useApi<PaginatedResponse<any>>(['hus-cut-search', huSearch], '/inventory/hus', { search: huSearch, estadoHu: 'DISPONIBLE', limit: 10 }, huSearch.length >= 2);
  const mutation = useMutationApi('/cutting');

  const handleCut = async () => {
    if (!selectedHU) return toast.error('Selecciona un rollo');
    if (metrajeCortado <= 0) return toast.error('Metraje debe ser mayor a 0');
    if (metrajeCortado > selectedHU.metrajeActual) return toast.error(`Solo hay ${selectedHU.metrajeActual}m disponibles`);

    try {
      const result: any = await mutation.mutateAsync({ huOrigenId: selectedHU.id, metrajeCortado, notas });
      const restante = selectedHU.metrajeActual - metrajeCortado;
      toast.success(`Cortados ${metrajeCortado}m de ${selectedHU.codigo}${restante > 0 ? ` — Retazo de ${restante.toFixed(1)}m creado` : ' — Rollo agotado'}`);
      setShowForm(false);
      setSelectedHU(null);
      setMetrajeCortado(0);
      setHuSearch('');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al cortar');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <KpiIcon icon={WmsIcon.Cut} gradient="from-purple-500 to-pink-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Corte de Rollos</h1>
            <p className="text-gray-500 text-sm">Operaciones de corte con trazabilidad — {resp?.total || 0} cortes</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm font-medium flex items-center gap-2">
          {showForm ? <><X size={16} /> Cerrar</> : <><Plus size={16} /> Nuevo Corte</>}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{stats?.totalCortes || 0}</p>
          <p className="text-xs text-gray-500">Cortes Totales</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{stats?.retazosActivos || 0}</p>
          <p className="text-xs text-gray-500">Retazos Activos</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{Math.round(stats?.metrajePromedioCortado || 0)}m</p>
          <p className="text-xs text-gray-500">Promedio Cortado</p>
        </div>
      </div>

      {/* Cut Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><WmsIcon.Cut size={20} className="text-purple-500" /> Nueva Operación de Corte</h2>

          {/* Step 1: Search HU */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Buscar Rollo (código HU)</label>
            <input value={huSearch} onChange={(e) => { setHuSearch(e.target.value); setSelectedHU(null); }} placeholder="Escribe el código HU..." className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
            {husResult?.data && husResult.data.length > 0 && !selectedHU && (
              <div className="mt-2 border rounded-lg divide-y max-h-40 overflow-y-auto">
                {husResult.data.map((hu: any) => (
                  <button key={hu.id} onClick={() => { setSelectedHU(hu); setHuSearch(hu.codigo); setMetrajeCortado(Math.min(10, hu.metrajeActual)); }} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm flex justify-between">
                    <span><span className="font-mono text-blue-600">{hu.codigo}</span> — {hu.sku?.nombre}</span>
                    <span className="font-semibold">{hu.metrajeActual}m</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected HU info + metraje */}
          {selectedHU && (
            <div className="p-4 bg-blue-50 rounded-lg space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-mono font-bold text-blue-700">{selectedHU.codigo}</p>
                  <p className="text-sm text-gray-600">{selectedHU.sku?.nombre} {selectedHU.sku?.color ? `— ${selectedHU.sku.color}` : ''}</p>
                  <p className="text-xs text-gray-400">{selectedHU.tipoRollo} · Gen {selectedHU.generacion} · {selectedHU.ubicacion?.codigo || 'Sin ubicar'}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-700">{selectedHU.metrajeActual}m</p>
                  <p className="text-xs text-gray-500">disponibles</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Metros a cortar *</label>
                  <input type="number" min={0.5} max={selectedHU.metrajeActual} step={0.5} value={metrajeCortado} onChange={(e) => setMetrajeCortado(+e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-lg font-bold text-center" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Restante (retazo)</label>
                  <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-lg font-bold text-center text-orange-600">
                    {Math.max(0, selectedHU.metrajeActual - metrajeCortado).toFixed(1)}m
                  </div>
                </div>
              </div>

              {/* Visual bar */}
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden flex">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${(metrajeCortado / selectedHU.metrajeActual) * 100}%` }}></div>
                <div className="h-full bg-orange-400 transition-all" style={{ width: `${((selectedHU.metrajeActual - metrajeCortado) / selectedHU.metrajeActual) * 100}%` }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span className="text-blue-600">● Cortado: {metrajeCortado}m</span>
                <span className="text-orange-600">● Retazo: {Math.max(0, selectedHU.metrajeActual - metrajeCortado).toFixed(1)}m</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notas</label>
            <input value={notas} onChange={(e) => setNotas(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" placeholder="Observaciones del corte..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => { setShowForm(false); setSelectedHU(null); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button onClick={handleCut} disabled={mutation.isPending || !selectedHU} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium disabled:opacity-50">
              {mutation.isPending ? 'Cortando...' : <><WmsIcon.Cut size={16} /> Ejecutar Corte ({metrajeCortado}m)</>}
            </button>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-gray-400">Cargando...</div> : !resp?.data?.length ? (
          <div className="p-12 text-center text-gray-400">
            <WmsIcon.Cut size={48} className="mx-auto mb-3 text-gray-300" />
            <p>No hay operaciones de corte aún</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">HU Origen</th>
                <th className="px-4 py-3 text-left">Tela</th>
                <th className="px-4 py-3 text-right">Cortado</th>
                <th className="px-4 py-3 text-right">Restante</th>
                <th className="px-4 py-3 text-left">Retazo</th>
                <th className="px-4 py-3 text-left">Pedido</th>
                <th className="px-4 py-3 text-left">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {resp.data.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-purple-600 font-medium">{c.codigo}</td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">{c.huOrigen?.codigo}</td>
                  <td className="px-4 py-3 text-xs">{c.huOrigen?.sku?.nombre} {c.huOrigen?.sku?.color ? `(${c.huOrigen.sku.color})` : ''}</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-700">{c.metrajeCortado}m</td>
                  <td className="px-4 py-3 text-right font-semibold text-orange-600">{c.metrajeRestante}m</td>
                  <td className="px-4 py-3 font-mono text-xs text-orange-600">{c.huRetazo?.codigo || '—'} {c.huRetazo?.ubicacion?.codigo ? `(${c.huRetazo.ubicacion.codigo})` : ''}</td>
                  <td className="px-4 py-3 text-xs">{c.orderLine?.order?.codigo || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(c.fechaCorte).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

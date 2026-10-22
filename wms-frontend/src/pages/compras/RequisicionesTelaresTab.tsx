import { useState } from 'react';
import {
  Building2, Truck, Clock, CheckCircle2, Search, Copy, Check,
  FileText, Plus, AlertTriangle, Layers, Calendar, User, ArrowRight,
  PackageCheck, RefreshCw, X
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import NuevaRequisicionTelaresModal from './NuevaRequisicionTelaresModal';

export default function RequisicionesTelaresTab({ onRefresh }: { onRefresh?: () => void }) {
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<'all' | 'CONFIRMADA' | 'EN_TRANSITO' | 'COMPLETADA'>('all');
  const [showNuevaReq, setShowNuevaReq] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedVale, setSelectedVale] = useState<any | null>(null);

  const { data: requisiciones, isLoading, refetch, isFetching } = useApi<any[]>(
    ['requisiciones-telares', search, filterEstado],
    '/purchasing/requisiciones-telares',
    {
      search: search || undefined,
      estado: filterEstado === 'all' ? undefined : filterEstado,
    }
  );

  const handleCopyWhatsApp = (req: any) => {
    const lines = req.lineas || [];
    const fabricList = lines
      .map((l: any) => `• *${l.sku?.nombre || 'Tela'}* ${l.sku?.color ? `(${l.sku.color})` : ''}: *${l.cantidadRollos} rollos* (${l.metrajeTotal}m)`)
      .join('\n');

    const text =
      `🏢 *FORMATEX ➔ TELARES Y TEJIDOS (REQUISICIÓN DE ROLLOS)*\n` +
      `📋 *Folio:* ${req.codigo}\n` +
      `👤 *Solicitado por:* ${req.solicitante || 'Israel (Jefe de Almacén)'}\n` +
      `🚚 *Ruta / Camioneta:* ${req.ruta || 'Camioneta Tototlán ➔ Zapopan'}\n` +
      `⏰ *Horario sugerido:* ${req.horaEstimada || 'Vuelta de la tarde'}\n` +
      `📍 *Destino:* Almacén Formatex Zapopan (Río La Barca)\n\n` +
      `*DETALLE DE ROLLOS SOLICITADOS (50m c/u):*\n${fabricList}\n\n` +
      `*Total:* ${req.totalRollos || 0} rollos (${req.totalMetros?.toLocaleString() || 0} metros)\n` +
      `${req.notas ? `📝 *Indicaciones:* ${req.notas}\n` : ''}` +
      `_Favor de tener listos en rampa de Tototlán para el chofer._`;

    navigator.clipboard.writeText(text);
    setCopiedId(req.id);
    toast.success('Ficha para WhatsApp copiada al portapapeles');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleStatusChange = async (id: string, nuevoEstado: 'EN_TRANSITO' | 'COMPLETADA') => {
    try {
      await api.put(`/purchasing/requisiciones-telares/${id}/status`, { estado: nuevoEstado });
      toast.success(
        nuevoEstado === 'EN_TRANSITO'
          ? 'Requisición en ruta — Camioneta en trayecto a Zapopan'
          : 'Requisición recibida y completada en Formatex Zapopan'
      );
      refetch();
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al actualizar estatus');
    }
  };

  const filtered = (requisiciones || []).filter((r: any) => {
    if (filterEstado !== 'all' && r.estado !== filterEstado) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchCode = r.codigo?.toLowerCase().includes(q);
      const matchSolicitante = r.solicitante?.toLowerCase().includes(q);
      const matchNotas = r.notas?.toLowerCase().includes(q);
      const matchLine = r.lineas?.some((l: any) =>
        l.sku?.nombre?.toLowerCase().includes(q) ||
        l.sku?.codigo?.toLowerCase().includes(q) ||
        l.sku?.color?.toLowerCase().includes(q)
      );
      if (!matchCode && !matchSolicitante && !matchNotas && !matchLine) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 animate-fade-in text-xs">
      {/* Banner Explicativo del Flujo Inter-Compañía */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300 border border-white/15 shrink-0">
              <Building2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-slate-900">
                  Sinergia Inter-Compañía
                </span>
                <span className="text-white/70 text-xs">Empresa Hermana (Río Tototlán)</span>
              </div>
              <h3 className="text-lg font-black tracking-tight text-white mt-0.5">
                Requisiciones y Traspasos: Formatex ➔ Telares y Tejidos
              </h3>
              <p className="text-white/80 text-xs mt-0.5 max-w-2xl">
                Sustitución digital del formato de WhatsApp. Cuando el almacén de Formatex (Israel) o Compras (Elba) requiere rollos completos para pedidos o resurtido de racks, emite una requisición oficial hacia la bodega de Tototlán para traslado en camioneta propia.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowNuevaReq(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 rounded-xl font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer shrink-0 active:scale-95"
          >
            <Plus size={16} />
            <span>Nueva Requisición a Telares</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por folio (REQ-TNT-...), tela, color o solicitante..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        {/* Chips de filtro */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setFilterEstado('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
              filterEstado === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas ({requisiciones?.length || 0})
          </button>

          <button
            onClick={() => setFilterEstado('CONFIRMADA')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
              filterEstado === 'CONFIRMADA'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            🟡 Solicitadas a Telares
          </button>

          <button
            onClick={() => setFilterEstado('EN_TRANSITO')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
              filterEstado === 'EN_TRANSITO'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            🚚 En Ruta Camioneta
          </button>

          <button
            onClick={() => setFilterEstado('COMPLETADA')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
              filterEstado === 'COMPLETADA'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            ✅ Recibidas en Zapopan
          </button>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-gray-500 hover:text-gray-800 bg-gray-50 border border-gray-200 rounded-xl transition-colors cursor-pointer"
            title="Refrescar"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin text-blue-600' : ''} />
          </button>
        </div>
      </div>

      {/* Lista de Requisiciones */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border p-12 text-center text-gray-400 animate-pulse">
          <Truck size={36} className="mx-auto mb-2 text-blue-300 animate-bounce" />
          <p className="font-semibold text-gray-600">Cargando requisiciones a Telares...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center text-gray-400">
          <Building2 size={40} className="mx-auto mb-2 text-gray-300" />
          <h4 className="font-bold text-gray-700 text-sm">No hay requisiciones registradas</h4>
          <p className="text-gray-400 mt-1 max-w-md mx-auto">
            Crea una nueva requisición para solicitar rollos de tela a la bodega hermana de Tototlán.
          </p>
          <button
            onClick={() => setShowNuevaReq(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
          >
            + Crear Primera Requisición
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req: any) => {
            const isSolicitada = req.estado === 'CONFIRMADA' || req.estado === 'BORRADOR';
            const isEnRuta = req.estado === 'EN_TRANSITO';
            const isCompletada = req.estado === 'COMPLETADA';

            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-200 transition-all"
              >
                {/* Cabecera de la Requisición */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100">
                      <Truck size={20} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-gray-900 text-base">{req.codigo}</span>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          isSolicitada ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          isEnRuta ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {isSolicitada && '🟡 Solicitada a Telares'}
                          {isEnRuta && '🚚 En Ruta de Camioneta'}
                          {isCompletada && '✅ Recibida en Zapopan'}
                        </span>
                        {req.prioridad === 1 && (
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-red-100 text-red-700">
                            🚨 Urgente
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-[11px] mt-0.5 flex flex-wrap items-center gap-3">
                        <span>Solicitó: <strong className="text-gray-800">{req.solicitante}</strong></span>
                        <span>•</span>
                        <span>Ruta: <strong className="text-gray-700">{req.ruta}</strong></span>
                        <span>•</span>
                        <span>Fecha: {new Date(req.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </p>
                    </div>
                  </div>

                  {/* Resumen de cantidades */}
                  <div className="text-right self-end md:self-auto bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block text-[10px] font-semibold uppercase">Total Solicitado</span>
                    <span className="font-black text-blue-800 text-sm">{req.totalRollos} rollos</span>
                    <span className="text-gray-500 font-medium ml-1">({req.totalMetros?.toLocaleString()} m)</span>
                  </div>
                </div>

                {/* Stepper Visual de 3 Pasos */}
                <div className="my-3 py-2 px-3 bg-gray-50/70 rounded-xl border border-gray-100 flex items-center justify-between text-[11px]">
                  <div className={`flex items-center gap-2 ${isSolicitada || isEnRuta || isCompletada ? 'text-blue-700 font-bold' : 'text-gray-400'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isSolicitada || isEnRuta || isCompletada ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</span>
                    <span>Requisición Solicitada</span>
                  </div>
                  <ArrowRight size={14} className="text-gray-300" />
                  <div className={`flex items-center gap-2 ${isEnRuta || isCompletada ? 'text-blue-700 font-bold' : 'text-gray-400'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isEnRuta || isCompletada ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</span>
                    <span>En Ruta Camioneta</span>
                  </div>
                  <ArrowRight size={14} className="text-gray-300" />
                  <div className={`flex items-center gap-2 ${isCompletada ? 'text-emerald-700 font-bold' : 'text-gray-400'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isCompletada ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}>3</span>
                    <span>Recibido en Zapopan</span>
                  </div>
                </div>

                {/* Desglose de Telas Solicitadas */}
                <div className="space-y-1.5 my-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Telas Solicitadas a Telares Tototlán:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {(req.lineas || []).map((l: any) => (
                      <div key={l.id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900 text-xs">{l.sku?.nombre || 'Tela'}</p>
                          <p className="text-gray-500 text-[10px]">
                            {l.sku?.color ? `Color: ${l.sku.color}` : l.sku?.codigo}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-blue-700 text-xs block">{l.cantidadRollos} rollos</span>
                          <span className="text-gray-400 text-[10px]">{l.metrajeTotal}m</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {req.notas && (
                  <p className="text-[11px] text-gray-500 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100 mb-3">
                    <strong>Instrucciones:</strong> {req.notas}
                  </p>
                )}

                {/* Acciones de la Requisición */}
                <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyWhatsApp(req)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Copiar texto formateado para el grupo de WhatsApp"
                    >
                      {copiedId === req.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      <span>{copiedId === req.id ? 'Copiado' : 'Copiar p/ WhatsApp'}</span>
                    </button>

                    <button
                      onClick={() => setSelectedVale(req)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Ver e imprimir vale de carga de camioneta"
                    >
                      <FileText size={13} />
                      <span>Vale de Carga</span>
                    </button>
                  </div>

                  {/* Botones de cambio de estado operativo */}
                  <div className="flex items-center gap-2">
                    {isSolicitada && (
                      <button
                        onClick={() => handleStatusChange(req.id, 'EN_TRANSITO')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Truck size={13} />
                        <span>Marcar en Ruta (Salió Camioneta)</span>
                      </button>
                    )}

                    {isEnRuta && (
                      <button
                        onClick={() => handleStatusChange(req.id, 'COMPLETADA')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        <span>Confirmar Entrada en Zapopan</span>
                      </button>
                    )}

                    {isCompletada && (
                      <span className="text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-lg">
                        <CheckCircle2 size={13} />
                        <span>Surtida y Entregada</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL NUEVA REQUISICIÓN */}
      {showNuevaReq && (
        <NuevaRequisicionTelaresModal
          onClose={() => setShowNuevaReq(false)}
          onCreated={() => {
            setShowNuevaReq(false);
            refetch();
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {/* MODAL VALE DE CARGA PARA CAMIONETA */}
      {selectedVale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <Building2 size={24} className="text-blue-700" />
                <div>
                  <h3 className="font-black text-gray-900 text-lg">VALE DE TRASPASO INTER-BODEGAS</h3>
                  <p className="text-gray-500 text-xs">Forma Textil ➔ Telares y Tejidos (Río Tototlán)</p>
                </div>
              </div>
              <button onClick={() => setSelectedVale(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs">
              <div>Folio: <strong className="text-blue-700">{selectedVale.codigo}</strong></div>
              <div>Fecha: <strong>{new Date(selectedVale.createdAt).toLocaleDateString()}</strong></div>
              <div>Solicitado por: <strong>{selectedVale.solicitante}</strong></div>
              <div>Ruta: <strong>{selectedVale.ruta}</strong></div>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-600 font-bold">
                  <tr>
                    <th className="p-2.5">Tela / SKU</th>
                    <th className="p-2.5">Color</th>
                    <th className="p-2.5 text-right">Rollos (50m)</th>
                    <th className="p-2.5 text-right">Metros Totales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(selectedVale.lineas || []).map((l: any) => (
                    <tr key={l.id}>
                      <td className="p-2.5 font-bold text-gray-900">{l.sku?.nombre}</td>
                      <td className="p-2.5 text-gray-600">{l.sku?.color || '—'}</td>
                      <td className="p-2.5 text-right font-extrabold text-blue-700">{l.cantidadRollos}</td>
                      <td className="p-2.5 text-right font-bold text-gray-900">{l.metrajeTotal}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-6 border-t border-gray-200 grid grid-cols-2 gap-8 text-center text-xs text-gray-500">
              <div className="border-t border-gray-300 pt-2">
                Firma Entrega (Bodega Tototlán)
              </div>
              <div className="border-t border-gray-300 pt-2">
                Firma Chofer / Recibe (Formatex Zapopan)
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
              >
                Imprimir Vale
              </button>
              <button
                onClick={() => setSelectedVale(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

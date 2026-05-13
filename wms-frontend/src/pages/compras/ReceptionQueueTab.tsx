import { Clock, Package, Eye, TrendingUp, AlertCircle } from 'lucide-react';
import { useApi } from '../../hooks/useApi';

const prioColors: Record<number, { dot: string; label: string; bg: string }> = {
  1: { dot: 'bg-red-500', label: 'Urgente', bg: 'bg-red-50 text-red-700' },
  2: { dot: 'bg-amber-500', label: 'Alta', bg: 'bg-amber-50 text-amber-700' },
  3: { dot: 'bg-blue-500', label: 'Media', bg: 'bg-blue-50 text-blue-700' },
  4: { dot: 'bg-gray-400', label: 'Baja', bg: 'bg-gray-50 text-gray-600' },
};

const estadoConfig: Record<string, { label: string; bg: string; icon: any }> = {
  EN_RECEPCION: { label: 'En Proceso', bg: 'bg-blue-100 text-blue-700', icon: Clock },
  PARCIAL: { label: 'Parcial', bg: 'bg-orange-100 text-orange-700', icon: TrendingUp },
  COMPLETADA: { label: 'Completada', bg: 'bg-emerald-100 text-emerald-700', icon: Package },
};

export default function ReceptionQueueTab({ onRefresh }: { onRefresh: () => void }) {
  const { data: queue, isLoading } = useApi<any[]>(['purchasing-reception-queue'], '/purchasing/reception-queue');

  if (isLoading) return <div className="text-center text-gray-400 py-12">Cargando cola de recepción...</div>;
  if (!queue || queue.length === 0) return (
    <div className="bg-white rounded-xl border p-12 text-center">
      <Package size={48} className="mx-auto mb-3 text-gray-300" />
      <p className="font-medium text-gray-500">No hay OC en recepción actualmente</p>
      <p className="text-xs text-gray-400 mt-1">Las OC confirmadas aparecerán aquí al ser enviadas a recepción</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
        <Eye size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800">Vista de monitoreo</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Esta pestaña muestra el estatus de las OC durante su paso por Recepción en Almacén. 
            El procesamiento se realiza desde el módulo de <strong>Recepción</strong>.
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-400">Ordenado por prioridad y fecha estimada de llegada</p>

      {queue.map((oc: any, idx: number) => {
        const prio = prioColors[oc.prioridad] || prioColors[3];
        const estado = estadoConfig[oc.estado] || estadoConfig['EN_RECEPCION'];
        const EstadoIcon = estado.icon;
        const eta = oc.fechaEstimadaEntrega ? new Date(oc.fechaEstimadaEntrega) : null;
        const daysToEta = eta ? Math.ceil((eta.getTime() - Date.now()) / 86400000) : null;
        const isOverdue = daysToEta !== null && daysToEta < 0;
        const pct = oc.porcentajeRecibido || 0;

        return (
          <div key={oc.id} className="bg-white rounded-xl border p-5 hover:shadow-sm transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-300">#{idx + 1}</span>
                <div className={`w-2.5 h-2.5 rounded-full ${prio.dot}`} />
                <div>
                  <span className="font-mono text-primary-600 font-medium">{oc.codigo}</span>
                  <span className="mx-2 text-gray-300">•</span>
                  <span className="text-gray-900 font-medium">{oc.supplier?.nombre}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs ${prio.bg}`}>{prio.label}</span>
                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${estado.bg}`}>
                  <EstadoIcon size={12} />
                  {estado.label}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Recibido por Almacén</span>
                <span className="text-gray-600 font-medium">{pct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-400' : 'bg-gray-200'}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>

            {/* SKU Tags */}
            <div className="flex flex-wrap gap-2 mb-3">
              {(oc.lineas || []).map((l: any) => {
                const recibido = Number(l.metrajeRecibido) || 0;
                const total = Number(l.metrajeTotal) || 0;
                const lineComplete = total > 0 && recibido >= total;
                return (
                  <div key={l.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${lineComplete ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'}`}>
                    {lineComplete && <span className="text-emerald-500">✓</span>}
                    <span className="text-gray-700 font-medium">{l.sku?.codigo}</span>
                    <span className="text-gray-300">|</span>
                    <span className={`${lineComplete ? 'text-emerald-600' : 'text-gray-500'}`}>{recibido}/{total}m</span>
                  </div>
                );
              })}
            </div>

            {/* Footer Info */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {eta ? (
                    <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                      ETA: {eta.toLocaleDateString('es-MX')} 
                      {daysToEta !== null && (
                        <span className="ml-1">
                          ({daysToEta > 0 ? `en ${daysToEta} días` : daysToEta === 0 ? 'hoy' : `${Math.abs(daysToEta)}d atrasado`})
                        </span>
                      )}
                    </span>
                  ) : <span>Sin ETA</span>}
                </div>
                {isOverdue && (
                  <div className="flex items-center gap-1 text-red-500">
                    <AlertCircle size={12} />
                    <span className="font-medium">Atrasado</span>
                  </div>
                )}
              </div>
              <span className="text-gray-300">
                {oc.receipts?.length || 0} recepciones registradas
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

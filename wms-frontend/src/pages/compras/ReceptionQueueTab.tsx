import { Clock, CheckCircle, Package } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../config/api';

const prioColors: Record<number, { dot: string; label: string }> = {
  1: { dot: 'bg-red-500', label: 'Urgente' },
  2: { dot: 'bg-amber-500', label: 'Alta' },
  3: { dot: 'bg-blue-500', label: 'Media' },
  4: { dot: 'bg-gray-500', label: 'Baja' },
  5: { dot: 'bg-gray-600', label: 'Baja' },
};

export default function ReceptionQueueTab({ onRefresh }: { onRefresh: () => void }) {
  const { data: queue, isLoading, refetch } = useApi<any[]>(['purchasing-reception-queue'], '/purchasing/reception-queue');

  const handlePartialReceipt = async (oc: any) => {
    const lineas = (oc.lineas || []).map((l: any) => {
      const rollos = parseInt(prompt(`${l.sku?.nombre} — ¿Cuántos rollos recibidos?`, '0') || '0');
      const metraje = rollos * (l.metrajePorRollo || 50);
      return { skuId: l.skuId, rollosRecibidos: rollos, metrajeRecibido: metraje };
    }).filter((l: any) => l.rollosRecibidos > 0);
    if (lineas.length === 0) return;
    await api.post(`/purchasing/orders/${oc.id}/partial-receipt`, { lineas });
    refetch(); onRefresh();
  };

  const handleComplete = async (id: string) => {
    if (!confirm('¿Marcar OC como completada?')) return;
    await api.post(`/purchasing/orders/${id}/complete`);
    refetch(); onRefresh();
  };

  if (isLoading) return <div className="text-center text-white/30 py-12">Cargando cola de recepción...</div>;
  if (!queue || queue.length === 0) return (
    <div className="text-center py-16">
      <Package size={48} className="mx-auto text-white/10 mb-4" />
      <p className="text-white/30">No hay OC pendientes de recepción</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/40">Ordenado por prioridad y fecha estimada de llegada</p>
      {queue.map((oc: any, idx: number) => {
        const prio = prioColors[oc.prioridad] || prioColors[3];
        const eta = oc.fechaEstimadaEntrega ? new Date(oc.fechaEstimadaEntrega) : null;
        const daysToEta = eta ? Math.ceil((eta.getTime() - Date.now()) / 86400000) : null;
        return (
          <div key={oc.id} className="bg-primary-800/30 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-white/20">#{idx + 1}</span>
                <div className={`w-2.5 h-2.5 rounded-full ${prio.dot}`} title={prio.label} />
                <div>
                  <span className="font-mono text-blue-400 font-medium">{oc.codigo}</span>
                  <span className="mx-2 text-white/20">•</span>
                  <span className="text-white">{oc.supplier?.nombre}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {oc.estado === 'PARCIAL' && <span className="px-2.5 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-medium">PARCIAL</span>}
                <span className="px-2.5 py-1 bg-white/5 text-white/50 rounded-full text-xs">{prio.label}</span>
              </div>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/40">Recibido</span>
                <span className="text-white/60 font-medium">{oc.porcentajeRecibido || 0}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${oc.porcentajeRecibido >= 100 ? 'bg-emerald-500' : oc.porcentajeRecibido > 0 ? 'bg-amber-500' : 'bg-white/10'}`}
                  style={{ width: `${Math.min(oc.porcentajeRecibido || 0, 100)}%` }} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {(oc.lineas || []).map((l: any) => (
                <div key={l.id} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg text-xs">
                  <span className="text-white/70">{l.sku?.codigo}</span>
                  <span className="text-white/30">|</span>
                  <span className="text-white/50">{l.metrajeRecibido || 0}/{l.metrajeTotal}m</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Clock size={14} />
                {eta ? <span>ETA: {eta.toLocaleDateString('es-MX')} ({daysToEta !== null && daysToEta > 0 ? `en ${daysToEta} días` : daysToEta === 0 ? 'hoy' : 'atrasado'})</span> : <span>Sin ETA</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handlePartialReceipt(oc)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-500/20 transition-colors">
                  <Package size={14} /> Registrar Recepción
                </button>
                <button onClick={() => handleComplete(oc.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors">
                  <CheckCircle size={14} /> Completar
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

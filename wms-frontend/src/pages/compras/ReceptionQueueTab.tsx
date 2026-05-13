import { useState } from 'react';
import { Clock, CheckCircle, Package } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ui/ConfirmModal';

const prioColors: Record<number, { dot: string; label: string; bg: string }> = {
  1: { dot: 'bg-red-500', label: 'Urgente', bg: 'bg-red-50' },
  2: { dot: 'bg-amber-500', label: 'Alta', bg: 'bg-amber-50' },
  3: { dot: 'bg-blue-500', label: 'Media', bg: 'bg-blue-50' },
  4: { dot: 'bg-gray-400', label: 'Baja', bg: 'bg-gray-50' },
};

export default function ReceptionQueueTab({ onRefresh }: { onRefresh: () => void }) {
  const { data: queue, isLoading, refetch } = useApi<any[]>(['purchasing-reception-queue'], '/purchasing/reception-queue');

  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; action: () => void; confirmText: string }>({
    open: false, title: '', message: '', action: () => {}, confirmText: 'Confirmar',
  });

  const handleComplete = (oc: any) => {
    setConfirmModal({
      open: true,
      title: 'Marcar OC como Completada',
      message: `¿Confirmas que se ha recibido todo el pedido de ${oc.supplier?.nombre}? (${oc.codigo})`,
      confirmText: 'Marcar como Completada',
      action: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        try {
          await api.post(`/purchasing/orders/${oc.id}/complete`);
          toast.success(`OC ${oc.codigo} marcada como completada`);
          refetch(); onRefresh();
        } catch (e: any) { toast.error(e?.response?.data?.message || 'Error'); }
      },
    });
  };

  const handlePartialReceipt = async (oc: any) => {
    // For now we use a simplified receipt approach with toast
    try {
      const lineas = [];
      for (const l of (oc.lineas || [])) {
        const rollosStr = window.prompt(`${l.sku?.nombre} (${l.sku?.codigo}) — ¿Cuántos rollos recibidos?`, '0');
        if (rollosStr === null) return; // cancelled
        const rollos = parseInt(rollosStr) || 0;
        if (rollos > 0) {
          lineas.push({ skuId: l.skuId, rollosRecibidos: rollos, metrajeRecibido: rollos * (Number(l.metrajePorRollo) || 50) });
        }
      }
      if (lineas.length === 0) { toast.error('No se registraron rollos'); return; }
      await api.post(`/purchasing/orders/${oc.id}/partial-receipt`, { lineas });
      toast.success('Recepción parcial registrada exitosamente');
      refetch(); onRefresh();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Error al registrar recepción'); }
  };

  if (isLoading) return <div className="text-center text-gray-400 py-12">Cargando cola de recepción...</div>;
  if (!queue || queue.length === 0) return (
    <div className="bg-white rounded-xl border p-12 text-center">
      <Package size={48} className="mx-auto mb-3 text-gray-300" />
      <p className="font-medium text-gray-500">No hay OC pendientes de recepción</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">Ordenado por prioridad y fecha estimada de llegada</p>
      {queue.map((oc: any, idx: number) => {
        const prio = prioColors[oc.prioridad] || prioColors[3];
        const eta = oc.fechaEstimadaEntrega ? new Date(oc.fechaEstimadaEntrega) : null;
        const daysToEta = eta ? Math.ceil((eta.getTime() - Date.now()) / 86400000) : null;
        return (
          <div key={oc.id} className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow">
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
                {oc.estado === 'PARCIAL' && <span className="px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">PARCIAL</span>}
                <span className={`px-2.5 py-1 rounded-full text-xs ${prio.bg} text-gray-600`}>{prio.label}</span>
              </div>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Recibido</span>
                <span className="text-gray-600 font-medium">{oc.porcentajeRecibido || 0}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${oc.porcentajeRecibido >= 100 ? 'bg-emerald-500' : oc.porcentajeRecibido > 0 ? 'bg-amber-400' : 'bg-gray-200'}`}
                  style={{ width: `${Math.min(oc.porcentajeRecibido || 0, 100)}%` }} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {(oc.lineas || []).map((l: any) => (
                <div key={l.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-xs">
                  <span className="text-gray-700 font-medium">{l.sku?.codigo}</span>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-500">{Number(l.metrajeRecibido) || 0}/{Number(l.metrajeTotal)}m</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Clock size={14} />
                {eta ? <span>ETA: {eta.toLocaleDateString('es-MX')} ({daysToEta !== null && daysToEta > 0 ? `en ${daysToEta} días` : daysToEta === 0 ? 'hoy' : 'atrasado'})</span> : <span>Sin ETA</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handlePartialReceipt(oc)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors">
                  <Package size={14} /> Registrar Recepción
                </button>
                <button onClick={() => handleComplete(oc)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors">
                  <CheckCircle size={14} /> Completar
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
      />
    </div>
  );
}

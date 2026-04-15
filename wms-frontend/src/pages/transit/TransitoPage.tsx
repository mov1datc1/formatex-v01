import { useApi } from '../../hooks/useApi';
import { WmsIcon, KpiIcon } from '../../components/icons/WmsIcons';

export default function TransitoPage() {
  const { data: shipments, isLoading } = useApi<any[]>(['transit'], '/transit');
  const { data: stats } = useApi<any>(['transit-stats'], '/transit/stats');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-3">
          <KpiIcon icon={WmsIcon.Transit} gradient="from-blue-500 to-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventario en Tránsito</h1>
            <p className="text-gray-500 text-sm">Embarques entrantes — Disponibilidad para ATC</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <WmsIcon.Transit size={16} className="text-blue-500" strokeWidth={1.75} />
              <p className="text-xs text-gray-400 uppercase font-medium">Embarques Activos</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.totalEmbarques}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <WmsIcon.Ruler size={16} className="text-emerald-500" strokeWidth={1.75} />
              <p className="text-xs text-gray-400 uppercase font-medium">Metraje Esperado</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.metrajeEsperado?.toLocaleString()}m</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <WmsIcon.Locked size={16} className="text-amber-500" strokeWidth={1.75} />
              <p className="text-xs text-gray-400 uppercase font-medium">Ya Reservado</p>
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.metrajeReservado?.toLocaleString()}m</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <WmsIcon.Unlocked size={16} className="text-purple-500" strokeWidth={1.75} />
              <p className="text-xs text-gray-400 uppercase font-medium">Disponible p/ Venta</p>
            </div>
            <p className="text-2xl font-bold text-purple-600">{stats.metrajeDisponible?.toLocaleString()}m</p>
          </div>
        </div>
      )}

      {/* Próximo embarque */}
      {stats?.proximoEmbarque && (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-5 text-white flex items-center justify-between shadow-lg shadow-blue-500/20">
          <div className="flex items-center gap-3">
            <WmsIcon.Transit size={24} className="text-white/80" />
            <div>
              <p className="text-sm opacity-80">Próximo Embarque</p>
              <p className="font-bold text-lg">{stats.proximoEmbarque.codigo}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-80">Llega en</p>
            <p className="font-bold text-3xl">{stats.proximoEmbarque.diasParaLlegar} <span className="text-base font-normal opacity-80">días</span></p>
          </div>
        </div>
      )}

      {/* Shipments list */}
      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Cargando embarques...</div>
      ) : !shipments?.length ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
          <WmsIcon.Transit size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">No hay embarques en tránsito</p>
        </div>
      ) : (
        <div className="space-y-4">
          {shipments.map((s: any) => (
            <div key={s.id} className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <WmsIcon.Shipping size={20} className="text-blue-500" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{s.codigo}</h3>
                    <p className="text-xs text-gray-400">{s.supplier?.nombre} — {s.ordenCompra || 'Sin OC'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                    s.diasParaLlegar <= 7 ? 'bg-amber-100 text-amber-700' :
                    s.diasParaLlegar <= 14 ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    <WmsIcon.Clock size={12} />
                    {s.diasParaLlegar > 0 ? `En ${s.diasParaLlegar} días` : 'Hoy'}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">ETA: {new Date(s.fechaEstimada).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Meters bar */}
              <div className="bg-gray-50 rounded-xl p-3 mb-3">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500">Total: {s.metrajeTotal}m</span>
                  <span className="text-amber-600">Reservado: {s.metrajeReservado}m</span>
                  <span className="text-emerald-600 font-semibold">Disponible: {s.metrajeDisponible}m</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all" style={{ width: `${Math.max(((s.metrajeTotal - s.metrajeDisponible) / s.metrajeTotal) * 100, 2)}%` }}></div>
                </div>
              </div>

              {/* Lines */}
              <div className="space-y-1.5">
                {s.lineas?.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <WmsIcon.Rolls size={14} className="text-gray-400" />
                      <span className="text-sm font-medium">{l.sku?.nombre}</span>
                      {l.sku?.color && <span className="text-xs text-gray-400">({l.sku.color})</span>}
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-gray-600">{l.cantidadRollos} rollos</span>
                      <span className="mx-2 text-gray-300">|</span>
                      <span className="text-blue-600 font-semibold">{l.metrajeTotal}m</span>
                      {l.metrajeReservado > 0 && <span className="ml-2 text-amber-600">({l.metrajeReservado}m reservados)</span>}
                    </div>
                  </div>
                ))}
              </div>

              {s.transportista && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-3">
                  <WmsIcon.Shipping size={12} />
                  <span>{s.transportista}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

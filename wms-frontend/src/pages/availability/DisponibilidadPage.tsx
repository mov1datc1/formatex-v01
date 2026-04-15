import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { WmsIcon, KpiIcon, StatusBadge } from '../../components/icons/WmsIcons';

export default function DisponibilidadPage() {
  const [selectedSku, setSelectedSku] = useState('');
  const { data: skus } = useApi<PaginatedResponse<any>>(['skus-disp'], '/catalog/skus', { limit: 100 });
  const { data: availability, isLoading } = useApi<any>(['availability', selectedSku], `/reservations/availability/${selectedSku}`, {}, !!selectedSku);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <KpiIcon icon={WmsIcon.Search} gradient="from-emerald-500 to-teal-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disponibilidad Unificada</h1>
          <p className="text-gray-500 text-sm">Stock físico + En tránsito — Vista ATC para cotizar sin doble-venta</p>
        </div>
      </div>

      {/* SKU selector */}
      <div className="bg-white rounded-xl border p-5">
        <label className="block text-xs font-medium text-gray-500 mb-2">Selecciona una tela para consultar disponibilidad:</label>
        <select value={selectedSku} onChange={e => setSelectedSku(e.target.value)} className="w-full max-w-lg px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all">
          <option value="">— Seleccionar SKU —</option>
          {skus?.data?.map((s: any) => (
            <option key={s.id} value={s.id}>{s.nombre} — {s.color} ({s.codigo}) | ${Number(s.precioReferencia || 0).toFixed(2)}/m</option>
          ))}
        </select>
      </div>

      {isLoading && selectedSku && <div className="text-center text-gray-400 py-8">Consultando disponibilidad...</div>}

      {availability && (
        <div className="space-y-6">
          {/* Total Global */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-6 text-white shadow-lg shadow-emerald-500/20">
            <div className="flex items-center gap-2 mb-2 opacity-80">
              <WmsIcon.Chart size={18} />
              <p className="text-sm">Total Disponible Global (Stock + Tránsito)</p>
            </div>
            <p className="text-4xl font-bold">{availability.totalGlobal.toLocaleString()} metros</p>
            <div className="flex gap-8 mt-3 text-sm opacity-80">
              <div className="flex items-center gap-1.5">
                <WmsIcon.HU size={14} />
                <span>Físico: {availability.fisico.disponible}m</span>
              </div>
              <div className="flex items-center gap-1.5">
                <WmsIcon.Transit size={14} />
                <span>Tránsito: {availability.transito.disponible}m</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stock Físico */}
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center gap-2 mb-4">
                <WmsIcon.Stock size={20} className="text-gray-700" strokeWidth={1.75} />
                <h3 className="font-bold text-gray-900">Stock Físico en Almacén</h3>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-emerald-600 font-medium">Disponible</p>
                  <p className="text-xl font-bold text-emerald-700">{availability.fisico.disponible}m</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-amber-600 font-medium">Res. Blanda (24h)</p>
                  <p className="text-xl font-bold text-amber-700">{availability.fisico.reservadoBlando}m</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-red-600 font-medium">Res. Firme</p>
                  <p className="text-xl font-bold text-red-700">{availability.fisico.reservadoFirme}m</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-3">{availability.fisico.rollos} rollos totales</p>

              <div className="max-h-60 overflow-y-auto space-y-1.5">
                {availability.fisico.detalle?.map((hu: any) => (
                  <div key={hu.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <WmsIcon.Rolls size={13} className="text-gray-400" />
                      <span className="font-mono text-xs text-blue-600">{hu.codigo}</span>
                      {hu.ubicacion && <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded font-mono">{hu.ubicacion}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{hu.metraje}m</span>
                      {hu.estado === 'DISPONIBLE' ? (
                        <StatusBadge icon={WmsIcon.Unlocked} label="" bgClass="bg-emerald-100" textClass="text-emerald-700" />
                      ) : hu.estado === 'RESERVADO_BLANDO' ? (
                        <StatusBadge icon={WmsIcon.Timer} label="" bgClass="bg-amber-100" textClass="text-amber-700" />
                      ) : (
                        <StatusBadge icon={WmsIcon.Locked} label="" bgClass="bg-red-100" textClass="text-red-700" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* En Tránsito */}
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center gap-2 mb-4">
                <WmsIcon.Transit size={20} className="text-gray-700" strokeWidth={1.75} />
                <h3 className="font-bold text-gray-900">En Tránsito</h3>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-600 font-medium">Total Esperado</p>
                  <p className="text-xl font-bold text-blue-700">{availability.transito.total}m</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-amber-600 font-medium">Reservado</p>
                  <p className="text-xl font-bold text-amber-700">{availability.transito.reservado}m</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-emerald-600 font-medium">Disponible</p>
                  <p className="text-xl font-bold text-emerald-700">{availability.transito.disponible}m</p>
                </div>
              </div>

              {availability.transito.embarques?.length > 0 ? (
                <div className="space-y-2">
                  {availability.transito.embarques.map((emb: any, i: number) => (
                    <div key={i} className="p-3 bg-blue-50 rounded-xl">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <WmsIcon.Transit size={14} className="text-blue-600" />
                          <span className="font-semibold text-sm text-blue-700">{emb.embarque}</span>
                        </div>
                        <span className="text-xs text-gray-500">ETA: {new Date(emb.eta).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-gray-500">
                        <span>{emb.rollos} rollos</span>
                        <span>Total: {emb.metrajeTotal}m</span>
                        <span className="text-emerald-600 font-medium">Disp: {emb.metrajeDisponible}m</span>
                      </div>
                      {emb.transportista && (
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                          <WmsIcon.Shipping size={11} /><span>{emb.transportista}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-6">
                  <WmsIcon.Transit size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Sin embarques en tránsito</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!selectedSku && (
        <div className="bg-white rounded-xl border p-12 text-center">
          <WmsIcon.Search size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600 font-medium">Selecciona un SKU para ver disponibilidad</p>
          <p className="text-sm text-gray-400 mt-1">Verás stock físico + tránsito, con reservas activas</p>
        </div>
      )}
    </div>
  );
}

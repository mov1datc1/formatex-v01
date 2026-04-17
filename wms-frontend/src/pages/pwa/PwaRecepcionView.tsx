import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import { ScanBarcode, ArrowRight, MapPin } from 'lucide-react';

export default function PwaRecepcionView() {
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const { data: resp } = useApi<PaginatedResponse<any>>(['pwa-receipts'], '/reception', { limit: 20 });
  const receipts = resp?.data || [];

  const loadDetail = async (id: string) => {
    try { const { data } = await api.get(`/reception/${id}`); setSelectedReceipt(data); }
    catch { toast.error('Error al cargar'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center">
          <ScanBarcode size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Recepción</h1>
          <p className="text-xs text-gray-400">{receipts.length} recepciones</p>
        </div>
      </div>

      {!selectedReceipt ? (
        <div className="space-y-2">
          {!receipts.length ? (
            <div className="text-center py-16">
              <ScanBarcode size={48} className="mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500">No hay recepciones</p>
            </div>
          ) : receipts.map((r: any) => (
            <button key={r.id} onClick={() => loadDetail(r.id)}
              className="w-full text-left bg-gray-900 rounded-2xl p-4 active:scale-[0.98] transition-all border border-gray-800">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-emerald-400">{r.codigo}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${r.estado === 'COMPLETADA' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-amber-900/50 text-amber-400'}`}>{r.estado}</span>
                  <ArrowRight size={16} className="text-gray-600" />
                </div>
              </div>
              <p className="text-sm text-gray-300 mt-1">{r.supplier?.nombre}</p>
              <p className="text-xs text-gray-600">{r.totalRollos} rollos · {r.totalPallets} pallets</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
            <div className="flex justify-between items-center mb-3">
              <span className="font-mono font-bold text-lg text-emerald-400">{selectedReceipt.codigo}</span>
              <button onClick={() => setSelectedReceipt(null)} className="text-xs text-gray-400 bg-gray-800 px-3 py-1.5 rounded-lg">← Volver</button>
            </div>
            <p className="text-sm text-gray-300">{selectedReceipt.supplier?.nombre}</p>
            {selectedReceipt.ordenCompra && <p className="text-xs text-gray-500">OC: {selectedReceipt.ordenCompra}</p>}
          </div>

          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
            HUs ({selectedReceipt.lineas?.reduce((a: number, l: any) => a + (l.handlingUnits?.length || 0), 0)})
          </p>

          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
            {selectedReceipt.lineas?.map((linea: any) =>
              linea.handlingUnits?.map((hu: any) => (
                <div key={hu.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-800">
                  <div>
                    <p className="font-mono font-bold text-sm text-blue-400">{hu.codigo}</p>
                    <p className="text-xs text-gray-500">{hu.sku?.nombre}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{hu.metrajeActual}m</p>
                    <div className="flex items-center gap-1 text-[10px]">
                      <MapPin size={10} className="text-gray-500" />
                      <span className="text-gray-400">{hu.ubicacion?.codigo || 'SIN UBICAR'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

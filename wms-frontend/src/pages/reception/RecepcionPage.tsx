import { useState } from 'react';
import { useApi, useMutationApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';

export default function RecepcionPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [page, setPage] = useState(1);
  const { data: resp, isLoading } = useApi<PaginatedResponse<any>>(['receipts', page], '/reception', { page, limit: 10 });
  const mutation = useMutationApi('/reception');

  // Form state
  const [supplierId, setSupplierId] = useState('');
  const [ordenCompra, setOrdenCompra] = useState('');
  const [transportista, setTransportista] = useState('');
  const [lineas, setLineas] = useState([{ skuId: '', cantidadRollos: 1, metrajePorRollo: 50, palletRef: '' }]);
  const { data: suppliers } = useApi<PaginatedResponse<any>>(['suppliers'], '/catalog/suppliers', { limit: 100 });
  const { data: skus } = useApi<PaginatedResponse<any>>(['skus'], '/catalog/skus', { limit: 100 });

  const addLinea = () => setLineas([...lineas, { skuId: '', cantidadRollos: 1, metrajePorRollo: 50, palletRef: '' }]);
  const removeLinea = (idx: number) => setLineas(lineas.filter((_, i) => i !== idx));
  const updateLinea = (idx: number, field: string, value: any) => {
    const updated = [...lineas];
    (updated[idx] as any)[field] = value;
    setLineas(updated);
  };

  const handleSubmit = async () => {
    if (!supplierId) return toast.error('Selecciona un proveedor');
    if (lineas.some((l) => !l.skuId)) return toast.error('Selecciona SKU en todas las líneas');
    if (lineas.some((l) => l.cantidadRollos < 1)) return toast.error('Cantidad de rollos debe ser al menos 1');
    try {
      const result = await mutation.mutateAsync({ supplierId, ordenCompra, transportista, lineas });
      toast.success('✅ Recepción registrada — HUs creados con ubicación asignada');
      setShowForm(false);
      setLineas([{ skuId: '', cantidadRollos: 1, metrajePorRollo: 50, palletRef: '' }]);
      setSupplierId('');
      setOrdenCompra('');
      setTransportista('');
      // Seleccionar automáticamente la recepción recién creada para ver los HUs
      if (result) setSelectedReceipt(result);
    } catch (e: any) {
      console.error('Error registrando recepción:', e);
      toast.error(e?.response?.data?.message || 'Error al registrar recepción');
    }
  };

  const loadReceiptDetail = async (id: string) => {
    try {
      const { data } = await api.get(`/reception/${id}`);
      setSelectedReceipt(data);
    } catch { toast.error('Error al cargar detalle'); }
  };

  const totalRollos = lineas.reduce((a, l) => a + l.cantidadRollos, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recepción de Rollos</h1>
          <p className="text-gray-500 text-sm">Registro de entradas desde pallets — {resp?.total || 0} recepciones</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setSelectedReceipt(null); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          {showForm ? '✕ Cerrar' : '+ Nueva Recepción'}
        </button>
      </div>

      {/* Formulario de nueva recepción */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Nueva Recepción de Pallet</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Proveedor *</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                <option value="">Seleccionar...</option>
                {suppliers?.data?.map((s: any) => <option key={s.id} value={s.id}>{s.nombre} ({s.codigo})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Orden de Compra</label>
              <input value={ordenCompra} onChange={(e) => setOrdenCompra(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" placeholder="OC-2026-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Transportista</label>
              <input value={transportista} onChange={(e) => setTransportista(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" placeholder="Nombre del transportista" />
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Líneas de Recepción ({totalRollos} rollos total)</h3>
              <button onClick={addLinea} className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100">+ Agregar Línea</button>
            </div>
            {lineas.map((l, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end mb-2 p-3 bg-gray-50 rounded-lg">
                <div className="col-span-4">
                  <label className="block text-xs text-gray-400 mb-1">SKU Tela *</label>
                  <select value={l.skuId} onChange={(e) => updateLinea(idx, 'skuId', e.target.value)} className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-sm">
                    <option value="">Seleccionar...</option>
                    {skus?.data?.map((s: any) => <option key={s.id} value={s.id}>{s.nombre} ({s.codigo})</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Rollos</label>
                  <input type="number" min={1} value={l.cantidadRollos} onChange={(e) => updateLinea(idx, 'cantidadRollos', +e.target.value)} className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">m/rollo</label>
                  <input type="number" min={1} value={l.metrajePorRollo} onChange={(e) => updateLinea(idx, 'metrajePorRollo', +e.target.value)} className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-sm" />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs text-gray-400 mb-1">Pallet Ref</label>
                  <input value={l.palletRef} onChange={(e) => updateLinea(idx, 'palletRef', e.target.value)} className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-sm" placeholder="PAL-001" />
                </div>
                <div className="col-span-1 flex justify-center">
                  {lineas.length > 1 && <button onClick={() => removeLinea(idx)} className="text-red-400 hover:text-red-600 text-lg">✕</button>}
                </div>
              </div>
            ))}
          </div>

          {/* Info box — Flujo */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700 font-medium mb-1">📦 Flujo automático al registrar:</p>
            <ol className="text-xs text-blue-600 list-decimal list-inside space-y-0.5">
              <li><b>Crear HUs</b> — Genera un código único por cada rollo</li>
              <li><b>Ubicación inteligente</b> — Asigna ubicación en zonas de rollos enteros según disponibilidad de espacio</li>
              <li><b>Etiquetado pendiente</b> — Los HUs quedan como ⬜ pendientes de etiqueta para imprimir en módulo Etiquetas</li>
              <li><b>Escaneo de validación</b> — El operador escanea la etiqueta del rollo y la ubicación para confirmar colocación</li>
            </ol>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button onClick={handleSubmit} disabled={mutation.isPending} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
              {mutation.isPending ? '⏳ Registrando...' : `📥 Registrar Recepción (${totalRollos} rollos)`}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Receipt List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
          {isLoading ? <div className="p-8 text-center text-gray-400">Cargando...</div> : !resp?.data?.length ? (
            <div className="p-12 text-center text-gray-400">
              <p className="text-4xl mb-2">📥</p>
              <p>No hay recepciones aún</p>
              <p className="text-xs mt-1">Haz clic en "+ Nueva Recepción" para comenzar</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Código</th>
                  <th className="px-4 py-3 text-left">Proveedor</th>
                  <th className="px-4 py-3 text-center">Rollos</th>
                  <th className="px-4 py-3 text-center">Pallets</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {resp.data.map((r: any) => (
                  <tr key={r.id} className={`hover:bg-gray-50 cursor-pointer ${selectedReceipt?.id === r.id ? 'bg-blue-50' : ''}`} onClick={() => loadReceiptDetail(r.id)}>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 font-medium">{r.codigo}</td>
                    <td className="px-4 py-3 font-medium">{r.supplier?.nombre || '—'}</td>
                    <td className="px-4 py-3 text-center font-semibold">{r.totalRollos}</td>
                    <td className="px-4 py-3 text-center">{r.totalPallets}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.estado === 'COMPLETADA' ? 'bg-emerald-100 text-emerald-700' : r.estado === 'EN_PROCESO' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100'}`}>{r.estado}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Receipt Detail Panel */}
        <div className="bg-white rounded-xl border p-5">
          {!selectedReceipt ? (
            <div className="text-center text-gray-400 py-12">
              <p className="text-4xl mb-2">📦</p>
              <p className="text-sm">Selecciona una recepción</p>
              <p className="text-xs mt-1">para ver los HUs y ubicaciones asignadas</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">{selectedReceipt.codigo}</h3>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${selectedReceipt.estado === 'COMPLETADA' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{selectedReceipt.estado}</span>
              </div>
              <div className="text-sm space-y-1 text-gray-600">
                <p>🏭 <b>Proveedor:</b> {selectedReceipt.supplier?.nombre}</p>
                {selectedReceipt.ordenCompra && <p>📄 <b>OC:</b> {selectedReceipt.ordenCompra}</p>}
                {selectedReceipt.transportista && <p>🚛 <b>Transportista:</b> {selectedReceipt.transportista}</p>}
              </div>

              <div className="border-t pt-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  HUs Generados ({selectedReceipt.lineas?.reduce((a: number, l: any) => a + (l.handlingUnits?.length || 0), 0)})
                </h4>
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {selectedReceipt.lineas?.map((linea: any) =>
                    linea.handlingUnits?.map((hu: any) => (
                      <div key={hu.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
                        <div>
                          <p className="font-mono font-semibold text-blue-600">{hu.codigo}</p>
                          <p className="text-gray-400">{hu.sku?.nombre}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{hu.metrajeActual}m</p>
                          <div className="flex items-center gap-1">
                            <span className={`w-4 text-center ${hu.etiquetaImpresa ? '' : 'text-gray-300'}`}>
                              {hu.etiquetaImpresa ? '✅' : '⬜'}
                            </span>
                            <span className="font-mono text-[10px] bg-blue-100 text-blue-700 px-1 rounded">
                              📍 {hu.ubicacion?.codigo || 'SIN UBICAR'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Botón para ir a Etiquetar */}
              <div className="border-t pt-3">
                <a href="/etiquetas" className="block text-center px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200">
                  Ir a Etiquetar estos rollos
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search } from 'lucide-react';
import { api } from '../../config/api';

interface OCLine {
  skuId: string;
  skuLabel: string;
  cantidadRollos: number;
  metrajePorRollo: number;
  metrajeTotal: number;
  precioUnitario: number;
  precioFuente: string;
  importe: number;
}

export default function NuevaOCModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [skuSearch, setSkuSearch] = useState('');
  const [lineas, setLineas] = useState<OCLine[]>([]);
  const [prioridad, setPrioridad] = useState(3);
  const [fechaETA, setFechaETA] = useState('');
  const [condiciones, setCondiciones] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/catalog/suppliers', { params: { limit: 100 } }).then(r => setSuppliers(r.data?.data || r.data || [])).catch(() => {});
    api.get('/catalog/skus', { params: { limit: 100 } }).then(r => setSkus(r.data?.data || r.data || [])).catch(() => {});
  }, []);

  const filteredSuppliers = suppliers.filter((s: any) =>
    s.nombre?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.codigo?.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const filteredSkus = skus.filter((s: any) =>
    s.nombre?.toLowerCase().includes(skuSearch.toLowerCase()) ||
    s.codigo?.toLowerCase().includes(skuSearch.toLowerCase())
  );

  const addSku = async (sku: any) => {
    if (lineas.some(l => l.skuId === sku.id)) return;
    let precio = 0, fuente = 'MANUAL';
    if (supplierId) {
      try {
        const r = await api.get('/purchasing/resolve-price', { params: { supplierId, skuId: sku.id } });
        precio = r.data.precio || 0;
        fuente = r.data.fuente || 'MANUAL';
      } catch { }
    }
    const rollos = 1;
    const metraje = sku.metrajeEstandar || 50;
    setLineas([...lineas, {
      skuId: sku.id, skuLabel: `${sku.codigo} — ${sku.nombre}`,
      cantidadRollos: rollos, metrajePorRollo: metraje, metrajeTotal: rollos * metraje,
      precioUnitario: precio, precioFuente: fuente, importe: rollos * metraje * precio,
    }]);
    setSkuSearch('');
  };

  const updateLine = (idx: number, field: string, value: number) => {
    setLineas(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: value };
      if (field === 'cantidadRollos' || field === 'metrajePorRollo') updated.metrajeTotal = updated.cantidadRollos * updated.metrajePorRollo;
      if (field === 'precioUnitario') updated.precioFuente = 'MANUAL';
      updated.importe = updated.metrajeTotal * updated.precioUnitario;
      return updated;
    }));
  };

  const removeLine = (idx: number) => setLineas(prev => prev.filter((_, i) => i !== idx));
  const subtotal = lineas.reduce((s, l) => s + l.importe, 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  const fuenteLabel: Record<string, { text: string; color: string }> = {
    PRECIO_PROVEEDOR: { text: 'Precio Negociado', color: 'text-emerald-400' },
    ULTIMA_COMPRA: { text: 'Última Compra', color: 'text-blue-400' },
    PRECIO_REFERENCIA: { text: 'Precio Referencia', color: 'text-amber-400' },
    MANUAL: { text: 'Manual', color: 'text-white/50' },
  };

  const handleSubmit = async () => {
    if (!supplierId || lineas.length === 0) return;
    setSaving(true);
    try {
      await api.post('/purchasing/orders', {
        supplierId, prioridad,
        fechaEstimadaEntrega: fechaETA || undefined,
        condicionesPago: condiciones || undefined,
        notas: notas || undefined,
        lineas: lineas.map(l => ({ skuId: l.skuId, cantidadRollos: l.cantidadRollos, metrajePorRollo: l.metrajePorRollo, metrajeTotal: l.metrajeTotal, precioUnitario: l.precioUnitario, precioFuente: l.precioFuente })),
      });
      onCreated();
    } catch (e: any) { alert(e?.response?.data?.message || 'Error al crear OC'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-primary-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Nueva Orden de Compra</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg"><X size={18} className="text-white/50" /></button>
        </div>
        <div className="p-5 space-y-5">
          {/* Proveedor */}
          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">1. Proveedor</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input value={supplierSearch} onChange={e => { setSupplierSearch(e.target.value); if (supplierId) setSupplierId(''); }}
                placeholder="Buscar proveedor..." className="w-full pl-10 pr-4 py-2.5 bg-primary-800/50 border border-white/10 rounded-xl text-white text-sm focus:border-blue-500/50 focus:outline-none" />
            </div>
            {supplierSearch && !supplierId && (
              <div className="mt-1 bg-primary-800 border border-white/10 rounded-xl max-h-32 overflow-y-auto">
                {filteredSuppliers.map((s: any) => (
                  <button key={s.id} onClick={() => { setSupplierId(s.id); setSupplierSearch(s.nombre); }}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5">{s.codigo} — {s.nombre}</button>
                ))}
              </div>
            )}
            {supplierId && <p className="text-xs text-emerald-400 mt-1">✓ Proveedor seleccionado</p>}
          </div>

          {/* SKUs */}
          {supplierId && (
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">2. SKUs</label>
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input value={skuSearch} onChange={e => setSkuSearch(e.target.value)}
                  placeholder="Buscar SKU por código o nombre..." className="w-full pl-10 pr-4 py-2.5 bg-primary-800/50 border border-white/10 rounded-xl text-white text-sm focus:border-blue-500/50 focus:outline-none" />
              </div>
              {skuSearch && (
                <div className="mb-3 bg-primary-800 border border-white/10 rounded-xl max-h-32 overflow-y-auto">
                  {filteredSkus.map((s: any) => (
                    <button key={s.id} onClick={() => addSku(s)}
                      className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 flex justify-between">
                      <span>{s.codigo} — {s.nombre}</span><Plus size={16} className="text-blue-400" />
                    </button>
                  ))}
                </div>
              )}
              {lineas.length > 0 && (
                <div className="bg-primary-800/30 border border-white/5 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-white/5">
                      {['SKU', 'Rollos', 'm/Rollo', 'Total m', 'Precio/m', 'Fuente', 'Importe', ''].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs text-white/40">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {lineas.map((l, i) => {
                        const f = fuenteLabel[l.precioFuente] || fuenteLabel.MANUAL;
                        return (
                          <tr key={i} className="border-b border-white/5">
                            <td className="px-3 py-2 text-white text-xs">{l.skuLabel}</td>
                            <td className="px-3 py-2"><input type="number" min={1} value={l.cantidadRollos} onChange={e => updateLine(i, 'cantidadRollos', parseInt(e.target.value) || 1)} className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center" /></td>
                            <td className="px-3 py-2"><input type="number" min={1} value={l.metrajePorRollo} onChange={e => updateLine(i, 'metrajePorRollo', parseFloat(e.target.value) || 50)} className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center" /></td>
                            <td className="px-3 py-2 text-white/60 text-xs">{l.metrajeTotal}m</td>
                            <td className="px-3 py-2"><input type="number" step="0.01" value={l.precioUnitario} onChange={e => updateLine(i, 'precioUnitario', parseFloat(e.target.value) || 0)} className="w-20 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center" /></td>
                            <td className="px-3 py-2"><span className={`text-xs ${f.color}`}>{f.text}</span></td>
                            <td className="px-3 py-2 text-white font-medium text-xs">${l.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2"><button onClick={() => removeLine(i)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Details */}
          {lineas.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs text-white/50 mb-1 block">Prioridad</label>
                <select value={prioridad} onChange={e => setPrioridad(Number(e.target.value))} className="w-full px-3 py-2 bg-primary-800/50 border border-white/10 rounded-xl text-white text-sm">
                  <option value={1}>🔴 Urgente</option><option value={2}>🟡 Alta</option><option value={3}>🔵 Media</option><option value={4}>⚪ Baja</option>
                </select></div>
              <div><label className="text-xs text-white/50 mb-1 block">Fecha estimada entrega</label>
                <input type="date" value={fechaETA} onChange={e => setFechaETA(e.target.value)} className="w-full px-3 py-2 bg-primary-800/50 border border-white/10 rounded-xl text-white text-sm" /></div>
              <div><label className="text-xs text-white/50 mb-1 block">Condiciones de pago</label>
                <input value={condiciones} onChange={e => setCondiciones(e.target.value)} placeholder="Ej: Crédito 30 días" className="w-full px-3 py-2 bg-primary-800/50 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/30" /></div>
              <div><label className="text-xs text-white/50 mb-1 block">Notas</label>
                <input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Notas opcionales" className="w-full px-3 py-2 bg-primary-800/50 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/30" /></div>
            </div>
          )}

          {/* Totals */}
          {lineas.length > 0 && (
            <div className="bg-primary-800/50 border border-white/10 rounded-xl p-4">
              <div className="flex justify-between text-sm mb-1"><span className="text-white/50">Subtotal</span><span className="text-white">${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between text-sm mb-1"><span className="text-white/50">IVA (16%)</span><span className="text-white">${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-white/10"><span className="text-white">Total</span><span className="text-blue-400">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-white/10">
          <button onClick={onClose} className="px-5 py-2.5 border border-white/10 text-white/60 rounded-xl hover:bg-white/5 text-sm">Cancelar</button>
          <button onClick={handleSubmit} disabled={!supplierId || lineas.length === 0 || saving}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 hover:shadow-lg hover:shadow-blue-500/25 transition-all">
            {saving ? 'Creando...' : 'Crear Orden de Compra'}
          </button>
        </div>
      </div>
    </div>
  );
}

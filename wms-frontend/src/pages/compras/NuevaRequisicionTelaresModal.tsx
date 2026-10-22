import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search, Building2, Truck, AlertTriangle, Layers, Clock, Check } from 'lucide-react';
import { api } from '../../config/api';
import toast from 'react-hot-toast';

interface RequisicionLine {
  skuId: string;
  skuLabel: string;
  skuColor?: string;
  cantidadRollos: number;
  metrajeTotal: number;
}

export default function NuevaRequisicionTelaresModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [skus, setSkus] = useState<any[]>([]);
  const [skuSearch, setSkuSearch] = useState('');
  const [lineas, setLineas] = useState<RequisicionLine[]>([]);
  const [solicitante, setSolicitante] = useState('Israel (Jefe de Almacén)');
  const [prioridad, setPrioridad] = useState(3);
  const [ruta, setRuta] = useState('Camioneta Flota Propia (Tototlán ➔ Zapopan)');
  const [horaEstimada, setHoraEstimada] = useState('Vuelta Vespertina (02:00 PM)');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/catalog/skus', { params: { limit: 150 } })
      .then(r => setSkus(r.data?.data || r.data || []))
      .catch(() => {});
  }, []);

  const filteredSkus = skus.filter((s: any) =>
    s.nombre?.toLowerCase().includes(skuSearch.toLowerCase()) ||
    s.codigo?.toLowerCase().includes(skuSearch.toLowerCase()) ||
    s.color?.toLowerCase().includes(skuSearch.toLowerCase())
  );

  const addSku = (sku: any) => {
    if (lineas.some(l => l.skuId === sku.id)) {
      toast.error('Esta tela ya está agregada en la requisición');
      return;
    }
    const metrajePorRollo = 50; // 50m estándar rollo cerrado en Telares
    setLineas([
      ...lineas,
      {
        skuId: sku.id,
        skuLabel: `${sku.codigo} — ${sku.nombre}`,
        skuColor: sku.color,
        cantidadRollos: 2,
        metrajeTotal: 2 * metrajePorRollo,
      },
    ]);
    setSkuSearch('');
  };

  const updateRollos = (idx: number, cantidadRollos: number) => {
    const validRollos = Math.max(1, cantidadRollos || 1);
    setLineas(prev =>
      prev.map((l, i) => (i === idx ? { ...l, cantidadRollos: validRollos, metrajeTotal: validRollos * 50 } : l))
    );
  };

  const removeLine = (idx: number) => {
    setLineas(prev => prev.filter((_, i) => i !== idx));
  };

  const totalRollos = lineas.reduce((sum, l) => sum + l.cantidadRollos, 0);
  const totalMetros = lineas.reduce((sum, l) => sum + l.metrajeTotal, 0);

  const handleSubmit = async () => {
    if (lineas.length === 0) {
      toast.error('Agrega al menos una tela a la requisición');
      return;
    }
    setSaving(true);
    try {
      await api.post('/purchasing/requisiciones-telares', {
        solicitante,
        prioridad,
        ruta,
        horaEstimada,
        notas: notas || undefined,
        lineas: lineas.map(l => ({
          skuId: l.skuId,
          cantidadRollos: l.cantidadRollos,
        })),
      });
      toast.success('Requisición enviada a Telares y Tejidos exitosamente');
      onCreated();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al crear requisición');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Cabecera */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300 border border-white/15">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                  Resurtido Inter-Compañía
                </span>
                <span className="bg-white/10 text-white/80 px-2 py-0.5 rounded text-[10px] font-mono">
                  Formatex ➔ Telares
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight mt-0.5 text-white">
                Nueva Requisición de Rollos a Telares y Tejidos
              </h2>
              <p className="text-xs text-white/70 mt-0.5">
                Origen: <strong className="text-amber-300">Bodega Río Tototlán (BOD-TNT)</strong> ➔ Destino: <strong className="text-white">Almacén Formatex Zapopan (BOD-PRI)</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Banner Informativo Regla de Telares */}
        <div className="bg-amber-50 px-6 py-2.5 border-b border-amber-200/60 flex items-center gap-2.5 text-xs text-amber-900">
          <AlertTriangle size={15} className="text-amber-600 shrink-0" />
          <span>
            <strong>Regla Operativa Telares:</strong> En la bodega de Tototlán el surtido es únicamente en <strong>rollos enteros cerrados (50 metros c/u)</strong>. No aplica servicio de corte ni retazos fraccionados.
          </span>
        </div>

        {/* Cuerpo del formulario */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Metadata del solicitante y ruta */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Solicitante</label>
              <select
                value={solicitante}
                onChange={e => setSolicitante(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
              >
                <option value="Israel (Jefe de Almacén)">Israel (Jefe de Almacén)</option>
                <option value="Elba Vázquez (Compras/Costeo)">Elba Vázquez (Compras/Costeo)</option>
                <option value="Andrea Ramírez (Operaciones/ATC)">Andrea Ramírez (Operaciones/ATC)</option>
                <option value="Nayeli (E-Commerce/Ventas)">Nayeli (E-Commerce/Ventas)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Vuelta de Camioneta / Horario</label>
              <select
                value={horaEstimada}
                onChange={e => setHoraEstimada(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
              >
                <option value="Vuelta Matutina (08:30 AM)">Vuelta Matutina (08:30 AM)</option>
                <option value="Vuelta Vespertina (02:00 PM)">Vuelta Vespertina (02:00 PM)</option>
                <option value="Viaje Especial Urgente">Viaje Especial Urgente</option>
                <option value="Ruta Ocotlán / Tototlán (Mar/Jue)">Ruta Ocotlán / Tototlán (Mar/Jue)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Prioridad de Carga</label>
              <select
                value={prioridad}
                onChange={e => setPrioridad(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
              >
                <option value={3}>Normal (Resurtido de Racks)</option>
                <option value={1}>🚨 Alta / Urgente (Pedido Especial Cliente)</option>
                <option value={5}>Baja (Stock de previsión)</option>
              </select>
            </div>
          </div>

          {/* Buscador de Telas */}
          <div className="space-y-2">
            <label className="block font-bold text-gray-700">Agregar Telas a la Requisición</label>
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar tela por nombre o código (ej: Enigma, Lino, Terciopelo, LENIGIRO)..."
                value={skuSearch}
                onChange={e => setSkuSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            {/* Dropdown de resultados */}
            {skuSearch.trim().length > 1 && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-100 z-10">
                {filteredSkus.slice(0, 10).map((sku: any) => (
                  <button
                    key={sku.id}
                    type="button"
                    onClick={() => addSku(sku)}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-gray-900">{sku.nombre}</span>
                      {sku.color && <span className="ml-2 text-gray-500">({sku.color})</span>}
                      <span className="ml-2 font-mono text-[10px] text-gray-400">[{sku.codigo}]</span>
                    </div>
                    <span className="text-blue-600 font-semibold text-xs">+ Agregar</span>
                  </button>
                ))}
                {filteredSkus.length === 0 && (
                  <div className="p-3 text-center text-gray-400">No se encontraron telas</div>
                )}
              </div>
            )}
          </div>

          {/* Lista de Partidas Seleccionadas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-bold text-gray-600 px-1">
              <span>PARTIDAS SOLICITADAS ({lineas.length})</span>
              <span>{totalRollos} rollos • {totalMetros.toLocaleString()} metros</span>
            </div>

            {lineas.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl text-center text-gray-400">
                <Layers size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="font-semibold text-gray-600">No has agregado telas a la requisición</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Usa el buscador de arriba para seleccionar telas del catálogo</p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100 bg-white">
                {lineas.map((l, idx) => (
                  <div key={l.skuId} className="p-3 flex items-center justify-between gap-4 hover:bg-gray-50">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-sm">{l.skuLabel}</p>
                      {l.skuColor && <p className="text-gray-500 text-[11px]">Color: {l.skuColor}</p>}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-gray-500 font-medium">Rollos:</label>
                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={l.cantidadRollos}
                          onChange={e => updateRollos(idx, parseInt(e.target.value) || 1)}
                          className="w-16 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-center font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="text-right w-24">
                        <span className="font-mono font-bold text-gray-900 text-sm">
                          {l.metrajeTotal} m
                        </span>
                        <span className="text-[10px] text-gray-400 block">50m / rollo</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                        title="Quitar tela"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notas para el Chofer */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Notas / Instrucciones de Carga</label>
            <textarea
              rows={2}
              placeholder="Ej: Avisar a Martín en Tototlán para tenerlos en rampa listos antes de las 2:00 PM. Llevar remito firmado."
              value={notas}
              onChange={e => setNotas(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-gray-900"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Total Requisición: <strong className="text-blue-700">{totalRollos} rollos</strong> ({totalMetros.toLocaleString()} metros)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || lineas.length === 0}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <Truck size={16} />
              <span>{saving ? 'Enviando...' : 'Enviar Requisición a Telares'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

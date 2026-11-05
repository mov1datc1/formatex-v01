import { useState, useEffect } from 'react';
import { X, Trash2, Search, Building2, FileText, Layers, Mail } from 'lucide-react';
import { api } from '../../config/api';
import toast from 'react-hot-toast';

export interface RequisicionLine {
  skuId: string;
  skuLabel: string;
  skuColor?: string;
  cantidadRollos: number;
  metrajeTotal: number;
  conceptoOverride?: string;
}

export default function NuevaRequisicionTelaresModal({
  onClose,
  onCreated,
  initialLineas,
  initialReferencia,
  initialNotas,
}: {
  onClose: () => void;
  onCreated: (createdReq?: any) => void;
  initialLineas?: RequisicionLine[];
  initialReferencia?: string;
  initialNotas?: string;
}) {
  const [skus, setSkus] = useState<any[]>([]);
  const [skuSearch, setSkuSearch] = useState('');
  const [lineas, setLineas] = useState<RequisicionLine[]>(initialLineas || []);
  const [empresaEmisora, setEmpresaEmisora] = useState<'FORMATEX' | 'DICATEX'>('FORMATEX');
  const [solicitante, setSolicitante] = useState('Israel (Jefe de Almacén)');
  const [referencia, setReferencia] = useState(initialReferencia || 'PRIORIDAD #1');
  const [domicilioEntrega, setDomicilioEntrega] = useState('Clz. J. Gonzalez Gallo 1505 Col. Atlas');
  const [emailTelares, setEmailTelares] = useState('encargada.telares@telaresytejidos.com.mx');
  const [prioridad, setPrioridad] = useState(1);
  const [ruta, setRuta] = useState('Camioneta Flota Propia (Tototlán ➔ Guadalajara)');
  const [horaEstimada, setHoraEstimada] = useState('Corte 13:00 hrs / Envío 14:00 hrs');
  const [notas, setNotas] = useState(initialNotas || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/catalog/skus', { params: { limit: 200 } })
      .then((r) => setSkus(r.data?.data || r.data || []))
      .catch(() => {});
  }, []);

  const filteredSkus = skus.filter(
    (s: any) =>
      s.nombre?.toLowerCase().includes(skuSearch.toLowerCase()) ||
      s.codigo?.toLowerCase().includes(skuSearch.toLowerCase()) ||
      s.color?.toLowerCase().includes(skuSearch.toLowerCase())
  );

  const addSku = (sku: any) => {
    if (lineas.some((l) => l.skuId === sku.id)) {
      toast.error('Esta tela ya está agregada en la orden de requisición');
      return;
    }
    const concepto = `${sku.nombre || ''}${sku.color ? ` ${sku.color}` : ''}`.trim().toUpperCase();
    setLineas([
      ...lineas,
      {
        skuId: sku.id,
        skuLabel: `${sku.nombre}${sku.color ? ` ${sku.color}` : ''}`,
        skuColor: sku.color,
        cantidadRollos: 4,
        metrajeTotal: 200,
        conceptoOverride: concepto,
      },
    ]);
    setSkuSearch('');
  };

  const updateMetros = (idx: number, metros: number) => {
    const validMetros = Math.max(1, metros || 1);
    const calcRollos = Math.max(1, Math.ceil(validMetros / 50));
    setLineas((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, metrajeTotal: validMetros, cantidadRollos: calcRollos } : l))
    );
  };

  const updateRollos = (idx: number, cantidadRollos: number) => {
    const validRollos = Math.max(1, cantidadRollos || 1);
    setLineas((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, cantidadRollos: validRollos, metrajeTotal: validRollos * 50 } : l))
    );
  };

  const removeLine = (idx: number) => {
    setLineas((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalRollos = lineas.reduce((sum, l) => sum + l.cantidadRollos, 0);
  const totalMetros = lineas.reduce((sum, l) => sum + l.metrajeTotal, 0);

  const handleSubmit = async () => {
    if (lineas.length === 0) {
      toast.error('Agrega al menos una tela a la Orden de Compra / Requisición');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/purchasing/requisiciones-telares', {
        solicitante,
        prioridad,
        ruta,
        horaEstimada,
        referencia,
        domicilioEntrega,
        empresaEmisora,
        emailTelares,
        notas: notas || undefined,
        lineas: lineas.map((l) => ({
          skuId: l.skuId,
          cantidadRollos: l.cantidadRollos,
          metrajeTotal: l.metrajeTotal,
          conceptoOverride: l.conceptoOverride || l.skuLabel,
        })),
      });
      toast.success('Orden de Compra / Requisición generada exitosamente');
      onCreated(res.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al crear requisición');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Cabecera */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 flex items-center justify-center text-amber-300 border border-amber-400/30">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded uppercase tracking-wider">
                  Perfil: Jefe de Almacén
                </span>
                <span className="bg-white/10 text-white/90 px-2 py-0.5 rounded text-[10px] font-mono">
                  Proveedor: TELARES Y TEJIDOS (TTE140429HZ6)
                </span>
              </div>
              <h2 className="text-lg font-black tracking-tight mt-1 text-white">
                Nueva Orden de Compra / Requisición a Telares y Tejidos
              </h2>
              <p className="text-xs text-white/75">
                Genera el documento PDF oficial de Orden de Compra (formato STO) para enviar por correo a la encargada de Telares.
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

        {/* Datos Fijos del Proveedor Telares y Tejidos (como en el documento físico) */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Datos del Proveedor (Fijo)</span>
            <p className="font-black text-slate-900">TELARES Y TEJIDOS · RFC: TTE140429HZ6</p>
            <p className="text-slate-600">
              Avenida Dr. Roberto Michel 2903, El Mirador Álamo, C.P. 44895, Guadalajara, Jalisco
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Condiciones Fiscales de Traspaso</span>
            <p className="font-bold text-slate-800">Unidad: METRO · Impuestos: IVA - 0, · Valor Unitario: $0.00</p>
            <p className="text-slate-500">Importe con letra: cero Pesos 00/100 M.N.</p>
          </div>
        </div>

        {/* Cuerpo del formulario */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Metadata del documento PDF */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Empresa Solicitante (Encabezado PDF)</label>
              <select
                value={empresaEmisora}
                onChange={(e) => setEmpresaEmisora(e.target.value as 'FORMATEX' | 'DICATEX')}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-slate-900 cursor-pointer"
              >
                <option value="FORMATEX">FORMATEX (Forma Textil)</option>
                <option value="DICATEX">DICATEX (Empresa Asociada)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Solicitado por (Jefe de Almacén)</label>
              <input
                type="text"
                value={solicitante}
                onChange={(e) => setSolicitante(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-900"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Referencia en Orden de Compra</label>
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Ej. PRIORIDAD #1"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-indigo-900"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-gray-700 mb-1">Datos de Entrega (Domicilio Destino)</label>
              <input
                type="text"
                value={domicilioEntrega}
                onChange={(e) => setDomicilioEntrega(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                <Mail size={12} className="text-indigo-600" /> Correo Encargada de Telares
              </label>
              <input
                type="email"
                value={emailTelares}
                onChange={(e) => setEmailTelares(e.target.value)}
                placeholder="correo@telares.com"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-900"
              />
            </div>
          </div>

          {/* Buscador de Telas */}
          <div className="space-y-2">
            <label className="block font-bold text-gray-700">
              Agregar Conceptos / Telas a la Orden de Compra
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar tela por nombre, color o código (ej: Alpha Expresso, Dryland Ebony, Enjoy Plus, Osi Flax)..."
                value={skuSearch}
                onChange={(e) => setSkuSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
            </div>

            {skuSearch.trim().length > 1 && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-100 z-10">
                {filteredSkus.slice(0, 12).map((sku: any) => (
                  <button
                    key={sku.id}
                    type="button"
                    onClick={() => addSku(sku)}
                    className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-gray-900">{sku.nombre}</span>
                      {sku.color && <span className="ml-2 text-gray-600 font-semibold">{sku.color}</span>}
                      <span className="ml-2 font-mono text-[10px] text-gray-400">[{sku.codigo}]</span>
                    </div>
                    <span className="text-indigo-600 font-bold text-xs">+ Agregar a Orden</span>
                  </button>
                ))}
                {filteredSkus.length === 0 && (
                  <div className="p-3 text-center text-gray-400">No se encontraron telas</div>
                )}
              </div>
            )}
          </div>

          {/* Tabla de Partidas estilo Orden de Compra */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-bold text-gray-700 px-1">
              <span>CONCEPTOS / DESCRIPCIÓN EN LA ORDEN ({lineas.length})</span>
              <span className="text-indigo-700">
                Total: {totalMetros.toLocaleString('es-MX')} METRO ({totalRollos} rollos aprox.)
              </span>
            </div>

            {lineas.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl text-center text-gray-400">
                <Layers size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="font-semibold text-gray-600">No has agregado telas a la Orden de Compra</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Usa el buscador de arriba o selecciona pedidos desde el Monitor de Backorders
                </p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Concepto / Descripción</th>
                      <th className="py-2.5 px-2 text-center">Rollos (Ref)</th>
                      <th className="py-2.5 px-2 text-center">Cantidad (Metros)</th>
                      <th className="py-2.5 px-2 text-center">Unidad</th>
                      <th className="py-2.5 px-2 text-center">Impuestos</th>
                      <th className="py-2.5 px-3 text-right">Quitar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lineas.map((l, idx) => (
                      <tr key={`${l.skuId}-${idx}`} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={l.conceptoOverride ?? l.skuLabel}
                            onChange={(e) => {
                              const val = e.target.value;
                              setLineas((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, conceptoOverride: val } : item))
                              );
                            }}
                            className="w-full font-bold text-slate-900 bg-transparent border-b border-transparent focus:border-indigo-400 focus:outline-none text-xs uppercase"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="number"
                            min={1}
                            value={l.cantidadRollos}
                            onChange={(e) => updateRollos(idx, parseInt(e.target.value) || 1)}
                            className="w-16 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-center font-semibold text-slate-700"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="number"
                            min={1}
                            value={l.metrajeTotal}
                            onChange={(e) => updateMetros(idx, parseInt(e.target.value) || 1)}
                            className="w-24 px-2.5 py-1 bg-indigo-50/60 border border-indigo-200 rounded-lg text-center font-black text-indigo-800"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-600">METRO</td>
                        <td className="py-2.5 px-2 text-center font-mono text-slate-500">IVA - 0,</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Observaciones en el PDF</label>
            <textarea
              rows={2}
              placeholder="Observaciones adicionales para la encargada de Telares..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-xs text-gray-600">
            Total Orden: <strong className="text-indigo-700">{totalMetros.toLocaleString('es-MX')} METRO</strong> (
            {totalRollos} rollos) · Importe: <strong>cero Pesos 00/100 M.N.</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || lineas.length === 0}
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-blue-700 text-white rounded-xl font-black shadow-md hover:from-indigo-700 hover:to-blue-800 cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <FileText size={16} />
              <span>{saving ? 'Generando...' : 'Generar Orden de Compra / Requisición'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

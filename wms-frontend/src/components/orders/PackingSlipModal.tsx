import React, { useRef } from 'react';
import {
  Printer, X, Truck, Shield, MapPin, Building,
  Package, Calendar, User, FileText, CheckCircle2, Phone
} from 'lucide-react';

interface PackingSlipModalProps {
  order: any;
  onClose: () => void;
}

export default function PackingSlipModal({ order, onClose }: PackingSlipModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const client = order.client || {};
  const deliveryAddress = order.deliveryAddress;
  const lineas = order.lineas || [];

  // Calcular rollos y metraje total
  let totalRollos = 0;
  let totalMetros = 0;
  lineas.forEach((l: any) => {
    totalMetros += Number(l.metrajeSurtido || l.metrajeRequerido || 0);
    if (l.assignments && l.assignments.length > 0) {
      totalRollos += l.assignments.length;
    } else {
      // Si no hay asignación explícita, estimar rollos según metraje / 50m
      totalRollos += Math.max(1, Math.ceil(Number(l.metrajeRequerido || 0) / 50));
    }
  });

  const handlePrint = () => {
    window.print();
  };

  const fechaEmision = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: '2-digit' })
    : new Date().toLocaleDateString('es-MX');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Container */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:w-full print:rounded-none">
        {/* Modal Toolbar (Oculto en Impresión) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-400/30">
              <Package size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm">Packing List Oficial — {order.codigo}</h3>
              <p className="text-xs text-slate-400">{client.nombre || 'Cliente General'} · Formato Oficial Formatex</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Printer size={15} />
              <span>Imprimir / Descargar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Document Body (Área imprimible) */}
        <div className="p-8 overflow-y-auto flex-1 print:p-0 print:overflow-visible text-gray-800" ref={printRef}>
          {/* Estilos específicos de impresión */}
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              .printable-packing-slip, .printable-packing-slip * {
                visibility: visible;
              }
              .printable-packing-slip {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 15mm;
                font-size: 11pt;
                color: #000;
                background: #fff;
              }
              @page {
                size: letter portrait;
                margin: 10mm;
              }
            }
          `}</style>

          <div className="printable-packing-slip space-y-6 max-w-3xl mx-auto">
            {/* Header Formatex */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div>
                <h1 className="text-xl font-black text-slate-950 tracking-tight">FORMA TEXTIL</h1>
                <p className="text-xs text-gray-600 font-semibold">FORMA TEXTIL S. DE R.L. DE C.V.</p>
                <p className="text-[11px] text-gray-500 mt-0.5">RFC: <strong className="font-mono text-gray-700">FTE140429FP3</strong></p>
                <p className="text-[11px] text-gray-500">Rio La Barca No. 1680, Col. Atlas, CP: 44870</p>
                <p className="text-[11px] text-gray-500">Guadalajara, Jalisco, México · Tel: (33) 3650-5447</p>
              </div>

              <div className="text-right">
                <div className="inline-block bg-slate-900 text-white font-mono font-bold text-xs uppercase px-3 py-1 rounded">
                  PACKING LIST
                </div>
                <p className="text-base font-extrabold text-slate-950 font-mono mt-1">{order.codigo}</p>
                <p className="text-xs text-gray-500 mt-0.5">Fecha: <strong>{fechaEmision}</strong></p>
                <p className="text-[10px] text-gray-400 mt-0.5">Comprobante Oficial de Embarque</p>
              </div>
            </div>

            {/* Bloque Destinatario & Domicilio de Entrega */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* Columna Izquierda: Destinatario Fiscal */}
              <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wide border-b border-gray-200 pb-1 mb-1.5">
                  <Building size={13} className="text-slate-500" />
                  <span>Destinatario (Datos Fiscales)</span>
                </div>
                <p className="font-bold text-sm text-slate-900">{client.nombre || '—'}</p>
                <p className="text-gray-600">RFC: <strong className="font-mono">{client.rfc || 'XAXX010101000'}</strong></p>
                <p className="text-gray-600 leading-tight">
                  {client.direccion || 'Domicilio no registrado en padrón'}
                </p>
                {client.cp && <p className="text-gray-600">CP: <strong>{client.cp}</strong></p>}
                {client.telefono && <p className="text-gray-600">Tel: {client.telefono}</p>}
              </div>

              {/* Columna Derecha: Domicilio de Entrega Logística */}
              <div className="border border-indigo-100 rounded-xl p-3.5 bg-indigo-50/30 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-indigo-900 text-[11px] uppercase tracking-wide border-b border-indigo-200 pb-1 mb-1.5">
                  <MapPin size={13} className="text-indigo-600" />
                  <span>Domicilio de Entrega (Destino)</span>
                </div>
                {deliveryAddress ? (
                  <>
                    <p className="font-bold text-slate-900">{deliveryAddress.alias || 'Bodega de Entrega'}</p>
                    <p className="text-gray-700 leading-tight">
                      {deliveryAddress.calleNumero}, {deliveryAddress.colonia || ''}
                    </p>
                    <p className="text-gray-700">
                      CP: <strong>{deliveryAddress.cp || '—'}</strong> · {deliveryAddress.municipio || ''}, {deliveryAddress.estado || ''}
                    </p>
                    {deliveryAddress.contacto && (
                      <p className="text-gray-600">Atención: <strong>{deliveryAddress.contacto}</strong></p>
                    )}
                    {deliveryAddress.telefono && (
                      <p className="text-gray-600">Tel: {deliveryAddress.telefono}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-slate-800">{client.nombre}</p>
                    <p className="text-gray-600 leading-tight">
                      {client.direccion || 'Mismo que domicilio fiscal'}
                    </p>
                    <p className="text-gray-500 italic mt-1">Entrega directa en domicilio del cliente</p>
                  </>
                )}
                {order.deliveryContactName && (
                  <p className="text-indigo-950 font-medium pt-1 border-t border-indigo-100">
                    Receptor en Destino: <strong>{order.deliveryContactName}</strong> {order.deliveryContactPhone ? `(${order.deliveryContactPhone})` : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Parámetros Logísticos de Embarque */}
            <div className="grid grid-cols-4 gap-2 text-xs border border-gray-200 rounded-xl p-3 bg-slate-50">
              <div>
                <span className="block text-[10px] text-gray-500 uppercase font-semibold">Fletera</span>
                <strong className="text-slate-900 font-medium">{order.fletera || 'TRAVISA / Castores'}</strong>
              </div>
              <div>
                <span className="block text-[10px] text-gray-500 uppercase font-semibold">Seguro de Carga</span>
                <span className={`inline-flex items-center gap-1 font-semibold ${order.envioAsegurado ? 'text-indigo-700' : 'text-gray-700'}`}>
                  {order.envioAsegurado ? 'ASEGURADO' : 'SIN SEGURO'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-500 uppercase font-semibold">Tipo de Entrega</span>
                <strong className="text-slate-900 font-medium">DOMICILIO POR COBRAR</strong>
              </div>
              <div>
                <span className="block text-[10px] text-gray-500 uppercase font-semibold">Valor Declarado</span>
                <strong className="text-emerald-700 font-mono font-bold">
                  ${Number(order.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                </strong>
              </div>
            </div>

            {/* Totales Resumen */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">
                Resumen de Carga:
              </span>
              <div className="flex gap-6 font-mono">
                <span>Partidas: <strong className="text-white text-sm">{lineas.length}</strong></span>
                <span>Total Rollos/Bultos: <strong className="text-amber-400 text-sm">{totalRollos}</strong></span>
                <span>Total Metros: <strong className="text-emerald-400 text-sm">{totalMetros.toFixed(2)} MTS</strong></span>
              </div>
            </div>

            {/* Tabla Detallada de Mercancía */}
            <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-gray-100 text-gray-700 text-[10px] uppercase font-bold tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 w-24">Clave SAT</th>
                    <th className="py-2.5 px-3 w-28">Código SKU</th>
                    <th className="py-2.5 px-3">Concepto / Descripción</th>
                    <th className="py-2.5 px-3 w-24 text-right">Cantidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lineas.map((line: any, idx: number) => {
                    const sku = line.sku || {};
                    const assignments = line.assignments || [];
                    const mts = Number(line.metrajeSurtido || line.metrajeRequerido || 0);

                    return (
                      <React.Fragment key={line.id || idx}>
                        <tr className="bg-white hover:bg-gray-50/50">
                          <td className="py-2.5 px-3 text-center text-gray-400 font-mono font-semibold">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono text-gray-600">
                            {sku.claveSat || '11161800'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {sku.codigo || '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-slate-950">{sku.nombre || 'Tela Sintética'}</p>
                            <p className="text-[11px] text-gray-500">
                              {sku.color ? `Color: ${sku.color}` : ''}
                              {sku.composicion ? ` · Comp: ${sku.composicion}` : ''}
                              {sku.anchoMetros ? ` · Ancho: ${sku.anchoMetros}m` : ''}
                            </p>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {mts.toFixed(2)} MTS
                          </td>
                        </tr>

                        {/* Desglose individual de rollos / HUs (como en Formatex oficial) */}
                        {assignments.length > 0 && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={5} className="py-2 px-3 pl-12 text-[10px]">
                              <div className="font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                                <span>Desglose de Rollos Asignados ({assignments.length} rollos):</span>
                              </div>
                              <div className="grid grid-cols-4 md:grid-cols-6 gap-1.5 font-mono text-gray-700">
                                {assignments.map((a: any, aIdx: number) => (
                                  <div key={a.id || aIdx} className="bg-white border border-gray-200 px-2 py-0.5 rounded flex justify-between">
                                    <span className="text-gray-500">{a.hu?.codigo || `R${aIdx + 1}`}:</span>
                                    <strong className="text-slate-900">{Number(a.metrajeTomado || 0).toFixed(1)}m</strong>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Observaciones y Notas */}
            {(order.notas || order.notasEntrega || order.deliverySchedule) && (
              <div className="border border-gray-200 rounded-xl p-3 text-xs bg-gray-50/50">
                <span className="font-bold text-slate-800 text-[10px] uppercase block mb-1">Observaciones / Instrucciones de Entrega:</span>
                <p className="text-gray-700">
                  {order.notasEntrega || order.notas || 'Sin observaciones particulares.'}
                  {order.deliverySchedule && ` (Horario: ${order.deliverySchedule})`}
                </p>
              </div>
            )}

            {/* Firmas de Conformidad y Recepción (Matching Formato Oficial) */}
            <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs">
              <div className="border-t border-gray-400 pt-2">
                <p className="font-bold text-slate-900">Almacén Formatex</p>
                <p className="text-[10px] text-gray-500">Preparó y Empacó</p>
              </div>
              <div className="border-t border-gray-400 pt-2">
                <p className="font-bold text-slate-900">Transportista / Fletera</p>
                <p className="text-[10px] text-gray-500">Nombre, Firma y Placas</p>
              </div>
              <div className="border-t border-gray-400 pt-2">
                <p className="font-bold text-slate-900">Recibido Conforme Cliente</p>
                <p className="text-[10px] text-gray-500">Nombre, Firma y Sello</p>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[9px] text-gray-400 pt-4 border-t border-gray-100">
              Formatex WMS 360+ · Sistema Integral de Gestión de Almacén · Impreso el {new Date().toLocaleString('es-MX')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

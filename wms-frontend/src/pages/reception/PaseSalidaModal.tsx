import React from 'react';
import { X, Printer, CheckCircle2, Truck, Calendar, Clock, ShieldCheck, FileText, ArrowRight } from 'lucide-react';

interface PaseSalidaModalProps {
  open: boolean;
  onClose: () => void;
  voucher: any;
  receipt?: any;
  onGoToLabeling?: () => void;
}

export default function PaseSalidaModal({
  open,
  onClose,
  voucher,
  receipt,
  onGoToLabeling,
}: PaseSalidaModalProps) {
  if (!open || !voucher) return null;

  const handlePrint = () => {
    window.print();
  };

  const fechaLlegada = voucher.horaLlegada ? new Date(voucher.horaLlegada) : new Date();
  const fechaSalida = voucher.horaLiberacion ? new Date(voucher.horaLiberacion) : new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-100 animate-scale-in my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              ✓
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide">Pase de Salida & Acuse de Liberación</h3>
              <p className="text-xs text-gray-400">Transportista liberado de muelle de descarga</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Printer size={14} /> Imprimir Pase
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Voucher Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 print:p-8">
          {/* Header */}
          <div className="border-b pb-4 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-wider text-gray-900">FORMATEX</span>
                <span className="text-[10px] bg-primary-100 text-primary-700 font-bold px-2 py-0.5 rounded-full uppercase">
                  WMS 360+
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">FORMA TEXTIL S. DE R.L. DE C.V.</p>
              <p className="text-[11px] text-gray-400">Río La Barca No. 1680, Col. Atlas, Guadalajara, Jal.</p>
            </div>
            <div className="text-right">
              <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold block">Folio de Liberación</span>
              <span className="text-base font-mono font-bold text-emerald-600 block">
                {voucher.folioLiberacion || 'LIB-2026-00000'}
              </span>
              <span className="text-[11px] font-mono text-gray-500">
                Recepción: {receipt?.codigo || voucher.sourceId || 'REC-GENERAL'}
              </span>
            </div>
          </div>

          {/* Release Status Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                  Descarga Conforme — Transportista Autorizado para Salir
                </p>
                <p className="text-xs text-emerald-700">
                  Mercancía cotejada al 100% contra manifiesto. Muelle de recepción desocupado.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold bg-white text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-sm">
              MUELLE LIBRE
            </span>
          </div>

          {/* Logistics & Carrier Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <span className="text-gray-400 block font-medium mb-1">Transporte & Chofer</span>
              <p className="font-bold text-gray-900 text-sm">{voucher.choferNombre || 'Israel (Logística Almacén)'}</p>
              <p className="text-gray-600 font-medium mt-0.5 flex items-center gap-1.5">
                <Truck size={12} className="text-gray-400" /> {voucher.transportista || 'Camioneta Tototlán ➔ Zapopan'}
              </p>
              <p className="text-gray-500 font-mono mt-0.5">Placas: <span className="font-bold text-gray-800">{voucher.placas || 'JW-9281-A'}</span></p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <span className="text-gray-400 block font-medium mb-1">Control Horario</span>
              <div className="space-y-1">
                <p className="text-gray-600 flex items-center justify-between">
                  <span>Llegada a Rampa:</span>
                  <span className="font-mono font-semibold text-gray-800">
                    {fechaLlegada.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
                <p className="text-gray-600 flex items-center justify-between">
                  <span>Liberación Chofer:</span>
                  <span className="font-mono font-semibold text-emerald-600">
                    {fechaSalida.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
                <p className="text-gray-400 text-[11px] pt-1 border-t flex items-center justify-between">
                  <span>Fecha:</span>
                  <span>{fechaSalida.toLocaleDateString('es-MX', { dateStyle: 'medium' })}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Discharge Metrics */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
              <span className="text-[11px] text-blue-600 font-medium block">Tarimas / Pallets</span>
              <span className="text-lg font-bold text-blue-900">{voucher.totalPallets || 1}</span>
            </div>
            <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl">
              <span className="text-[11px] text-purple-600 font-medium block">Total Rollos (50m)</span>
              <span className="text-lg font-bold text-purple-900">{voucher.totalRollos || 0}</span>
            </div>
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
              <span className="text-[11px] text-emerald-600 font-medium block">Metros Descargados</span>
              <span className="text-lg font-bold text-emerald-900">{voucher.totalMetros?.toLocaleString() || 0} m</span>
            </div>
          </div>

          {/* Items Table Snapshot */}
          {receipt?.lineas && receipt.lineas.length > 0 && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 border-b flex justify-between">
                <span>Detalle de Rollos Recibidos</span>
                <span className="text-gray-400 font-normal">Destino actual: REC-STAGING-01 (Mesa de Reetiquetado)</span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 text-left border-b bg-white">
                    <th className="px-3 py-1.5 font-medium">SKU / Tela</th>
                    <th className="px-3 py-1.5 text-center font-medium">Rollos</th>
                    <th className="px-3 py-1.5 text-center font-medium">m/rollo</th>
                    <th className="px-3 py-1.5 text-right font-medium">Total (m)</th>
                    <th className="px-3 py-1.5 text-center font-medium">HUs Creados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {receipt.lineas.map((l: any) => (
                    <tr key={l.id} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2 font-medium text-gray-800">
                        {l.handlingUnits?.[0]?.sku?.nombre || 'Tela'}
                        <span className="text-gray-400 block text-[10px] font-mono">
                          {l.handlingUnits?.[0]?.sku?.codigo || l.skuId}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-gray-700">{l.cantidadRollos}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{l.metrajePorRollo} m</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-600">{l.metrajeTotalRecibido} m</td>
                      <td className="px-3 py-2 text-center font-mono text-[11px] text-primary-600">
                        {l.handlingUnits?.length || l.cantidadRollos} HU
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {voucher.notas && (
            <div className="text-xs bg-amber-50/50 border border-amber-100 rounded-lg p-2.5 text-gray-600">
              <span className="font-semibold text-amber-800">Observaciones de Descarga: </span>
              {voucher.notas}
            </div>
          )}

          {/* Signatures Area */}
          <div className="pt-4 border-t border-dashed grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="h-14 border-b border-gray-400 flex items-end justify-center pb-1">
                <span className="font-script text-sm text-gray-600 italic">
                  {voucher.choferNombre || 'Chofer Transportista'}
                </span>
              </div>
              <p className="mt-1 font-semibold text-gray-800">Firma Chofer / Transportista</p>
              <p className="text-[10px] text-gray-400">Declara entrega física concluida</p>
            </div>
            <div>
              <div className="h-14 border-b border-gray-400 flex items-end justify-center pb-1">
                <span className="font-script text-sm text-gray-600 italic">Israel (Jefe de Almacén)</span>
              </div>
              <p className="mt-1 font-semibold text-gray-800">Firma Almacén Formatex</p>
              <p className="text-[10px] text-gray-400">Recepción conforme & liberación de muelle</p>
            </div>
          </div>
        </div>

        {/* Modal Footer (No Print) */}
        <div className="px-6 py-3.5 bg-gray-50 border-t flex items-center justify-between no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cerrar Ventana
          </button>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer size={14} /> Imprimir Comprobante
            </button>
            {onGoToLabeling && (
              <button
                onClick={() => {
                  onClose();
                  onGoToLabeling();
                }}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <span>Ir a Mesa de Reetiquetado</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

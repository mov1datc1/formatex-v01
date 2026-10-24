import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, Truck, User, Calendar, Layers, Hash, CheckSquare, Square, ShieldCheck, ArrowRight, ScanBarcode } from 'lucide-react';
import { api } from '../../config/api';
import toast from 'react-hot-toast';

interface DescargaChecklistModalProps {
  open: boolean;
  onClose: () => void;
  order: any;
  onSuccess: (data: { receipt: any; releaseVoucher: any; husCount: number }) => void;
}

export default function DescargaChecklistModal({
  open,
  onClose,
  order,
  onSuccess,
}: DescargaChecklistModalProps) {
  if (!open || !order) return null;

  // Driver and Carrier info
  const [transportista, setTransportista] = useState(order.ruta || 'Camioneta Formatex (Tototlán ➔ Zapopan)');
  const [choferNombre, setChoferNombre] = useState('Israel (Logística Almacén)');
  const [placas, setPlacas] = useState('JW-9281-A');
  const [totalPallets, setTotalPallets] = useState<number>(1);
  const [notasDescarga, setNotasDescarga] = useState('');
  const [horaLlegada, setHoraLlegada] = useState<string>(() => {
    const d = new Date(Date.now() - 25 * 60000);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  // Barcode / Handheld Scanner state
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lastScannedSku, setLastScannedSku] = useState<string | null>(null);

  // Checklist lines state
  const [lineasState, setLineasState] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleBarcodeScan = (codeToScan?: string) => {
    const raw = (codeToScan || barcodeInput).trim();
    if (!raw) return;

    const lineIndex = lineasState.findIndex(l =>
      l.skuCodigo?.toLowerCase() === raw.toLowerCase() ||
      l.skuNombre?.toLowerCase().includes(raw.toLowerCase()) ||
      raw.toLowerCase().includes(l.skuCodigo?.toLowerCase() || '---')
    );

    if (lineIndex >= 0) {
      setLineasState(prev => {
        const copy = [...prev];
        const current = Number(copy[lineIndex].rollosRecibidos) || 0;
        copy[lineIndex] = { ...copy[lineIndex], rollosRecibidos: current + 1, conforme: true };
        return copy;
      });
      setLastScannedSku(lineasState[lineIndex].skuNombre);
      toast.success(`+1 Rollo: ${lineasState[lineIndex].skuNombre} (Total: ${(Number(lineasState[lineIndex].rollosRecibidos) || 0) + 1})`, { icon: '📦' });
      if (navigator.vibrate) navigator.vibrate(80);
    } else {
      toast.error(`Código escaneado no coincide: ${raw}`, { icon: '⚠️' });
      if (navigator.vibrate) navigator.vibrate([150, 50, 150]);
    }
    setBarcodeInput('');
  };


  useEffect(() => {
    if (!order) return;
    const initial = (order.lineas || []).map((l: any, idx: number) => {
      const esperadoRollos = l.pendienteRollos !== undefined ? l.pendienteRollos : (l.cantidadRollos || 1);
      const metrajePorRollo = Number(l.metrajePorRollo) || 50;
      return {
        id: l.id || `line-${idx}`,
        skuId: l.skuId || l.sku?.id,
        skuNombre: l.sku?.nombre || 'Tela',
        skuCodigo: l.sku?.codigo || 'SKU',
        skuColor: l.sku?.color || '',
        esperadoRollos,
        metrajePorRollo,
        rollosRecibidos: esperadoRollos,
        palletRef: `TAR-0${Math.floor(idx / 2) + 1}`,
        loteProveedor: `TNT-${new Date().getFullYear()}-${String(idx + 1).padStart(2, '0')}`,
        gradoCalidad: 'PRIMERA',
        conforme: true,
      };
    });
    setLineasState(initial);
  }, [order]);

  const handleUpdateLine = (index: number, field: string, val: any) => {
    setLineasState(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleSetAllConforme = () => {
    setLineasState(prev =>
      prev.map(l => ({
        ...l,
        rollosRecibidos: l.esperadoRollos,
        conforme: true,
      }))
    );
    toast.success('Todos los rollos marcados como 100% conforme');
  };

  const totalRollosRecibidos = lineasState.reduce((sum, l) => sum + (Number(l.rollosRecibidos) || 0), 0);
  const totalMetrosRecibidos = lineasState.reduce((sum, l) => sum + (Number(l.rollosRecibidos) || 0) * (Number(l.metrajePorRollo) || 50), 0);
  const allConforme = lineasState.every(l => l.conforme && Number(l.rollosRecibidos) === l.esperadoRollos);

  const handleSubmit = async () => {
    if (totalRollosRecibidos <= 0) {
      return toast.error('Ingresa al menos 1 rollo recibido en la descarga');
    }
    if (!choferNombre.trim()) {
      return toast.error('Ingresa el nombre del chofer o transportista');
    }

    setSubmitting(true);
    try {
      const payload = {
        sourceType: order.tipo || 'REQUISICION_TELARES',
        sourceId: order.id,
        supplierId: order.supplierId || order.supplier?.id,
        ordenCompra: order.codigo,
        transportista,
        choferNombre,
        placas,
        horaLlegada: new Date().toISOString(),
        horaLiberacion: new Date().toISOString(),
        firmaAcuse: 'Firma de chofer recabada físicamente en rampa',
        notasDescarga,
        totalPallets: Number(totalPallets) || 1,
        lineas: lineasState
          .filter(l => Number(l.rollosRecibidos) > 0)
          .map(l => ({
            skuId: l.skuId,
            cantidadRollos: Number(l.rollosRecibidos),
            metrajePorRollo: Number(l.metrajePorRollo) || 50,
            palletRef: l.palletRef,
            loteProveedor: l.loteProveedor,
            gradoCalidad: l.gradoCalidad,
            conforme: l.conforme,
          })),
      };

      const { data } = await api.post('/reception/process-intake', payload);
      toast.success(
        `Descarga completada — ${data.husCount || totalRollosRecibidos} HUs creados. Transportista liberado (${data.releaseVoucher?.folioLiberacion})`
      );
      onSuccess(data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al procesar descarga');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-gray-100 animate-scale-in my-8 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b bg-gradient-to-r from-gray-900 via-gray-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Truck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-wide">Cotejo de Descarga & Liberación</h3>
                <span className="text-[10px] font-mono bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                  {order.codigo}
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-0.5">
                {order.origen || 'Bodega Río Tototlán'} ➔ {order.destino || 'Formatex Zapopan (Río La Barca)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Section 1: Carrier & Vehicle Info */}
          <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Truck size={14} className="text-primary-600" /> Datos de la Unidad & Transportista
              </h4>
              <span className="text-[11px] text-gray-400">Requerido para emitir Pase de Salida</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-gray-500 font-medium mb-1">Línea de Transporte / Ruta</label>
                <input
                  type="text"
                  value={transportista}
                  onChange={e => setTransportista(e.target.value)}
                  placeholder="Camioneta Tototlán ➔ Zapopan"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-primary-200"
                />
              </div>

              <div>
                <label className="block text-gray-500 font-medium mb-1">Nombre del Chofer *</label>
                <input
                  type="text"
                  value={choferNombre}
                  onChange={e => setChoferNombre(e.target.value)}
                  placeholder="Nombre de chofer"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-800 focus:ring-2 focus:ring-primary-200"
                />
              </div>

              <div>
                <label className="block text-gray-500 font-medium mb-1">Placas Vehículo</label>
                <input
                  type="text"
                  value={placas}
                  onChange={e => setPlacas(e.target.value)}
                  placeholder="JW-9281-A"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono text-gray-800 focus:ring-2 focus:ring-primary-200 uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs pt-1">
              <div>
                <label className="block text-gray-500 font-medium mb-1">Total Pallets / Tarimas</label>
                <input
                  type="number"
                  min={1}
                  value={totalPallets}
                  onChange={e => setTotalPallets(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-800 focus:ring-2 focus:ring-primary-200"
                />
              </div>
              <div>
                <label className="block text-gray-500 font-medium mb-1">Hora Llegada a Rampa</label>
                <input
                  type="time"
                  value={horaLlegada}
                  onChange={e => setHoraLlegada(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-primary-200"
                />
              </div>
              <div>
                <label className="block text-gray-500 font-medium mb-1">Muelle de Descarga</label>
                <span className="block px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
                  📍 REC-MUELLE-01 (Zapopan)
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Physical Checklist Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <CheckSquare size={14} className="text-emerald-600" /> Cotejo de Rollos Físicos (Checklist)
                </h4>
                <p className="text-[11px] text-gray-400">Verifica que cada rollo coincida con el pedido de 50 metros</p>
              </div>
              <button
                type="button"
                onClick={handleSetAllConforme}
                className="text-xs px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold border border-emerald-200 transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 size={13} /> Marcar Todo Conforme
              </button>
            </div>

            {/* Quick Scanner Bar (Handheld / Laser Gun) */}
            <div className="bg-gray-900 rounded-xl p-3 flex items-center gap-3 text-white border border-gray-800 shadow-md">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                <ScanBarcode size={18} />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleBarcodeScan(); }}
                  placeholder="Escáner Handheld activo: apunta la pistola láser o escribe código de rollo / SKU..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => handleBarcodeScan()}
                className="px-3 py-1.5 bg-amber-500 text-gray-950 font-bold text-xs rounded-lg hover:bg-amber-400 transition-colors"
              >
                OK
              </button>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 uppercase text-[11px]">
                    <th className="px-3 py-2 text-left">SKU / Tela</th>
                    <th className="px-2 py-2 text-center">Esperado</th>
                    <th className="px-3 py-2 text-center">Rollos Recibidos</th>
                    <th className="px-2 py-2 text-center">Tarima Ref</th>
                    <th className="px-2 py-2 text-center">Lote TNT</th>
                    <th className="px-2 py-2 text-center">Calidad</th>
                    <th className="px-2 py-2 text-center">Conforme</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {lineasState.map((line, idx) => {
                    const isFullyMatched = Number(line.rollosRecibidos) === line.esperadoRollos;
                    return (
                      <tr key={line.id} className="hover:bg-gray-50/50">
                        {/* SKU */}
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-gray-900">{line.skuNombre}</p>
                          <p className="text-[10px] text-gray-400 font-mono">
                            {line.skuCodigo} {line.skuColor ? `· ${line.skuColor}` : ''}
                          </p>
                        </td>

                        {/* Esperado */}
                        <td className="px-2 py-2.5 text-center text-gray-600 font-medium">
                          {line.esperadoRollos} rollos
                          <span className="block text-[10px] text-gray-400">
                            {line.esperadoRollos * line.metrajePorRollo} m
                          </span>
                        </td>

                        {/* Rollos Recibidos input */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateLine(idx, 'rollosRecibidos', Math.max(0, (Number(line.rollosRecibidos) || 0) - 1))}
                              className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold flex items-center justify-center text-xs"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={0}
                              value={line.rollosRecibidos}
                              onChange={e => handleUpdateLine(idx, 'rollosRecibidos', Math.max(0, parseInt(e.target.value) || 0))}
                              className={`w-14 px-2 py-1 text-center font-bold text-sm border rounded-lg ${
                                isFullyMatched ? 'border-emerald-300 bg-emerald-50/40 text-emerald-800' : 'border-amber-300 bg-amber-50/40 text-amber-800'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateLine(idx, 'rollosRecibidos', (Number(line.rollosRecibidos) || 0) + 1)}
                              className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold flex items-center justify-center text-xs"
                            >
                              +
                            </button>
                          </div>
                          <span className="block text-center text-[10px] text-gray-400 mt-0.5">
                            {(Number(line.rollosRecibidos) || 0) * line.metrajePorRollo} m
                          </span>
                        </td>

                        {/* Pallet Ref */}
                        <td className="px-2 py-2.5 text-center">
                          <input
                            type="text"
                            value={line.palletRef}
                            onChange={e => handleUpdateLine(idx, 'palletRef', e.target.value)}
                            className="w-16 px-1.5 py-1 text-center font-mono text-[11px] border border-gray-200 rounded"
                          />
                        </td>

                        {/* Lote */}
                        <td className="px-2 py-2.5 text-center">
                          <input
                            type="text"
                            value={line.loteProveedor}
                            onChange={e => handleUpdateLine(idx, 'loteProveedor', e.target.value)}
                            className="w-20 px-1.5 py-1 text-center font-mono text-[11px] border border-gray-200 rounded"
                          />
                        </td>

                        {/* Calidad */}
                        <td className="px-2 py-2.5 text-center">
                          <select
                            value={line.gradoCalidad}
                            onChange={e => handleUpdateLine(idx, 'gradoCalidad', e.target.value)}
                            className="px-1.5 py-1 text-[11px] font-semibold border border-gray-200 rounded bg-white"
                          >
                            <option value="PRIMERA">Grado A (Primera)</option>
                            <option value="CALIDAD_B">Grado B</option>
                            <option value="RESTRINGIDO">Restringido</option>
                          </select>
                        </td>

                        {/* Conforme check */}
                        <td className="px-2 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleUpdateLine(idx, 'conforme', !line.conforme)}
                            className={`p-1 rounded transition-colors ${
                              line.conforme ? 'text-emerald-600 hover:text-emerald-700' : 'text-red-500 hover:text-red-600'
                            }`}
                          >
                            {line.conforme ? <CheckSquare size={18} /> : <Square size={18} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Staging Zone & Next Step Guidance */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500 text-white mt-0.5">
              <Layers size={16} />
            </div>
            <div className="text-xs">
              <p className="font-bold text-blue-900">Destino Inmediato: REC-STAGING-01 (Mesa de Reetiquetado)</p>
              <p className="text-blue-700 mt-0.5">
                Al confirmar la descarga se generarán automáticamente los códigos de unidad Formatex (
                <span className="font-mono font-bold">HU-2026-xxxxx</span>). A continuación pasarás a la mesa de
                reetiquetado para imprimir las etiquetas oficiales y finalmente acomodarlos en sus racks asignados.
              </p>
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notas u Observaciones de Descarga</label>
            <input
              type="text"
              value={notasDescarga}
              onChange={e => setNotasDescarga(e.target.value)}
              placeholder="Ej: Empaque plástico en perfecto estado, tarimas flejadas correctamente..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-xs">
            <span className="text-gray-500">Total a recibir: </span>
            <span className="font-bold text-gray-900 text-sm">{totalRollosRecibidos} rollos</span>
            <span className="text-gray-400 mx-1.5">•</span>
            <span className="font-bold text-emerald-600 text-sm">{totalMetrosRecibidos.toLocaleString()} m</span>
            {!allConforme && (
              <span className="ml-2 text-amber-600 font-semibold">(Descarga Parcial / Incidencia)</span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || totalRollosRecibidos === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
            >
              <Truck size={15} />
              <span>{submitting ? 'Registrando...' : 'Confirmar Descarga & Liberar Transportista'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

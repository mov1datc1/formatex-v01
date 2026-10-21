import { useState, useEffect } from 'react';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import {
  Calculator, DollarSign, FileSpreadsheet, Save, X,
  ArrowRight, ShieldCheck, Download, Loader2, Sparkles, AlertCircle
} from 'lucide-react';

interface ImportCostingModalProps {
  shipmentId: string;
  onClose: () => void;
  onSaved?: () => void;
}

export default function ImportCostingModal({ shipmentId, onClose, onSaved }: ImportCostingModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [costingData, setCostingData] = useState<any>(null);

  // Form parameters
  const [tipoCambio, setTipoCambio] = useState<number>(18.3688);
  const [gastosPct, setGastosPct] = useState<number>(23.0);
  const [numeroPedimento, setNumeroPedimento] = useState<string>('26 16 1924 6003496');
  const [fechaPagoPedimento, setFechaPagoPedimento] = useState<string>('');
  const [aduanaDespacho, setAduanaDespacho] = useState<string>('16 - Manzanillo');

  const fetchCosting = async (tc: number, gastos: number, ped: string) => {
    try {
      const res = await api.get(`/transit/${shipmentId}/costing`, {
        params: {
          tipoCambio: tc,
          gastosIncrementablesPct: gastos,
          numeroPedimento: ped,
          aduanaDespacho,
        },
      });
      setCostingData(res.data);
      if (res.data.tipoCambio && tc === 18.3688) setTipoCambio(res.data.tipoCambio);
      if (res.data.gastosIncrementablesPct && gastos === 23.0) setGastosPct(res.data.gastosIncrementablesPct);
      if (res.data.numeroPedimento && ped === '26 16 1924 6003496') setNumeroPedimento(res.data.numeroPedimento);
      if (res.data.fechaPagoPedimento) {
        setFechaPagoPedimento(new Date(res.data.fechaPagoPedimento).toISOString().split('T')[0]);
      }
    } catch {
      toast.error('Error al calcular costeo de importación');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCosting(tipoCambio, gastosPct, numeroPedimento);
  }, [shipmentId]);

  const handleRecalculate = () => {
    fetchCosting(tipoCambio, gastosPct, numeroPedimento);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/transit/${shipmentId}/costing`, {
        tipoCambio,
        gastosIncrementablesPct: gastosPct,
        numeroPedimento,
        fechaPagoPedimento: fechaPagoPedimento || undefined,
        aduanaDespacho,
      });
      toast.success('Costeo aplicado y costos puestos en México actualizados en catálogo');
      if (onSaved) onSaved();
      onClose();
    } catch {
      toast.error('Error al guardar costeo');
    } finally {
      setSaving(false);
    }
  };

  const handleExportContpaqi = async () => {
    try {
      const res = await api.get(`/transit/${shipmentId}/export-contpaqi`);
      const rows = res.data?.rows || [];
      if (!rows.length) {
        toast.error('No hay registros para exportar');
        return;
      }

      // Generar CSV para CONTPAQi Comercial (Hoja Electrónica)
      const headers = ['Producto', 'Nombre', 'UM', 'Cantidad', 'Costo', 'Importe', 'Lote', 'Fec. Fab.', 'Fec. Cad.', 'Pedimento'];
      const csvLines = [headers.join(',')];

      rows.forEach((r: any) => {
        csvLines.push([
          `"${r.producto}"`,
          `"${r.nombre.replace(/"/g, '""')}"`,
          `"${r.um}"`,
          r.cantidad,
          r.costo,
          r.importe,
          `"${r.lote}"`,
          `"${r.fecFab}"`,
          `"${r.fecCad}"`,
          `"${r.pedimento}"`,
        ].join(','));
      });

      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `CONTPAQI_IMPORTACION_${costingData?.codigoEmbarque || 'EMBARQUE'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Archivo para Hoja Electrónica CONTPAQi descargado');
    } catch {
      toast.error('Error al exportar para CONTPAQi');
    }
  };

  const totales = costingData?.totales || {};

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in border border-gray-100">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-400/30">
              <Calculator size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Costeo de Importación & Landed Cost</h3>
                <span className="text-[10px] font-mono bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded border border-indigo-400/30 font-semibold">
                  Fórmula Oficial Elba / Formatex
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Embarque: <strong className="text-white font-mono">{costingData?.codigoEmbarque || 'Cargando...'}</strong>
                {costingData?.ordenCompra ? ` · OC: ${costingData.ordenCompra}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-gray-800">
          {loading ? (
            <div className="py-20 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="animate-spin text-indigo-500" />
              <p className="text-sm font-medium">Calculando costeo de importación marítima...</p>
            </div>
          ) : (
            <>
              {/* Formula Bar Banner */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 text-xs text-indigo-950 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Sparkles size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Fórmula de Costeo Landed Formatex:</strong>
                    <p className="text-[11px] text-indigo-900/80 mt-0.5 font-mono">
                      Costo TT = (FOB USD × TC Pedimento) × (1 + %Gastos 23%) · Costo Formatex = Costo TT / 0.88 (Factor Inter-compañía)
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase text-indigo-600 font-semibold block">Margen Transferencia:</span>
                  <span className="font-bold text-indigo-950 font-mono">12% Inter-empresa (Telares → Formatex)</span>
                </div>
              </div>

              {/* Parametrización del Pedimento y Gastos */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1 uppercase">
                    Número de Pedimento SAT *
                  </label>
                  <input
                    type="text"
                    value={numeroPedimento}
                    onChange={(e) => setNumeroPedimento(e.target.value)}
                    placeholder="26 16 1924 6003496"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-400"
                  />
                  <span className="text-[10px] text-gray-400">Año + Aduana + Patente</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1 uppercase">
                    Fecha Pago Pedimento
                  </label>
                  <input
                    type="date"
                    value={fechaPagoPedimento}
                    onChange={(e) => setFechaPagoPedimento(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-400"
                  />
                  <span className="text-[10px] text-gray-400">Fija el TC oficial</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1 uppercase">
                    Tipo de Cambio (MXN/USD) *
                  </label>
                  <input
                    type="number"
                    step={0.0001}
                    value={tipoCambio}
                    onChange={(e) => setTipoCambio(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-indigo-400"
                  />
                  <span className="text-[10px] text-gray-400">TC Pedimento SAT</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1 uppercase">
                    % Gastos Incrementables *
                  </label>
                  <input
                    type="number"
                    step={0.5}
                    value={gastosPct}
                    onChange={(e) => setGastosPct(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-400"
                  />
                  <span className="text-[10px] text-gray-400">Flete + Seguro + Aduana (23%)</span>
                </div>

                <div className="flex flex-col justify-end">
                  <button
                    onClick={handleRecalculate}
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Calculator size={14} /> Recalcular
                  </button>
                </div>
              </div>

              {/* KPI Totales Resumen */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="border border-gray-200 rounded-xl p-3 bg-white">
                  <span className="text-[10px] uppercase text-gray-400 font-semibold block">Total Metros / Rollos</span>
                  <p className="text-lg font-bold text-slate-900 font-mono">
                    {totales.totalMetros?.toLocaleString('es-MX')} m <span className="text-xs text-gray-500 font-normal">({totales.totalRollos} rollos)</span>
                  </p>
                </div>

                <div className="border border-blue-200 rounded-xl p-3 bg-blue-50/40">
                  <span className="text-[10px] uppercase text-blue-600 font-semibold block">Valor Factura FOB (USD)</span>
                  <p className="text-lg font-bold text-blue-800 font-mono">
                    ${totales.totalUSD?.toLocaleString('es-MX', { minimumFractionDigits: 2 })} USD
                  </p>
                </div>

                <div className="border border-amber-200 rounded-xl p-3 bg-amber-50/40">
                  <span className="text-[10px] uppercase text-amber-700 font-semibold block">Costo Telares & Tejidos (TT)</span>
                  <p className="text-lg font-bold text-amber-900 font-mono">
                    ${totales.totalCostoTT?.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                  </p>
                </div>

                <div className="border border-emerald-200 rounded-xl p-3 bg-emerald-50/40">
                  <span className="text-[10px] uppercase text-emerald-700 font-semibold block">Costo Landed Formatex (FM)</span>
                  <p className="text-lg font-bold text-emerald-900 font-mono">
                    ${totales.totalCostoFM?.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                  </p>
                </div>
              </div>

              {/* Detalle por SKU */}
              <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 font-semibold text-gray-700 flex justify-between items-center">
                  <span>Partidas del Embarque & Costos Unitarios Desglosados</span>
                  <span className="text-[11px] text-gray-500 font-normal font-mono">{costingData?.lineas?.length || 0} SKUs</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase font-bold tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-3">SKU / Producto</th>
                        <th className="py-2.5 px-3 text-center">Rollos</th>
                        <th className="py-2.5 px-3 text-right">Metros</th>
                        <th className="py-2.5 px-3 text-right">FOB USD/m</th>
                        <th className="py-2.5 px-3 text-right">Base Pesos</th>
                        <th className="py-2.5 px-3 text-right text-amber-800">Costo TT (+23%)</th>
                        <th className="py-2.5 px-3 text-right text-emerald-800 font-bold">Costo Formatex (/0.88)</th>
                        <th className="py-2.5 px-3 text-right">Subtotal FM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                      {costingData?.lineas?.map((l: any) => (
                        <tr key={l.lineId} className="hover:bg-indigo-50/30">
                          <td className="py-2 px-3 font-sans">
                            <strong className="font-bold text-slate-900 font-mono">{l.codigo}</strong>
                            <p className="text-[11px] text-gray-500">{l.nombre} {l.color ? `· ${l.color}` : ''}</p>
                          </td>
                          <td className="py-2 px-3 text-center text-gray-600">{l.cantidadRollos}</td>
                          <td className="py-2 px-3 text-right text-gray-800 font-bold">{l.metrajeTotal?.toLocaleString()}m</td>
                          <td className="py-2 px-3 text-right text-blue-700">${l.costoFobUSD?.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-gray-600">${l.costoPesosBase?.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-amber-700 font-semibold">${l.costoLandedTT?.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-emerald-700 font-bold bg-emerald-50/40">
                            ${l.costoLandedFM?.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-900 font-bold">
                            ${l.subtotalFM?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExportContpaqi}
              disabled={loading || saving}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <FileSpreadsheet size={15} />
              <span>Exportar a CONTPAQi (Hoja Electrónica CSV)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 sm:flex-none px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving}
              className="flex-1 sm:flex-none px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              <span>Guardar Costeo en Sistema</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

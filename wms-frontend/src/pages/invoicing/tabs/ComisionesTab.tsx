import { useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { BarChart3, Search, Download, Filter } from 'lucide-react';

export default function ComisionesTab() {
  const [vendorFilter, setVendorFilter] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const { data: report, isLoading } = useApi<any>(
    ['commissions', vendorFilter, desde, hasta],
    '/invoicing/commissions',
    { vendorId: vendorFilter || undefined, desde: desde || undefined, hasta: hasta || undefined },
  );

  const vendors = report?.data || [];

  const exportCSV = () => {
    const rows = [['Vendedor', 'Pedido', 'Cliente', 'Total Facturado', 'Lista', '% Comisión', 'Comisión $']];
    for (const v of vendors) {
      for (const f of v.facturas) {
        for (const l of f.lineas) {
          rows.push([v.vendorNombre, f.orderCode, f.clientName, l.importe.toFixed(2), l.lista, l.comisionPct.toFixed(2), l.comision.toFixed(2)]);
        }
      }
    }
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comisiones-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <>
      {/* Grand Totals */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 font-medium">Total Facturado (pagadas)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${Number(report?.granTotalFacturado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 font-medium">Total Comisiones</p>
          <p className="text-2xl font-bold text-violet-600 mt-1">
            ${Number(report?.granTotalComision || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 font-medium">Vendedores</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{report?.totalVendedores || 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-end">
        <div>
          <label className="text-xs font-medium text-gray-500">Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            className="block mt-1 px-3 py-2 border rounded-xl text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            className="block mt-1 px-3 py-2 border rounded-xl text-sm" />
        </div>
        <button onClick={exportCSV} className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 flex items-center gap-2 h-[38px]">
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      {/* Vendor Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Calculando comisiones...</div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <BarChart3 size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">Sin comisiones para el periodo seleccionado</p>
          <p className="text-xs mt-1">Solo se muestran facturas 100% pagadas</p>
        </div>
      ) : vendors.map((vendor: any) => (
        <div key={vendor.vendorId} className="bg-white rounded-xl border overflow-hidden">
          {/* Vendor Header */}
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-5 py-4 border-b flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{vendor.vendorNombre}</h3>
              <p className="text-xs text-gray-500">{vendor.vendorCodigo} · {vendor.facturas.length} factura(s) pagadas</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Comisión Total</p>
              <p className="text-2xl font-bold text-violet-600">${vendor.totalComision.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-gray-400 mt-0.5">de ${vendor.totalFacturado.toLocaleString('es-MX', { minimumFractionDigits: 2 })} facturado</p>
            </div>
          </div>

          {/* Invoices detail */}
          <div className="divide-y">
            {vendor.facturas.map((factura: any) => (
              <div key={factura.orderId} className="px-5 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-primary-600">{factura.orderCode}</span>
                    <span className="text-sm text-gray-600">{factura.clientName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${factura.metodoPago === 'PPD' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {factura.metodoPago}
                    </span>
                  </div>
                  <span className="font-semibold text-violet-600 text-sm">${factura.comisionFactura.toFixed(2)}</span>
                </div>
                {/* Line detail */}
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400">
                      <th className="text-left py-1 font-medium">Metraje</th>
                      <th className="text-left py-1 font-medium">Precio/m</th>
                      <th className="text-right py-1 font-medium">Importe</th>
                      <th className="text-center py-1 font-medium">Lista</th>
                      <th className="text-center py-1 font-medium">% Com</th>
                      <th className="text-right py-1 font-medium">Comisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {factura.lineas.map((l: any, idx: number) => (
                      <tr key={idx} className="text-gray-600">
                        <td className="py-0.5">{l.metraje}m</td>
                        <td className="py-0.5">${l.precioUnitario.toFixed(2)}</td>
                        <td className="py-0.5 text-right font-mono">${l.importe.toFixed(2)}</td>
                        <td className="py-0.5 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 font-semibold">{l.lista}</span>
                        </td>
                        <td className="py-0.5 text-center">{l.comisionPct}%</td>
                        <td className="py-0.5 text-right font-semibold text-violet-600">${l.comision.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

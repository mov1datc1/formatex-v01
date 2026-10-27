import { useState } from 'react';
import {
  BadgeDollarSign,
  Calendar,
  Filter,
  Download,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  UserCheck,
  Info,
  RefreshCw,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';

export default function ComisionesPage() {
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = (new Date().getMonth() + 1).toString();

  const [anio, setAnio] = useState<string>(currentYear);
  const [mes, setMes] = useState<string>(currentMonth);
  const [soloFacturasPagadas, setSoloFacturasPagadas] = useState<boolean>(true);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  if (anio) queryParams.set('anio', anio);
  if (mes) queryParams.set('mes', mes);
  queryParams.set('soloFacturasPagadas', soloFacturasPagadas ? 'true' : 'false');
  if (selectedVendorId) queryParams.set('vendorId', selectedVendorId);

  const { data: report, loading, error, refetch } = useApi<any>(
    ['commissions-report', anio, mes, soloFacturasPagadas ? 'paid' : 'all', selectedVendorId],
    `/invoicing/commissions?${queryParams.toString()}`
  );

  const mesesList = [
    { value: 'all', label: 'Todo el año' },
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];

  // Flatten all invoices across vendors for the detail list
  const allFacturas = (report?.data || []).flatMap((v: any) =>
    (v.facturas || []).map((f: any) => ({
      ...f,
      vendorNombre: v.vendorNombre,
      vendorCodigo: v.vendorCodigo,
      comisionBaseVendor: v.comisionBaseVendor,
    }))
  );

  const filteredFacturas = allFacturas.filter((f: any) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      (f.orderCode && f.orderCode.toLowerCase().includes(term)) ||
      (f.clientName && f.clientName.toLowerCase().includes(term)) ||
      (f.clientCode && f.clientCode.toLowerCase().includes(term)) ||
      (f.vendorNombre && f.vendorNombre.toLowerCase().includes(term))
    );
  });

  const totalFacturadoReport = report?.granTotalFacturado || 0;
  const totalComisionAprobada = report?.granTotalComisionAprobada || report?.granTotalComision || 0;
  const totalFacturas = allFacturas.length;
  const totalFacturasLiquidadas = allFacturas.filter((f: any) => f.isLiquidada).length;

  const handleExportCsv = () => {
    if (!filteredFacturas.length) return;
    const headers = [
      'Folio Pedido',
      'Vendedor',
      'Código Cliente',
      'Nombre Cliente',
      'Fecha Facturación',
      'Fecha Pago',
      'Método Pago',
      'Estado Pago',
      'Total Facturado',
      'Comisión Ganada',
      'Estatus Comisión',
    ];

    const rows = filteredFacturas.map((f: any) => [
      `"${f.orderCode || ''}"`,
      `"${f.vendorNombre || ''}"`,
      `"${f.clientCode || ''}"`,
      `"${f.clientName || ''}"`,
      `"${f.facturadaAt ? new Date(f.facturadaAt).toLocaleDateString('es-MX') : ''}"`,
      `"${f.fechaPago ? new Date(f.fechaPago).toLocaleDateString('es-MX') : 'Pendiente'}"`,
      `"${f.metodoPago || ''}"`,
      `"${f.estadoPago || ''}"`,
      f.total || 0,
      f.comisionFactura || 0,
      `"${f.comisionStatus || (f.isLiquidada ? 'APROBADA' : 'PENDIENTE')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Comisiones_Formatex_${anio}_${mes}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header con Badge de Política */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <BadgeDollarSign size={26} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {report?.isManagerView ? 'Control Global de Comisiones — Ventas / ATC' : 'Mis Comisiones — Ventas / ATC'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {report?.isManagerView
                  ? 'Consolidado de ventas del equipo y comisiones por factura liquidada al 100%'
                  : 'Consulta de comisiones acumuladas por pedidos y facturas efectivamente pagadas'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={loading}
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-gray-200"
            title="Recargar datos"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-blue-600' : ''} />
          </button>

          <button
            onClick={handleExportCsv}
            disabled={!filteredFacturas.length}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-gray-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Download size={15} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Filtros de Período y Vendedor */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-gray-100">
          <Filter size={14} className="text-blue-600" />
          <span>Filtros de Liquidación</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Año */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Año Fiscal</label>
            <div className="relative">
              <Calendar size={15} className="absolute left-3 top-3 text-gray-400" />
              <select
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>
          </div>

          {/* Mes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Mes de Liquidación</label>
            <select
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              {mesesList.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Vendedor (Solo para Jefatura/Gerencia) */}
          {report?.isManagerView ? (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Agente / Vendedor</label>
              <div className="relative">
                <UserCheck size={15} className="absolute left-3 top-3 text-gray-400" />
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value="">Todo el Equipo de Ventas</option>
                  {(report.vendedoresDisponibles || []).map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.nombre} ({v.codigo}) · {v.comision}%
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Agente Asignado</label>
              <div className="px-3 py-2 bg-slate-100 border border-gray-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2">
                <UserCheck size={14} className="text-blue-600" />
                <span className="truncate">
                  {report?.data?.[0]?.vendorNombre || 'Mi Perfil de Venta'}
                </span>
              </div>
            </div>
          )}

          {/* Checkbox Solo Pagadas */}
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 p-2 bg-slate-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={soloFacturasPagadas}
                onChange={(e) => setSoloFacturasPagadas(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-700 select-none">
                Solo Facturas Liquidadas (100%)
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* 3. Tarjetas Resumen de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Facturado */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Facturado</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Receipt size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
            ${totalFacturadoReport.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Base gravable neta de facturación
          </p>
        </div>

        {/* Comisión Aprobada */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs relative overflow-hidden bg-gradient-to-br from-emerald-50/30 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Comisión Aprobada</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">
            ${totalComisionAprobada.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <span>Facturas 100% liquidadas</span>
          </p>
        </div>

        {/* Facturas Procesadas */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Facturas Liquidadas</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <FileSpreadsheet size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {totalFacturasLiquidadas} <span className="text-xs font-normal text-slate-400">/ {totalFacturas} total</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Documentos fiscales generadores
          </p>
        </div>

        {/* Calendario de Pago */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">Próximo Pago</span>
            <div className="p-2 bg-slate-800 text-cyan-300 rounded-lg">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-xl font-black text-white mt-2">
            Día 10 de Cada Mes
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Límite factura fiscal: Día 5 del mes
          </p>
        </div>
      </div>

      {/* 4. Tabla de Vendedores (Visible en Modo Supervisión cuando se selecciona todo el equipo) */}
      {report?.isManagerView && !selectedVendorId && (report?.data || []).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Desglose por Vendedor del Equipo</h2>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              {(report?.data || []).length} vendedores activos con ventas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">Vendedor</th>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4 text-center">% Comisión</th>
                  <th className="py-3 px-4 text-right">Total Facturado</th>
                  <th className="py-3 px-4 text-center">Facturas</th>
                  <th className="py-3 px-4 text-right">Comisión Aprobada</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(report?.data || []).map((v: any) => (
                  <tr key={v.vendorId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{v.vendorNombre}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{v.vendorCodigo}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-blue-600">
                      {v.comisionBaseVendor}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      ${v.totalFacturado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                        {v.facturas?.length || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                      ${(v.comisionAprobada || v.totalComision).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedVendorId(v.vendorId)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Tabla Detallada de Facturas y Comisiones */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              {report?.isManagerView && selectedVendorId
                ? `Facturas de ${report.data?.[0]?.vendorNombre || 'Vendedor Seleccionado'}`
                : 'Detalle de Facturas y Comisiones por Partida'}
            </h2>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por folio o cliente..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto text-blue-500 mb-2" />
            <p className="text-xs">Calculando comisiones...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 text-xs">
            Error al consultar el reporte de comisiones: {error}
          </div>
        ) : filteredFacturas.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Info size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">No se encontraron facturas en este periodo</p>
            <p className="text-xs text-slate-400 mt-1">
              Prueba cambiando el mes o desmarcando el filtro de facturas pagadas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-4">Folio</th>
                  {report?.isManagerView && <th className="py-3 px-4">Vendedor</th>}
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Fecha Factura</th>
                  <th className="py-3 px-4 text-center">Método</th>
                  <th className="py-3 px-4 text-center">Estado Pago</th>
                  <th className="py-3 px-4 text-right">Total Facturado</th>
                  <th className="py-3 px-4 text-right">Comisión</th>
                  <th className="py-3 px-4 text-center">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredFacturas.map((f: any) => {
                  const isExpanded = expandedOrderId === f.orderId;

                  return (
                    <>
                      <tr
                        key={f.orderId}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isExpanded ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setExpandedOrderId(isExpanded ? null : f.orderId)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer transition-colors"
                            title="Ver desglose por partida"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {f.orderCode}
                        </td>

                        {report?.isManagerView && (
                          <td className="py-3 px-4 font-medium text-slate-700">
                            {f.vendorNombre}
                          </td>
                        )}

                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{f.clientName}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{f.clientCode}</p>
                        </td>

                        <td className="py-3 px-4 text-slate-600">
                          {f.facturadaAt ? new Date(f.facturadaAt).toLocaleDateString('es-MX') : '—'}
                        </td>

                        <td className="py-3 px-4 text-center font-mono">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              f.metodoPago === 'PUE'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {f.metodoPago || 'PUE'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              f.estadoPago === 'PAGADA' || f.isLiquidada
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {f.estadoPago || (f.isLiquidada ? 'PAGADA' : 'PENDIENTE')}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ${f.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-600">
                          ${f.comisionFactura.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              f.isLiquidada
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {f.isLiquidada ? 'APROBADA' : 'PENDIENTE PAGO'}
                          </span>
                        </td>
                      </tr>

                      {/* Fila desplegable con desglose de partidas */}
                      {isExpanded && f.lineas && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={report?.isManagerView ? 10 : 9} className="p-4 pl-12">
                            <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Partidas de Tela y % Comisión Aplicado:
                              </span>
                              <table className="w-full text-[11px] text-left">
                                <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-gray-100">
                                  <tr>
                                    <th className="py-1 px-3">Metraje</th>
                                    <th className="py-1 px-3">Precio Unitario</th>
                                    <th className="py-1 px-3">Importe Partida</th>
                                    <th className="py-1 px-3">Lista Precios</th>
                                    <th className="py-1 px-3 text-center">% Comisión</th>
                                    <th className="py-1 px-3 text-right">Comisión Ganada</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {f.lineas.map((l: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50/50">
                                      <td className="py-1.5 px-3 font-mono font-bold text-slate-800">
                                        {l.metraje} m
                                      </td>
                                      <td className="py-1.5 px-3 font-mono text-slate-600">
                                        ${l.precioUnitario?.toFixed(2)}
                                      </td>
                                      <td className="py-1.5 px-3 font-mono text-slate-800 font-semibold">
                                        ${l.importe?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="py-1.5 px-3 font-mono text-slate-500">
                                        {l.lista}
                                      </td>
                                      <td className="py-1.5 px-3 text-center font-mono font-bold text-blue-600">
                                        {l.comisionPct}%
                                      </td>
                                      <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-600">
                                        ${l.comision?.toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Caja de Políticas Oficiales Formatex */}
      <div className="bg-blue-50/50 border border-blue-200/60 rounded-2xl p-5 text-xs text-slate-700 space-y-2">
        <div className="flex items-center gap-2 font-bold text-blue-950 uppercase tracking-wide text-[11px]">
          <Info size={15} className="text-blue-600" />
          <span>Reglas y Políticas Oficiales de Comisiones Formatex</span>
        </div>
        <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[11px] leading-relaxed">
          <li>
            <strong>Regla Madre:</strong> «Mes trabajado = Mes cobrado». Las comisiones se generan exclusivamente sobre facturas 100% liquidadas (PUE de contado o PPD con complementos de pago aplicados por Cobranza).
          </li>
          <li>
            <strong>Corte Mensual:</strong> El cálculo de comisiones cierra el último día de cada mes calendario.
          </li>
          <li>
            <strong>Entrega de Factura Fiscal (CFDI):</strong> El agente debe entregar su factura fiscal de honorarios/comisiones a más tardar el <strong>Día 5</strong> del mes siguiente.
          </li>
          <li>
            <strong>Dispersión de Pago:</strong> Las comisiones aprobadas se pagan mediante transferencia bancaria el <strong>Día 10</strong> del mes siguiente.
          </li>
        </ul>
      </div>
    </div>
  );
}

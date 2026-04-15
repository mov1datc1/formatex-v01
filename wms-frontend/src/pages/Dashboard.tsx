import { useApi } from '../hooks/useApi';
import { Link } from 'react-router-dom';
import { WmsIcon, KpiIcon, PipelineIcon } from '../components/icons/WmsIcons';

export default function Dashboard() {
  const { data: invStats } = useApi<any>(['inv-stats'], '/inventory/stats');
  const { data: orderStats } = useApi<any>(['order-stats'], '/orders/stats');
  const { data: cutStats } = useApi<any>(['cut-stats'], '/cutting/stats');
  const { data: transitStats } = useApi<any>(['transit-stats-dash'], '/transit/stats');

  const kpis = [
    { label: 'Rollos en Stock', value: invStats?.totalHUs || 0, icon: WmsIcon.Rolls, gradient: 'from-blue-500 to-blue-600', sub: `${invStats?.totalEnteros || 0} enteros / ${invStats?.totalRetazos || 0} retazos` },
    { label: 'Metros Totales', value: `${Math.round(invStats?.metrajeTotal || 0).toLocaleString()}m`, icon: WmsIcon.Ruler, gradient: 'from-emerald-500 to-teal-600', sub: `${invStats?.totalDisponibles || 0} HUs disponibles` },
    { label: 'Cortes Realizados', value: cutStats?.totalCortes || 0, icon: WmsIcon.Cut, gradient: 'from-amber-500 to-orange-600', sub: `~${Math.round(cutStats?.metrajePromedioCortado || 0)}m promedio` },
    { label: 'En Tránsito', value: transitStats?.totalEmbarques || 0, icon: WmsIcon.Transit, gradient: 'from-violet-500 to-purple-600', sub: `${(transitStats?.metrajeEsperado || 0).toLocaleString()}m esperados` },
  ];

  const pipeline = [
    { key: 'cotizados', label: 'Cotizados', icon: WmsIcon.Quote, bg: 'bg-slate-50', iconBg: 'bg-slate-100', iconColor: 'text-slate-600' },
    { key: 'porPagar', label: 'Por Pagar', icon: WmsIcon.Payment, bg: 'bg-amber-50', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
    { key: 'porSurtir', label: 'Por Surtir', icon: WmsIcon.ToFulfill, bg: 'bg-blue-50', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    { key: 'enProceso', label: 'Surtido/Corte', icon: WmsIcon.InCut, bg: 'bg-purple-50', iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
    { key: 'empacados', label: 'Empacados', icon: WmsIcon.Packed, bg: 'bg-teal-50', iconBg: 'bg-teal-100', iconColor: 'text-teal-600' },
    { key: 'facturados', label: 'Facturados', icon: WmsIcon.Invoiced, bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    { key: 'despachados', label: 'Despachados', icon: WmsIcon.Dispatched, bg: 'bg-gray-50', iconBg: 'bg-gray-200', iconColor: 'text-gray-600' },
  ];

  const quickActions = [
    { label: 'Nueva Cotización', icon: WmsIcon.Quote, href: '/pedidos', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
    { label: 'Disponibilidad', icon: WmsIcon.Search, href: '/disponibilidad', color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
    { label: 'Recepción', icon: WmsIcon.Reception, href: '/recepcion', color: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
    { label: 'En Tránsito', icon: WmsIcon.Transit, href: '/transito', color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
    { label: 'Corte', icon: WmsIcon.Cut, href: '/corte', color: 'text-red-600 bg-red-50 hover:bg-red-100' },
    { label: 'Inventario', icon: WmsIcon.Stock, href: '/inventario/rollos', color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard — WMS 360+ Formatex</h1>
        <p className="text-gray-500 text-sm mt-1">FORMA TEXTIL S. DE R.L. DE C.V. — Vista operativa en tiempo real</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <KpiIcon icon={s.icon} gradient={s.gradient} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Pipeline de Pedidos */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Pipeline de Pedidos</h2>
          <Link to="/pedidos" className="text-sm text-primary-500 hover:text-primary-600 font-medium">Ver todos →</Link>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {pipeline.map(p => {
            const Icon = p.icon;
            return (
              <div key={p.key} className={`text-center p-3 rounded-xl ${p.bg} transition-all hover:shadow-sm`}>
                <PipelineIcon icon={Icon} bgClass={p.iconBg} iconClass={p.iconColor} size={18} />
                <div className="text-xl font-bold mt-2 text-gray-900">{(orderStats as any)?.[p.key] || 0}</div>
                <div className="text-[11px] text-gray-500 mt-0.5 font-medium">{p.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions + State */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((a, i) => {
              const Icon = a.icon;
              return (
                <Link key={i} to={a.href} className={`flex items-center gap-3 p-4 rounded-xl transition-all hover:shadow-sm ${a.color}`}>
                  <Icon size={20} strokeWidth={1.75} />
                  <span className="font-medium text-sm">{a.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Estado del Almacén</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl">
              <div className="flex items-center gap-2.5">
                <WmsIcon.Unlocked size={16} className="text-emerald-500" strokeWidth={1.75} />
                <span className="text-sm text-gray-600">HUs Disponibles</span>
              </div>
              <span className="font-bold text-emerald-600">{invStats?.totalDisponibles || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-amber-50 rounded-xl">
              <div className="flex items-center gap-2.5">
                <WmsIcon.Locked size={16} className="text-amber-500" strokeWidth={1.75} />
                <span className="text-sm text-gray-600">HUs Reservados</span>
              </div>
              <span className="font-bold text-amber-600">{invStats?.totalReservados || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-2.5">
                <WmsIcon.Transit size={16} className="text-blue-500" strokeWidth={1.75} />
                <span className="text-sm text-gray-600">En Tránsito (mts)</span>
              </div>
              <span className="font-bold text-blue-600">{(transitStats?.metrajeDisponible || 0).toLocaleString()}m</span>
            </div>
            {transitStats?.proximoEmbarque && (
              <div className="flex justify-between items-center p-3 bg-violet-50 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <WmsIcon.Clock size={16} className="text-violet-500" strokeWidth={1.75} />
                  <span className="text-sm text-gray-600">Próximo Embarque</span>
                </div>
                <span className="font-bold text-violet-600">{transitStats.proximoEmbarque.diasParaLlegar}d · {transitStats.proximoEmbarque.codigo}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import {
  CalendarRange, TrendingUp, AlertTriangle, Package, Truck, ShieldCheck,
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle2, ArrowUpRight,
  BarChart3, Send, Loader2
} from 'lucide-react';
import { api } from '../../config/api';
import toast from 'react-hot-toast';

const MONTH_NAMES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const PRIO_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  CRITICA: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  ALTA: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  MEDIA: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  BAJA: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
};
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDIENTE: { label: 'Pendiente', color: 'bg-gray-100 text-gray-700' },
  APROBADO: { label: 'Aprobado', color: 'bg-blue-100 text-blue-700' },
  ORDENADO: { label: 'Ordenado', color: 'bg-purple-100 text-purple-700' },
  RECIBIDO: { label: 'Recibido', color: 'bg-green-100 text-green-700' },
};

interface KPIs {
  totalStock: number; totalTransito: number; coberturaPromedio: number;
  skusCriticos: number; skusAlerta: number; valorCompraEstimado: number;
  embarquesTransito: number; totalSkus: number;
}

interface SkuLine {
  id: string;
  sku: { id: string; codigo: string; nombre: string; color: string; categoria: string; precioReferencia?: number };
  supplier?: { id: string; nombre: string; codigo: string } | null;
  stockActual: number; transitoActual: number; consumoPromedio: number;
  demandaProyectada: number; diasCobertura: number; necesidadNeta: number;
  stockMinimo: number; cantidadSugerida: number; cantidadAprobada: number | null;
  prioridad: string; status: string; precioEstimado: number | null;
  shipmentId?: string | null; notas?: string | null;
}

interface Plan {
  id: string; mes: number; anio: number; estado: string;
  totalEstimado: number; lineas: SkuLine[];
  user: { nombre: string };
}

export default function PlanificacionPage() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [skuAnalysis, setSkuAnalysis] = useState<any[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState<'overview' | 'plan' | 'projections'>('overview');
  const [projections, setProjections] = useState<any>(null);

  useEffect(() => { loadDashboard(); }, []);
  useEffect(() => { if (tab === 'plan') loadPlan(); }, [mes, anio, tab]);
  useEffect(() => { if (tab === 'projections') loadProjections(); }, [tab]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/supply-planning/dashboard');
      setKpis(data.kpis);
      setSkuAnalysis(data.skuAnalysis);
    } catch (e) { toast.error('Error cargando dashboard'); }
    finally { setLoading(false); }
  };

  const loadPlan = async () => {
    try {
      const { data: plans } = await api.get('/supply-planning/plans', { params: { anio } });
      const found = plans.find((p: any) => p.mes === mes && p.anio === anio);
      if (found) {
        const { data } = await api.get(`/supply-planning/plans/${found.id}`);
        setPlan(data);
      } else {
        setPlan(null);
      }
    } catch { setPlan(null); }
  };

  const generatePlan = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post('/supply-planning/plans/generate', { mes, anio });
      setPlan(data);
      toast.success(`Plan ${MONTH_NAMES[mes]} ${anio} generado`);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Error generando plan'); }
    finally { setGenerating(false); }
  };

  const approvePlan = async () => {
    if (!plan) return;
    try {
      await api.put(`/supply-planning/plans/${plan.id}/approve`);
      toast.success('Plan aprobado');
      loadPlan();
    } catch { toast.error('Error aprobando plan'); }
  };

  const createShipment = async (lineId: string) => {
    try {
      await api.post(`/supply-planning/plans/lines/${lineId}/create-shipment`);
      toast.success('Embarque creado en tránsito');
      loadPlan();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Error creando embarque'); }
  };

  const loadProjections = async () => {
    try {
      const { data } = await api.get('/supply-planning/projections');
      setProjections(data);
    } catch { toast.error('Error cargando proyecciones'); }
  };

  const prevMonth = () => {
    if (mes === 1) { setMes(12); setAnio(anio - 1); }
    else setMes(mes - 1);
  };
  const nextMonth = () => {
    if (mes === 12) { setMes(1); setAnio(anio + 1); }
    else setMes(mes + 1);
  };

  const fmt = (n: number) => n.toLocaleString('es-MX', { maximumFractionDigits: 0 });
  const fmtMoney = (n: number) => '$' + n.toLocaleString('es-MX', { maximumFractionDigits: 0 });

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="animate-spin text-primary-500" size={40} />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarRange className="text-primary-500" size={26} />
            Planificación de Abastecimiento
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Control y proyección de compras — Formato mensual y anual</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadDashboard} className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-1.5 transition-colors">
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>
      </div>

      {/* ===== TAB NAVIGATION ===== */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'overview', label: 'Vista General', icon: BarChart3 },
          { key: 'plan', label: 'Plan Mensual', icon: CalendarRange },
          { key: 'projections', label: 'Proyecciones', icon: TrendingUp },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t.key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* ===== KPI CARDS ===== */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={Package} label="Stock Disponible" value={`${fmt(kpis.totalStock)}m`} sub={`${kpis.totalSkus} SKUs activos`} color="text-blue-600" bg="bg-blue-50" />
          <KpiCard icon={Truck} label="En Tránsito" value={`${fmt(kpis.totalTransito)}m`} sub={`${kpis.embarquesTransito} embarques`} color="text-purple-600" bg="bg-purple-50" />
          <KpiCard icon={ShieldCheck} label="Cobertura Promedio" value={`${kpis.coberturaPromedio} días`} sub={kpis.skusCriticos > 0 ? `⚠ ${kpis.skusCriticos} críticos` : 'Todos cubiertos'} color="text-emerald-600" bg="bg-emerald-50" />
          <KpiCard icon={AlertTriangle} label="Compra Estimada" value={fmtMoney(kpis.valorCompraEstimado)} sub={`${kpis.skusAlerta + kpis.skusCriticos} SKUs necesitan reorden`} color="text-orange-600" bg="bg-orange-50" />
        </div>
      )}

      {/* ===== TAB CONTENT ===== */}
      {tab === 'overview' && <OverviewTab skuAnalysis={skuAnalysis} fmt={fmt} />}
      {tab === 'plan' && (
        <PlanTab
          mes={mes} anio={anio} plan={plan} generating={generating}
          prevMonth={prevMonth} nextMonth={nextMonth}
          generatePlan={generatePlan} approvePlan={approvePlan}
          createShipment={createShipment} fmt={fmt} fmtMoney={fmtMoney}
        />
      )}
      {tab === 'projections' && projections && <ProjectionsTab data={projections} fmt={fmt} />}
    </div>
  );
}

// ===== SUB-COMPONENTS =====

function KpiCard({ icon: Icon, label, value, sub, color, bg }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon size={20} className={color} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}

function OverviewTab({ skuAnalysis, fmt }: { skuAnalysis: any[]; fmt: (n: number) => string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Análisis de Inventario por SKU</h3>
        <p className="text-xs text-gray-400 mt-0.5">Ordenado por prioridad de reabastecimiento</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">SKU</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stock (m)</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tránsito (m)</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Consumo/Mes</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Demanda/Mes</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cobertura</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Necesidad</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Prioridad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {skuAnalysis.map((a: any) => {
              const pc = PRIO_COLORS[a.prioridad] || PRIO_COLORS.BAJA;
              return (
                <tr key={a.sku.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{a.sku.nombre}</p>
                    <p className="text-xs text-gray-400">{a.sku.codigo} · {a.sku.color || '—'}</p>
                  </td>
                  <td className="text-right px-4 py-3 font-mono text-gray-700">{fmt(a.stockActual)}</td>
                  <td className="text-right px-4 py-3 font-mono text-purple-600">{fmt(a.transitoActual)}</td>
                  <td className="text-right px-4 py-3 font-mono text-gray-600">{fmt(a.consumoMensual)}</td>
                  <td className="text-right px-4 py-3 font-mono text-gray-600">{fmt(a.demandaMensual)}</td>
                  <td className="text-center px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                      a.diasCobertura < 15 ? 'bg-red-100 text-red-700' :
                      a.diasCobertura < 30 ? 'bg-orange-100 text-orange-700' :
                      a.diasCobertura < 60 ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {a.diasCobertura > 365 ? '365+' : a.diasCobertura} días
                    </span>
                  </td>
                  <td className="text-right px-4 py-3 font-mono font-bold text-gray-900">
                    {a.necesidadNeta > 0 ? `${fmt(a.necesidadNeta)}m` : '—'}
                  </td>
                  <td className="text-center px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${pc.bg} ${pc.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
                      {a.prioridad}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlanTab({ mes, anio, plan, generating, prevMonth, nextMonth, generatePlan, approvePlan, createShipment, fmt, fmtMoney }: any) {
  return (
    <>
      {/* Month Navigator */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-6 py-4">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors"><ChevronLeft size={20} /></button>
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-900">{MONTH_NAMES[mes]} {anio}</h3>
          {plan && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              plan.estado === 'BORRADOR' ? 'bg-gray-100 text-gray-600' :
              plan.estado === 'APROBADO' ? 'bg-green-100 text-green-700' :
              plan.estado === 'EN_EJECUCION' ? 'bg-blue-100 text-blue-700' :
              'bg-purple-100 text-purple-700'
            }`}>{plan.estado}</span>
          )}
        </div>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors"><ChevronRight size={20} /></button>
      </div>

      {!plan ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <CalendarRange size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay plan para {MONTH_NAMES[mes]} {anio}</h3>
          <p className="text-gray-400 text-sm mb-6">Genera un plan automático basado en proyecciones de demanda y stock actual</p>
          <button onClick={generatePlan} disabled={generating}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl flex items-center gap-2 mx-auto transition-colors disabled:opacity-50">
            {generating ? <Loader2 size={18} className="animate-spin" /> : <TrendingUp size={18} />}
            {generating ? 'Generando...' : 'Generar Plan Automático'}
          </button>
        </div>
      ) : (
        <>
          {/* Plan Actions */}
          <div className="flex gap-2 justify-end">
            {plan.estado === 'BORRADOR' && (
              <button onClick={approvePlan} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors">
                <CheckCircle2 size={15} /> Aprobar Plan
              </button>
            )}
            <button onClick={generatePlan} disabled={generating}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors">
              <RefreshCw size={14} className={generating ? 'animate-spin' : ''} /> Regenerar
            </button>
          </div>

          {/* Plan Table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Plan de Compras — {MONTH_NAMES[mes]} {anio}</h3>
                <p className="text-xs text-gray-400">{plan.lineas.length} SKUs · Total estimado: {fmtMoney(Number(plan.totalEstimado || 0))}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">SKU</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">Stock</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">Tránsito</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Cobertura</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">Demanda</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">Necesidad</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">Sugerido</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Prioridad</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Status</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {plan.lineas.map((line: SkuLine) => {
                    const pc = PRIO_COLORS[line.prioridad] || PRIO_COLORS.BAJA;
                    const st = STATUS_LABELS[line.status] || STATUS_LABELS.PENDIENTE;
                    return (
                      <tr key={line.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{line.sku.nombre}</p>
                          <p className="text-xs text-gray-400">{line.sku.codigo}</p>
                        </td>
                        <td className="text-right px-3 py-3 font-mono text-gray-700">{fmt(line.stockActual)}m</td>
                        <td className="text-right px-3 py-3 font-mono text-purple-600">{fmt(line.transitoActual)}m</td>
                        <td className="text-center px-3 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            line.diasCobertura < 15 ? 'bg-red-100 text-red-700' :
                            line.diasCobertura < 30 ? 'bg-orange-100 text-orange-700' :
                            'bg-green-100 text-green-700'
                          }`}>{Math.round(line.diasCobertura) > 365 ? '365+' : Math.round(line.diasCobertura)}d</span>
                        </td>
                        <td className="text-right px-3 py-3 font-mono text-gray-600">{fmt(line.demandaProyectada)}m</td>
                        <td className="text-right px-3 py-3 font-mono font-bold text-gray-800">
                          {line.necesidadNeta > 0 ? `${fmt(line.necesidadNeta)}m` : '—'}
                        </td>
                        <td className="text-right px-3 py-3 font-mono font-bold text-primary-700">
                          {line.cantidadSugerida > 0 ? `${fmt(line.cantidadSugerida)}m` : '—'}
                        </td>
                        <td className="text-center px-3 py-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${pc.bg} ${pc.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />{line.prioridad}
                          </span>
                        </td>
                        <td className="text-center px-3 py-3">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                        </td>
                        <td className="text-center px-3 py-3">
                          {line.status === 'PENDIENTE' && line.cantidadSugerida > 0 && (
                            <button onClick={() => createShipment(line.id)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Crear embarque">
                              <Send size={14} />
                            </button>
                          )}
                          {line.status === 'ORDENADO' && (
                            <span className="text-green-600"><Truck size={14} /></span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function ProjectionsTab({ data, fmt }: { data: any; fmt: (n: number) => string }) {
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const maxVal = Math.max(...data.projections.flatMap((p: any) => p.months.map((m: any) => Math.max(m.projected, m.historical))), 1);

  return (
    <div className="space-y-4">
      {/* SKU Selector */}
      <div className="flex flex-wrap gap-2">
        {data.projections.map((p: any) => (
          <button key={p.sku.id} onClick={() => setSelectedSku(selectedSku === p.sku.id ? null : p.sku.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              selectedSku === p.sku.id || !selectedSku
                ? 'bg-primary-50 border-primary-200 text-primary-700'
                : 'bg-white border-gray-200 text-gray-500'
            }`}>
            {p.sku.codigo}
          </button>
        ))}
      </div>

      {/* Projection Charts */}
      {data.projections
        .filter((p: any) => !selectedSku || p.sku.id === selectedSku)
        .map((p: any) => (
          <div key={p.sku.id} className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-gray-900">{p.sku.nombre}</h4>
                <p className="text-xs text-gray-400">{p.sku.codigo} · Promedio mensual: {fmt(p.avgMonthly)}m</p>
              </div>
              <ArrowUpRight size={18} className="text-gray-300" />
            </div>

            {/* Simple bar chart */}
            <div className="flex items-end gap-1.5 h-32">
              {p.months.map((m: any, idx: number) => {
                const h = maxVal > 0 ? (m.projected / maxVal) * 100 : 0;
                const hHist = maxVal > 0 ? (m.historical / maxVal) * 100 : 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-0.5" title={`${m.month}: Proyectado ${fmt(m.projected)}m | Histórico ${fmt(m.historical)}m`}>
                    <div className="w-full flex items-end gap-px" style={{ height: '100px' }}>
                      {m.historical > 0 && (
                        <div className="flex-1 bg-blue-200 rounded-t-sm transition-all" style={{ height: `${hHist}%`, minHeight: m.historical > 0 ? '4px' : '0' }} />
                      )}
                      <div className="flex-1 rounded-t-sm transition-all" style={{
                        height: `${h}%`,
                        minHeight: m.projected > 0 ? '4px' : '0',
                        background: idx < 3 ? 'linear-gradient(to top, #3b82f6, #60a5fa)' : 'linear-gradient(to top, #94a3b8, #cbd5e1)',
                      }} />
                    </div>
                    <span className="text-[9px] text-gray-400 font-medium">{m.month.split('-')[1]}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500" /> Proyección</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-200" /> Histórico</span>
            </div>
          </div>
        ))}
    </div>
  );
}

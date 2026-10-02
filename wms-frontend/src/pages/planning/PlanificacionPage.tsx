import { useState, useEffect } from 'react';
import {
  CalendarRange, TrendingUp, AlertTriangle, Package, Truck, ShieldCheck,
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle2, ArrowUpRight,
  BarChart3, Send, Loader2, UploadCloud, FileSpreadsheet, X, Check,
  BookOpen, Filter
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
  totalStock: number;
  totalRestringido: number;
  totalTransito: number;
  skusResurtir: number;
  skusOk: number;
  totalSkus: number;
  embarquesTransito: number;
  valorCompraEstimado: number;
}

interface SkuLine {
  id: string;
  sku: { id: string; codigo: string; nombre: string; color: string; categoria: string; libroColeccion?: string; precioReferencia?: number };
  supplier?: { id: string; nombre: string; codigo: string } | null;
  stockActual: number;
  transitoActual: number;
  consumoPromedio: number;
  promedio4M?: number;
  proyeccion4M5?: number;
  demandaProyectada: number;
  diasCobertura: number;
  necesidadNeta: number;
  stockMinimo: number;
  decisionStatus?: string;
  cantidadSugerida: number;
  cantidadAprobada: number | null;
  ajusteDireccion?: number | null;
  prioridad: string;
  status: string;
  precioEstimado: number | null;
  shipmentId?: string | null;
  notas?: string | null;
}

interface Plan {
  id: string;
  mes: number;
  anio: number;
  estado: string;
  totalEstimado: number;
  lineas: SkuLine[];
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
  const [tab, setTab] = useState<'overview' | 'plan' | 'matrix' | 'projections'>('overview');
  const [projections, setProjections] = useState<any>(null);
  const [matrixData, setMatrixData] = useState<any>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => { loadDashboard(); }, []);
  useEffect(() => { if (tab === 'plan') loadPlan(); }, [mes, anio, tab]);
  useEffect(() => { if (tab === 'projections') loadProjections(); }, [tab]);
  useEffect(() => { if (tab === 'matrix') loadMatrix(); }, [tab, anio]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/supply-planning/dashboard');
      setKpis(data.kpis);
      setSkuAnalysis(data.skuAnalysis);
    } catch (e) {
      toast.error('Error cargando dashboard');
    } finally {
      setLoading(false);
    }
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
    } catch {
      setPlan(null);
    }
  };

  const loadMatrix = async () => {
    try {
      const { data } = await api.get('/supply-planning/historical-sales/matrix', { params: { anio } });
      setMatrixData(data);
    } catch {
      toast.error('Error cargando matriz de ventas históricas');
    }
  };

  const generatePlan = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post('/supply-planning/plans/generate', { mes, anio });
      setPlan(data);
      toast.success(`Plan ${MONTH_NAMES[mes]} ${anio} generado con éxito`);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error generando plan');
    } finally {
      setGenerating(false);
    }
  };

  const approvePlan = async () => {
    if (!plan) return;
    try {
      await api.put(`/supply-planning/plans/${plan.id}/approve`);
      toast.success('Plan aprobado');
      loadPlan();
    } catch {
      toast.error('Error aprobando plan');
    }
  };

  const createShipment = async (lineId: string) => {
    try {
      await api.post(`/supply-planning/plans/lines/${lineId}/create-shipment`);
      toast.success('Embarque creado en tránsito');
      loadPlan();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error creando embarque');
    }
  };

  const updateAjuste = async (lineId: string, ajuste: number) => {
    if (!plan) return;
    try {
      await api.put(`/supply-planning/plans/${plan.id}/lines/${lineId}/ajuste`, { ajusteDireccion: ajuste });
      toast.success('Ajuste directivo guardado');
      loadPlan();
    } catch {
      toast.error('Error guardando ajuste');
    }
  };

  const loadProjections = async () => {
    try {
      const { data } = await api.get('/supply-planning/projections');
      setProjections(data);
    } catch {
      toast.error('Error cargando proyecciones');
    }
  };

  const prevMonth = () => {
    if (mes === 1) { setMes(12); setAnio(anio - 1); }
    else setMes(mes - 1);
  };
  const nextMonth = () => {
    if (mes === 12) { setMes(1); setAnio(anio + 1); }
    else setMes(mes + 1);
  };

  const fmt = (n: number) => (n || 0).toLocaleString('es-MX', { maximumFractionDigits: 1 });
  const fmtMoney = (n: number) => '$' + (n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-primary-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarRange className="text-primary-500" size={26} />
            Master de Resurtido y Abastecimiento
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Cálculo de necesidades Formatex (4M Promedio × 4.5 vs S+P+T) y control de compras
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-sm transition-all"
          >
            <UploadCloud size={16} /> Ingestar CFDI XML (CONTPAQi)
          </button>
          <button
            onClick={loadDashboard}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-1.5 transition-colors text-gray-700"
          >
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>
      </div>

      {/* ===== TAB NAVIGATION ===== */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {[
          { key: 'overview', label: 'Decisión Resurtido', icon: BarChart3 },
          { key: 'matrix', label: 'Histórico 13 Meses', icon: FileSpreadsheet },
          { key: 'plan', label: 'Plan Mensual / OCs', icon: CalendarRange },
          { key: 'projections', label: 'Proyecciones', icon: TrendingUp },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t.key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* ===== KPI CARDS ===== */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            icon={Package}
            label="Stock Disponible (S)"
            value={`${fmt(kpis.totalStock)}m`}
            sub={kpis.totalRestringido > 0 ? `+ ${fmt(kpis.totalRestringido)}m en Calidad/Restringido` : `${kpis.totalSkus} SKUs activos`}
            color="text-blue-600"
            bg="bg-blue-50"
          />
          <KpiCard
            icon={Truck}
            label="Tránsito Proveedores (P+T)"
            value={`${fmt(kpis.totalTransito)}m`}
            sub={`${kpis.embarquesTransito} embarques en camino`}
            color="text-purple-600"
            bg="bg-purple-50"
          />
          <KpiCard
            icon={ShieldCheck}
            label="Estado Resurtido"
            value={`${kpis.skusResurtir} por resurtir`}
            sub={`${kpis.skusOk} con cobertura suficiente`}
            color={kpis.skusResurtir > 0 ? 'text-amber-600' : 'text-emerald-600'}
            bg={kpis.skusResurtir > 0 ? 'bg-amber-50' : 'bg-emerald-50'}
          />
          <KpiCard
            icon={AlertTriangle}
            label="Inversión Sugerida"
            value={fmtMoney(kpis.valorCompraEstimado)}
            sub="Basado en mínimos y déficit calculado"
            color="text-orange-600"
            bg="bg-orange-50"
          />
        </div>
      )}

      {/* ===== TAB CONTENT ===== */}
      {tab === 'overview' && <OverviewTab skuAnalysis={skuAnalysis} fmt={fmt} />}
      {tab === 'matrix' && <MatrixTab data={matrixData} anio={anio} fmt={fmt} />}
      {tab === 'plan' && (
        <PlanTab
          mes={mes} anio={anio} plan={plan} generating={generating}
          prevMonth={prevMonth} nextMonth={nextMonth}
          generatePlan={generatePlan} approvePlan={approvePlan}
          createShipment={createShipment} updateAjuste={updateAjuste}
          fmt={fmt} fmtMoney={fmtMoney}
        />
      )}
      {tab === 'projections' && projections && <ProjectionsTab data={projections} fmt={fmt} />}

      {/* ===== UPLOAD XML MODAL ===== */}
      {showUploadModal && (
        <UploadXmlModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            loadDashboard();
            if (tab === 'matrix') loadMatrix();
          }}
        />
      )}
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
  const [filterLibro, setFilterLibro] = useState('');
  const libros = Array.from(new Set(skuAnalysis.map(a => a.sku.libroColeccion).filter(Boolean)));

  const filtered = filterLibro
    ? skuAnalysis.filter(a => a.sku.libroColeccion === filterLibro)
    : skuAnalysis;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">Hoja de Decisión de Resurtido (Fórmula Formatex)</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            TENDREMOS (Stock + Tránsito) vs. NECESITAREMOS (4M Prom Vta × 4.5)
          </p>
        </div>
        {libros.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={filterLibro}
              onChange={(e) => setFilterLibro(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg"
            >
              <option value="">Todos los Libros / Colecciones</option>
              {libros.map((l: any) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Colección / Tela</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">4M Prom Vta</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Proy 4.5M</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Stock Disp.</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Tránsito</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase bg-blue-50/50">Tendremos</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Diferencia</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sugerido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((a: any) => {
              const isResurtir = a.statusResurtido === 'RESURTIR';
              return (
                <tr key={a.sku.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {a.sku.tipoArticulo === 'MUESTRARIO' ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">MUESTRARIO</span>
                      ) : null}
                      <p className="font-semibold text-gray-900">{a.sku.nombre}</p>
                    </div>
                    <p className="text-xs text-gray-400">
                      {a.sku.libroColeccion ? <span className="text-indigo-600 font-medium">[{a.sku.libroColeccion}] </span> : ''}
                      {a.sku.codigo} · {a.sku.color || 'Sin color'}
                    </p>
                  </td>
                  <td className="text-right px-3 py-3 font-mono text-gray-700">{fmt(a.promedio4M)}m</td>
                  <td className="text-right px-3 py-3 font-mono text-gray-800 font-semibold">{fmt(a.proyeccion4M5)}m</td>
                  <td className="text-right px-3 py-3 font-mono text-emerald-700 font-medium">
                    {fmt(a.stockActual)}m
                    {a.stockRestringido > 0 ? (
                      <span className="block text-[10px] text-amber-600">({fmt(a.stockRestringido)}m rest.)</span>
                    ) : null}
                  </td>
                  <td className="text-right px-3 py-3 font-mono text-purple-600">{fmt(a.transitoActual)}m</td>
                  <td className="text-right px-3 py-3 font-mono font-bold text-blue-700 bg-blue-50/30">{fmt(a.tendremos)}m</td>
                  <td className={`text-right px-3 py-3 font-mono font-bold ${a.diferencia < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {a.diferencia > 0 ? `+${fmt(a.diferencia)}m` : `${fmt(a.diferencia)}m`}
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                      isResurtir ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {isResurtir ? '⚠ Resurtir' : '✓ Ok'}
                    </span>
                  </td>
                  <td className="text-right px-4 py-3 font-mono font-bold">
                    {a.cantidadSugerida > 0 ? (
                      <span className="text-primary-700 bg-primary-50 px-2 py-0.5 rounded font-mono">
                        {fmt(a.cantidadSugerida)}m
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
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

function MatrixTab({ data, anio, fmt }: { data: any; anio: number; fmt: (n: number) => string }) {
  if (!data || !data.matrix) {
    return <div className="p-8 text-center text-gray-400">Cargando matriz histórica...</div>;
  }

  const shortMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Matriz de Ventas Mensuales ({anio}) — Hoja RESURTIDO Formatex</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Metros facturados mes a mes obtenidos de facturación CFDI o registro WMS
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500 font-semibold uppercase">
            <tr>
              <th className="text-left px-3 py-2.5">Libro / Tela</th>
              {shortMonths.map(m => (
                <th key={m} className="text-right px-2 py-2.5">{m}</th>
              ))}
              <th className="text-right px-2.5 py-2.5 bg-gray-100 text-gray-800">Total</th>
              <th className="text-right px-2.5 py-2.5 text-primary-700 font-bold bg-primary-50">4M Prom</th>
              <th className="text-right px-3 py-2.5 text-indigo-700 font-bold bg-indigo-50">Proy 4.5M</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-mono">
            {data.matrix.map((row: any) => (
              <tr key={row.sku.id} className="hover:bg-gray-50/50">
                <td className="px-3 py-2 font-sans font-medium text-gray-900 whitespace-nowrap">
                  {row.sku.libroColeccion && <span className="text-indigo-600 font-bold">[{row.sku.libroColeccion}] </span>}
                  {row.sku.nombre}
                </td>
                {shortMonths.map((_, i) => (
                  <td key={i} className="text-right px-2 py-2 text-gray-600">
                    {row.meses[i + 1] > 0 ? fmt(row.meses[i + 1]) : '—'}
                  </td>
                ))}
                <td className="text-right px-2.5 py-2 font-bold text-gray-900 bg-gray-50">{fmt(row.total)}</td>
                <td className="text-right px-2.5 py-2 font-bold text-primary-700 bg-primary-50/50">{fmt(row.promedio4M)}</td>
                <td className="text-right px-3 py-2 font-bold text-indigo-700 bg-indigo-50/50">{fmt(row.proyeccion4M5)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlanTab({ mes, anio, plan, generating, prevMonth, nextMonth, generatePlan, approvePlan, createShipment, updateAjuste, fmt, fmtMoney }: any) {
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [ajusteVal, setAjusteVal] = useState<number>(0);

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
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay plan generado para {MONTH_NAMES[mes]} {anio}</h3>
          <p className="text-gray-400 text-sm mb-6">
            El sistema correrá el algoritmo del Master (4M Prom Vta × 4.5) para proponer las OCs sugeridas.
          </p>
          <button
            onClick={generatePlan} disabled={generating}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl flex items-center gap-2 mx-auto transition-colors disabled:opacity-50"
          >
            {generating ? <Loader2 size={18} className="animate-spin" /> : <TrendingUp size={18} />}
            {generating ? 'Generando...' : 'Generar Plan con Fórmula Formatex'}
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
                <h3 className="font-semibold text-gray-900">Propuesta de Compras — {MONTH_NAMES[mes]} {anio}</h3>
                <p className="text-xs text-gray-400">{plan.lineas.length} SKUs · Inversión estimada: {fmtMoney(Number(plan.totalEstimado || 0))}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tela / SKU</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">Stock</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">Tránsito</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">Proy 4.5M</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Status</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">Sugerido</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-indigo-700 bg-indigo-50/50">Ajuste Ricardo</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Prioridad</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {plan.lineas.map((line: SkuLine) => {
                    const pc = PRIO_COLORS[line.prioridad] || PRIO_COLORS.BAJA;
                    const st = STATUS_LABELS[line.status] || STATUS_LABELS.PENDIENTE;
                    const isEditing = editingLineId === line.id;

                    return (
                      <tr key={line.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{line.sku.nombre}</p>
                          <p className="text-xs text-gray-400">
                            {line.sku.libroColeccion ? `[${line.sku.libroColeccion}] ` : ''}
                            {line.sku.codigo}
                          </p>
                        </td>
                        <td className="text-right px-3 py-3 font-mono text-gray-700">{fmt(line.stockActual)}m</td>
                        <td className="text-right px-3 py-3 font-mono text-purple-600">{fmt(line.transitoActual)}m</td>
                        <td className="text-right px-3 py-3 font-mono text-gray-600">{fmt(line.proyeccion4M5 || line.demandaProyectada)}m</td>
                        <td className="text-center px-3 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            line.decisionStatus === 'RESURTIR' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {line.decisionStatus || 'OK'}
                          </span>
                        </td>
                        <td className="text-right px-3 py-3 font-mono font-bold text-primary-700">
                          {line.cantidadSugerida > 0 ? `${fmt(line.cantidadSugerida)}m` : '—'}
                        </td>
                        <td className="text-right px-3 py-3 bg-indigo-50/30">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                value={ajusteVal}
                                onChange={(e) => setAjusteVal(Number(e.target.value))}
                                className="w-20 px-1.5 py-0.5 text-xs font-mono border rounded"
                              />
                              <button
                                onClick={() => {
                                  updateAjuste(line.id, ajusteVal);
                                  setEditingLineId(null);
                                }}
                                className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                <Check size={12} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingLineId(line.id);
                                setAjusteVal(line.ajusteDireccion || line.cantidadAprobada || line.cantidadSugerida);
                              }}
                              className="text-xs font-mono font-semibold text-indigo-700 hover:underline"
                            >
                              {line.ajusteDireccion ? `${fmt(line.ajusteDireccion)}m` : '(Definir)'}
                            </button>
                          )}
                        </td>
                        <td className="text-center px-3 py-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${pc.bg} ${pc.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />{line.prioridad}
                          </span>
                        </td>
                        <td className="text-center px-3 py-3">
                          {line.status === 'PENDIENTE' && (line.ajusteDireccion || line.cantidadSugerida) > 0 && (
                            <button
                              onClick={() => createShipment(line.id)}
                              className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 text-xs font-medium flex items-center gap-1 mx-auto"
                            >
                              <Send size={12} /> Generar OC
                            </button>
                          )}
                          {line.status === 'ORDENADO' && (
                            <span className="text-green-600 text-xs font-medium flex items-center justify-center gap-1">
                              <Truck size={12} /> Ordenado
                            </span>
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

            {/* Bar chart */}
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

// ===== UPLOAD XML MODAL =====

function UploadXmlModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.xml'));
      setFiles(selected);
    }
  };

  const handleProcess = async () => {
    if (files.length === 0) {
      toast.error('Selecciona al menos un archivo XML');
      return;
    }

    setUploading(true);
    try {
      // Leer contenidos de los XML en memoria
      const xmlContents = await Promise.all(
        files.map(file => {
          return new Promise<{ filename: string; content: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ filename: file.name, content: reader.result as string });
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
          });
        })
      );

      const { data } = await api.post('/supply-planning/historical-sales/upload-xmls', { xmlFiles: xmlContents });
      setStats(data);
      toast.success(`Procesados ${data.processedInvoices} comprobantes con éxito`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error procesando facturas XML');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <UploadCloud className="text-indigo-600" size={22} />
            <h3 className="font-bold text-gray-900">Ingesta de Facturas CFDI (CONTPAQi)</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400">
            <X size={18} />
          </button>
        </div>

        {!stats ? (
          <>
            <p className="text-xs text-gray-500 leading-relaxed">
              Selecciona los archivos <strong>XML de facturas emitidas</strong> descargados de CONTPAQi o del portal del SAT. El sistema leerá automáticamente la fecha, los códigos de tela y los metros vendidos para alimentar el cálculo de los 4 meses de promedio de resurtido.
            </p>

            <div className="border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-xl p-6 text-center cursor-pointer bg-gray-50/50 transition-colors">
              <input
                type="file"
                multiple
                accept=".xml"
                onChange={handleFileChange}
                className="hidden"
                id="xml-file-input"
              />
              <label htmlFor="xml-file-input" className="cursor-pointer">
                <FileSpreadsheet className="mx-auto text-indigo-400 mb-2" size={36} />
                <p className="text-sm font-semibold text-gray-700">Haz clic aquí para seleccionar archivos XML</p>
                <p className="text-xs text-gray-400 mt-1">Puedes seleccionar múltiples archivos XML a la vez</p>
              </label>
            </div>

            {files.length > 0 && (
              <div className="bg-indigo-50/60 p-3 rounded-xl flex items-center justify-between text-xs text-indigo-800">
                <span>{files.length} archivos XML seleccionados para procesar</span>
                <span className="font-mono font-bold">{(files.reduce((s, f) => s + f.size, 0) / 1024).toFixed(0)} KB</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleProcess}
                disabled={files.length === 0 || uploading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
              >
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
                {uploading ? 'Extrayendo datos...' : `Procesar ${files.length} XMLs`}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-sm">
                <CheckCircle2 size={18} /> Ingesta completada con éxito
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono mt-2">
                <div>Comprobantes: <strong>{stats.processedInvoices}</strong></div>
                <div>Conceptos leídos: <strong>{stats.totalItems}</strong></div>
                <div>Metros asignados: <strong>{stats.matchedItems}</strong></div>
                <div>Períodos SKU: <strong>{stats.salesRecordsUpdated}</strong></div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={onSuccess}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold"
              >
                Cerrar y Ver Resultados
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

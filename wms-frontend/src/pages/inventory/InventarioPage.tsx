import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import type { PaginatedResponse, HU } from '../../hooks/useApi';
import {
  Zap, ShieldAlert, Scissors, ScrollText, Warehouse,
  Package, Search, MapPin, BarChart3, AlertTriangle, Layers,
  ChevronRight, ArrowRight, CheckCircle2, History, Check
} from 'lucide-react';
import ExpressIngestModal from '../../components/inventory/ExpressIngestModal';
import { api } from '../../config/api';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  DISPONIBLE: 'bg-emerald-100 text-emerald-700',
  RESERVADO: 'bg-amber-100 text-amber-700',
  EN_PICKING: 'bg-blue-100 text-blue-700',
  EN_CORTE: 'bg-purple-100 text-purple-700',
  EN_EMPAQUE: 'bg-indigo-100 text-indigo-700',
  DESPACHADO: 'bg-gray-100 text-gray-600',
  AGOTADO: 'bg-red-100 text-red-700',
};

type InventoryTab = 'todo' | 'enteros' | 'remanentes' | 'mermas';

export default function InventarioPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const actionParam = searchParams.get('action');

  // Active tab: 'todo' | 'enteros' | 'remanentes' | 'mermas'
  const [activeTab, setActiveTab] = useState<InventoryTab>(() => {
    if (tabParam === 'remanentes' || tabParam === 'retazos') return 'remanentes';
    if (tabParam === 'enteros') return 'enteros';
    if (tabParam === 'mermas') return 'mermas';
    return 'todo';
  });

  // Selected warehouse / bodega filter
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');

  // General filters
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterCalidad, setFilterCalidad] = useState('');
  const [page, setPage] = useState(1);
  const [selectedHU, setSelectedHU] = useState<string | null>(null);

  // Modal
  const [showExpressModal, setShowExpressModal] = useState(false);
  const [modalDefaultTab, setModalDefaultTab] = useState<'express' | 'cyclic'>('express');

  useEffect(() => {
    if (tabParam === 'cyclic' || actionParam === 'conteo') {
      setModalDefaultTab('cyclic');
      setShowExpressModal(true);
    } else if (tabParam === 'remanentes' || tabParam === 'retazos') {
      setActiveTab('remanentes');
    } else if (tabParam === 'enteros') {
      setActiveTab('enteros');
    } else if (tabParam === 'mermas') {
      setActiveTab('mermas');
    }
  }, [tabParam, actionParam]);

  // Fetch warehouses
  const { data: warehouses } = useApi<any[]>(['warehouses-list'], '/warehouse/warehouses');
  const warehouseList = warehouses || [];

  // Computed API filter params based on active tab
  const tipoRolloParam =
    activeTab === 'enteros' ? 'ENTERO' :
    activeTab === 'remanentes' ? 'RETAZO' : undefined;

  const zonaTipoParam = activeTab === 'mermas' ? 'MERMA' : undefined;

  // Inventory stats for selected warehouse
  const { data: stats, refetch: refetchStats } = useApi<any>(
    ['inventory-stats', selectedWarehouse],
    '/inventory/stats',
    { warehouseId: selectedWarehouse || undefined }
  );

  // Main HUs list
  const { data: resp, isLoading, refetch: refetchHUs } = useApi<PaginatedResponse<HU>>(
    ['inventory-hus', page, activeTab, selectedWarehouse, filterEstado, filterCalidad, search],
    '/inventory/hus',
    {
      search: search || undefined,
      tipoRollo: tipoRolloParam,
      zonaTipo: zonaTipoParam,
      warehouseId: selectedWarehouse || undefined,
      estadoHu: filterEstado || undefined,
      gradoCalidad: filterCalidad || undefined,
      page,
      limit: 15,
    }
  );

  // Detail query
  const { data: detail, refetch: refetchDetail } = useApi<any>(
    ['hu-detail', selectedHU],
    `/inventory/hus/${selectedHU}`,
    {},
    !!selectedHU
  );

  const handleTabChange = (tab: InventoryTab) => {
    setActiveTab(tab);
    setPage(1);
    setSelectedHU(null);
  };

  const handleWarehouseChange = (wId: string) => {
    setSelectedWarehouse(wId);
    setPage(1);
    setSelectedHU(null);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
            <ScrollText size={24} strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Inventario</h1>
              {selectedWarehouse && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {warehouseList.find((w: any) => w.id === selectedWarehouse)?.nombre || 'Bodega Filtrada'}
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm">
              Gestión centralizada de rollos enteros, remanentes y mermas por bodega
            </p>
          </div>
        </div>

        {/* Top Controls: Warehouse Selector + Express Modal Button */}
        <div className="flex items-center gap-3">
          {/* Warehouse Selector */}
          <div className="relative min-w-[220px]">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm text-sm">
              <Warehouse size={16} className="text-indigo-600 shrink-0" />
              <select
                value={selectedWarehouse}
                onChange={(e) => handleWarehouseChange(e.target.value)}
                className="w-full bg-transparent text-gray-800 font-medium focus:outline-none cursor-pointer text-xs"
              >
                <option value="">🏢 Todas las Bodegas</option>
                {warehouseList.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.tipo === 'VIRTUAL' ? '🏬' : '🏢'} {w.nombre} ({w.codigo})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={() => {
              setModalDefaultTab('express');
              setShowExpressModal(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95 shrink-0"
          >
            <Zap size={16} />
            + Alta Express / Conteo
          </button>
        </div>
      </div>

      {/* Quick KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl p-3.5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
            <span>Total Piezas</span>
            <Package size={16} className="text-blue-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">{stats?.totalHUs || 0}</p>
          <span className="text-[11px] text-gray-400">Handling Units</span>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
            <span>Metraje Total</span>
            <BarChart3 size={16} className="text-indigo-500" />
          </div>
          <p className="text-xl font-bold text-indigo-600">{(stats?.metrajeTotal || 0).toFixed(1)}m</p>
          <span className="text-[11px] text-emerald-600 font-medium">{(stats?.metrajeDisponible || 0).toFixed(1)}m disponible</span>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
            <span>Rollos Enteros</span>
            <ScrollText size={16} className="text-blue-500" />
          </div>
          <p className="text-xl font-bold text-blue-600">{stats?.totalEnteros || 0}</p>
          <span className="text-[11px] text-gray-400">Piezas originales</span>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-amber-100 bg-amber-50/20 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 text-xs mb-1">
            <span className="font-semibold">Remanentes</span>
            <Scissors size={16} className="text-amber-600" />
          </div>
          <p className="text-xl font-bold text-amber-600">{stats?.totalRetazos || 0}</p>
          <span className="text-[11px] text-amber-700/80 font-medium">{(stats?.metrajeRemanentes || 0).toFixed(1)}m (remanentes)</span>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-rose-100 bg-rose-50/20 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-rose-700 text-xs mb-1">
            <span className="font-semibold">Mermas / Cuarentena</span>
            <AlertTriangle size={16} className="text-rose-600" />
          </div>
          <p className="text-xl font-bold text-rose-600">{stats?.totalMermas || 0}</p>
          <span className="text-[11px] text-rose-700/80">En zona merma</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => handleTabChange('todo')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'todo'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Layers size={16} />
          <span>Todo el Inventario</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'todo' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
            {stats?.totalHUs || 0}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('enteros')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'enteros'
              ? 'border-blue-600 text-blue-600 bg-blue-50/30'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <ScrollText size={16} />
          <span>Rollos Enteros</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'enteros' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
            {stats?.totalEnteros || 0}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('remanentes')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'remanentes'
              ? 'border-amber-500 text-amber-600 bg-amber-50/30'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Scissors size={16} />
          <span>Remanentes</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'remanentes' ? 'bg-amber-100 text-amber-700 font-bold' : 'bg-gray-100 text-gray-600'}`}>
            {stats?.totalRetazos || 0}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('mermas')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'mermas'
              ? 'border-rose-500 text-rose-600 bg-rose-50/30'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <AlertTriangle size={16} />
          <span>Mermas</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'mermas' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'}`}>
            {stats?.totalMermas || 0}
          </span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap items-center gap-3 shadow-sm">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por código HU, tela, lote o clave..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={filterCalidad}
          onChange={(e) => { setFilterCalidad(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 cursor-pointer"
        >
          <option value="">Todas las calidades</option>
          <option value="PRIMERA">Primera Calidad</option>
          <option value="CALIDAD_A">Calidad A</option>
          <option value="CALIDAD_B">Calidad B (-20%)</option>
          <option value="CALIDAD_C">Calidad C (-40%)</option>
          <option value="CALIDAD_D">Calidad D (-60%)</option>
          <option value="RESTRINGIDO">Restringido / Apartado</option>
        </select>

        <select
          value={filterEstado}
          onChange={(e) => { setFilterEstado(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 cursor-pointer"
        >
          <option value="">Todos los estados</option>
          <option value="DISPONIBLE">Disponible</option>
          <option value="RESERVADO">Reservado</option>
          <option value="EN_PICKING">En Picking</option>
          <option value="EN_CORTE">En Corte</option>
          <option value="EN_EMPAQUE">En Empaque</option>
          <option value="AGOTADO">Agotado</option>
        </select>
      </div>

      {/* Grid: Table + Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center text-gray-400">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm">Cargando inventario...</p>
            </div>
          ) : !resp?.data?.length ? (
            <div className="p-12 text-center text-gray-400">
              <Package size={48} className="mx-auto mb-2 text-gray-300" />
              <p className="text-base font-semibold text-gray-600">No hay registros en esta vista</p>
              <p className="text-xs text-gray-400 mt-1">
                {selectedWarehouse ? 'Prueba seleccionando otra bodega o limpiando los filtros.' : 'Registra una recepción o alta express para generar HUs.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase font-semibold border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left">Código HU</th>
                      <th className="px-4 py-3 text-left">SKU / Colección</th>
                      <th className="px-4 py-3 text-left">Bodega / Ubicación</th>
                      <th className="px-4 py-3 text-right">Metraje</th>
                      <th className="px-4 py-3 text-center">Calidad</th>
                      <th className="px-4 py-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {resp.data.map((hu: any) => {
                      const isRemanente = hu.tipoRollo === 'RETAZO';
                      const isSelected = selectedHU === hu.id;
                      const warehouseName = hu.ubicacion?.warehouse?.nombre || 'Nave Formatex';
                      const isVirtual = hu.ubicacion?.warehouse?.tipo === 'VIRTUAL';

                      return (
                        <tr
                          key={hu.id}
                          className={`hover:bg-indigo-50/40 cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50/80' : ''
                          }`}
                          onClick={() => setSelectedHU(hu.id)}
                        >
                          {/* Código HU + Tipo */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {isRemanente ? (
                                <Scissors size={14} className="text-amber-500 shrink-0" />
                              ) : (
                                <ScrollText size={14} className="text-blue-500 shrink-0" />
                              )}
                              <span className="font-mono text-xs font-bold text-gray-900">
                                {hu.codigo}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  isRemanente
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {isRemanente ? 'REMANENTE' : 'ENTERO'}
                              </span>
                              {hu.generacion > 0 && (
                                <span className="text-[10px] text-gray-400 font-medium">
                                  G{hu.generacion}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* SKU */}
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900 text-xs">{hu.sku?.nombre}</p>
                            <p className="text-xs text-gray-400">
                              {hu.sku?.codigo} {hu.sku?.color ? `· ${hu.sku.color}` : ''}
                            </p>
                          </td>

                          {/* Bodega / Ubicación */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-xs font-medium text-gray-700">
                              <span>{isVirtual ? '🏬' : '🏢'}</span>
                              <span className="truncate max-w-[130px]" title={warehouseName}>
                                {warehouseName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-mono text-gray-500">
                              <MapPin size={10} className="text-gray-400 shrink-0" />
                              <span>{hu.ubicacion?.codigo || 'Sin ubicar'}</span>
                            </div>
                          </td>

                          {/* Metraje */}
                          <td className="px-4 py-3 text-right">
                            <span className="font-bold text-gray-900">{hu.metrajeActual}m</span>
                            {isRemanente && hu.metrajeOriginal && (
                              <span className="block text-[10px] text-gray-400">
                                de {hu.metrajeOriginal}m
                              </span>
                            )}
                          </td>

                          {/* Calidad */}
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                hu.gradoCalidad === 'RESTRINGIDO' || hu.calidadRestringida
                                  ? 'bg-red-600 text-white'
                                  : hu.gradoCalidad === 'CALIDAD_A'
                                  ? 'bg-amber-100 text-amber-800'
                                  : hu.gradoCalidad === 'CALIDAD_B'
                                  ? 'bg-orange-100 text-orange-800'
                                  : hu.gradoCalidad === 'CALIDAD_C'
                                  ? 'bg-rose-100 text-rose-800'
                                  : hu.gradoCalidad === 'CALIDAD_D'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {hu.gradoCalidad === 'RESTRINGIDO' ? 'RESTRINGIDO' : hu.gradoCalidad || 'PRIMERA'}
                            </span>
                          </td>

                          {/* Estado */}
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                                STATUS_COLORS[hu.estadoHu] || 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {hu.estadoHu}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/40">
                <span className="text-xs text-gray-500 font-medium">
                  Pág {resp.page} de {resp.totalPages || 1} ({resp.total} registros)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= (resp.totalPages || 1)}
                    className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Detail Panel */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          {!selectedHU ? (
            <div className="text-center text-gray-400 py-16">
              <Search size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">Selecciona un HU</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px] mx-auto">
                Haz clic en cualquier rollo o remanente para ver su bodega, calidad y genealogía
              </p>
            </div>
          ) : !detail ? (
            <div className="text-center text-gray-400 py-16">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">Cargando detalle...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Detail Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  {detail.tipoRollo === 'RETAZO' ? (
                    <Scissors size={18} className="text-amber-500" />
                  ) : (
                    <ScrollText size={18} className="text-blue-500" />
                  )}
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 leading-tight">{detail.codigo}</h3>
                    <span className="text-[11px] font-semibold text-gray-500">
                      {detail.tipoRollo === 'RETAZO' ? 'Remanente de corte' : 'Rollo Entero'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedHU(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Metraje Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 text-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Metraje Actual</span>
                <p className="text-3xl font-extrabold text-indigo-900 mt-0.5">{detail.metrajeActual}m</p>
                {detail.metrajeOriginal && (
                  <p className="text-xs text-indigo-700/80 mt-1">
                    de {detail.metrajeOriginal}m originales
                  </p>
                )}
                {/* Visual Progress Bar for Remanentes */}
                {detail.metrajeOriginal && (
                  <div className="mt-2.5 h-2 bg-indigo-200/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (detail.metrajeActual / detail.metrajeOriginal) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400 block text-xs">SKU / Tela</span>
                  <span className="font-semibold text-gray-900 text-xs">{detail.sku?.nombre}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs">Color</span>
                  <span className="font-medium text-gray-700 text-xs">{detail.sku?.color || '—'}</span>
                </div>

                <div>
                  <span className="text-gray-400 block text-xs">Bodega / Almacén</span>
                  <span className="font-semibold text-indigo-700 text-xs flex items-center gap-1">
                    <Warehouse size={12} />
                    {detail.ubicacion?.warehouse?.nombre || 'Nave Formatex'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs">Ubicación Rack</span>
                  <span className="font-mono font-medium text-gray-800 text-xs">
                    {detail.ubicacion?.codigo || 'Sin ubicar'}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 block text-xs">Estado HU</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLORS[detail.estadoHu] || 'bg-gray-100'}`}>
                    {detail.estadoHu}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs">Generación</span>
                  <span className="font-medium text-gray-800 text-xs">G{detail.generacion}</span>
                </div>

                {/* Formatex Quality Grade Selector */}
                <div className="col-span-2 bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <ShieldAlert size={14} className="text-indigo-600" /> Grado de Calidad Fórmatex
                    </span>
                    {detail.calidadRestringida && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                        RESTRINGIDO
                      </span>
                    )}
                  </div>
                  <select
                    value={detail.gradoCalidad || 'PRIMERA'}
                    onChange={async (e) => {
                      const newGrade = e.target.value;
                      try {
                        await api.put(`/inventory/hus/${detail.id}/calidad`, {
                          gradoCalidad: newGrade,
                          calidadRestringida: newGrade === 'RESTRINGIDO',
                        });
                        toast.success(`Calidad actualizada a ${newGrade}`);
                        refetchHUs();
                        refetchDetail();
                        refetchStats();
                      } catch {
                        toast.error('Error al actualizar calidad');
                      }
                    }}
                    className="w-full text-xs px-2.5 py-2 border border-gray-300 rounded-lg bg-white font-medium text-gray-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="PRIMERA">Primera Calidad (Disponible general)</option>
                    <option value="CALIDAD_A">Calidad A (Sin descuento a clientes especiales)</option>
                    <option value="CALIDAD_B">Calidad B (20% de descuento)</option>
                    <option value="CALIDAD_C">Calidad C (40% de descuento)</option>
                    <option value="CALIDAD_D">Calidad D (60% de descuento)</option>
                    <option value="RESTRINGIDO">RESTRINGIDO (Apartada / Bloqueada)</option>
                  </select>
                </div>
              </div>

              {/* Genealogy (Traceability) */}
              {(detail.parentHu || detail.childHus?.length > 0) && (
                <div className="border-t border-gray-100 pt-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Scissors size={14} className="text-amber-600" /> Genealogía (Trazabilidad)
                  </h4>
                  {detail.parentHu && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50/70 border border-blue-100 rounded-lg text-xs mb-1.5">
                      <ScrollText size={14} className="text-blue-500 shrink-0" />
                      <span>
                        Originado de:{' '}
                        <span className="font-mono font-bold text-blue-700">{detail.parentHu.codigo}</span>
                      </span>
                      <span className="text-gray-400">({detail.parentHu.metrajeOriginal}m)</span>
                    </div>
                  )}
                  {detail.childHus?.map((c: any) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2 bg-amber-50/60 border border-amber-100 rounded-lg text-xs mb-1"
                    >
                      <div className="flex items-center gap-1.5">
                        <Scissors size={13} className="text-amber-500 shrink-0" />
                        <span className="font-mono font-bold text-amber-700">{c.codigo}</span>
                      </div>
                      <span className="text-gray-500 font-medium">
                        {c.metrajeActual}m · {c.estadoHu}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent Movements */}
              {detail.movimientos?.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <History size={14} className="text-indigo-600" /> Últimos Movimientos
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {detail.movimientos.slice(0, 6).map((m: any) => (
                      <div key={m.id} className="text-xs flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-bold text-gray-800">{m.tipo}</span>
                          {m.ubicacionDestino && (
                            <span className="block text-[10px] text-gray-400">{m.ubicacionDestino}</span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400">
                          {new Date(m.createdAt).toLocaleDateString('es-MX')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Express / Conteo Modal */}
      <ExpressIngestModal
        open={showExpressModal}
        defaultTab={modalDefaultTab}
        onClose={() => {
          setShowExpressModal(false);
          if (tabParam || actionParam) setSearchParams({});
        }}
        onSuccess={() => {
          refetchHUs();
          refetchStats();
        }}
      />
    </div>
  );
}

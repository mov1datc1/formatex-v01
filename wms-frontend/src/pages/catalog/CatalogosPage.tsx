import { useState, useRef } from 'react';
import { useApi, useMutationApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import { Pencil, Trash2, X, Plus, Search, FileText, AlertTriangle, CreditCard, Shield, Upload, Download, Layers, Truck, Users, UserCheck, BookOpen, CheckCircle2 } from 'lucide-react';
import { KpiIcon } from '../../components/icons/WmsIcons';

type Tab = 'skus' | 'suppliers' | 'clients' | 'vendors';

const TABS: { key: Tab; label: string; icon: any; csvHeaders: string[] }[] = [
  { key: 'skus', label: 'Telas (SKUs)', icon: Layers, csvHeaders: ['codigo','nombre','categoria','color','composicion','anchoMetros','metrajeEstandar','codigoBarras'] },
  { key: 'suppliers', label: 'Proveedores', icon: Truck, csvHeaders: ['codigo','nombre','contacto','telefono','email','rfc'] },
  { key: 'clients', label: 'Clientes', icon: Users, csvHeaders: ['codigo','nombre','contacto','telefono','email','direccion','pais','rfc','cp','regimenFiscal','usoCfdi'] },
  { key: 'vendors', label: 'Vendedores', icon: UserCheck, csvHeaders: ['codigo','nombre','telefono','email'] },
];

// Catálogos SAT para dropdowns
const REGIMENES_FISCALES = [
  { clave: '601', label: '601 - General de Ley PM' },
  { clave: '603', label: '603 - PM con Fines no Lucrativos' },
  { clave: '605', label: '605 - Sueldos y Salarios' },
  { clave: '606', label: '606 - Arrendamiento' },
  { clave: '608', label: '608 - Demás ingresos' },
  { clave: '612', label: '612 - PF con Act. Empresariales y Prof.' },
  { clave: '616', label: '616 - Sin obligaciones fiscales' },
  { clave: '620', label: '620 - Soc. Cooperativas de Producción' },
  { clave: '621', label: '621 - Incorporación Fiscal' },
  { clave: '625', label: '625 - Plataformas Tecnológicas' },
  { clave: '626', label: '626 - Régimen Simplificado de Confianza' },
];

const USOS_CFDI = [
  { clave: 'G01', label: 'G01 - Adquisición de mercancías' },
  { clave: 'G03', label: 'G03 - Gastos en general' },
  { clave: 'P01', label: 'P01 - Por definir' },
  { clave: 'S01', label: 'S01 - Sin efectos fiscales' },
];

export default function CatalogosPage() {
  const [tab, setTab] = useState<Tab>('skus');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [deleteModal, setDeleteModal] = useState<any>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const endpoint = tab === 'skus' ? '/catalog/skus' : tab === 'suppliers' ? '/catalog/suppliers' : tab === 'clients' ? '/catalog/clients' : '/catalog/vendors';
  const { data: resp, isLoading, refetch } = useApi<PaginatedResponse<any>>([tab, search], endpoint, { search: search || undefined, limit: 50 });
  const createMut = useMutationApi(endpoint);

  const handleCreate = async () => {
    try {
      await createMut.mutateAsync(formData);
      toast.success('✅ Creado exitosamente');
      closeForm();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al crear');
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      // Strip read-only and relation fields that Prisma won't accept
      const { id, createdAt, updatedAt, vendor, orders, activo, vendorId: _vid, ...editableData } = formData;
      await api.put(`${endpoint}/${editingId}`, editableData);
      toast.success('✅ Actualizado exitosamente');
      closeForm();
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al actualizar');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`${endpoint}/${id}`);
      toast.success('✅ Eliminado');
      setDeleteModal(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al eliminar');
    }
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({ ...item });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({});
  };

  // === CSV Bulk Upload ===
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvUploading(true); setCsvResult(null);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('El CSV debe tener al menos un encabezado y una fila'); setCsvUploading(false); return; }
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const items = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const obj: any = {};
        headers.forEach((h, i) => { if (vals[i]) obj[h] = vals[i]; });
        return obj;
      }).filter(item => item.codigo && item.nombre);
      if (!items.length) { toast.error('No se encontraron filas válidas (requiere columnas: codigo, nombre)'); setCsvUploading(false); return; }
      const bulkEndpoint = `${endpoint}/bulk`;
      const { data } = await api.post(bulkEndpoint, { items });
      setCsvResult(data);
      toast.success(`${data.created} registros creados${data.errors?.length ? `, ${data.errors.length} errores` : ''}`);
      refetch();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Error al procesar CSV'); }
    setCsvUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const tabConfig = TABS.find(t => t.key === tab)!;
    const csv = tabConfig.csvHeaders.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `plantilla_${tab}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const renderForm = () => {
    switch (tab) {
      case 'skus': return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderInput('Código *', 'codigo')}
          {renderInput('Nombre *', 'nombre')}
          {renderInput('Categoría', 'categoria', { placeholder: 'Algodón, Poliéster...' })}
          {renderInput('Color', 'color')}
          {renderInput('Composición', 'composicion', { placeholder: '100% algodón' })}
          {renderInput('Ancho (m)', 'anchoMetros', { type: 'number' })}
          {renderInput('Metraje Estándar', 'metrajeEstandar', { type: 'number' })}
          {renderInput('Código Barras', 'codigoBarras')}
        </div>
      );
      case 'suppliers': return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderInput('Código *', 'codigo')}
          {renderInput('Nombre *', 'nombre')}
          {renderInput('Contacto', 'contacto')}
          {renderInput('Teléfono', 'telefono')}
          {renderInput('Email', 'email')}
          {renderInput('RFC', 'rfc')}
        </div>
      );
      case 'clients': return (
        <div className="space-y-4">
          {/* Datos generales */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Datos Generales</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderInput('Código *', 'codigo')}
              {renderInput('Razón Social / Nombre *', 'nombre', { hint: 'Debe coincidir con la Constancia de Situación Fiscal del SAT' })}
              {renderInput('Contacto', 'contacto')}
              {renderInput('Teléfono', 'telefono')}
              {renderInput('Email', 'email', { type: 'email' })}
              {renderInput('Dirección', 'direccion')}
              {renderInput('País', 'pais', { placeholder: 'México' })}
            </div>
          </div>

          {/* Datos Fiscales CFDI 4.0 */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={14} className="text-emerald-600" />
              <h3 className="text-xs font-semibold text-emerald-700 uppercase">Datos Fiscales — CFDI 4.0</h3>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 text-xs text-emerald-700 mb-3">
              ⚠️ Estos datos son <strong>obligatorios</strong> para emitir facturas. Deben coincidir exactamente con la Constancia de Situación Fiscal del cliente.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderInput('RFC *', 'rfc', { hint: '13 caracteres PM, 12 PF', placeholder: 'XAXX010101000' })}
              {renderInput('Código Postal Fiscal *', 'cp', { hint: 'C.P. del domicilio fiscal registrado en SAT', placeholder: '06600' })}
              {renderSelect('Régimen Fiscal *', 'regimenFiscal', REGIMENES_FISCALES, 'Del catálogo SAT c_RegimenFiscal')}
              {renderSelect('Uso del CFDI', 'usoCfdi', USOS_CFDI, 'Default para facturas de este cliente')}
            </div>
          </div>

          {/* Config de Crédito */}
          {editingId && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard size={14} className="text-violet-600" />
                <h3 className="text-xs font-semibold text-violet-700 uppercase">Crédito y Descuentos</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Plazo Default (días)</label>
                  <select value={formData.creditPlazo || 30} onChange={(e) => updateField('creditPlazo', +e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                    <option value={30}>30 días</option>
                    <option value={60}>60 días</option>
                    <option value={90}>90 días</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Lista de Precios Default</label>
                  <select value={formData.creditLista || ''} onChange={(e) => updateField('creditLista', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                    <option value="">Sin asignar</option>
                    <option value="F1">F1 — Premium (2.50%)</option>
                    <option value="F2">F2 — Estándar (2.25%)</option>
                    <option value="F3">F3 — Desc. Medio (2.00%)</option>
                    <option value="F4">F4 — Desc. Alto (1.75%)</option>
                    <option value="F5">F5 — Máx. Descuento (1.75%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Desc. Máximo (%)</label>
                  <input type="number" step="0.5" min={0} max={50}
                    value={formData.creditDescMax ?? 20}
                    onChange={(e) => updateField('creditDescMax', +e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                  <p className="text-[10px] text-gray-400 mt-0.5">Máximo que un vendedor puede otorgar</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => updateField('creditBloqueado', !formData.creditBloqueado)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        formData.creditBloqueado ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      <Shield size={12} />
                      {formData.creditBloqueado ? '🔒 Bloqueado' : '✅ Activo'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
      case 'vendors': return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderInput('Código *', 'codigo')}
          {renderInput('Nombre *', 'nombre')}
          {renderInput('Teléfono', 'telefono')}
          {renderInput('Email', 'email')}
        </div>
      );
    }
  };

  // Stable input change handler (avoids re-mount issues)
  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const renderInput = (label: string, field: string, opts?: { type?: string; placeholder?: string; hint?: string }) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={opts?.type || 'text'}
        value={formData[field] ?? ''}
        onChange={(e) => updateField(field, opts?.type === 'number' ? +e.target.value : e.target.value)}
        placeholder={opts?.placeholder}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
      />
      {opts?.hint && <p className="text-[10px] text-gray-400 mt-0.5">{opts.hint}</p>}
    </div>
  );

  const renderSelect = (label: string, field: string, options: { clave: string; label: string }[], hint?: string) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select
        value={formData[field] || ''}
        onChange={(e) => updateField(field, e.target.value)}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
      >
        <option value="">Seleccionar...</option>
        {options.map((o) => <option key={o.clave} value={o.clave}>{o.label}</option>)}
      </select>
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );

  const columns: Record<Tab, { key: string; label: string }[]> = {
    skus: [{ key: 'codigo', label: 'Código' }, { key: 'nombre', label: 'Nombre' }, { key: 'categoria', label: 'Categoría' }, { key: 'color', label: 'Color' }, { key: 'metrajeEstandar', label: 'Metraje Std.' }],
    suppliers: [{ key: 'codigo', label: 'Código' }, { key: 'nombre', label: 'Nombre' }, { key: 'contacto', label: 'Contacto' }, { key: 'telefono', label: 'Teléfono' }, { key: 'email', label: 'Email' }],
    clients: [{ key: 'codigo', label: 'Código' }, { key: 'nombre', label: 'Razón Social' }, { key: 'rfc', label: 'RFC' }, { key: 'cp', label: 'C.P. Fiscal' }, { key: 'regimenFiscal', label: 'Régimen' }, { key: 'telefono', label: 'Teléfono' }],
    vendors: [{ key: 'codigo', label: 'Código' }, { key: 'nombre', label: 'Nombre' }, { key: 'telefono', label: 'Teléfono' }, { key: 'email', label: 'Email' }],
  };

  // Check if client has all CFDI fields
  const isCfdiReady = (item: any) => item.rfc && item.cp && item.regimenFiscal;

  const activeTab = TABS.find(t => t.key === tab)!;
  const TabIcon = activeTab.icon;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <KpiIcon icon={BookOpen} gradient="from-violet-500 to-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Catálogos</h1>
            <p className="text-gray-500 text-sm">Gestión de datos maestros — {resp?.total || 0} registros en {activeTab.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors" title="Descargar plantilla CSV">
            <Download size={15} /> Plantilla
          </button>
          <label className={`flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors cursor-pointer border border-emerald-200 ${csvUploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload size={15} /> {csvUploading ? 'Subiendo...' : 'Carga CSV'}
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} disabled={csvUploading} />
          </label>
          <button onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({}); setCsvResult(null); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all">
            {showForm ? <><X size={15} /> Cerrar</> : <><Plus size={15} /> Nuevo</>}
          </button>
        </div>
      </div>

      {/* CSV Result Banner */}
      {csvResult && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${csvResult.errors?.length ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <CheckCircle2 size={18} className={csvResult.errors?.length ? 'text-amber-500 mt-0.5' : 'text-emerald-500 mt-0.5'} />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">{csvResult.created} registros importados exitosamente</p>
            {csvResult.errors?.length > 0 && (
              <div className="mt-1">
                <p className="text-xs text-amber-700 font-medium">{csvResult.errors.length} errores:</p>
                <ul className="text-xs text-amber-600 mt-0.5 max-h-20 overflow-y-auto">
                  {csvResult.errors.slice(0, 5).map((e: any, i: number) => <li key={i}>Fila {e.row}: {e.error}</li>)}
                  {csvResult.errors.length > 5 && <li>...y {csvResult.errors.length - 5} más</li>}
                </ul>
              </div>
            )}
          </div>
          <button onClick={() => setCsvResult(null)} className="p-1 hover:bg-white/50 rounded"><X size={14} className="text-gray-400" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); closeForm(); setCsvResult(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}>
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-50"><TabIcon size={20} className="text-violet-500" /></div>
            <h2 className="text-lg font-bold text-gray-900">
              {editingId ? `Editar ${activeTab.label}` : `Nuevo ${activeTab.label}`}
            </h2>
          </div>
          {renderForm()}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={closeForm} className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-sm font-medium transition-colors">Cancelar</button>
            <button
              onClick={editingId ? handleUpdate : handleCreate}
              disabled={createMut.isPending}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all"
            >
              {createMut.isPending ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Registro'}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Buscar en ${activeTab.label.toLowerCase()}...`} className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-gray-400">Cargando...</div> : !resp?.data?.length ? (
          <div className="p-12 text-center text-gray-400">
            <TabIcon size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">No hay registros en {activeTab.label}</p>
            <p className="text-xs mt-1">Usa "+ Nuevo" o "Carga CSV" para agregar</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {columns[tab].map((c) => <th key={c.key} className="px-4 py-3 text-left">{c.label}</th>)}
                <th className="px-4 py-3 text-center w-24">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {resp.data.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  {columns[tab].map((c) => (
                    <td key={c.key} className="px-4 py-3">
                      {c.key === 'regimenFiscal' && item[c.key] ? (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{item[c.key]}</span>
                      ) : c.key === 'rfc' && tab === 'clients' ? (
                        <span className="font-mono text-xs">{item[c.key] || <span className="text-red-400 flex items-center gap-1"><AlertTriangle size={10} /> Falta</span>}</span>
                      ) : (
                        item[c.key] || '—'
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {tab === 'clients' && !isCfdiReady(item) && (
                        <span title="Faltan datos fiscales para CFDI 4.0" className="p-1 text-amber-500">
                          <AlertTriangle size={14} />
                        </span>
                      )}
                      <button
                        onClick={() => startEdit(item)}
                        title="Editar"
                        className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      {tab === 'clients' && (
                        <button
                          onClick={() => setDeleteModal(item)}
                          title="Eliminar"
                          className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Eliminar Cliente</h3>
                <p className="text-xs text-gray-400">Esta acción desactiva el cliente</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 mb-4">
              ¿Estás seguro de eliminar a <strong>{deleteModal.nombre}</strong> ({deleteModal.codigo})?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm font-medium">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteModal.id)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-medium">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

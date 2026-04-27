import { useState } from 'react';
import { useApi, useMutationApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import { Pencil, Trash2, X, Plus, Search, FileText, AlertTriangle } from 'lucide-react';

type Tab = 'skus' | 'suppliers' | 'clients' | 'vendors';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'skus', label: 'Telas (SKUs)', icon: '🧵' },
  { key: 'suppliers', label: 'Proveedores', icon: '🏭' },
  { key: 'clients', label: 'Clientes', icon: '👤' },
  { key: 'vendors', label: 'Vendedores', icon: '💼' },
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
      await api.put(`${endpoint}/${editingId}`, formData);
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

  const renderForm = () => {
    switch (tab) {
      case 'skus': return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Código *" field="codigo" />
          <Input label="Nombre *" field="nombre" />
          <Input label="Categoría" field="categoria" placeholder="Algodón, Poliéster..." />
          <Input label="Color" field="color" />
          <Input label="Composición" field="composicion" placeholder="100% algodón" />
          <Input label="Ancho (m)" field="anchoMetros" type="number" />
          <Input label="Metraje Estándar" field="metrajeEstandar" type="number" />
          <Input label="Código Barras" field="codigoBarras" />
        </div>
      );
      case 'suppliers': return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Código *" field="codigo" />
          <Input label="Nombre *" field="nombre" />
          <Input label="Contacto" field="contacto" />
          <Input label="Teléfono" field="telefono" />
          <Input label="Email" field="email" />
          <Input label="RFC" field="rfc" />
        </div>
      );
      case 'clients': return (
        <div className="space-y-4">
          {/* Datos generales */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Datos Generales</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Código *" field="codigo" />
              <Input label="Razón Social / Nombre *" field="nombre" hint="Debe coincidir con la Constancia de Situación Fiscal del SAT" />
              <Input label="Contacto" field="contacto" />
              <Input label="Teléfono" field="telefono" />
              <Input label="Email" field="email" type="email" />
              <Input label="Dirección" field="direccion" />
              <Input label="País" field="pais" placeholder="México" />
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
              <Input label="RFC *" field="rfc" hint="13 caracteres PM, 12 PF" placeholder="XAXX010101000" />
              <Input label="Código Postal Fiscal *" field="cp" hint="C.P. del domicilio fiscal registrado en SAT" placeholder="06600" />
              <Select
                label="Régimen Fiscal *"
                field="regimenFiscal"
                options={REGIMENES_FISCALES}
                hint="Del catálogo SAT c_RegimenFiscal"
              />
              <Select
                label="Uso del CFDI"
                field="usoCfdi"
                options={USOS_CFDI}
                hint="Default para facturas de este cliente"
              />
            </div>
          </div>
        </div>
      );
      case 'vendors': return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Código *" field="codigo" />
          <Input label="Nombre *" field="nombre" />
          <Input label="Teléfono" field="telefono" />
          <Input label="Email" field="email" />
        </div>
      );
    }
  };

  function Input({ label, field, type = 'text', placeholder, hint, className = '' }: { label: string; field: string; type?: string; placeholder?: string; hint?: string; className?: string }) {
    return (
      <div className={className}>
        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
        <input type={type} value={formData[field] || ''} onChange={(e) => setFormData({ ...formData, [field]: type === 'number' ? +e.target.value : e.target.value })} placeholder={placeholder} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
        {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
      </div>
    );
  }

  function Select({ label, field, options, hint }: { label: string; field: string; options: { clave: string; label: string }[]; hint?: string }) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
        <select value={formData[field] || ''} onChange={(e) => setFormData({ ...formData, [field]: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
          <option value="">Seleccionar...</option>
          {options.map((o) => <option key={o.clave} value={o.clave}>{o.label}</option>)}
        </select>
        {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
      </div>
    );
  }

  const columns: Record<Tab, { key: string; label: string }[]> = {
    skus: [{ key: 'codigo', label: 'Código' }, { key: 'nombre', label: 'Nombre' }, { key: 'categoria', label: 'Categoría' }, { key: 'color', label: 'Color' }, { key: 'metrajeEstandar', label: 'Metraje Std.' }],
    suppliers: [{ key: 'codigo', label: 'Código' }, { key: 'nombre', label: 'Nombre' }, { key: 'contacto', label: 'Contacto' }, { key: 'telefono', label: 'Teléfono' }, { key: 'email', label: 'Email' }],
    clients: [{ key: 'codigo', label: 'Código' }, { key: 'nombre', label: 'Razón Social' }, { key: 'rfc', label: 'RFC' }, { key: 'cp', label: 'C.P. Fiscal' }, { key: 'regimenFiscal', label: 'Régimen' }, { key: 'telefono', label: 'Teléfono' }],
    vendors: [{ key: 'codigo', label: 'Código' }, { key: 'nombre', label: 'Nombre' }, { key: 'telefono', label: 'Teléfono' }, { key: 'email', label: 'Email' }],
  };

  // Check if client has all CFDI fields
  const isCfdiReady = (item: any) => item.rfc && item.cp && item.regimenFiscal;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogos</h1>
          <p className="text-gray-500 text-sm">Gestión de datos maestros</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({}); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2 transition-colors">
          {showForm ? <><X size={14} /> Cerrar</> : <><Plus size={14} /> Nuevo</>}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); closeForm(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold">
            {editingId ? `✏️ Editar ${TABS.find((t) => t.key === tab)?.label}` : `Nuevo ${TABS.find((t) => t.key === tab)?.label}`}
          </h2>
          {renderForm()}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={closeForm} className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100">Cancelar</button>
            <button
              onClick={editingId ? handleUpdate : handleCreate}
              disabled={createMut.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
            >
              {createMut.isPending ? '⏳ Guardando...' : editingId ? '💾 Guardar Cambios' : '✅ Crear'}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-gray-400">Cargando...</div> : !resp?.data?.length ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-2">{TABS.find((t) => t.key === tab)?.icon}</p>
            <p>No hay registros. Haz clic en "+ Nuevo" para empezar.</p>
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

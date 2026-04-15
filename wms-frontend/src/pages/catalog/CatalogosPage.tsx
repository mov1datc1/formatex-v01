import { useState } from 'react';
import { useApi, useMutationApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import toast from 'react-hot-toast';

type Tab = 'skus' | 'suppliers' | 'clients' | 'vendors';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'skus', label: 'Telas (SKUs)', icon: '🧵' },
  { key: 'suppliers', label: 'Proveedores', icon: '🏭' },
  { key: 'clients', label: 'Clientes', icon: '👤' },
  { key: 'vendors', label: 'Vendedores', icon: '💼' },
];

export default function CatalogosPage() {
  const [tab, setTab] = useState<Tab>('skus');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const endpoint = tab === 'skus' ? '/catalog/skus' : tab === 'suppliers' ? '/catalog/suppliers' : tab === 'clients' ? '/catalog/clients' : '/catalog/vendors';
  const { data: resp, isLoading } = useApi<PaginatedResponse<any>>([tab], endpoint, { search: search || undefined, limit: 30 });
  const createMut = useMutationApi(endpoint);

  const handleCreate = async () => {
    try {
      await createMut.mutateAsync(formData);
      toast.success('✅ Creado exitosamente');
      setShowForm(false);
      setFormData({});
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al crear');
    }
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Código *" field="codigo" />
          <Input label="Nombre *" field="nombre" />
          <Input label="Contacto" field="contacto" />
          <Input label="Teléfono" field="telefono" />
          <Input label="Email" field="email" />
          <Input label="RFC" field="rfc" />
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

  function Input({ label, field, type = 'text', placeholder }: { label: string; field: string; type?: string; placeholder?: string }) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
        <input type={type} value={formData[field] || ''} onChange={(e) => setFormData({ ...formData, [field]: type === 'number' ? +e.target.value : e.target.value })} placeholder={placeholder} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
      </div>
    );
  }

  const columns: Record<Tab, { key: string; label: string }[]> = {
    skus: [{ key: 'codigo', label: 'Código' }, { key: 'nombre', label: 'Nombre' }, { key: 'categoria', label: 'Categoría' }, { key: 'color', label: 'Color' }, { key: 'metrajeEstandar', label: 'Metraje Std.' }],
    suppliers: [{ key: 'codigo', label: 'Código' }, { key: 'nombre', label: 'Nombre' }, { key: 'contacto', label: 'Contacto' }, { key: 'telefono', label: 'Teléfono' }, { key: 'email', label: 'Email' }],
    clients: [{ key: 'codigo', label: 'Código' }, { key: 'nombre', label: 'Nombre' }, { key: 'contacto', label: 'Contacto' }, { key: 'telefono', label: 'Teléfono' }, { key: 'rfc', label: 'RFC' }],
    vendors: [{ key: 'codigo', label: 'Código' }, { key: 'nombre', label: 'Nombre' }, { key: 'telefono', label: 'Teléfono' }, { key: 'email', label: 'Email' }],
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogos</h1>
          <p className="text-gray-500 text-sm">Gestión de datos maestros</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setFormData({}); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          {showForm ? '✕ Cerrar' : '+ Nuevo'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); setShowForm(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Nuevo {TABS.find((t) => t.key === tab)?.label}</h2>
          {renderForm()}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100">Cancelar</button>
            <button onClick={handleCreate} disabled={createMut.isPending} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {createMut.isPending ? '⏳ Creando...' : '✅ Crear'}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-full max-w-md px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm" />

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
              <tr>{columns[tab].map((c) => <th key={c.key} className="px-4 py-3 text-left">{c.label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {resp.data.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  {columns[tab].map((c) => <td key={c.key} className="px-4 py-3">{item[c.key] || '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

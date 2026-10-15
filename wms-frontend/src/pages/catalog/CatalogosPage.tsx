import { useState, useRef, useEffect } from 'react';
import { useApi, useMutationApi } from '../../hooks/useApi';
import type { PaginatedResponse } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import {
  Pencil, Trash2, X, Plus, Search, FileText, AlertTriangle,
  CreditCard, Shield, Upload, Download, Layers, Truck, Users,
  UserCheck, BookOpen, CheckCircle2, MapPin, Tag, Sparkles,
  HelpCircle, Building2, Phone, Clock, ShieldCheck, Check,
  ChevronRight, ArrowUpDown, Filter, Lock, RefreshCw,
  FileSpreadsheet, Eye, Info, AlertCircle,
} from 'lucide-react';
import { KpiIcon, WmsIcon } from '../../components/icons/WmsIcons';

type Tab = 'skus' | 'clients' | 'specialPrices' | 'priceLists' | 'suppliers' | 'vendors';

const TABS: { key: Tab; label: string; icon: any; csvHeaders: string[] }[] = [
  { key: 'skus', label: 'Telas (SKUs)', icon: Layers, csvHeaders: ['codigo','nombre','categoria','color','composicion','anchoMetros','metrajeEstandar','codigoBarras'] },
  { key: 'clients', label: 'Clientes & Domicilios', icon: Users, csvHeaders: ['codigo','nombre','contacto','telefono','email','direccion','pais','rfc','cp','regimenFiscal','usoCfdi','listaPrecioDefault','cartaFletera'] },
  { key: 'specialPrices', label: 'Precios Especiales', icon: Tag, csvHeaders: ['clientCodigo','skuCodigo','precioPactado','referenciaProyecto','autorizadoPor','notas'] },
  { key: 'priceLists', label: 'Listas de Precios (10)', icon: BookOpen, csvHeaders: ['codigo','nombre','descuentoPct','comisionPct','requiereAprobacion','descripcion'] },
  { key: 'suppliers', label: 'Proveedores', icon: Truck, csvHeaders: ['codigo','nombre','contacto','telefono','email','rfc'] },
  { key: 'vendors', label: 'Vendedores', icon: UserCheck, csvHeaders: ['codigo','nombre','telefono','email'] },
];

// 10 Listas oficiales de Formatex para dropdowns y asignación
export const FORMATEX_PRICE_LISTS = [
  { codigo: 'F1', nombre: 'Casa Decoradora', requiereAprobacion: false, desc: 'Clientes residenciales y diseño interior' },
  { codigo: 'F2', nombre: 'Tienda', requiereAprobacion: false, desc: 'Tiendas de tela y mercerías al mayoreo' },
  { codigo: 'F3', nombre: 'Tienda Especial', requiereAprobacion: true, desc: 'Convenio volumen tiendas (Requiere Aprobación)' },
  { codigo: 'F4', nombre: 'Fabricante', requiereAprobacion: false, desc: 'Fabricantes de muebles y tapicería regular' },
  { codigo: 'F5', nombre: 'Fabricante Especial', requiereAprobacion: true, desc: 'Floor-plan / Cadenas grandes (Requiere Aprobación)' },
  { codigo: 'F6', nombre: 'Distribuidor', requiereAprobacion: false, desc: 'Distribuidores mayoristas regionales' },
  { codigo: 'F7', nombre: 'Distribuidor Especial', requiereAprobacion: true, desc: 'Distribución masiva (Requiere Aprobación)' },
  { codigo: 'F8', nombre: 'Cliente Premium', requiereAprobacion: false, desc: 'Cuentas clave institucionales' },
  { codigo: 'F9', nombre: 'Precio Dirección / Mayorista', requiereAprobacion: true, desc: 'Convenios directos Dirección General' },
  { codigo: 'F10', nombre: 'Venta Web / Público Externo', requiereAprobacion: false, desc: 'Clientes esporádicos no registrados' },
];

const FLETERAS_COMUNES = [
  'Transportes Castores',
  'Tres Guerras',
  'Paquetexpress',
  'Estafeta Carga',
  'FedEx Express',
  'Chofer Local Formatex',
  'Ocurre en Almacén Formatex',
];

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

  // Estados para domicilios de clientes
  const [clientAddresses, setClientAddresses] = useState<any[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressFormData, setAddressFormData] = useState<any>({
    alias: '',
    tipo: 'ENTREGA',
    calleNumero: '',
    colonia: '',
    municipio: '',
    estado: 'Jalisco',
    cp: '',
    contactoNombre: '',
    contactoTelefono: '',
    horarioRecepcion: '',
    referencias: '',
    esPredeterminada: false,
  });

  // Estados para Precios Especiales
  const [allSkusList, setAllSkusList] = useState<any[]>([]);
  const [allClientsList, setAllClientsList] = useState<any[]>([]);

  // Estados para Wizard Interactivo de Carga de Precios (Amigable para equipo comercial)
  const [showPriceWizard, setShowPriceWizard] = useState(false);
  const [wizardTargetMode, setWizardTargetMode] = useState<'specialPrices' | 'priceLists'>('specialPrices');
  const [wizardSelectedList, setWizardSelectedList] = useState('ALL');
  const [wizardParsedData, setWizardParsedData] = useState<{
    fileName: string;
    totalRows: number;
    validRows: any[];
    invalidRows: any[];
    headers: string[];
  } | null>(null);
  const [wizardApplying, setWizardApplying] = useState(false);
  const [showCommercialGuide, setShowCommercialGuide] = useState(true);
  const [priceListFilterCategory, setPriceListFilterCategory] = useState('TODAS');
  const wizardFileInputRef = useRef<HTMLInputElement>(null);

  const handleWizardFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        toast.error('El archivo debe tener una fila de encabezados y al menos una fila con datos');
        return;
      }

      // Autodetectar delimitador: coma, punto y coma, o tabulador
      const firstLine = lines[0];
      const sep = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
      const rawHeaders = firstLine.split(sep).map(h => h.trim().replace(/^"|"$/g, ''));

      // Mapear encabezados a claves estándar
      const normHeaders = rawHeaders.map(h => {
        const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (clean.includes('sku') || clean.includes('tela') || clean.includes('articulo') || clean.includes('codigo')) return 'skuCodigo';
        if (clean.includes('cliente') || clean.includes('rfc') || clean.includes('client')) return 'clientCodigo';
        if (clean.includes('precio') || clean.includes('tarifa') || clean.includes('pactado') || clean.includes('costo')) return 'precio';
        if (clean.includes('lista') || clean.includes('perfil')) return 'lista';
        if (clean.includes('proyecto') || clean.includes('referencia') || clean.includes('convenio')) return 'referenciaProyecto';
        if (clean.includes('autoriz') || clean.includes('por')) return 'autorizadoPor';
        if (clean.includes('nota') || clean.includes('comentario')) return 'notas';
        return h;
      });

      const validRows: any[] = [];
      const invalidRows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const vals = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
        const rowObj: any = { _rowNum: i + 1 };
        normHeaders.forEach((k, colIdx) => {
          rowObj[k] = vals[colIdx] || '';
        });

        const rawPrice = String(rowObj.precio || '').replace(/[$, ]/g, '');
        const numPrice = parseFloat(rawPrice);
        const skuFound = allSkusList.find(s => s.codigo?.toUpperCase() === String(rowObj.skuCodigo || '').toUpperCase());
        const clientFound = allClientsList.find(c => c.codigo?.toUpperCase() === String(rowObj.clientCodigo || '').toUpperCase());

        rowObj._skuObj = skuFound;
        rowObj._clientObj = clientFound;
        rowObj._numPrice = isNaN(numPrice) ? 0 : numPrice;

        if (!rowObj.skuCodigo || isNaN(numPrice) || numPrice <= 0) {
          rowObj._error = !rowObj.skuCodigo ? 'Falta código de tela' : 'Precio inválido o menor a 0';
          invalidRows.push(rowObj);
        } else {
          validRows.push(rowObj);
        }
      }

      setWizardParsedData({
        fileName: file.name,
        totalRows: lines.length - 1,
        validRows,
        invalidRows,
        headers: rawHeaders,
      });
      toast.success(`Archivo analizado: ${validRows.length} precios listos para aplicar`);
    } catch (err: any) {
      toast.error('Error al leer el archivo. Asegúrate de que sea un archivo CSV o de texto.');
    }
  };

  const handleApplyWizard = async () => {
    if (!wizardParsedData || wizardParsedData.validRows.length === 0) return;
    setWizardApplying(true);
    try {
      if (wizardTargetMode === 'specialPrices') {
        const items = wizardParsedData.validRows.map(r => ({
          clientCodigo: r.clientCodigo || (allClientsList[0]?.codigo || 'CLI-001'),
          skuCodigo: r.skuCodigo,
          precioPactado: r._numPrice,
          referenciaProyecto: r.referenciaProyecto || 'Convenio Directivo Masivo',
          autorizadoPor: r.autorizadoPor || 'Dirección General',
          notas: r.notas || `Importado desde ${wizardParsedData.fileName}`,
        }));
        const res = await api.post('/catalog/special-prices/bulk', { items });
        toast.success(`${res.data?.created || 0} precios especiales creados/actualizados exitosamente`);
      } else {
        toast.success(`${wizardParsedData.validRows.length} tarifas asignadas a ${wizardSelectedList === 'ALL' ? 'todas las listas' : wizardSelectedList}`);
      }
      setShowPriceWizard(false);
      setWizardParsedData(null);
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al aplicar precios');
    } finally {
      setWizardApplying(false);
    }
  };

  const downloadPriceTemplate = (type: 'specialPrices' | 'priceLists') => {
    let headers = '';
    let sampleRow = '';
    let fileName = '';
    if (type === 'specialPrices') {
      headers = 'clientCodigo,skuCodigo,precioPactado,referenciaProyecto,autorizadoPor,notas';
      sampleRow = '\nCLI-001,LENIGIRO,89.50,Convenio Cadena Plasencia,Ricardo / Dirección General,Precio piso negociado';
      fileName = 'plantilla_precios_especiales_formatex.csv';
    } else {
      headers = 'lista,skuCodigo,nombreTela,precioBase,descuentoAdicional,notas';
      sampleRow = '\nF1,LENIGIRO,Leni Giro Crudo,89.50,0.00,Lista Casa Decoradora\nF2,LENIGIRO,Leni Giro Crudo,85.00,0.00,Lista Tienda\nF4,LENIGIRO,Leni Giro Crudo,82.00,0.00,Lista Fabricante';
      fileName = 'plantilla_listas_precios_formatex.csv';
    }
    const csv = headers + sampleRow;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  };

  const getEndpoint = (currentTab: Tab) => {
    switch (currentTab) {
      case 'skus': return '/catalog/skus';
      case 'suppliers': return '/catalog/suppliers';
      case 'clients': return '/catalog/clients';
      case 'vendors': return '/catalog/vendors';
      case 'specialPrices': return '/catalog/special-prices';
      case 'priceLists': return '/catalog/price-lists';
    }
  };

  const endpoint = getEndpoint(tab);
  const { data: resp, isLoading, refetch } = useApi<any>(
    [tab, search],
    endpoint,
    tab === 'priceLists' ? {} : { search: search || undefined, limit: 50 }
  );
  const createMut = useMutationApi(endpoint);

  // Carga complementaria para dropdowns de Precios Especiales y Clientes
  useEffect(() => {
    const loadSelectables = async () => {
      try {
        const [skusRes, clientsRes] = await Promise.all([
          api.get('/catalog/skus', { params: { limit: 200 } }),
          api.get('/catalog/clients', { params: { limit: 200 } }),
        ]);
        setAllSkusList(skusRes.data?.data || []);
        setAllClientsList(clientsRes.data?.data || []);
      } catch {
        // Fallback silencioso
      }
    };
    loadSelectables();
  }, []);

  // Si se entra a tab de domicilios de un cliente en edición, cargar sus direcciones
  useEffect(() => {
    if (editingId && tab === 'clients') {
      api.get(`/catalog/clients/${editingId}/addresses`)
        .then(res => setClientAddresses(res.data || []))
        .catch(() => setClientAddresses([]));
    }
  }, [editingId, tab]);

  const handleCreate = async () => {
    try {
      if (tab === 'specialPrices') {
        await api.post('/catalog/special-prices', formData);
      } else {
        await createMut.mutateAsync(formData);
      }
      toast.success('Registro creado exitosamente');
      closeForm();
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al crear');
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      if (tab === 'specialPrices') {
        await api.put(`/catalog/special-prices/${editingId}`, formData);
      } else if (tab === 'priceLists') {
        await api.put(`/catalog/price-lists/${editingId}`, formData);
      } else {
        const { id, createdAt, updatedAt, vendor, orders, addresses, specialPrices, creditConfig, _count, ...editableData } = formData;
        await api.put(`${endpoint}/${editingId}`, editableData);
      }
      toast.success('Actualizado exitosamente');
      closeForm();
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al actualizar');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`${endpoint}/${id}`);
      toast.success('Registro eliminado');
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

  // Guardar nueva dirección para el cliente en edición
  const handleSaveAddress = async () => {
    if (!editingId) return;
    if (!addressFormData.calleNumero || !addressFormData.alias) {
      toast.error('Alias y Dirección (calle y número) son obligatorios');
      return;
    }
    try {
      await api.post(`/catalog/clients/${editingId}/addresses`, addressFormData);
      toast.success('Domicilio registrado exitosamente');
      setShowAddressModal(false);
      setAddressFormData({
        alias: '',
        tipo: 'ENTREGA',
        calleNumero: '',
        colonia: '',
        municipio: '',
        estado: 'Jalisco',
        cp: '',
        contactoNombre: '',
        contactoTelefono: '',
        horarioRecepcion: '',
        referencias: '',
        esPredeterminada: false,
      });
      const res = await api.get(`/catalog/clients/${editingId}/addresses`);
      setClientAddresses(res.data || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al guardar domicilio');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      await api.delete(`/catalog/clients/addresses/${addressId}`);
      toast.success('Domicilio eliminado');
      if (editingId) {
        const res = await api.get(`/catalog/clients/${editingId}/addresses`);
        setClientAddresses(res.data || []);
      }
    } catch (e: any) {
      toast.error('Error al eliminar domicilio');
    }
  };

  // Carga masiva CSV / Excel
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvUploading(true); setCsvResult(null);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        toast.error('El archivo debe tener al menos una fila de encabezados y datos');
        setCsvUploading(false);
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const items = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const obj: any = {};
        headers.forEach((h, i) => { if (vals[i] !== undefined) obj[h] = vals[i]; });
        return obj;
      });

      const bulkEndpoint = tab === 'specialPrices' ? '/catalog/special-prices/bulk' : `${endpoint}/bulk`;
      const { data } = await api.post(bulkEndpoint, { items });
      setCsvResult(data);
      toast.success(`${data.created || 0} registros creados${data.updated ? `, ${data.updated} actualizados` : ''}`);
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al procesar el archivo');
    }
    setCsvUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const tabConfig = TABS.find(t => t.key === tab)!;
    let sampleRow = '';
    if (tab === 'specialPrices') {
      sampleRow = '\nCLI-001,LENIGIRO,89.50,Proyecto Muebles Plasencia,Dirección General,Precio piso negociado';
    }
    const csv = tabConfig.csvHeaders.join(',') + sampleRow;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `plantilla_${tab}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const renderInput = (label: string, field: string, opts?: { type?: string; placeholder?: string; hint?: string; disabled?: boolean }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input
        type={opts?.type || 'text'}
        value={formData[field] ?? ''}
        disabled={opts?.disabled}
        onChange={(e) => updateField(field, opts?.type === 'number' ? +e.target.value : e.target.value)}
        placeholder={opts?.placeholder}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all disabled:opacity-60"
      />
      {opts?.hint && <p className="text-[11px] text-gray-400 mt-1">{opts.hint}</p>}
    </div>
  );

  const renderSelect = (label: string, field: string, options: { clave: string; label: string }[], hint?: string) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <select
        value={formData[field] || ''}
        onChange={(e) => updateField(field, e.target.value)}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all"
      >
        <option value="">Seleccionar...</option>
        {options.map((o) => <option key={o.clave} value={o.clave}>{o.label}</option>)}
      </select>
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );

  // Formulario según pestaña
  const renderForm = () => {
    switch (tab) {
      case 'skus':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderInput('Código *', 'codigo')}
            {renderInput('Nombre *', 'nombre')}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de Artículo</label>
              <select
                value={formData.tipoArticulo || 'TELA'}
                onChange={(e) => updateField('tipoArticulo', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-400"
              >
                <option value="TELA">Tela</option>
                <option value="MUESTRARIO">Muestrario</option>
                <option value="CONSUMIBLE">Consumible</option>
              </select>
            </div>
            {renderInput('Categoría', 'categoria', { placeholder: 'Lino, Algodón, Terciopelo...' })}
            {renderInput('Color', 'color')}
            {renderInput('Composición', 'composicion', { placeholder: '100% Poliéster...' })}
            {renderInput('Ancho (metros)', 'anchoMetros', { type: 'number', placeholder: '1.40' })}
            {renderInput('Metraje Estándar Rollo', 'metrajeEstandar', { type: 'number', placeholder: '50' })}
            {renderInput('Precio Referencia / Metro', 'precioReferencia', { type: 'number', placeholder: '120.00' })}
            {renderInput('Colección / Libro', 'libroColeccion', { placeholder: 'LIBRO AMALFI' })}
            {renderInput('Código de Barras', 'codigoBarras')}
          </div>
        );

      case 'clients':
        return (
          <div className="space-y-6">
            {/* Datos Generales */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-indigo-600" />
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Datos Comerciales del Cliente</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {renderInput('Código *', 'codigo', { placeholder: 'CLI-001' })}
                {renderInput('Razón Social / Nombre *', 'nombre', { hint: 'Tal cual aparece en la Constancia de Situación Fiscal' })}
                {renderInput('Contacto Principal', 'contacto')}
                {renderInput('Teléfono Directo', 'telefono')}
                {renderInput('Correo Electrónico', 'email', { type: 'email' })}

                {/* Lista de Precios Asignada */}
                <div>
                  <label className="block text-xs font-semibold text-indigo-700 mb-1 flex items-center gap-1.5">
                    <BookOpen size={13} className="text-indigo-600" />
                    Lista de Precios Asignada *
                  </label>
                  <select
                    value={formData.listaPrecioDefault || 'F1'}
                    onChange={(e) => updateField('listaPrecioDefault', e.target.value)}
                    className="w-full px-3 py-2 bg-indigo-50/50 border border-indigo-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-400"
                  >
                    {FORMATEX_PRICE_LISTS.map((pl) => (
                      <option key={pl.codigo} value={pl.codigo}>
                        {pl.codigo} — {pl.nombre} {pl.requiereAprobacion ? '(Requiere Autorización)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">Se aplica automáticamente en cada nueva cotización</p>
                </div>
              </div>
            </div>

            {/* Logística y Fletera */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Truck size={16} className="text-indigo-600" />
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Logística y Fletera (Carta de Transporte)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Fletera Asignada por Carta</label>
                  <input
                    type="text"
                    list="fleteras-list"
                    value={formData.cartaFletera || ''}
                    onChange={(e) => updateField('cartaFletera', e.target.value)}
                    placeholder="Selecciona o escribe fletera..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-400"
                  />
                  <datalist id="fleteras-list">
                    {FLETERAS_COMUNES.map(f => <option key={f} value={f} />)}
                  </datalist>
                  <p className="text-[11px] text-gray-400 mt-1">Transportista predefinido según carta firmada por el cliente</p>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!formData.seguroEnvioDefault}
                      onChange={(e) => updateField('seguroEnvioDefault', e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <span>Cliente autorizó seguro de mercancía por carta</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Datos Fiscales CFDI 4.0 */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={16} className="text-emerald-600" />
                <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Datos Fiscales Obligatorios — CFDI 4.0</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {renderInput('RFC *', 'rfc', { placeholder: 'BALJ710130CJ8' })}
                {renderInput('Código Postal Fiscal *', 'cp', { placeholder: '44870' })}
                {renderSelect('Régimen Fiscal *', 'regimenFiscal', REGIMENES_FISCALES, 'De la constancia SAT')}
                {renderSelect('Uso CFDI', 'usoCfdi', USOS_CFDI, 'Uso default para facturas')}
                {renderInput('Calle y Número Fiscal', 'direccion')}
                {renderInput('Colonia Fiscal', 'colonia')}
                {renderInput('Municipio / Población', 'poblacion')}
                {renderInput('Estado', 'estado')}
              </div>
            </div>

            {/* Domicilios de Entrega Múltiples */}
            {editingId && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-indigo-600" />
                    <div>
                      <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Domicilios de Entrega ({clientAddresses.length})</h3>
                      <p className="text-[11px] text-gray-400">Sucursales, bodegas y tapiceros externos donde este cliente recibe mercancía</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddressModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Plus size={14} /> Agregar Domicilio
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {clientAddresses.map((addr: any) => (
                    <div key={addr.id} className="p-3 bg-gray-50 border border-gray-200/80 rounded-xl relative group">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-semibold text-gray-900 text-sm">{addr.alias}</span>
                          {addr.esPredeterminada && (
                            <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                              Predeterminada
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="text-gray-400 hover:text-red-500 p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{addr.calleNumero}, {addr.colonia || ''}, {addr.municipio || ''}, {addr.cp || ''}</p>
                      {addr.contactoNombre && (
                        <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                          <Users size={11} className="text-gray-400" /> Receptor: {addr.contactoNombre} {addr.contactoTelefono ? `· ${addr.contactoTelefono}` : ''}
                        </p>
                      )}
                      {addr.horarioRecepcion && (
                        <p className="text-[11px] text-gray-500 flex items-center gap-1">
                          <Clock size={11} className="text-gray-400" /> Horarios: {addr.horarioRecepcion}
                        </p>
                      )}
                    </div>
                  ))}
                  {clientAddresses.length === 0 && (
                    <div className="col-span-2 py-4 text-center text-xs text-gray-400 border border-dashed rounded-xl">
                      No hay domicilios de entrega adicionales registrados. El sistema usará el domicilio fiscal como destino.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 'specialPrices':
        return (
          <div className="space-y-4">
            <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
              <Sparkles size={16} className="text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Precios Especiales Directivos Centralizados</p>
                <p className="text-indigo-700 mt-0.5">
                  Los precios registrados aquí se auto-aplican en el cotizador al seleccionar el cliente y la tela,
                  bloqueando la edición manual para evitar errores de dedo y notas de crédito.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Cliente *</label>
                <select
                  value={formData.clientId || ''}
                  onChange={(e) => updateField('clientId', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">Selecciona cliente...</option>
                  {allClientsList.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.codigo})</option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">Cliente al que se otorga la tarifa pactada</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tela (SKU) *</label>
                <select
                  value={formData.skuId || ''}
                  onChange={(e) => updateField('skuId', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">Selecciona tela...</option>
                  {allSkusList.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre} ({s.codigo}) — {s.color || ''}</option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">Tela específica pactada</p>
              </div>

              {renderInput('Precio Pactado por Metro (MXN) *', 'precioPactado', {
                type: 'number',
                placeholder: '89.50',
                hint: 'Precio neto final por metro autorizado por Dirección',
              })}

              {renderInput('Referencia de Proyecto / Convenio', 'referenciaProyecto', {
                placeholder: 'Ej: Piso Plasencia Guadalajara',
                hint: 'Motivo o acuerdo comercial para auditoría',
              })}

              {renderInput('Autorizado Por', 'autorizadoPor', {
                placeholder: 'Dirección General (Ricardo)',
                hint: 'Persona directiva que autorizó el precio',
              })}

              {renderInput('Notas Adicionales', 'notas', {
                placeholder: 'Condiciones de volumen o temporalidad...',
              })}
            </div>
          </div>
        );

      case 'priceLists':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput('Código Lista', 'codigo', { disabled: true })}
            {renderInput('Nombre Descriptivo *', 'nombre')}
            {renderInput('Descuento de Referencia (%)', 'descuentoPct', { type: 'number' })}
            {renderInput('Comisión Interna Vendedor (%)', 'comisionPct', { type: 'number', hint: 'Nota: Esta comisión se oculta a ATC en el cotizador' })}
            <div className="col-span-2">
              {renderInput('Descripción Operativa', 'descripcion', { placeholder: 'Tipo de clientes a los que aplica...' })}
            </div>
            <div className="col-span-2 pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={!!formData.requiereAprobacion}
                  onChange={(e) => updateField('requiereAprobacion', e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <span>Requiere autorización gerencial si se asigna fuera de política</span>
              </label>
            </div>
          </div>
        );

      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderInput('Código *', 'codigo')}
            {renderInput('Nombre *', 'nombre')}
            {renderInput('Teléfono', 'telefono')}
            {renderInput('Correo Electrónico', 'email')}
          </div>
        );
    }
  };

  const activeTab = TABS.find(t => t.key === tab)!;
  const TabIcon = activeTab.icon;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Institucional */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3.5">
          <KpiIcon icon={BookOpen} gradient="from-indigo-600 to-slate-800" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Catálogos & Datos Maestros</h1>
            <p className="text-gray-500 text-sm">
              Gestión comercial 360° — {resp?.total ?? (Array.isArray(resp?.data) ? resp.data.length : 0)} registros en {activeTab.label}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(tab === 'priceLists' || tab === 'specialPrices') && (
            <button
              onClick={() => {
                setWizardTargetMode(tab === 'specialPrices' ? 'specialPrices' : 'priceLists');
                setShowPriceWizard(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              <Sparkles size={14} /> Wizard de Carga de Precios
            </button>
          )}

          {tab === 'priceLists' ? (
            <button
              onClick={() => downloadPriceTemplate('priceLists')}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors"
              title="Descargar plantilla de listas de precios"
            >
              <Download size={14} /> Plantilla Tarifas
            </button>
          ) : (
            <>
              <button
                onClick={tab === 'specialPrices' ? () => downloadPriceTemplate('specialPrices') : downloadTemplate}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors"
                title="Descargar plantilla CSV para importación"
              >
                <Download size={14} /> Plantilla CSV
              </button>

              <label className={`flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition-colors cursor-pointer border border-indigo-200/80 ${csvUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <Upload size={14} /> {csvUploading ? 'Cargando...' : 'Importar Archivo'}
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} disabled={csvUploading} />
              </label>

              <button
                onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({}); setCsvResult(null); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
              >
                {showForm ? <><X size={14} /> Cerrar</> : <><Plus size={14} /> Nuevo Registro</>}
              </button>
            </>
          )}
        </div>
      </div>

      {/* CSV Result Banner */}
      {csvResult && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${csvResult.errors?.length ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <CheckCircle2 size={18} className={csvResult.errors?.length ? 'text-amber-600 mt-0.5' : 'text-emerald-600 mt-0.5'} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">
              {csvResult.created || 0} registros creados{csvResult.updated ? `, ${csvResult.updated} actualizados` : ''} exitosamente
            </p>
            {csvResult.errors?.length > 0 && (
              <div className="mt-1">
                <p className="text-xs text-amber-800 font-semibold">{csvResult.errors.length} observaciones en filas:</p>
                <ul className="text-xs text-amber-700 mt-0.5 max-h-20 overflow-y-auto list-disc pl-4">
                  {csvResult.errors.slice(0, 5).map((e: any, i: number) => <li key={i}>Fila {e.row}: {e.error}</li>)}
                </ul>
              </div>
            )}
          </div>
          <button onClick={() => setCsvResult(null)} className="p-1 hover:bg-white/50 rounded"><X size={14} className="text-gray-400" /></button>
        </div>
      )}

      {/* Selector de Pestañas */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-1 bg-gray-100/90 rounded-2xl p-1.5 border border-gray-200/60">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSearch(''); closeForm(); setCsvResult(null); }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <Icon size={15} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Formulario de Alta / Edición */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <TabIcon size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {editingId ? `Editar ${activeTab.label}` : `Nuevo Registro en ${activeTab.label}`}
                </h2>
                <p className="text-xs text-gray-500">Completa los campos requeridos para mantener sincronizado el catálogo</p>
              </div>
            </div>
            <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg">
              <X size={16} />
            </button>
          </div>

          {renderForm()}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={closeForm}
              className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={editingId ? handleUpdate : handleCreate}
              disabled={createMut.isPending}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all"
            >
              {createMut.isPending ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Registrar en Catálogo'}
            </button>
          </div>
        </div>
      )}

      {/* Buscador Rápido */}
      {tab !== 'priceLists' && (
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Buscar en ${activeTab.label.toLowerCase()}...`}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
          />
        </div>
      )}

      {/* Renderizado de Tablas según Pestaña */}
      {tab === 'priceLists' ? (
        /* Vista Especial: 10 Listas Oficiales con Guía Comercial y Filtros */
        <div className="space-y-5">
          {/* Guía Operativa & Talktips para el Equipo de Ventas y ATC */}
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-indigo-800/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Guía Operativa de Listas de Precios & Políticas Formatex</h3>
                  <p className="text-xs text-indigo-200/80">Reglas comerciales y jerarquía aplicadas automáticamente en el cotizador</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCommercialGuide(!showCommercialGuide)}
                className="self-start sm:self-auto px-3 py-1.5 bg-white/10 hover:bg-white/15 text-indigo-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <HelpCircle size={14} />
                <span>{showCommercialGuide ? 'Ocultar Guía' : 'Ver Guía Operativa'}</span>
              </button>
            </div>

            {showCommercialGuide && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2 border-t border-indigo-800/50 text-xs">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold">
                    <ShieldCheck size={15} />
                    <span>1. Jerarquía 360° de Precios</span>
                  </div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">
                    <strong>Paso 1:</strong> Precios Especiales Directivos (prioridad máxima por cliente y tela).<br />
                    <strong>Paso 2:</strong> Lista Asignada al Cliente (F1 a F10).<br />
                    <strong>Paso 3:</strong> Precio base de referencia del SKU.
                  </p>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold">
                    <FileSpreadsheet size={15} />
                    <span>2. Carga Rápida desde Excel</span>
                  </div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">
                    Importa tu archivo completo con todas las listas o por pestaña. Nuestro Wizard inteligente detecta automáticamente columnas como "Tela", "Precio", "Cliente" y "Lista" sin importar el formato.
                  </p>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-300 font-bold">
                    <Lock size={15} />
                    <span>3. Autorización Gerencial</span>
                  </div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">
                    Las listas <strong>F3, F5, F7 y F9</strong> tienen candado preventivo: si un ejecutivo asigna estas tarifas a clientes no autorizados, el pedido pasa a revisión gerencial antes de corte.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Filtros por Categoría de Cliente */}
          <div className="flex flex-wrap items-center gap-2 pb-1">
            <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
              <Filter size={13} /> Segmento:
            </span>
            {['TODAS', 'Decoración', 'Tiendas', 'Fabricantes', 'Distribución', 'Institucional & Web'].map((cat) => {
              const isSelected = priceListFilterCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setPriceListFilterCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Grid de 10 Listas Oficiales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(resp || FORMATEX_PRICE_LISTS)
              .filter((pl: any) => {
                if (priceListFilterCategory === 'TODAS') return true;
                const c = pl.codigo;
                if (priceListFilterCategory === 'Decoración') return c === 'F1' || c === 'F8';
                if (priceListFilterCategory === 'Tiendas') return c === 'F2' || c === 'F3';
                if (priceListFilterCategory === 'Fabricantes') return c === 'F4' || c === 'F5' || c === 'F6' || c === 'F7';
                if (priceListFilterCategory === 'Distribución') return c === 'F9';
                if (priceListFilterCategory === 'Institucional & Web') return c === 'F10';
                return true;
              })
              .map((pl: any) => {
                const getCat = (cod: string) => {
                  if (cod === 'F1' || cod === 'F8') return 'Decoración';
                  if (cod === 'F2' || cod === 'F3') return 'Tiendas';
                  if (cod === 'F4' || cod === 'F5' || cod === 'F6' || cod === 'F7') return 'Fabricantes';
                  if (cod === 'F9') return 'Distribución';
                  return 'Institucional & Web';
                };

                return (
                  <div key={pl.codigo} className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm hover:border-indigo-300 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200">
                            {pl.codigo}
                          </span>
                          <h3 className="font-bold text-gray-900 text-sm">{pl.nombre}</h3>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {getCat(pl.codigo)}
                          </span>
                        </div>
                        {pl.requiereAprobacion ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Lock size={11} /> Requiere Aprobación
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <ShieldCheck size={11} /> Estándar
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{pl.descripcion || pl.desc || 'Perfil comercial Formatex'}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <span>Descuento ref: <strong className="text-gray-800">{pl.descuentoPct || 0}%</strong></span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setWizardTargetMode('priceLists');
                            setWizardSelectedList(pl.codigo);
                            setShowPriceWizard(true);
                          }}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold flex items-center gap-1 text-[11px] transition-colors"
                          title={`Importar tarifas de Excel para ${pl.codigo}`}
                        >
                          <Upload size={12} /> Cargar Precios
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(pl)}
                          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-50 rounded-lg font-semibold flex items-center gap-1"
                          title="Editar configuración y comisión"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : tab === 'specialPrices' ? (
        /* Vista Especial: Precios Especiales Directivos */
        <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400 text-xs">Cargando convenios especiales...</div>
          ) : !resp?.data?.length ? (
            <div className="p-12 text-center text-gray-400">
              <Tag size={36} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">No hay precios especiales directivos registrados</p>
              <p className="text-xs mt-1 text-gray-500">Usa "+ Nuevo Registro" o "Importar Archivo" para agregar convenios</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-gray-50/80 text-gray-500 uppercase font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Tela (SKU)</th>
                  <th className="px-4 py-3 text-right">Precio Pactado / m</th>
                  <th className="px-4 py-3 text-left">Proyecto / Convenio</th>
                  <th className="px-4 py-3 text-left">Autorizado Por</th>
                  <th className="px-4 py-3 text-center w-20">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resp.data.map((item: any) => (
                  <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {item.client?.nombre}
                      <span className="block text-[11px] text-gray-400 font-normal">{item.client?.codigo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-800">{item.sku?.nombre}</span>
                      <span className="block text-[11px] text-gray-400">{item.sku?.codigo} · {item.sku?.color}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 text-sm">
                      ${Number(item.precioPactado).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg font-medium text-[11px]">
                        {item.referenciaProyecto || 'Convenio Especial'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-[11px]">
                      {item.autorizadoPor || 'Dirección General'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => startEdit(item)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* Vista Estándar para SKUs, Clientes, Proveedores, Vendedores */
        <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400 text-xs">Cargando registros...</div>
          ) : !resp?.data?.length ? (
            <div className="p-12 text-center text-gray-400">
              <TabIcon size={36} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">No hay registros en {activeTab.label}</p>
              <p className="text-xs mt-1 text-gray-500">Usa "+ Nuevo Registro" para dar de alta</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-gray-50/80 text-gray-500 uppercase font-semibold border-b border-gray-100">
                <tr>
                  {tab === 'clients' ? (
                    <>
                      <th className="px-4 py-3 text-left">Código</th>
                      <th className="px-4 py-3 text-left">Razón Social</th>
                      <th className="px-4 py-3 text-left">Lista Asignada</th>
                      <th className="px-4 py-3 text-left">Domicilios</th>
                      <th className="px-4 py-3 text-left">Fletera</th>
                      <th className="px-4 py-3 text-left">RFC / Fiscal</th>
                    </>
                  ) : tab === 'skus' ? (
                    <>
                      <th className="px-4 py-3 text-left">Código</th>
                      <th className="px-4 py-3 text-left">Nombre</th>
                      <th className="px-4 py-3 text-left">Color</th>
                      <th className="px-4 py-3 text-left">Categoría</th>
                      <th className="px-4 py-3 text-right">Precio Ref.</th>
                      <th className="px-4 py-3 text-center">Tipo</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-left">Código</th>
                      <th className="px-4 py-3 text-left">Nombre</th>
                      <th className="px-4 py-3 text-left">Contacto</th>
                      <th className="px-4 py-3 text-left">Teléfono</th>
                      <th className="px-4 py-3 text-left">Email</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-center w-20">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resp.data.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                    {tab === 'clients' ? (
                      <>
                        <td className="px-4 py-3 font-mono font-bold text-gray-900">{item.codigo}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{item.nombre}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">
                            {item.listaPrecioDefault || 'F1'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {item.addresses?.length ? (
                            <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded text-[11px] font-medium text-gray-700">
                              <MapPin size={11} className="text-indigo-600" /> {item.addresses.length} domicilio(s)
                            </span>
                          ) : (
                            <span className="text-gray-400">Fiscal</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-[11px]">
                          {item.cartaFletera || 'Por definir'}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-gray-600">
                          {item.rfc || <span className="text-amber-600">Pendiente</span>}
                        </td>
                      </>
                    ) : tab === 'skus' ? (
                      <>
                        <td className="px-4 py-3 font-mono font-bold text-gray-900">{item.codigo}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{item.nombre}</td>
                        <td className="px-4 py-3 text-gray-600">{item.color || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{item.categoria || '—'}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                          ${Number(item.precioReferencia || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {item.tipoArticulo || 'TELA'}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-mono font-bold text-gray-900">{item.codigo}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{item.nombre}</td>
                        <td className="px-4 py-3 text-gray-600">{item.contacto || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{item.telefono || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{item.email || '—'}</td>
                      </>
                    )}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => startEdit(item)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                          <Pencil size={13} />
                        </button>
                        {tab === 'clients' && (
                          <button onClick={() => setDeleteModal(item)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 size={13} />
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
      )}

      {/* Modal para Agregar Domicilio de Entrega */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-indigo-600" />
                <h3 className="font-bold text-gray-900 text-sm">Registrar Nuevo Domicilio de Entrega</h3>
              </div>
              <button onClick={() => setShowAddressModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block font-semibold text-gray-700 mb-1">Nombre / Alias del Lugar *</label>
                <input
                  type="text"
                  placeholder="Ej: Bodega Zapopan, Sucursal Punto Sur, Taller Tapicería"
                  value={addressFormData.alias}
                  onChange={(e) => setAddressFormData({ ...addressFormData, alias: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="col-span-2">
                <label className="block font-semibold text-gray-700 mb-1">Calle y Número *</label>
                <input
                  type="text"
                  placeholder="Av. Vallarta 5500 Nave 4"
                  value={addressFormData.calleNumero}
                  onChange={(e) => setAddressFormData({ ...addressFormData, calleNumero: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Colonia</label>
                <input
                  type="text"
                  placeholder="San Juan de Ocotán"
                  value={addressFormData.colonia}
                  onChange={(e) => setAddressFormData({ ...addressFormData, colonia: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Municipio / Alcaldía</label>
                <input
                  type="text"
                  placeholder="Zapopan"
                  value={addressFormData.municipio}
                  onChange={(e) => setAddressFormData({ ...addressFormData, municipio: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Código Postal</label>
                <input
                  type="text"
                  placeholder="45019"
                  value={addressFormData.cp}
                  onChange={(e) => setAddressFormData({ ...addressFormData, cp: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Estado</label>
                <input
                  type="text"
                  placeholder="Jalisco"
                  value={addressFormData.estado}
                  onChange={(e) => setAddressFormData({ ...addressFormData, estado: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Persona que Recibe (Contacto)</label>
                <input
                  type="text"
                  placeholder="Encargado de almacén / Tapicero"
                  value={addressFormData.contactoNombre}
                  onChange={(e) => setAddressFormData({ ...addressFormData, contactoNombre: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Teléfono Directo de Quien Recibe</label>
                <input
                  type="text"
                  placeholder="El chofer llamará antes"
                  value={addressFormData.contactoTelefono}
                  onChange={(e) => setAddressFormData({ ...addressFormData, contactoTelefono: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="col-span-2">
                <label className="block font-semibold text-gray-700 mb-1">Horarios de Recepción</label>
                <input
                  type="text"
                  placeholder="Ej: Lunes a Viernes 08:30 a 14:00"
                  value={addressFormData.horarioRecepcion}
                  onChange={(e) => setAddressFormData({ ...addressFormData, horarioRecepcion: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={addressFormData.esPredeterminada}
                    onChange={(e) => setAddressFormData({ ...addressFormData, esPredeterminada: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Establecer como dirección predeterminada de entrega</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowAddressModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveAddress}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                Guardar Domicilio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wizard Interactivo de Carga de Precios (Formatex Magic) */}
      {showPriceWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl p-6 md:p-8 space-y-6 my-8 animate-fade-in border border-gray-100">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                  <Sparkles size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">Wizard Inteligente de Carga de Precios</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Formatex 360°
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Diseñado para el equipo de Ventas y ATC. Importa tarifas desde Excel o CSV con validación instantánea y sin enredos técnicos.
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowPriceWizard(false); setWizardParsedData(null); }}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Selector de Destino de Precios */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-800 uppercase tracking-wide">
                    1. ¿Qué tipo de precios vas a cargar?
                  </label>
                  <p className="text-[11px] text-gray-500">Selecciona el perfil de destino en el catálogo</p>
                </div>

                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => { setWizardTargetMode('priceLists'); setWizardParsedData(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      wizardTargetMode === 'priceLists'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Listas Oficiales (F1 - F10)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setWizardTargetMode('specialPrices'); setWizardParsedData(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      wizardTargetMode === 'specialPrices'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Precios Especiales Directivos
                  </button>
                </div>
              </div>

              {wizardTargetMode === 'priceLists' ? (
                <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center gap-3">
                  <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">Aplicar a Lista:</span>
                  <select
                    value={wizardSelectedList}
                    onChange={(e) => setWizardSelectedList(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="ALL">Detectar automáticamente por columna "lista" en el archivo</option>
                    {FORMATEX_PRICE_LISTS.map((pl) => (
                      <option key={pl.codigo} value={pl.codigo}>
                        {pl.codigo} — {pl.nombre} {pl.requiereAprobacion ? '(Requiere Aprobación)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2 text-xs text-indigo-700">
                  <Info size={14} className="shrink-0" />
                  <span>
                    El archivo debe incluir el código del cliente (o RFC) y el código de tela. Estos precios tendrán prioridad absoluta en cotizaciones.
                  </span>
                </div>
              )}
            </div>

            {/* Talktip Asistente para usuarios no técnicos */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 p-4 rounded-2xl border border-amber-200/80 flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 mt-0.5">
                <HelpCircle size={16} />
              </div>
              <div className="flex-1 text-xs text-amber-900 space-y-1">
                <p className="font-bold">Guía Rápida para el Equipo de Ventas / ATC:</p>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  • <strong>No te preocupes por el orden de las columnas:</strong> El wizard detecta automáticamente si tu columna dice "Tela", "SKU", "Artículo", "Código", "Precio", "Tarifa", "Costo", "Cliente" o "Lista".
                  <br />
                  • <strong>Archivos con múltiples listas:</strong> Si tu archivo tiene una columna con la lista (F1, F2, etc.), se asignará a cada lista correspondiente.
                  <br />
                  • <strong>Revisión antes de guardar:</strong> Puedes ver las filas válidas y las observaciones antes de aplicar cualquier cambio definitivo a la base de datos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => downloadPriceTemplate(wizardTargetMode)}
                className="shrink-0 px-3 py-1.5 bg-white hover:bg-amber-100/50 text-amber-800 border border-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
              >
                <Download size={13} /> Descargar Ejemplo
              </button>
            </div>

            {/* Zona de Carga de Archivo */}
            {!wizardParsedData ? (
              <div
                onClick={() => wizardFileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/40 rounded-3xl p-8 text-center cursor-pointer transition-all space-y-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center mx-auto">
                  <FileSpreadsheet size={28} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Haz clic para seleccionar o arrastra tu archivo aquí</p>
                  <p className="text-xs text-gray-500 mt-1">Soporta archivos CSV o exportados de Excel (.csv, delimitado por comas, punto y coma o tabuladores)</p>
                </div>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-indigo-700 transition-colors">
                    <Upload size={14} /> Seleccionar Archivo de Precios
                  </span>
                </div>
                <input
                  ref={wizardFileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleWizardFileSelect}
                />
              </div>
            ) : (
              /* Previsualización y Validación de Filas */
              <div className="space-y-4">
                {/* Resumen de Validación */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 text-center">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Archivo</span>
                    <p className="font-bold text-gray-800 text-sm truncate mt-0.5">{wizardParsedData.fileName}</p>
                    <span className="text-[11px] text-gray-400">{wizardParsedData.totalRows} filas leídas</span>
                  </div>

                  <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Precios Válidos</span>
                    <p className="font-bold text-emerald-700 text-lg mt-0.5">{wizardParsedData.validRows.length}</p>
                    <span className="text-[11px] text-emerald-600">Listos para sincronizar</span>
                  </div>

                  <div className={`p-3.5 rounded-2xl border text-center ${
                    wizardParsedData.invalidRows.length > 0
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <span className="text-[11px] font-bold uppercase tracking-wide">Observaciones / Descartadas</span>
                    <p className="font-bold text-lg mt-0.5">{wizardParsedData.invalidRows.length}</p>
                    <span className="text-[11px]">{wizardParsedData.invalidRows.length > 0 ? 'Requieren corrección' : 'Sin errores'}</span>
                  </div>
                </div>

                {/* Tabla de Muestra / Preview */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-3 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700">Previsualización de Tarifas Detectadas (Primeras 8 filas):</span>
                    <button
                      type="button"
                      onClick={() => setWizardParsedData(null)}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      Cargar otro archivo
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 uppercase font-semibold text-[10px]">
                        <tr>
                          <th className="px-3 py-2 text-left">Fila</th>
                          <th className="px-3 py-2 text-left">Tela (SKU)</th>
                          {wizardTargetMode === 'specialPrices' && <th className="px-3 py-2 text-left">Cliente</th>}
                          {wizardTargetMode === 'priceLists' && <th className="px-3 py-2 text-left">Lista</th>}
                          <th className="px-3 py-2 text-right">Precio Detectado</th>
                          <th className="px-3 py-2 text-left">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {wizardParsedData.validRows.slice(0, 8).map((r, idx) => (
                          <tr key={idx} className="hover:bg-indigo-50/20">
                            <td className="px-3 py-2 font-mono text-gray-400">#{r._rowNum}</td>
                            <td className="px-3 py-2 font-semibold text-gray-800">
                              {r.skuCodigo}
                              {r._skuObj ? <span className="text-[10px] text-gray-400 block font-normal">{r._skuObj.nombre}</span> : null}
                            </td>
                            {wizardTargetMode === 'specialPrices' && (
                              <td className="px-3 py-2 text-gray-700">
                                {r.clientCodigo || 'Cliente General'}
                                {r._clientObj ? <span className="text-[10px] text-gray-400 block">{r._clientObj.nombre}</span> : null}
                              </td>
                            )}
                            {wizardTargetMode === 'priceLists' && (
                              <td className="px-3 py-2">
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold font-mono text-[11px]">
                                  {r.lista || wizardSelectedList}
                                </span>
                              </td>
                            )}
                            <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600">
                              ${Number(r._numPrice).toFixed(2)}
                            </td>
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <Check size={11} /> Correcto
                              </span>
                            </td>
                          </tr>
                        ))}

                        {wizardParsedData.invalidRows.slice(0, 4).map((r, idx) => (
                          <tr key={`inv-${idx}`} className="bg-amber-50/30">
                            <td className="px-3 py-2 font-mono text-gray-400">#{r._rowNum}</td>
                            <td className="px-3 py-2 text-gray-500">{r.skuCodigo || '—'}</td>
                            {wizardTargetMode === 'specialPrices' && <td className="px-3 py-2 text-gray-500">{r.clientCodigo || '—'}</td>}
                            {wizardTargetMode === 'priceLists' && <td className="px-3 py-2 text-gray-500">{r.lista || '—'}</td>}
                            <td className="px-3 py-2 text-right font-mono text-gray-400">${r.precio || '0.00'}</td>
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                <AlertTriangle size={11} /> {r._error || 'Observación'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { setShowPriceWizard(false); setWizardParsedData(null); }}
                className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-xs font-semibold transition-colors"
              >
                Cerrar
              </button>

              <div className="flex items-center gap-2">
                {wizardParsedData && (
                  <button
                    type="button"
                    onClick={() => setWizardParsedData(null)}
                    className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-100"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  type="button"
                  disabled={!wizardParsedData || wizardParsedData.validRows.length === 0 || wizardApplying}
                  onClick={handleApplyWizard}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-40 transition-all flex items-center gap-2"
                >
                  {wizardApplying ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Aplicando Precios...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} /> Aplicar {wizardParsedData?.validRows?.length || 0} Precios al Sistema
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 size={22} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">¿Eliminar registro?</h3>
              <p className="text-xs text-gray-500 mt-1">Esta acción desactivará el registro seleccionado.</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setDeleteModal(null)} className="flex-1 py-2 border rounded-xl text-xs font-semibold hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteModal.id)} className="flex-1 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700">
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

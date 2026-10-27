import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi, useMutationApi } from '../../hooks/useApi';
import type { PaginatedResponse, Order } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import { WmsIcon, PipelineIcon, StatusBadge } from '../../components/icons/WmsIcons';
import {
  X, Plus, Phone, AlertCircle, ShieldCheck, FileText, Download, Mail,
  Printer, Loader2, Info, Zap, MapPin, Truck, Clock, Shield,
  CheckCircle2, Check, Lock, Building2, Package, Layers, Calendar,
  ArrowUpDown, ChevronRight, Filter, Sparkles, RefreshCw, AlertTriangle,
  CreditCard, Split, PackageCheck, Ship, ArrowRight, ArrowLeft, Ban, Eye,
} from 'lucide-react';
import type { FC } from 'react';
import type { LucideProps } from 'lucide-react';
import OrderLineSmart from '../../components/orders/OrderLineSmart';
import PackingSlipModal from '../../components/orders/PackingSlipModal';
import QuotationModal from '../../components/orders/QuotationModal';
import { usePermission } from '../../hooks/usePermission';
import ExpressIngestModal from '../../components/inventory/ExpressIngestModal';

// 9 estados reales del flujo Formatex
const STATUS_MAP: Record<string, { label: string; color: string; icon: FC<LucideProps>; iconBg: string; iconColor: string; area: string }> = {
  COTIZADO:       { label: 'Cotizado',        color: 'bg-slate-100 text-slate-700',    icon: WmsIcon.Quote,      iconBg: 'bg-slate-100', iconColor: 'text-slate-600', area: 'ATC' },
  POR_PAGAR:      { label: 'Por Pagar',       color: 'bg-amber-100 text-amber-700',    icon: WmsIcon.Payment,    iconBg: 'bg-amber-100', iconColor: 'text-amber-600', area: 'ATC' },
  PAGO_RECIBIDO:  { label: 'Pago Recibido',   color: 'bg-yellow-100 text-yellow-700',  icon: WmsIcon.PayReceived,iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600', area: 'Cobranza' },
  POR_SURTIR:     { label: 'Por Surtir',      color: 'bg-blue-100 text-blue-700',      icon: WmsIcon.ToFulfill,  iconBg: 'bg-blue-100', iconColor: 'text-blue-600', area: 'Almacén' },
  EN_SURTIDO:     { label: 'En Surtido',      color: 'bg-indigo-100 text-indigo-700',  icon: WmsIcon.InFulfill,  iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', area: 'Picker' },
  EN_CORTE:       { label: 'En Corte',        color: 'bg-purple-100 text-purple-700',  icon: WmsIcon.InCut,      iconBg: 'bg-purple-100', iconColor: 'text-purple-600', area: 'Cortador' },
  EMPACADO:       { label: 'Empacado',        color: 'bg-teal-100 text-teal-700',      icon: WmsIcon.Packed,     iconBg: 'bg-teal-100', iconColor: 'text-teal-600', area: 'Empaque' },
  FACTURADO:      { label: 'Facturado',       color: 'bg-emerald-100 text-emerald-700',icon: WmsIcon.Invoiced,   iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', area: 'Facturación' },
  DESPACHADO:     { label: 'Despachado',      color: 'bg-gray-200 text-gray-600',      icon: WmsIcon.Dispatched, iconBg: 'bg-gray-200', iconColor: 'text-gray-600', area: 'Despacho' },
  CANCELADO:      { label: 'Cancelado',       color: 'bg-red-100 text-red-700',        icon: WmsIcon.Cancelled,  iconBg: 'bg-red-100', iconColor: 'text-red-700', area: '—' },
};

const NEXT_STATUS: Record<string, { next: string; label: string; icon: FC<LucideProps>; confirmMsg?: string; requiredModule: string }> = {
  COTIZADO:       { next: 'POR_PAGAR',      label: 'Marcar Por Pagar',    icon: WmsIcon.Payment, requiredModule: 'orders' },
  POR_PAGAR:      { next: 'PAGO_RECIBIDO',  label: 'Registrar Pago',      icon: WmsIcon.PayReceived, requiredModule: 'orders' },
  PAGO_RECIBIDO:  { next: 'POR_SURTIR',     label: 'Aprobar (Cobranza)',   icon: WmsIcon.Verified, confirmMsg: '¿Confirmas que el pago fue verificado contra el banco?', requiredModule: 'cobranza' },
  POR_SURTIR:     { next: 'EN_SURTIDO',     label: 'Tomar Pedido (Picker)',icon: WmsIcon.InFulfill, requiredModule: 'picking' },
  EN_SURTIDO:     { next: 'EN_CORTE',       label: 'Enviar a Corte',       icon: WmsIcon.InCut, requiredModule: 'picking' },
  EN_CORTE:       { next: 'EMPACADO',       label: 'Marcar Empacado',      icon: WmsIcon.Packed, requiredModule: 'cutting' },
  // EMPACADO → FACTURADO is now handled by the Facturapi invoice flow, not a simple status change
  FACTURADO:      { next: 'DESPACHADO',     label: 'Despachar',            icon: WmsIcon.Dispatched, requiredModule: 'shipping' },
};

const PRIORITY_MAP: Record<number, { label: string; color: string }> = {
  1: { label: 'URGENTE', color: 'text-red-500' },
  2: { label: 'ALTA', color: 'text-amber-500' },
  3: { label: 'NORMAL', color: 'text-blue-500' },
  4: { label: 'BAJA', color: 'text-emerald-500' },
};

export default function PedidosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [filterEstado, setFilterEstado] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ orderId: string; currentStatus: string; msg: string } | null>(null);
  const [invoiceModal, setInvoiceModal] = useState<string | null>(null); // orderId to invoice
  const [invoicing, setInvoicing] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ formaPago: '03', metodoPago: 'PUE', usoCfdi: 'G03', condicionesPago: '' });
  const [packingSlipOrder, setPackingSlipOrder] = useState<any>(null);
  const [quotationOrder, setQuotationOrder] = useState<any>(null);
  const { canCreate, canUpdate, isAdmin, isSupervisor, user } = usePermission();

  const { data: resp, isLoading } = useApi<PaginatedResponse<Order>>(['orders', search, filterEstado], '/orders', { search: search || undefined, estado: filterEstado || undefined, limit: 20 });
  const { data: detail, refetch: refetchDetail } = useApi<any>(['order-detail', selectedOrder], `/orders/${selectedOrder}`, {}, !!selectedOrder);
  const { data: clients } = useApi<PaginatedResponse<any>>(['clients'], '/catalog/clients', { limit: 500 });
  const { data: skus } = useApi<PaginatedResponse<any>>(['skus-order'], '/catalog/skus', { limit: 5000 });
  const { data: vendors } = useApi<PaginatedResponse<any>>(['vendors'], '/catalog/vendors', { limit: 100 });

  // Tareas de confirmación de entrega (filtradas por ATC asignado o todas para Alma/Supervisora)
  const { data: pendingDeliveries, refetch: refetchPendingDeliveries } = useApi<any[]>(
    ['pending-delivery-confirmations'],
    '/orders/delivery-confirmations/pending'
  );

  const createMut = useMutationApi('/orders');

  const [clientId, setClientId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [prioridad, setPrioridad] = useState(3);
  const [reservaHoras, setReservaHoras] = useState(72); // Default 72h (3 días) según política interna
  const [modoEntrega, setModoEntrega] = useState('COMPLETA');
  const [lineas, setLineas] = useState<any[]>([{ skuId: '', metrajeRequerido: 50, precioUnitario: 0, listaPrecios: '', descuentoPct: 0, selectedHUs: [] }]);
  const [expressIngestTarget, setExpressIngestTarget] = useState<any>(null);

  useEffect(() => {
    const newSku = searchParams.get('newSku');
    if (newSku) {
      setLineas([{ skuId: newSku, metrajeRequerido: 50, precioUnitario: 0, listaPrecios: '', descuentoPct: 0, selectedHUs: [] }]);
      setShowForm(true);
      setActiveMainTab('pipeline');
    }
  }, [searchParams]);

  // Domicilio y logística para creación de cotización
  const [clientAddresses, setClientAddresses] = useState<any[]>([]);
  const [deliveryAddressId, setDeliveryAddressId] = useState('');
  const [deliveryContactName, setDeliveryContactName] = useState('');
  const [deliveryContactPhone, setDeliveryContactPhone] = useState('');
  const [deliverySchedule, setDeliverySchedule] = useState('');
  const [fletera, setFletera] = useState('Transportes Castores');
  const [envioAsegurado, setEnvioAsegurado] = useState(false);

  // Tab principal: Flujo de Pedidos (Pipeline) vs Cola de Backorders (FIFO)
  const [activeMainTab, setActiveMainTab] = useState<'pipeline' | 'backorder'>('pipeline');
  const [backorderContainerFilter, setBackorderContainerFilter] = useState('');
  const [backorderModal, setBackorderModal] = useState<{
    order: any;
    action: 'confirm' | 'cancel';
  } | null>(null);
  const [backorderNotes, setBackorderNotes] = useState('');
  const [backorderActionLoading, setBackorderActionLoading] = useState(false);

  // Estados para creación guiada (Wizard 3 Pasos) y Backorder en cotización
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [clientCreditStatus, setClientCreditStatus] = useState<any>(null);
  const [loadingCreditCheck, setLoadingCreditCheck] = useState(false);
  const [showPendingInvoicesModal, setShowPendingInvoicesModal] = useState(false);
  const [clientPendingInvoices, setClientPendingInvoices] = useState<any[]>([]);
  const [loadingPendingInvoices, setLoadingPendingInvoices] = useState(false);

  // Decisión Logística y Comercial
  const [deliveryDecision, setDeliveryDecision] = useState<'DIVIDIR' | 'TODO_JUNTO'>('DIVIDIR');
  const [condicionPagoInmediato, setCondicionPagoInmediato] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [condicionPagoBackorder, setCondicionPagoBackorder] = useState<'CONTADO_AL_ARRIBO' | 'CONTADO_ANTICIPO' | 'CREDITO'>('CONTADO_AL_ARRIBO');

  const [esBackorder, setEsBackorder] = useState(false);
  const [condicionBackorder, setCondicionBackorder] = useState<'CONTADO_ANTICIPO' | 'CONTADO_AL_ARRIBO' | 'CREDITO'>('CONTADO_ANTICIPO');
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [contenedorNumero, setContenedorNumero] = useState('');
  const [fechaEstimadaArriboContenedor, setFechaEstimadaArriboContenedor] = useState('');

  // Diagnóstico Inteligente de Demanda: Físico Formatex vs Tránsito a Telares
  const demandDiagnostic = useMemo(() => {
    let metrajeTotal = 0;
    let metrajeFisico = 0;
    let metrajeTransito = 0;
    let transitItem: any = null;

    lineas.forEach(l => {
      const req = Number(l.metrajeRequerido) || 0;
      metrajeTotal += req;
      if (l.fulfillmentPlan) {
        metrajeFisico += Number(l.fulfillmentPlan.metrajeFisico) || 0;
        metrajeTransito += Number(l.fulfillmentPlan.metrajeTransito) || 0;
        if (!transitItem) {
          const t = l.fulfillmentPlan.items?.find((it: any) => it.source === 'TRANSITO');
          if (t) transitItem = t;
        }
      } else {
        metrajeFisico += req;
      }
    });

    const hasTransit = metrajeTransito > 0;
    return {
      metrajeTotal,
      metrajeFisico: Math.min(metrajeFisico, metrajeTotal),
      metrajeTransito,
      hasTransit,
      transitItem,
    };
  }, [lineas]);

  // Cola de Backorders con semáforo de arribo de contenedores (15 días / 5 días)
  const { data: backorderQueue, refetch: refetchBackorderQueue, isLoading: loadingBackorders } = useApi<any[]>(
    ['backorder-queue', backorderContainerFilter],
    '/orders/backorder/queue',
    backorderContainerFilter ? { contenedorNumero: backorderContainerFilter } : {}
  );

  // Embarques / Contenedores en tránsito
  const { data: containersList } = useApi<any[]>(
    ['backorder-containers'],
    '/orders/backorder/containers'
  );

  // Modal para confirmar entrega durante surtido
  const [deliveryModalOrder, setDeliveryModalOrder] = useState<any>(null);
  const [deliveryOrderAddresses, setDeliveryOrderAddresses] = useState<any[]>([]);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({
    deliveryAddressId: '',
    deliveryContactName: '',
    deliveryContactPhone: '',
    deliverySchedule: '',
    fletera: 'Transportes Castores',
    envioAsegurado: false,
    notasEntrega: '',
  });

  const handleClientChange = async (cId: string) => {
    setClientId(cId);
    if (!cId) {
      setClientAddresses([]);
      setDeliveryAddressId('');
      return;
    }
    const clientObj = clients?.data?.find((c: any) => c.id === cId);
    if (clientObj) {
      if (clientObj.vendorId) setVendorId(clientObj.vendorId);
      if (clientObj.listaPrecioDefault) {
        setLineas(prev => prev.map(l => ({ ...l, listaPrecios: l.listaPrecios || clientObj.listaPrecioDefault })));
      }
      if (clientObj.cartaFletera) setFletera(clientObj.cartaFletera);
      if (clientObj.seguroEnvioDefault !== undefined) setEnvioAsegurado(clientObj.seguroEnvioDefault);
    }

    // Consulta en vivo del estatus de crédito y cobranza con César
    setLoadingCreditCheck(true);
    api.get(`/invoicing/credit/${cId}/check`)
      .then(res => {
        setClientCreditStatus(res.data);
        if (res.data?.creditConfig?.creditoHabilitado && !res.data?.creditConfig?.bloqueado) {
          setCondicionPagoInmediato('CREDITO');
          setCondicionPagoBackorder('CREDITO');
        } else {
          setCondicionPagoInmediato('CONTADO');
          setCondicionPagoBackorder('CONTADO_AL_ARRIBO');
        }
      })
      .catch(() => setClientCreditStatus(null))
      .finally(() => setLoadingCreditCheck(false));

    try {
      const res = await api.get(`/catalog/clients/${cId}/addresses`);
      const addrs = res.data || [];
      setClientAddresses(addrs);
      const defaultAddr = addrs.find((a: any) => a.esPredeterminada) || addrs[0];
      if (defaultAddr) {
        setDeliveryAddressId(defaultAddr.id);
        setDeliveryContactName(defaultAddr.contactoNombre || clientObj?.contacto || '');
        setDeliveryContactPhone(defaultAddr.contactoTelefono || clientObj?.telefono || '');
        setDeliverySchedule(defaultAddr.horarioRecepcion || '');
      } else {
        setDeliveryAddressId('');
        setDeliveryContactName(clientObj?.contacto || '');
        setDeliveryContactPhone(clientObj?.telefono || '');
      }
    } catch {
      setClientAddresses([]);
    }
  };

  const openPendingInvoicesModal = async () => {
    if (!clientId) return;
    setLoadingPendingInvoices(true);
    setShowPendingInvoicesModal(true);
    try {
      const res = await api.get(`/invoicing/client/${clientId}/pending`);
      setClientPendingInvoices(res.data || []);
    } catch {
      setClientPendingInvoices([]);
    } finally {
      setLoadingPendingInvoices(false);
    }
  };

  const openDeliveryModal = async (order: any) => {
    setDeliveryModalOrder(order);
    setDeliveryForm({
      deliveryAddressId: order.deliveryAddressId || '',
      deliveryContactName: order.deliveryContactName || order.client?.contacto || '',
      deliveryContactPhone: order.deliveryContactPhone || order.client?.telefono || '',
      deliverySchedule: order.deliverySchedule || '',
      fletera: order.fletera || order.client?.cartaFletera || 'Transportes Castores',
      envioAsegurado: order.envioAsegurado ?? order.client?.seguroEnvioDefault ?? false,
      notasEntrega: '',
    });
    if (order.client?.id) {
      try {
        const res = await api.get(`/catalog/clients/${order.client.id}/addresses`);
        setDeliveryOrderAddresses(res.data || []);
      } catch {
        setDeliveryOrderAddresses([]);
      }
    }
  };

  const handleSaveDeliveryConfirmation = async () => {
    if (!deliveryModalOrder) return;
    setConfirmingDelivery(true);
    try {
      await api.put(`/orders/${deliveryModalOrder.id}/confirm-delivery`, deliveryForm);
      toast.success('Datos de entrega confirmados exitosamente — Almacén notificado');
      setDeliveryModalOrder(null);
      refetchPendingDeliveries();
      refetchDetail();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al confirmar datos de entrega');
    } finally {
      setConfirmingDelivery(false);
    }
  };

  // Handlers para Control Operativo de Almacén (Levantamiento Israel / Oct 2026)
  const handleConfirmPhysicalValidation = async (orderId: string, estatus: 'CONFIRMADO_VISUAL' | 'CONFIRMADO_MESA') => {
    try {
      await api.put(`/orders/${orderId}/confirm-physical-validation`, {
        estatus,
        metrajeConfirmado: estatus === 'CONFIRMADO_MESA' ? 100 : undefined,
        notas: `Verificado en bodega según protocolo Israel (${estatus})`,
      });
      toast.success(estatus === 'CONFIRMADO_MESA' ? 'Medición física en mesa confirmada' : 'Verificación visual en rack confirmada');
      refetchDetail();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al validar metraje físico');
    }
  };

  const handleAcceptToneVariation = async (orderId: string) => {
    const contact = window.prompt('Ingresa el nombre del cliente o contacto que autorizó la posible variación de tono por mezcla de lotes:');
    if (!contact) return;
    try {
      await api.put(`/orders/${orderId}/accept-lot-variation`, {
        aceptadoPor: contact,
      });
      toast.success('Variación de tono autorizada correctamente');
      refetchDetail();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al autorizar variación');
    }
  };

  const handleAssignCart = async (orderId: string, carritoCorte: string) => {
    try {
      await api.put(`/orders/${orderId}/assign-cart`, { carritoCorte });
      toast.success(`Carrito de corte asignado: ${carritoCorte}`);
      refetchDetail();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al asignar carrito');
    }
  };

  const handleAssignShippingLabel = async (orderId: string, tipoEtiqueta: string) => {
    try {
      await api.put(`/orders/${orderId}/assign-shipping-label`, { tipoEtiqueta });
      toast.success(`Etiqueta de embarque actualizada: ${tipoEtiqueta}`);
      refetchDetail();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al asignar etiqueta');
    }
  };

  const addLinea = () => setLineas([...lineas, { skuId: '', metrajeRequerido: 50, precioUnitario: 0, listaPrecios: '', descuentoPct: 0, selectedHUs: [] }]);

  const handleCreate = async () => {
    if (!clientId) return toast.error('Selecciona un cliente');
    if (lineas.some(l => !l.skuId || !l.metrajeRequerido)) return toast.error('Completa todas las líneas');
    try {
      // CASO 1: Demanda Mixta y el usuario eligió DIVIDIR en 2 pedidos
      if (demandDiagnostic.hasTransit && deliveryDecision === 'DIVIDIR') {
        const lineasFisicas = lineas.map(l => {
          const physicalHUs = (l.selectedHUs || []).filter((h: any) => h.source !== 'TRANSITO');
          const metrajeFis = l.fulfillmentPlan?.metrajeFisico !== undefined
            ? Math.min(l.fulfillmentPlan.metrajeFisico, l.metrajeRequerido)
            : l.metrajeRequerido;
          return {
            skuId: l.skuId,
            metrajeRequerido: metrajeFis,
            precioUnitario: l.precioUnitario,
            listaPrecios: l.listaPrecios || undefined,
            descuentoPct: l.descuentoPct || 0,
            selectedHUs: physicalHUs.length ? physicalHUs : undefined,
          };
        }).filter(l => l.metrajeRequerido > 0);

        const lineasTransito = lineas.map(l => {
          const metrajeTrans = l.fulfillmentPlan?.metrajeTransito || 0;
          return {
            skuId: l.skuId,
            metrajeRequerido: metrajeTrans,
            precioUnitario: l.precioUnitario,
            listaPrecios: l.listaPrecios || undefined,
            descuentoPct: l.descuentoPct || 0,
          };
        }).filter(l => l.metrajeRequerido > 0);

        const tItem = demandDiagnostic.transitItem;

        // 1. Pedido Inmediato Bodega Formatex
        const res1 = await api.post('/orders', {
          clientId,
          vendorId: vendorId || undefined,
          prioridad,
          reservaHoras,
          modoEntrega: 'PARCIAL',
          deliveryAddressId: deliveryAddressId || undefined,
          deliveryContactName: deliveryContactName || undefined,
          deliveryContactPhone: deliveryContactPhone || undefined,
          deliverySchedule: deliverySchedule || undefined,
          fletera: fletera || undefined,
          envioAsegurado,
          condicionesPago: condicionPagoInmediato === 'CREDITO' ? `Crédito ${clientCreditStatus?.creditConfig?.plazoDefault || 30} días` : 'Contado Inmediato',
          metodoPagoCfdi: condicionPagoInmediato === 'CREDITO' ? 'PPD' : 'PUE',
          notas: `[Entrega Dividida 1/2 - Stock Bodega Formatex] Condición: ${condicionPagoInmediato}`,
          creadoPor: user?.name || user?.email || 'ATC',
          lineas: lineasFisicas,
        });

        // 2. Pedido Backorder Barco hacia Telares
        const res2 = await api.post('/orders', {
          clientId,
          vendorId: vendorId || undefined,
          prioridad,
          reservaHoras: 168,
          modoEntrega: 'PARCIAL',
          esBackorder: true,
          condicionBackorder: condicionPagoBackorder,
          contenedorNumero: tItem?.embarqueCodigo || contenedorNumero || 'EN_TRANSITO',
          fechaEstimadaArriboContenedor: tItem?.eta ? new Date(tItem.eta).toISOString().split('T')[0] : (fechaEstimadaArriboContenedor || undefined),
          incomingShipmentId: tItem?.shipmentLineId || selectedShipmentId || undefined,
          deliveryAddressId: deliveryAddressId || undefined,
          deliveryContactName: deliveryContactName || undefined,
          deliveryContactPhone: deliveryContactPhone || undefined,
          deliverySchedule: deliverySchedule || undefined,
          fletera: fletera || undefined,
          envioAsegurado,
          condicionesPago: condicionPagoBackorder === 'CREDITO' ? `Crédito ${clientCreditStatus?.creditConfig?.plazoDefault || 30} días` : 'Contado al Arribo',
          metodoPagoCfdi: condicionPagoBackorder === 'CREDITO' ? 'PPD' : 'PUE',
          notas: `[Entrega Dividida 2/2 - Backorder Barco a Telares] Condición: ${condicionPagoBackorder}. Turno en cola FIFO agendado con alertas de 15d y 5d.`,
          creadoPor: user?.name || user?.email || 'ATC',
          lineas: lineasTransito,
        });

        toast.success(`🎉 Entrega Dividida Creada:\n• ${res1.data.codigo}: ${demandDiagnostic.metrajeFisico}m (Bodega Formatex)\n• ${res2.data.codigo}: ${demandDiagnostic.metrajeTransito}m (Turno #${res2.data.posicionCola || 1} Barco Telares)`, { duration: 6000 });
      } else {
        // CASO 2: Pedido Regular o Todo Junto
        const isBackorderSingle = demandDiagnostic.hasTransit && deliveryDecision === 'TODO_JUNTO';
        const tItem = demandDiagnostic.transitItem;
        const res = await api.post('/orders', {
          clientId,
          vendorId: vendorId || undefined,
          prioridad,
          reservaHoras: isBackorderSingle ? 168 : reservaHoras,
          modoEntrega: isBackorderSingle ? 'COMPLETA' : modoEntrega,
          deliveryAddressId: deliveryAddressId || undefined,
          deliveryContactName: deliveryContactName || undefined,
          deliveryContactPhone: deliveryContactPhone || undefined,
          deliverySchedule: deliverySchedule || undefined,
          fletera: fletera || undefined,
          envioAsegurado,
          esBackorder: isBackorderSingle || esBackorder,
          condicionBackorder: isBackorderSingle ? condicionPagoBackorder : (esBackorder ? condicionBackorder : undefined),
          contenedorNumero: isBackorderSingle ? (tItem?.embarqueCodigo || 'EN_TRANSITO') : (esBackorder ? contenedorNumero : undefined),
          fechaEstimadaArriboContenedor: isBackorderSingle ? (tItem?.eta ? new Date(tItem.eta).toISOString().split('T')[0] : undefined) : (esBackorder ? fechaEstimadaArriboContenedor : undefined),
          incomingShipmentId: isBackorderSingle ? tItem?.shipmentLineId : (esBackorder ? selectedShipmentId : undefined),
          condicionesPago: condicionPagoInmediato === 'CREDITO' ? `Crédito ${clientCreditStatus?.creditConfig?.plazoDefault || 30} días` : 'Contado Inmediato',
          metodoPagoCfdi: condicionPagoInmediato === 'CREDITO' ? 'PPD' : 'PUE',
          creadoPor: user?.name || user?.email || 'ATC',
          lineas: lineas.map(l => ({
            skuId: l.skuId,
            metrajeRequerido: l.metrajeRequerido,
            precioUnitario: l.precioUnitario,
            listaPrecios: l.listaPrecios || undefined,
            descuentoPct: l.descuentoPct || 0,
            selectedHUs: l.selectedHUs?.length ? l.selectedHUs : undefined,
          })),
        });

        if (isBackorderSingle) {
          toast.success(`Pedido creado en Backorder Completo (${res.data.codigo}) — Formado en cola FIFO Turno #${res.data.posicionCola || 1}`);
        } else {
          toast.success(`Cotización creada exitosamente (${res.data.codigo}) — Apartado activo por ${reservaHoras}h`);
        }
      }

      setShowForm(false);
      setWizardStep(1);
      setEsBackorder(false);
      setContenedorNumero('');
      setFechaEstimadaArriboContenedor('');
      setSelectedShipmentId('');
      setCondicionBackorder('CONTADO_ANTICIPO');
      setLineas([{ skuId: '', metrajeRequerido: 50, precioUnitario: 0, listaPrecios: '', descuentoPct: 0, selectedHUs: [] }]);
      refetchBackorderQueue();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al procesar pedido');
    }
  };

  const handleConfirmBackorderVigencia = async () => {
    if (!backorderModal?.order) return;
    setBackorderActionLoading(true);
    try {
      await api.put(`/orders/${backorderModal.order.id}/backorder/confirm-vigencia`, {
        vigente: true,
        notas: backorderNotes,
      });
      toast.success(`Vigencia confirmada para ${backorderModal.order.codigo} — Listo para surtido al arribo`);
      setBackorderModal(null);
      setBackorderNotes('');
      refetchBackorderQueue();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al confirmar vigencia');
    } finally {
      setBackorderActionLoading(false);
    }
  };

  const handleCancelAndReassignBackorder = async () => {
    if (!backorderModal?.order) return;
    setBackorderActionLoading(true);
    try {
      const res = await api.post(`/orders/${backorderModal.order.id}/backorder/cancel-and-reassign`, {
        motivo: backorderNotes || 'Cancelación de Backorder',
      });
      const data = res.data;
      toast.success(`Pedido cancelado. ${data.ordersReorderedCount || 0} pedidos recorridos en la cola FIFO.`);
      if (data.promotedCandidate) {
        toast.success(`Pedido adelantado en lista: ${data.promotedCandidate.codigo}`);
      }
      setBackorderModal(null);
      setBackorderNotes('');
      refetchBackorderQueue();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al cancelar y recorrer cola');
    } finally {
      setBackorderActionLoading(false);
    }
  };

  const advanceStatus = async (orderId: string, currentStatus: string) => {
    const transition = NEXT_STATUS[currentStatus];
    if (!transition) return;

    // If this transition needs confirmation, show custom modal instead of native confirm()
    if (transition.confirmMsg) {
      setConfirmModal({ orderId, currentStatus, msg: transition.confirmMsg });
      return;
    }

    await executeAdvance(orderId, currentStatus);
  };

  const executeAdvance = async (orderId: string, currentStatus: string) => {
    const transition = NEXT_STATUS[currentStatus];
    if (!transition) return;
    try {
      await api.put(`/orders/${orderId}/status`, { estado: transition.next });
      toast.success(`Pedido avanzado a: ${STATUS_MAP[transition.next]?.label}`);
      refetchDetail();
      setConfirmModal(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al cambiar estado');
    }
  };

  const subtotal = lineas.reduce((a, l) => a + l.metrajeRequerido * l.precioUnitario * (1 - (l.descuentoPct || 0) / 100), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <WmsIcon.Quote className="w-5 h-5 text-white" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pedidos — Flujo Formatex</h1>
            <p className="text-gray-500 text-sm">Cotización → Cobranza → Almacén → Facturación → Despacho</p>
          </div>
        </div>
        {canCreate('orders') && (
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
            {showForm ? <><X size={16} /> Cerrar</> : <><Plus size={16} /> Nueva Cotización</>}
          </button>
        )}
      </div>

      {/* Banner de Tareas: Confirmación de Entrega (Asignado a ATC creador / Supervisora Alma) */}
      {pendingDeliveries && pendingDeliveries.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-4 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                <Truck size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                  <span>{isSupervisor ? 'Validación de Entregas — Vista Supervisora (Alma / Gerencia)' : 'Tus Pedidos por Confirmar Entrega (ATC)'}</span>
                </h3>
                <p className="text-xs text-amber-800">
                  {pendingDeliveries.length} pedido{pendingDeliveries.length > 1 ? 's' : ''} en surtido o corte requieren validar destino, receptor y fletera antes de empaque
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold bg-amber-200/90 text-amber-900 px-3 py-1 rounded-full">
              {pendingDeliveries.length} por validar
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingDeliveries.slice(0, 6).map((pOrder: any) => (
              <div key={pOrder.id} className="bg-white/95 border border-amber-200 rounded-xl p-3 flex flex-col justify-between shadow-xs hover:border-amber-400 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-gray-900">{pOrder.codigo}</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
                      {STATUS_MAP[pOrder.estado]?.label || pOrder.estado}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-800 truncate">{pOrder.client?.nombre}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Cotizado por: <strong className="text-gray-700">{pOrder.creadoPor || 'ATC'}</strong>
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Total: <strong className="text-emerald-700">${Number(pOrder.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                  </p>
                </div>
                <button
                  onClick={() => openDeliveryModal(pOrder)}
                  className="mt-3 w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <MapPin size={13} /> Validar Datos de Entrega
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Switcher de Vistas Principales: Pipeline Regular vs Cola de Backorders (Tránsito) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveMainTab('pipeline')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeMainTab === 'pipeline'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers size={15} className={activeMainTab === 'pipeline' ? 'text-primary-600' : 'text-gray-400'} />
            <span>Flujo Operativo (Pipeline)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeMainTab === 'pipeline' ? 'bg-primary-50 text-primary-700 font-bold' : 'bg-gray-200 text-gray-600'
            }`}>
              {resp?.data?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('backorder')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all relative ${
              activeMainTab === 'backorder'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Truck size={15} className={activeMainTab === 'backorder' ? 'text-blue-600' : 'text-gray-400'} />
            <span>Cola de Backorders (Tránsito / Telar)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeMainTab === 'backorder' ? 'bg-blue-50 text-blue-700 font-bold' : 'bg-gray-200 text-gray-600'
            }`}>
              {backorderQueue?.length || 0}
            </span>
            {backorderQueue?.some((b: any) => b.semaforo === 'AMBAR_15D' || b.semaforo === 'ROJO_5D') && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping absolute -top-1 -right-1" />
            )}
          </button>
        </div>

        {activeMainTab === 'backorder' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 hidden sm:inline">Filtrar Contenedor:</span>
            <select
              value={backorderContainerFilter}
              onChange={e => setBackorderContainerFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los Contenedores en Tránsito</option>
              {containersList?.map((c: any) => (
                <option key={c.id} value={c.numeroContenedor || c.codigo}>
                  {c.numeroContenedor || c.codigo} ({c.ordersCount || 0} pedidos)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Modal de Estado del Cliente y Facturas Pendientes (César / Cobranza / ATC) */}
      {showPendingInvoicesModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Estado de Cuenta y Facturas del Cliente</h3>
                  <p className="text-xs text-gray-500">
                    Cliente: <strong>{clients?.data?.find((c: any) => c.id === clientId)?.nombre}</strong> ({clients?.data?.find((c: any) => c.id === clientId)?.codigo}) · RFC: {clients?.data?.find((c: any) => c.id === clientId)?.rfc || '—'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowPendingInvoicesModal(false)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {/* Alerta si el cliente está bloqueado */}
            {clientCreditStatus?.creditConfig?.bloqueado && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3.5 text-xs text-red-900 flex items-start gap-2.5 shadow-xs">
                <Ban size={18} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-sm block">⛔ CLIENTE BLOQUEADO PARA NUEVOS PEDIDOS (Cobranza)</strong>
                  <p className="mt-0.5 font-medium">Motivo: {clientCreditStatus.creditConfig.motivoBloqueo || 'Bloqueado administrativamente por César.'}</p>
                  <p className="text-[11px] text-red-700 mt-1">Para liberar pedidos a este cliente, se requiere que César retire el bloqueo o autorice la excepción.</p>
                </div>
              </div>
            )}

            {/* Métricas de Crédito */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="text-[11px] text-gray-500 font-medium">Línea de Crédito</p>
                <p className="text-base font-bold text-gray-900 mt-0.5">
                  {clientCreditStatus?.creditConfig?.creditoHabilitado
                    ? `$${Number(clientCreditStatus.creditConfig.montoMaximo || 0).toLocaleString('es-MX')} MXN`
                    : 'Sin Crédito (Contado)'}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {clientCreditStatus?.creditConfig?.creditoHabilitado
                    ? `Plazo: ${clientCreditStatus.creditConfig.plazoDefault} días · Desc. máx: ${clientCreditStatus.creditConfig.descuentoMaximo}%`
                    : 'CFDI PUE Inmediato'}
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="text-[11px] text-gray-500 font-medium">Saldo Total Pendiente</p>
                <p className="text-base font-bold text-gray-900 mt-0.5">
                  ${clientPendingInvoices.reduce((sum: number, inv: any) => sum + Number(inv.saldoPendiente || inv.total || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">{clientPendingInvoices.length} factura(s) por liquidar</p>
              </div>

              <div className={`border rounded-xl p-3 ${
                clientPendingInvoices.some((i: any) => i.fechaVencimiento && new Date(i.fechaVencimiento) < new Date())
                  ? 'bg-red-50/80 border-red-200 text-red-900'
                  : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              }`}>
                <p className="text-[11px] font-medium">Saldo Vencido Fuera de Plazo</p>
                <p className="text-base font-bold mt-0.5">
                  ${clientPendingInvoices
                    .filter((i: any) => i.fechaVencimiento && new Date(i.fechaVencimiento) < new Date())
                    .reduce((sum: number, inv: any) => sum + Number(inv.saldoPendiente || inv.total || 0), 0)
                    .toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] mt-0.5 font-semibold">
                  {clientPendingInvoices.filter((i: any) => i.fechaVencimiento && new Date(i.fechaVencimiento) < new Date()).length > 0
                    ? `🔴 ${clientPendingInvoices.filter((i: any) => i.fechaVencimiento && new Date(i.fechaVencimiento) < new Date()).length} factura(s) vencida(s)`
                    : '🟢 Al corriente (0 vencidas)'}
                </p>
              </div>
            </div>

            {/* Criterio de Negociación César */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Criterio de Negociación y Desbloqueo (César):</strong> Si el cliente tiene facturas vencidas o adeudo elevado, se puede acordar liquidar o abonar 1 o 2 facturas pendientes hoy para que César libere la orden a corte en el WMS.
              </div>
            </div>

            {/* Tabla de Facturas */}
            <div className="overflow-y-auto flex-1 border border-gray-100 rounded-xl min-h-[160px]">
              {loadingPendingInvoices ? (
                <div className="p-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-primary-500" /> Consultando facturas en Facturapi...
                </div>
              ) : clientPendingInvoices.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-400" />
                  <p className="font-semibold text-gray-700">Sin facturas pendientes</p>
                  <p className="text-gray-400 text-[11px] mt-0.5">Este cliente se encuentra al 100% al corriente en cobranza.</p>
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b sticky top-0">
                    <tr>
                      <th className="p-2.5">Pedido / Folio</th>
                      <th className="p-2.5">Emisión</th>
                      <th className="p-2.5">Vencimiento</th>
                      <th className="p-2.5 text-right">Total Factura</th>
                      <th className="p-2.5 text-right">Saldo Insoluto</th>
                      <th className="p-2.5 text-center">Estatus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {clientPendingInvoices.map((inv: any) => {
                      const isVencida = inv.fechaVencimiento && new Date(inv.fechaVencimiento) < new Date();
                      return (
                        <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-2.5 font-mono font-bold text-gray-800">{inv.codigo}</td>
                          <td className="p-2.5 text-gray-500">{inv.facturadaAt ? new Date(inv.facturadaAt).toLocaleDateString('es-MX') : '—'}</td>
                          <td className="p-2.5 text-gray-500">{inv.fechaVencimiento ? new Date(inv.fechaVencimiento).toLocaleDateString('es-MX') : '—'}</td>
                          <td className="p-2.5 text-right font-mono text-gray-600">
                            ${Number(inv.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-red-600">
                            ${Number(inv.saldoPendiente || inv.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-center">
                            {isVencida ? (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded text-[10px]">🔴 Vencida</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-semibold rounded text-[10px]">🔵 En Plazo</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-xs text-gray-400">
                Total Facturas: <strong>{clientPendingInvoices.length}</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowPendingInvoicesModal(false)}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Entendido / Continuar con Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Form — WIZARD INTUITIVO DE 3 PASOS */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
          {/* Header & Stepper */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <WmsIcon.Quote size={20} className="text-primary-500" />
                <h2 className="text-lg font-bold text-gray-900">Asistente de Cotización y Pedidos</h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Captura guiada, validación fiscal SAT y sugerencia de inventario en almacén y telares</p>
            </div>

            {/* Stepper Pills */}
            <div className="flex items-center gap-2">
              {[
                { step: 1, label: '1. Cliente & Logística' },
                { step: 2, label: '2. Telas & Surtido' },
                { step: 3, label: '3. Decisión & Pago' },
              ].map(s => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setWizardStep(s.step as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    wizardStep === s.step
                      ? 'bg-primary-600 text-white shadow-xs'
                      : wizardStep > s.step
                        ? 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {wizardStep > s.step && <Check size={12} />}
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* PASO 1: CLIENTE, CRÉDITO Y LOGÍSTICA */}
          {wizardStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Cliente *</label>
                    {clientId && (
                      <button
                        type="button"
                        onClick={openPendingInvoicesModal}
                        className="text-[11px] text-primary-600 hover:text-primary-800 font-bold flex items-center gap-1 transition-colors bg-primary-50 hover:bg-primary-100 px-2.5 py-0.5 rounded-lg"
                      >
                        <Eye size={12} /> Ver Estado del Cliente
                      </button>
                    )}
                  </div>
                  <select value={clientId} onChange={e => handleClientChange(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500">
                    <option value="">Seleccionar cliente...</option>
                    {clients?.data?.map((c: any) => <option key={c.id} value={c.id}>{c.nombre} ({c.codigo})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Vendedor Asignado</label>
                  <select value={vendorId} onChange={e => setVendorId(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500">
                    <option value="">Sin vendedor comisionista</option>
                    {vendors?.data?.map((v: any) => <option key={v.id} value={v.id}>{v.nombre} ({v.codigo})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Prioridad Operativa</label>
                  <select value={prioridad} onChange={e => setPrioridad(+e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 font-medium">
                    <option value={1}>⚡ Urgente (Atención inmediata)</option>
                    <option value={2}>🟠 Alta</option>
                    <option value={3}>🔵 Normal</option>
                    <option value={4}>⚪ Baja</option>
                  </select>
                </div>
              </div>

              {/* Banner de Crédito y Cobranza en Vivo (César) */}
              {clientId && (
                <div className="pt-1">
                  {loadingCreditCheck ? (
                    <div className="p-3 bg-gray-50 border rounded-xl text-xs text-gray-500 flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-primary-500" /> Consultando estatus de crédito con César...
                    </div>
                  ) : clientCreditStatus?.overdueInvoices > 0 ? (
                    <div className="p-4 bg-red-50/90 border border-red-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-red-900">Alerta de Cobranza (César): {clientCreditStatus.overdueInvoices} factura(s) vencida(s)</p>
                          <p className="text-red-700 text-[11px] mt-0.5">El cliente tiene facturas fuera de plazo. Se requiere visto bueno de César o acordar abono previo para surtir a crédito.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={openPendingInvoicesModal}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
                      >
                        <Eye size={13} /> Ver Estado del Cliente & Facturas
                      </button>
                    </div>
                  ) : clientCreditStatus?.creditConfig?.creditoHabilitado ? (
                    <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-900">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <span>
                          <strong>Crédito Comercial Activo:</strong> Plazo {clientCreditStatus.creditConfig.plazoDefault} días · Límite: ${Number(clientCreditStatus.creditConfig.montoMaximo || 0).toLocaleString('es-MX')} · <strong>Al corriente (Sin adeudo vencido)</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-bold uppercase">
                          Autorizado PPD
                        </span>
                        <button
                          type="button"
                          onClick={openPendingInvoicesModal}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-xs transition-colors flex items-center gap-1"
                        >
                          <Eye size={12} /> Ver Estado
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center justify-between gap-2 text-xs text-blue-900">
                      <div className="flex items-center gap-2">
                        <CreditCard size={15} className="text-blue-600 shrink-0" />
                        <span><strong>Cliente de Contado:</strong> Se liquidará de contado (Transferencia SPEI / PUE). No requiere autorización de crédito.</span>
                      </div>
                      <button
                        type="button"
                        onClick={openPendingInvoicesModal}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] shadow-xs transition-colors shrink-0 flex items-center gap-1"
                      >
                        <Eye size={12} /> Ver Historial
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Domicilio de Entrega & Logística */}
              <div className="pt-4 border-t space-y-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={14} className="text-primary-500" />
                  Logística y Domicilio de Destino
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Domicilio de Destino</label>
                    <select
                      value={deliveryAddressId}
                      onChange={e => {
                        const aId = e.target.value;
                        setDeliveryAddressId(aId);
                        const addr = clientAddresses.find(a => a.id === aId);
                        if (addr) {
                          setDeliveryContactName(addr.contactoNombre || '');
                          setDeliveryContactPhone(addr.contactoTelefono || '');
                          setDeliverySchedule(addr.horarioRecepcion || '');
                        }
                      }}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Mismo domicilio fiscal / Matriz</option>
                      {clientAddresses.map(addr => (
                        <option key={addr.id} value={addr.id}>
                          {addr.alias} — {addr.calleNumero} ({addr.municipio || 'Jalisco'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Persona que Recibe</label>
                    <input
                      type="text"
                      value={deliveryContactName}
                      onChange={e => setDeliveryContactName(e.target.value)}
                      placeholder="Nombre del receptor"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono Receptor</label>
                    <input
                      type="text"
                      value={deliveryContactPhone}
                      onChange={e => setDeliveryContactPhone(e.target.value)}
                      placeholder="Celular para confirmar entrega"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Fletera Seleccionada</label>
                    <select
                      value={fletera}
                      onChange={e => setFletera(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium"
                    >
                      <option value="Transportes Castores">Transportes Castores</option>
                      <option value="Tres Guerras">Tres Guerras</option>
                      <option value="Paquetexpress">Paquetexpress</option>
                      <option value="Estafeta Carga">Estafeta Carga</option>
                      <option value="Chofer Local Formatex">Chofer Local Formatex (8 camionetas)</option>
                      <option value="Ruta Ocotlán">Ruta Ocotlán (Martes y Jueves)</option>
                      <option value="Ocurre en Almacén">Ocurre en Almacén Formatex</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Horario de Recepción Autorizado</label>
                    <input
                      type="text"
                      value={deliverySchedule}
                      onChange={e => setDeliverySchedule(e.target.value)}
                      placeholder="Ej: L-V 09:00 a 14:00"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={envioAsegurado}
                        onChange={e => setEnvioAsegurado(e.target.checked)}
                        className="w-4 h-4 text-primary-600 rounded border-gray-300"
                      />
                      <span>Asegurar mercancía con la fletera</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Botón de Siguiente */}
              <div className="flex justify-end pt-4 border-t">
                <button
                  type="button"
                  disabled={!clientId}
                  onClick={() => setWizardStep(2)}
                  className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all"
                >
                  <span>Siguiente: Seleccionar Telas & Surtido</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: TELAS & SURTIDO INTELIGENTE */}
          {wizardStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <WmsIcon.Rolls size={16} className="text-indigo-500" />
                    Líneas de Tela del Pedido
                  </h3>
                  <p className="text-xs text-gray-400">El motor analiza inventario en bodega Formatex, rollos en Telares y contenedores en barco</p>
                </div>
                <span className="text-[11px] text-indigo-700 font-bold bg-indigo-50 px-3 py-1 rounded-full flex items-center gap-1.5 border border-indigo-100">
                  <Sparkles size={13} className="text-indigo-500" />
                  Sugerencias Automáticas de Surtido
                </span>
              </div>

              <div className="space-y-3">
                {lineas.map((l, idx) => (
                  <OrderLineSmart
                    key={idx}
                    index={idx}
                    clientId={clientId}
                    line={l}
                    skus={skus?.data || []}
                    onChange={(i, field, value) => {
                      setLineas(prev => {
                        const n = [...prev];
                        (n[i] as any)[field] = value;
                        return n;
                      });
                    }}
                    onRemove={(i) => setLineas(lineas.filter((_, j) => j !== i))}
                    canRemove={lineas.length > 1}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={addLinea}
                className="text-xs px-3.5 py-2 bg-emerald-50 text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 flex items-center gap-1.5 transition-colors border border-emerald-200/80"
              >
                <Plus size={14} /> Agregar Otra Tela
              </button>

              {/* Barra Resumen de Disponibilidad */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-gray-600" />
                  <span className="text-gray-700">Demanda total calculada: <strong>{demandDiagnostic.metrajeTotal} metros</strong></span>
                </div>
                <div>
                  {demandDiagnostic.hasTransit ? (
                    <span className="px-3 py-1 bg-blue-100 text-blue-900 font-bold rounded-full flex items-center gap-1.5">
                      <Ship size={13} className="text-blue-600" />
                      Tránsito Detectado: {demandDiagnostic.metrajeFisico}m bodega + {demandDiagnostic.metrajeTransito}m barco
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-bold rounded-full flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      100% Cubierto en Bodega Formatex
                    </span>
                  )}
                </div>
              </div>

              {/* Botones de Navegación */}
              <div className="flex items-center justify-between pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft size={14} /> Volver a Cliente
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all"
                >
                  <span>Siguiente: Decisión de Entrega & Cobranza</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: DECISIÓN LOGÍSTICA & COBRANZA */}
          {wizardStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              {/* CASO A: SI HAY TRÁNSITO MARÍTIMO DETECTADO */}
              {demandDiagnostic.hasTransit ? (
                <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-50/90 border border-blue-200/90 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                      <Ship size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Demanda Mixta Detectada: Bodega Formatex + Barco Rumbo a Telares</h4>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Disponibilidad actual: <strong className="text-emerald-700">{demandDiagnostic.metrajeFisico}m listos en Bodega Formatex</strong> y <strong className="text-blue-700">{demandDiagnostic.metrajeTransito}m en Tránsito Marítimo</strong> hacia las bodegas de Telares ({demandDiagnostic.transitItem?.embarqueCodigo || 'Barco en camino'} · ETA: {demandDiagnostic.transitItem?.diasParaLlegar ? `${demandDiagnostic.transitItem.diasParaLlegar} días` : 'Próximo arribo'}).
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-bold text-gray-800 uppercase tracking-wide mb-2">
                      ¿Cómo prefiere el cliente recibir y pagar su mercancía? (1 Clic)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* Opción B: Entrega Dividida (Recomendada) */}
                      <button
                        type="button"
                        onClick={() => setDeliveryDecision('DIVIDIR')}
                        className={`p-4 rounded-2xl border text-left transition-all relative ${
                          deliveryDecision === 'DIVIDIR'
                            ? 'bg-white border-emerald-600 ring-2 ring-emerald-500 shadow-sm'
                            : 'bg-white/80 border-gray-200 hover:bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                            <Split size={16} className="text-emerald-600" />
                            Opción 1: Entrega Dividida (Recomendado)
                          </span>
                          {deliveryDecision === 'DIVIDIR' && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                              ✓ Seleccionada
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-600 leading-relaxed">
                          Genera automáticamente <strong>2 pedidos independientes</strong>:
                          <br />• <strong>Pedido #1 ({demandDiagnostic.metrajeFisico}m):</strong> Se surte hoy de bodega.
                          <br />• <strong>Pedido #2 ({demandDiagnostic.metrajeTransito}m):</strong> Apartado en cola FIFO del barco a Telares.
                        </p>
                      </button>

                      {/* Opción A: Entrega Completa */}
                      <button
                        type="button"
                        onClick={() => setDeliveryDecision('TODO_JUNTO')}
                        className={`p-4 rounded-2xl border text-left transition-all relative ${
                          deliveryDecision === 'TODO_JUNTO'
                            ? 'bg-white border-blue-600 ring-2 ring-blue-500 shadow-sm'
                            : 'bg-white/80 border-gray-200 hover:bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs text-blue-950 flex items-center gap-1.5">
                            <PackageCheck size={16} className="text-blue-600" />
                            Opción 2: Entrega Completa (Esperar Barco)
                          </span>
                          {deliveryDecision === 'TODO_JUNTO' && (
                            <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                              ✓ Seleccionada
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-600 leading-relaxed">
                          <strong>1 solo pedido</strong> por los {demandDiagnostic.metrajeTotal}m. Los rollos de bodega se resguardan esperando a que el contenedor llegue a Telares para mandar todo junto en un solo flete.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Condiciones de Pago para la Decisión Seleccionada */}
                  <div className="pt-3 border-t border-blue-200/70 space-y-3">
                    <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                      Términos de Pago y Facturación Fiscal (SAT)
                    </h5>

                    {deliveryDecision === 'DIVIDIR' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Pago Pedido 1 (Bodega) */}
                        <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-900">1. Pedido Inmediato ({demandDiagnostic.metrajeFisico}m Bodega)</span>
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">Hoy</span>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="pagoInmediato"
                                checked={condicionPagoInmediato === 'CONTADO'}
                                onChange={() => setCondicionPagoInmediato('CONTADO')}
                                className="text-primary-600"
                              />
                              <span>Contado Inmediato (Transferencia SPEI · CFDI PUE)</span>
                            </label>
                            {clientCreditStatus?.creditConfig?.creditoHabilitado && (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="pagoInmediato"
                                  checked={condicionPagoInmediato === 'CREDITO'}
                                  onChange={() => setCondicionPagoInmediato('CREDITO')}
                                  className="text-primary-600"
                                />
                                <span>Crédito a {clientCreditStatus.creditConfig.plazoDefault} días (CFDI PPD 99 Por Definir)</span>
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Pago Pedido 2 (Backorder Barco) */}
                        <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-900">2. Pedido Backorder ({demandDiagnostic.metrajeTransito}m Barco Telares)</span>
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">Al Arribo</span>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="pagoBackorder"
                                checked={condicionPagoBackorder === 'CONTADO_AL_ARRIBO'}
                                onChange={() => setCondicionPagoBackorder('CONTADO_AL_ARRIBO')}
                                className="text-primary-600"
                              />
                              <div>
                                <span className="font-semibold">Contado al Arribo (Cierre Fiscal SAT)</span>
                                <p className="text-[10px] text-gray-400">Sin pago hoy. Se cobra y factura en el mismo mes que llega a Telares.</p>
                              </div>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="pagoBackorder"
                                checked={condicionPagoBackorder === 'CONTADO_ANTICIPO'}
                                onChange={() => setCondicionPagoBackorder('CONTADO_ANTICIPO')}
                                className="text-primary-600"
                              />
                              <div>
                                <span className="font-semibold">Contado con Anticipo</span>
                                <p className="text-[10px] text-gray-400">Paga anticipo hoy para congelar precio y metraje.</p>
                              </div>
                            </label>
                            {clientCreditStatus?.creditConfig?.creditoHabilitado && (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="pagoBackorder"
                                  checked={condicionPagoBackorder === 'CREDITO'}
                                  onChange={() => setCondicionPagoBackorder('CREDITO')}
                                  className="text-primary-600"
                                />
                                <div>
                                  <span className="font-semibold">Crédito Comercial al Arribo</span>
                                  <p className="text-[10px] text-gray-400">Se surte contra su línea de crédito cuando el barco descargue en Telares.</p>
                                </div>
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Condiciones si es TODO JUNTO */
                      <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-2 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="pagoTodoJunto"
                            checked={condicionPagoBackorder === 'CONTADO_AL_ARRIBO'}
                            onChange={() => setCondicionPagoBackorder('CONTADO_AL_ARRIBO')}
                            className="text-primary-600"
                          />
                          <span><strong>Contado al Arribo (Cierre Fiscal):</strong> Se factura y cobra el total cuando arribe el contenedor a Telares.</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="pagoTodoJunto"
                            checked={condicionPagoBackorder === 'CONTADO_ANTICIPO'}
                            onChange={() => setCondicionPagoBackorder('CONTADO_ANTICIPO')}
                            className="text-primary-600"
                          />
                          <span><strong>Contado con Anticipo:</strong> El cliente congela su pedido completo con un anticipo hoy.</span>
                        </label>
                        {clientCreditStatus?.creditConfig?.creditoHabilitado && (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="pagoTodoJunto"
                              checked={condicionPagoBackorder === 'CREDITO'}
                              onChange={() => setCondicionPagoBackorder('CREDITO')}
                              className="text-primary-600"
                            />
                            <span><strong>Crédito Comercial al Arribo:</strong> Se factura todo a crédito diferido (PPD 99) al llegar la mercancía.</span>
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* CASO B: TODO DISPONIBLE EN BODEGA (PEDIDO REGULAR) */
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Surtido 100% en Bodega Formatex</h4>
                      <p className="text-xs text-gray-500">Toda la tela solicitada está disponible en racks locales para corte y despacho</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Apartado de Mercancía</label>
                      <select
                        value={reservaHoras}
                        onChange={e => setReservaHoras(+e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium"
                      >
                        <option value={72}>72 horas (3 días — Resguardo Interno Almacén) [Recomendado]</option>
                        <option value={24}>24 horas (Plazo Comercial Notificado al Cliente)</option>
                        <option value={48}>48 horas (2 días hábiles)</option>
                      </select>
                      <p className="text-[10px] text-gray-400 mt-1">Almacén protege los rollos durante 72h antes de liberarlos.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Forma de Pago Acordada</label>
                      <div className="space-y-1.5 pt-1 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="pagoRegular"
                            checked={condicionPagoInmediato === 'CONTADO'}
                            onChange={() => setCondicionPagoInmediato('CONTADO')}
                            className="text-primary-600"
                          />
                          <span>Contado Inmediato (Transferencia SPEI · CFDI PUE)</span>
                        </label>
                        {clientCreditStatus?.creditConfig?.creditoHabilitado && (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="pagoRegular"
                              checked={condicionPagoInmediato === 'CREDITO'}
                              onChange={() => setCondicionPagoInmediato('CREDITO')}
                              className="text-primary-600"
                            />
                            <span>Crédito Comercial {clientCreditStatus.creditConfig.plazoDefault} días (CFDI PPD 99 Por Definir)</span>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Totales Financieros */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-1.5 text-right border border-gray-100">
                <p className="text-xs text-gray-500">Subtotal de Tela: <span className="font-mono font-semibold text-gray-800">${subtotal.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></p>
                <p className="text-xs text-gray-500">IVA 16%: <span className="font-mono font-semibold text-gray-800">${iva.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></p>
                <p className="text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
                  Total Estimado: <span className="text-emerald-600 font-mono text-lg">${total.toLocaleString('es-MX', {minimumFractionDigits: 2})} MXN</span>
                </p>
              </div>

              {/* Acciones Finales del Wizard */}
              <div className="flex items-center justify-between pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft size={14} /> Volver a Telas
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setWizardStep(1); }}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={createMut.isPending}
                    className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 flex items-center gap-2 transition-all"
                  >
                    {createMut.isPending ? (
                      <><Loader2 size={15} className="animate-spin" /> Procesando Pedido...</>
                    ) : demandDiagnostic.hasTransit && deliveryDecision === 'DIVIDIR' ? (
                      <><Split size={15} /> Generar Entrega Dividida (2 Pedidos)</>
                    ) : (
                      <><WmsIcon.Quote size={15} /> Confirmar y Crear Pedido</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VISTA 1: PIPELINE OPERATIVO REGULAR */}
      {activeMainTab === 'pipeline' && (
        <>
          {/* Pipeline visual */}
          <div className="grid grid-cols-5 lg:grid-cols-9 gap-1.5">
            {Object.entries(STATUS_MAP).filter(([k]) => k !== 'CANCELADO').map(([key, s]) => {
              const Icon = s.icon;
              const count = resp?.data?.filter((o: any) => o.estado === key).length || 0;
              return (
                <button key={key} onClick={() => setFilterEstado(filterEstado === key ? '' : key)} className={`text-center p-2.5 rounded-xl text-xs transition-all ${filterEstado === key ? 'ring-2 ring-primary-400 shadow-md scale-[1.02]' : 'hover:shadow-sm'} ${s.color}`}>
                  <PipelineIcon icon={Icon} bgClass={s.iconBg} iconClass={s.iconColor} size={16} />
                  <div className="font-bold text-base mt-1.5">{count}</div>
                  <div className="truncate font-medium">{s.label}</div>
                </button>
              );
            })}
          </div>

          {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <WmsIcon.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pedido, folio, cliente..." className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm" />
        </div>
        {filterEstado && (
          <button onClick={() => setFilterEstado('')} className="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-medium hover:bg-red-100 flex items-center gap-1">
            <X size={14} /> Limpiar filtro
          </button>
        )}
      </div>

      {/* Orders List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {isLoading ? <div className="p-8 text-center text-gray-400">Cargando...</div> : !resp?.data?.length ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
              <WmsIcon.Quote size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-500">No hay pedidos {filterEstado && `en estado "${STATUS_MAP[filterEstado]?.label}"`}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {resp.data.map((o: any) => {
                const status = STATUS_MAP[o.estado];
                const StatusIcon = status?.icon || WmsIcon.Quote;
                const prio = PRIORITY_MAP[o.prioridad];
                return (
                  <div key={o.id} onClick={() => setSelectedOrder(o.id)} className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${selectedOrder === o.id ? 'border-primary-400 ring-1 ring-primary-200' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-primary-600">{o.codigo}</span>
                        {o.folioContpaqi && <span className="text-xs text-gray-400 font-mono">({o.folioContpaqi})</span>}
                        <StatusBadge icon={StatusIcon} label={status?.label || o.estado} bgClass={status?.color?.split(' ')[0] || 'bg-gray-100'} textClass={status?.color?.split(' ')[1] || 'text-gray-600'} />
                        {o.esBackorder && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            <Truck size={10} /> Backorder {o.contenedorNumero ? `· ${o.contenedorNumero}` : ''} (#{o.posicionCola || 1})
                          </span>
                        )}
                        {prio && o.prioridad <= 2 && (
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${prio.color}`}>
                            <AlertCircle size={12} /> {prio.label}
                          </span>
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <span className="text-sm font-bold text-emerald-600">${Number(o.total || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-400">{new Date(o.fechaPedido).toLocaleDateString()}</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              api.get(`/orders/${o.id}`).then((res) => setQuotationOrder(res.data)).catch(() => setQuotationOrder(o));
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 rounded-md border border-blue-200 transition-all flex items-center gap-1 active:scale-95"
                            title="Descargar o Imprimir Cotización para Cliente"
                          >
                            <FileText size={11} />
                            <span>Cotización PDF</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-sm text-gray-700">{o.client?.nombre}</span>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {o.vendor && <span className="flex items-center gap-1"><Phone size={10} /> {o.vendor.nombre}</span>}
                        {o.lineas?.some((l: any) => !l.assignments?.length) && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 font-medium border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> En piso
                          </span>
                        )}
                        <span>{o._count?.lineas || o.lineas?.length} líneas</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="bg-white rounded-xl border p-5">
          {!selectedOrder ? (
            <div className="text-center text-gray-400 py-12">
              <WmsIcon.Quote size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Selecciona un pedido</p>
              <p className="text-xs mt-1">para ver detalles y avanzar estado</p>
            </div>
          ) : !detail ? (
            <div className="text-center text-gray-400 py-12">Cargando...</div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{detail.codigo}</h3>
                  {detail.folioContpaqi && <p className="text-xs text-gray-400 font-mono">CONTPAQi: {detail.folioContpaqi}</p>}
                  <p className="text-sm text-gray-600">{detail.client?.nombre}</p>
                  {detail.client?.rfc && <p className="text-xs text-gray-400">RFC: {detail.client.rfc}</p>}
                </div>
                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>

              {/* Status badge */}
              {(() => {
                const s = STATUS_MAP[detail.estado];
                const Icon = s?.icon || WmsIcon.Quote;
                return (
                  <div className={`px-3 py-2.5 rounded-xl text-center ${s?.color || 'bg-gray-100'}`}>
                    <div className="flex items-center justify-center gap-2">
                      <Icon size={16} strokeWidth={2} />
                      <p className="text-sm font-semibold">{s?.label}</p>
                    </div>
                    <p className="text-xs opacity-70 mt-0.5">Área: {s?.area}</p>
                  </div>
                );
              })()}

              {/* Advance button — EMPACADO uses Facturapi instead */}
              {(isAdmin || canUpdate('facturacion')) && detail.estado === 'EMPACADO' && !detail.facturapiId && (
                <button
                  onClick={() => setInvoiceModal(detail.id)}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-800 text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <FileText size={16} /> Facturar (CFDI 4.0)
                </button>
              )}
              {NEXT_STATUS[detail.estado] && (() => {
                const t = NEXT_STATUS[detail.estado];
                const Icon = t.icon;
                const hasPermission = isAdmin || canUpdate(t.requiredModule);
                if (!hasPermission) return null;
                return (
                  <button onClick={() => advanceStatus(detail.id, detail.estado)} className="w-full px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm">
                    <Icon size={16} /> {t.label}
                  </button>
                );
              })()}

              {/* Generar / Descargar Cotización Oficial Formatex para Cliente */}
              <button
                type="button"
                onClick={() => setQuotationOrder(detail)}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <FileText size={16} className="text-cyan-200" />
                <span>Descargar / Imprimir Cotización (PDF Cliente)</span>
              </button>

              {/* Generar Packing List Oficial Formatex */}
              <button
                type="button"
                onClick={() => setPackingSlipOrder(detail)}
                className="w-full px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Package size={15} className="text-amber-400" />
                <span>Generar Packing List Oficial (PDF / Impresión)</span>
              </button>

              {/* Backorder en Tránsito Marítimo si aplica */}
              {detail.esBackorder && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3.5 text-xs space-y-2 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-900 flex items-center gap-1.5">
                      <Truck size={14} className="text-blue-600" /> Backorder en Tránsito
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-200 text-blue-900">
                      Cola #{detail.posicionCola || 1}
                    </span>
                  </div>
                  <div className="space-y-1 text-gray-700 text-[11px] pt-1 border-t border-blue-200/60">
                    <p className="flex justify-between">
                      <span className="text-gray-500">Contenedor:</span>
                      <strong className="font-mono">{detail.contenedorNumero || 'Por asignar'}</strong>
                    </p>
                    {detail.fechaEstimadaArriboContenedor && (
                      <p className="flex justify-between">
                        <span className="text-gray-500">ETA Arribo:</span>
                        <strong>{new Date(detail.fechaEstimadaArriboContenedor).toLocaleDateString('es-MX')}</strong>
                      </p>
                    )}
                    <p className="flex justify-between">
                      <span className="text-gray-500">Condición:</span>
                      <strong className="text-blue-800">
                        {detail.condicionBackorder === 'CONTADO_ANTICIPO' ? 'Contado con Anticipo' :
                         detail.condicionBackorder === 'CONTADO_AL_ARRIBO' ? 'Contado al Arribo (Fiscal)' : 'Crédito Comercial'}
                      </strong>
                    </p>
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-gray-500">Vigencia 15 días:</span>
                      {detail.vigenciaConfirmadaAt ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 size={11} /> Confirmada ({detail.vigenciaConfirmadaPor || 'ATC'})
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold">Pendiente de revalidación</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Logística y Datos de Entrega */}
              <div className="bg-gray-50 rounded-xl p-3.5 text-xs space-y-2 border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                    <Truck size={14} className="text-indigo-600" /> Logística y Entrega
                  </span>
                  {detail.deliveryConfirmed ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Confirmada
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                      <Clock size={11} /> Pendiente ATC
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-gray-600 text-[11px] pt-1 border-t border-gray-200/60">
                  {detail.deliveryAddress ? (
                    <p className="flex items-start gap-1">
                      <MapPin size={12} className="text-gray-400 mt-0.5 shrink-0" />
                      <span><strong>{detail.deliveryAddress.alias}:</strong> {detail.deliveryAddress.calleNumero}, {detail.deliveryAddress.municipio || ''}</span>
                    </p>
                  ) : (
                    <p className="text-gray-400 italic">Destino: Domicilio fiscal del cliente</p>
                  )}
                  {detail.deliveryContactName && (
                    <p className="flex items-center gap-1">
                      <Phone size={12} className="text-gray-400 shrink-0" /> Receptor: {detail.deliveryContactName} {detail.deliveryContactPhone ? `· ${detail.deliveryContactPhone}` : ''}
                    </p>
                  )}
                  {detail.deliverySchedule && (
                    <p className="flex items-center gap-1">
                      <Clock size={12} className="text-gray-400 shrink-0" /> Horario: {detail.deliverySchedule}
                    </p>
                  )}
                  {detail.fletera && (
                    <p className="flex items-center gap-1">
                      <Truck size={12} className="text-gray-400 shrink-0" /> Fletera: {detail.fletera} {detail.envioAsegurado ? '(Asegurado)' : ''}
                    </p>
                  )}
                  {detail.deliveryConfirmedBy && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      Confirmado por: {detail.deliveryConfirmedBy} {detail.deliveryConfirmedAt ? `el ${new Date(detail.deliveryConfirmedAt).toLocaleDateString()}` : ''}
                    </p>
                  )}
                </div>

                {(!detail.deliveryConfirmed || isSupervisor) && ['POR_SURTIR', 'EN_SURTIDO', 'EN_CORTE'].includes(detail.estado) && (
                  <button
                    onClick={() => openDeliveryModal(detail)}
                    className="w-full mt-2 py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <MapPin size={13} /> {detail.deliveryConfirmed ? 'Modificar Datos de Entrega' : 'Validar Datos de Entrega'}
                  </button>
                )}
              </div>

              {/* === CONTROL OPERATIVO DE ALMACÉN (Entrevista Israel / Oct 2026) === */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 text-xs space-y-3 shadow-md border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-black text-amber-300 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                    <Layers size={13} /> Control Operativo Almacén & Tiempos
                  </span>
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-white/10 text-white">
                    SLA: {detail.tiempoPromesaSlaHoras || 72}h
                  </span>
                </div>

                {/* Fecha Promesa de Entrega */}
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white/70 flex items-center gap-1">
                      <Clock size={12} className="text-amber-400" /> Promesa de Entrega:
                    </span>
                    <strong className="text-amber-300">
                      {detail.fechaPromesaEntrega
                        ? new Date(detail.fechaPromesaEntrega).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
                        : `${detail.tiempoPromesaSlaHoras || 72}h hábiles`}
                    </strong>
                  </div>
                  <p className="text-[10px] text-white/50 leading-tight">
                    {detail.tiempoPromesaSlaHoras === 48
                      ? 'Rollo cerrado estándar (24-48h). Puesta en fletera o domicilio.'
                      : detail.tiempoPromesaSlaHoras === 72
                      ? '1 a 4 cortes estándar (72h hábiles).'
                      : '5 a 9 cortes o acumulado anti-trampa (96h hábiles).'}
                  </p>
                </div>

                {/* Validación Física <100m */}
                {detail.validacionFisicaRequerida && (
                  <div className={`p-2.5 rounded-xl border ${
                    detail.validacionFisicaEstatus === 'CONFIRMADO_VISUAL' || detail.validacionFisicaEstatus === 'CONFIRMADO_MESA'
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-950/50 border-amber-500/50 text-amber-300'
                  }`}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold flex items-center gap-1">
                        <AlertTriangle size={12} /> Stock &lt; 100m (Revisión Física)
                      </span>
                      <span className="text-[10px] uppercase font-bold">
                        {detail.validacionFisicaEstatus || 'PENDIENTE'}
                      </span>
                    </div>
                    {detail.metrajeConfirmadoFisico ? (
                      <p className="text-[10px] text-emerald-400 mt-0.5">
                        Metraje medido en almacén: <strong>{detail.metrajeConfirmadoFisico}m</strong>
                      </p>
                    ) : (
                      <div className="pt-1.5 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleConfirmPhysicalValidation(detail.id, 'CONFIRMADO_VISUAL')}
                          className="flex-1 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg font-bold text-[10px] transition-all cursor-pointer"
                        >
                          👁️ Confirmar Visual (Rack)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmPhysicalValidation(detail.id, 'CONFIRMADO_MESA')}
                          className="flex-1 py-1 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-lg font-bold text-[10px] transition-all cursor-pointer"
                        >
                          📏 Medido en Mesa
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Variación de Tono por Lotes */}
                {detail.alertaVariacionTono && (
                  <div className={`p-2.5 rounded-xl border ${
                    detail.variacionTonoAceptada
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-red-950/50 border-red-500/50 text-red-300'
                  }`}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold flex items-center gap-1">
                        <Sparkles size={12} /> Variación de Tono (Lotes Mixtos)
                      </span>
                      <span className="text-[10px] font-bold">
                        {detail.variacionTonoAceptada ? '✅ AUTORIZADO' : '⚠️ REQUIERE ATC'}
                      </span>
                    </div>
                    {detail.variacionTonoAceptada ? (
                      <p className="text-[10px] text-emerald-400 mt-0.5">
                        Autorizado por cliente. Registrado por: <strong>{detail.variacionTonoAceptadaPor || 'ATC'}</strong>
                      </p>
                    ) : (
                      <div className="pt-1.5">
                        <button
                          type="button"
                          onClick={() => handleAcceptToneVariation(detail.id)}
                          className="w-full py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[10px] transition-all cursor-pointer shadow-xs"
                        >
                          Autorizar Variación de Tono (Confirmado con Cliente)
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Carrito de Corte (A1, A2, A3) */}
                <div className="pt-1 border-t border-white/10 flex items-center justify-between">
                  <span className="text-white/70 text-[11px]">Carrito de Corte:</span>
                  <select
                    value={detail.carritoCorte || ''}
                    onChange={(e) => handleAssignCart(detail.id, e.target.value)}
                    className="bg-slate-800 text-amber-300 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="">Sin asignar</option>
                    <option value="Carrito 01 - A1 (Nivel 1)">Carrito 01 - A1 (Nivel 1)</option>
                    <option value="Carrito 01 - A2 (Nivel 2)">Carrito 01 - A2 (Nivel 2)</option>
                    <option value="Carrito 01 - A3 (Nivel 3)">Carrito 01 - A3 (Nivel 3)</option>
                    <option value="Carrito 02 - A1 (Nivel 1)">Carrito 02 - A1 (Nivel 1)</option>
                    <option value="Carrito 02 - A2 (Nivel 2)">Carrito 02 - A2 (Nivel 2)</option>
                    <option value="Carrito 02 - A3 (Nivel 3)">Carrito 02 - A3 (Nivel 3)</option>
                  </select>
                </div>

                {/* Etiqueta de Embarque */}
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-[11px]">Etiqueta Embarque:</span>
                  <select
                    value={detail.tipoEtiquetaEmbarque || 'LOCAL_INFERIOR'}
                    onChange={(e) => handleAssignShippingLabel(detail.id, e.target.value)}
                    className="bg-slate-800 text-indigo-300 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold focus:ring-1 focus:ring-indigo-400"
                  >
                    <option value="LOCAL_INFERIOR">1. Local (Nivel Inferior)</option>
                    <option value="FORANEO_SUPERIOR">2. Foráneo (Nivel Superior)</option>
                    <option value="OCOTLAN">3. Ruta Ocotlán (Mar/Jue)</option>
                    <option value="PAQUETERIA">4. Paqueterías (Paquetexpress)</option>
                  </select>
                </div>
              </div>

              {/* Financial summary */}
              <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                <div className="flex justify-between"><span>Subtotal:</span><span className="font-mono">${Number(detail.subtotal || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></div>
                <div className="flex justify-between"><span>IVA:</span><span className="font-mono">${Number(detail.iva || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></div>
                <div className="flex justify-between font-bold text-sm"><span>Total:</span><span className="text-emerald-600">${Number(detail.total || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></div>
                {detail.referenciaPago && <div className="flex justify-between text-blue-600"><span>Ref. Pago:</span><span>{detail.referenciaPago}</span></div>}
                {detail.facturaRef && <div className="flex justify-between text-emerald-600"><span>Factura:</span><span>{detail.facturaRef}</span></div>}
              </div>

              {/* === FACTURA CFDI Section === */}
              {detail.facturapiId && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={16} className="text-emerald-600" />
                    <h4 className="text-sm font-bold text-emerald-800">Factura CFDI</h4>
                    <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold ${detail.facturaStatus === 'valid' ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}`}>
                      {detail.facturaStatus === 'valid' ? 'Vigente' : 'Cancelada'}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    {detail.uuidFiscal && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">UUID:</span>
                        <span className="font-mono text-emerald-700 text-[11px]">{detail.uuidFiscal}</span>
                      </div>
                    )}
                    {detail.facturaSerie && detail.facturaFolio && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Serie-Folio:</span>
                        <span className="font-semibold">{detail.facturaSerie}-{detail.facturaFolio}</span>
                      </div>
                    )}
                    {detail.facturadaAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Timbrada:</span>
                        <span>{new Date(detail.facturadaAt).toLocaleString('es-MX')}</span>
                      </div>
                    )}
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={async () => {
                        try {
                          const res = await api.get(`/invoicing/${detail.id}/pdf`, { responseType: 'blob' });
                          const url = window.URL.createObjectURL(new Blob([res.data]));
                          const a = document.createElement('a'); a.href = url; a.download = `factura-${detail.codigo}.pdf`; a.click();
                          window.URL.revokeObjectURL(url);
                        } catch { toast.error('Error al descargar PDF'); }
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
                    >
                      <Download size={13} /> PDF
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const res = await api.get(`/invoicing/${detail.id}/xml`, { responseType: 'blob' });
                          const url = window.URL.createObjectURL(new Blob([res.data]));
                          const a = document.createElement('a'); a.href = url; a.download = `factura-${detail.codigo}.xml`; a.click();
                          window.URL.revokeObjectURL(url);
                        } catch { toast.error('Error al descargar XML'); }
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                    >
                      <Download size={13} /> XML
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const res = await api.get(`/invoicing/${detail.id}/pdf`, { responseType: 'blob' });
                          const url = window.URL.createObjectURL(new Blob([res.data]));
                          const printWin = window.open(url);
                          printWin?.addEventListener('load', () => printWin.print());
                        } catch { toast.error('Error al imprimir'); }
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                    >
                      <Printer size={13} />
                    </button>
                    <button
                      onClick={async () => {
                        const email = detail.client?.email || prompt('Email del cliente:');
                        if (!email) return;
                        try {
                          await api.post(`/invoicing/${detail.id}/email`, { email });
                          toast.success(`Factura enviada a ${email}`);
                        } catch { toast.error('Error al enviar email'); }
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 transition-colors"
                    >
                      <Mail size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* Order Lines */}
              <div className="border-t pt-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Líneas del Pedido</h4>
                {detail.lineas?.map((line: any) => (
                  <div key={line.id} className="p-3 bg-gray-50 rounded-xl mb-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="truncate pr-2">
                        <span className="font-semibold text-gray-900">
                          {line.sku?.nombre || 'Tela'}
                        </span>
                        {(line.sku?.color || line.sku?.codigo) && (
                          <span className="text-xs text-gray-500 ml-1.5">
                            · {line.sku?.color || line.sku?.codigo}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {line.listaPrecios && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">
                            {line.listaPrecios}
                          </span>
                        )}
                        {Number(line.descuentoPct) > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                            -{Number(line.descuentoPct)}%
                          </span>
                        )}
                        <span className="font-mono text-xs font-bold text-gray-700 ml-1">
                          {line.metrajeRequerido}m
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>
                        ${Number(line.precioUnitario || 0).toFixed(2)}/m
                        {Number(line.descuentoPct) > 0 && line.precioLista && (
                          <span className="line-through text-gray-400 ml-1 text-[11px]">${Number(line.precioLista).toFixed(2)}</span>
                        )}
                      </span>
                      <span className="font-semibold text-gray-700">
                        Importe: ${Number(line.importe || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-primary-500 rounded-full transition-all" style={{ width: `${Math.min(100, (line.metrajeSurtido / line.metrajeRequerido) * 100)}%` }}></div>
                    </div>
                    {line.assignments?.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {line.assignments.map((a: any) => (
                          <div key={a.id} className="flex items-center justify-between text-xs text-gray-500">
                            <span className="font-mono text-primary-600">{a.hu?.codigo}</span>
                            <span className="flex items-center gap-1">{a.metrajeTomado}m {a.cortado ? <WmsIcon.Cut size={10} /> : <WmsIcon.HU size={10} />}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 pt-2 border-t border-dashed border-gray-200 flex items-center justify-between">
                        <div>
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Mercancía en piso / transición
                          </span>
                          <span className="text-[10px] text-gray-400">Sin HU asignado aún</span>
                        </div>
                        <button
                          onClick={() => setExpressIngestTarget({
                            skuId: line.skuId,
                            orderLineId: line.id,
                            metrajeRequerido: line.metrajeRequerido,
                          })}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors active:scale-95 shadow-sm"
                        >
                          <Zap size={12} /> Alta Express
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Reservations */}
              {detail.reservations?.length > 0 && (
                <div className="border-t pt-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <WmsIcon.Locked size={13} className="text-amber-500" />
                    <h4 className="text-xs font-semibold text-gray-500 uppercase">Reservas Activas</h4>
                  </div>
                  {detail.reservations.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg text-xs mb-1">
                      <span className="font-mono text-primary-600">{r.hu?.codigo || 'Tránsito'}</span>
                      <span>{r.metrajeReservado}m — <span className={r.tipo === 'BLANDA' ? 'text-amber-600' : 'text-emerald-600'}>{r.tipo}</span></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )}

      {/* VISTA 2: COLA DE BACKORDERS (FIFO) Y ALERTAS DE CONTENEDORES */}
      {activeMainTab === 'backorder' && (
        <div className="space-y-4 animate-fade-in">
          {/* Guía Operativa Formatex: Regla de 15 Días, 5 Días y Recorrido FIFO */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-indigo-900/40">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-indigo-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/30">
                  <Truck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Motor de Backorders & Asignación Marítima FIFO</span>
                    <span className="text-[10px] font-mono uppercase bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                      Formatex WMS 360°
                    </span>
                  </h3>
                  <p className="text-xs text-indigo-200/80">
                    Control de pedidos con tela en contenedor marítimo o telar, alertas de arribo y reasignación automática de cola
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => refetchBackorderQueue()}
                  className="px-3 py-1.5 bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-200 rounded-xl text-xs font-semibold border border-indigo-700/50 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={13} className={loadingBackorders ? 'animate-spin' : ''} />
                  <span>Actualizar Cola</span>
                </button>
              </div>
            </div>

            {/* 3 Reglas operativas ATC */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
              <div className="bg-indigo-950/60 border border-indigo-800/50 rounded-xl p-3">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold mb-1">
                  <Clock size={14} />
                  <span>1. Regla 15 Días (Semáforo Ámbar)</span>
                </div>
                <p className="text-[11px] text-indigo-200/90 leading-relaxed">
                  A 15 días del arribo del contenedor, ATC contacta al cliente vía llamada o WhatsApp para validar si la Orden de Compra sigue vigente y mantener reservado su metraje.
                </p>
              </div>

              <div className="bg-indigo-950/60 border border-indigo-800/50 rounded-xl p-3">
                <div className="flex items-center gap-2 text-rose-300 text-xs font-bold mb-1">
                  <AlertTriangle size={14} />
                  <span>2. Regla 5 Días (Semáforo Rojo)</span>
                </div>
                <p className="text-[11px] text-indigo-200/90 leading-relaxed">
                  A 5 días de la llegada a puerto/bodega, se detona la confirmación final de pago (o aplicación a crédito) para preparar corte y tarimas de despacho inmediato.
                </p>
              </div>

              <div className="bg-indigo-950/60 border border-indigo-800/50 rounded-xl p-3">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold mb-1">
                  <ArrowUpDown size={14} />
                  <span>3. Recorrido Automático FIFO</span>
                </div>
                <p className="text-[11px] text-indigo-200/90 leading-relaxed">
                  Si un cliente cancela o cede metros, el sistema recorre los turnos automáticamente (posición - 1), notificando al siguiente cliente en espera de ese contenedor o futuro.
                </p>
              </div>
            </div>
          </div>

          {/* Cards de Contenedores en Tránsito */}
          {containersList && containersList.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Package size={14} className="text-blue-600" />
                  <span>Contenedores Activos en Tránsito ({containersList.length})</span>
                </h4>
                {backorderContainerFilter && (
                  <button
                    onClick={() => setBackorderContainerFilter('')}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <X size={12} /> Ver todos
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {containersList.map((cont: any) => {
                  const isSelected = backorderContainerFilter === (cont.numeroContenedor || cont.codigo);
                  const diasRestantes = cont.fechaEstimada
                    ? Math.ceil((new Date(cont.fechaEstimada).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  return (
                    <div
                      key={cont.id}
                      onClick={() => setBackorderContainerFilter(isSelected ? '' : (cont.numeroContenedor || cont.codigo))}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-300 shadow-md'
                          : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs font-bold text-gray-900 truncate">
                          {cont.numeroContenedor || cont.codigo}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          diasRestantes !== null && diasRestantes <= 5
                            ? 'bg-rose-100 text-rose-800'
                            : diasRestantes !== null && diasRestantes <= 15
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {diasRestantes !== null ? `${diasRestantes} días` : 'En camino'}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 truncate">{cont.supplier?.nombre || 'Proveedor Internacional'}</p>
                      
                      <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2 pt-2 border-t border-gray-100">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} className="text-gray-400" />
                          <span>ETA: {cont.fechaEstimada ? new Date(cont.fechaEstimada).toLocaleDateString('es-MX') : 'Por definir'}</span>
                        </span>
                        <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {cont.ordersCount || 0} pedidos
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabla de la Cola FIFO */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span>Cola FIFO de Asignación por Contenedor</span>
                  <span className="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                    {backorderQueue?.length || 0} en espera
                  </span>
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Orden de despacho estricto según fecha de congelamiento y formato de cobro
                </p>
              </div>

              {backorderContainerFilter && (
                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-800 px-3 py-1.5 rounded-xl text-xs font-medium border border-blue-200">
                  <Filter size={13} />
                  <span>Filtrado por: <strong>{backorderContainerFilter}</strong></span>
                  <button onClick={() => setBackorderContainerFilter('')} className="ml-1 text-blue-600 hover:text-blue-900">
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>

            {loadingBackorders ? (
              <div className="p-12 text-center text-gray-400">
                <Loader2 size={32} className="animate-spin mx-auto text-blue-500 mb-2" />
                <p className="text-xs">Cargando cola de backorders y análisis de contenedores...</p>
              </div>
            ) : !backorderQueue?.length ? (
              <div className="p-12 text-center text-gray-400 space-y-2">
                <Truck size={40} className="mx-auto text-gray-300" />
                <p className="text-sm font-semibold text-gray-600">No hay pedidos en cola de backorder</p>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  {backorderContainerFilter
                    ? `No se encontraron pedidos asignados al contenedor ${backorderContainerFilter}.`
                    : 'Cuando captures una cotización activando la opción de Backorder en Contenedor, aparecerá en esta lista organizada por turno FIFO.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200">
                      <th className="py-3 px-3.5 text-center w-16">Turno</th>
                      <th className="py-3 px-3.5">Pedido / Cotización</th>
                      <th className="py-3 px-3.5">Cliente & Vendedor</th>
                      <th className="py-3 px-3.5">Telas & Metraje Requerido</th>
                      <th className="py-3 px-3.5">Formato Comercial</th>
                      <th className="py-3 px-3.5">Contenedor / ETA</th>
                      <th className="py-3 px-3.5">Alerta Arribo (ATC)</th>
                      <th className="py-3 px-3.5">Vigencia 15D</th>
                      <th className="py-3 px-3.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {backorderQueue.map((bo: any) => {
                      const totalMts = bo.lineas?.reduce((acc: number, l: any) => acc + Number(l.metrajeRequerido || 0), 0) || 0;
                      return (
                        <tr key={bo.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3.5 px-3.5 text-center">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-mono font-bold text-xs ${
                              bo.posicionCola === 1
                                ? 'bg-amber-100 text-amber-900 ring-2 ring-amber-300 shadow-xs'
                                : bo.posicionCola === 2
                                ? 'bg-slate-200 text-slate-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              #{bo.posicionCola || 1}
                            </span>
                          </td>

                          <td className="py-3.5 px-3.5">
                            <div className="font-mono font-bold text-gray-900">{bo.codigo}</div>
                            <div className="text-[11px] text-gray-400">
                              Captura: {new Date(bo.fechaPedido).toLocaleDateString('es-MX')}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              Por: <strong className="text-gray-700">{bo.creadoPor || 'ATC'}</strong>
                            </div>
                          </td>

                          <td className="py-3.5 px-3.5">
                            <div className="font-semibold text-gray-900 max-w-[200px] truncate">
                              {bo.client?.nombre}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {bo.client?.telefono || bo.client?.email || 'Sin contacto directo'}
                            </div>
                            {bo.vendor && (
                              <div className="text-[10px] text-indigo-700 mt-0.5 flex items-center gap-1">
                                <Phone size={10} /> {bo.vendor.nombre}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-3.5">
                            <div className="font-bold text-emerald-700 text-sm">
                              {totalMts.toLocaleString('es-MX')} m
                            </div>
                            <div className="text-[11px] text-gray-500 max-w-[220px] truncate">
                              {bo.lineas?.map((l: any) => `${l.sku?.nombre || l.sku?.codigo} (${l.metrajeRequerido}m)`).join(', ')}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              Total: ${Number(bo.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </div>
                          </td>

                          <td className="py-3.5 px-3.5">
                            {bo.condicionBackorder === 'CONTADO_ANTICIPO' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                                <ShieldCheck size={12} className="text-blue-600" />
                                <span>Contado Anticipo (Congelado)</span>
                              </span>
                            )}
                            {bo.condicionBackorder === 'CONTADO_AL_ARRIBO' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                                <Calendar size={12} className="text-purple-600" />
                                <span>Contado Arribo (Fiscal)</span>
                              </span>
                            )}
                            {bo.condicionBackorder === 'CREDITO' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                                <Check size={12} className="text-emerald-600" />
                                <span>Crédito Comercial</span>
                              </span>
                            )}
                            {!bo.condicionBackorder && (
                              <span className="text-gray-400 italic">Por definir</span>
                            )}
                          </td>

                          <td className="py-3.5 px-3.5">
                            <div className="font-mono font-bold text-gray-800">
                              {bo.contenedorNumero || bo.incomingShipment?.numeroContenedor || 'Sin Asignar'}
                            </div>
                            <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                              <Calendar size={11} className="text-gray-400" />
                              <span>ETA: {bo.fechaEstimadaArriboContenedor ? new Date(bo.fechaEstimadaArriboContenedor).toLocaleDateString('es-MX') : 'Por definir'}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-3.5">
                            {bo.semaforo === 'ROJO_5D' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300 animate-pulse">
                                <AlertTriangle size={12} className="text-rose-600" />
                                <span>Arribo &lt;= 5 días</span>
                              </span>
                            )}
                            {bo.semaforo === 'AMBAR_15D' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                <Clock size={12} className="text-amber-700" />
                                <span>Llamar Cliente ({bo.diasParaArribo}d)</span>
                              </span>
                            )}
                            {bo.semaforo === 'VERDE' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <Check size={12} className="text-emerald-600" />
                                <span>En tiempo ({bo.diasParaArribo}d)</span>
                              </span>
                            )}
                            {bo.semaforo === 'VENCIDO' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
                                <span>Arribo pasado</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3.5">
                            {bo.vigenciaConfirmadaAt ? (
                              <div>
                                <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                                  <CheckCircle2 size={11} className="text-emerald-600" /> Confirmada
                                </span>
                                <div className="text-[10px] text-gray-500 mt-0.5">
                                  {bo.vigenciaConfirmadaPor || 'ATC'} · {new Date(bo.vigenciaConfirmadaAt).toLocaleDateString('es-MX')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-amber-700 font-semibold text-[11px] flex items-center gap-1">
                                <Clock size={11} /> Pendiente ATC
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setBackorderNotes(bo.notasVigencia || '');
                                setBackorderModal({ order: bo, action: 'confirm' });
                              }}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                              title="Revalidar con cliente que sigue queriendo el pedido"
                            >
                              Confirmar Vigencia
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setBackorderNotes('');
                                setBackorderModal({ order: bo, action: 'cancel' });
                              }}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition-colors"
                              title="Cancelar pedido y recorrer lugares automáticamente en la cola"
                            >
                              Cancelar / Ceder
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === Custom Confirmation Modal === */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConfirmModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <ShieldCheck size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Confirmar Acción</h3>
                <p className="text-xs text-gray-400">{NEXT_STATUS[confirmModal.currentStatus]?.label}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6 bg-gray-50 rounded-xl p-4">
              {confirmModal.msg}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => executeAdvance(confirmModal.orderId, confirmModal.currentStatus)}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 text-sm font-medium transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <ShieldCheck size={16} /> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === FACTURAR CFDI MODAL === */}
      {invoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => !invoicing && setInvoiceModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <FileText size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Facturar — CFDI 4.0</h3>
                <p className="text-xs text-gray-400">Timbrado automático con Facturapi</p>
              </div>
            </div>

            {/* Método de Pago */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Método de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setInvoiceForm({ ...invoiceForm, metodoPago: 'PUE', formaPago: '03' })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      invoiceForm.metodoPago === 'PUE'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-semibold">PUE — Pagado</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Pago en una sola exhibición</p>
                  </button>
                  <button
                    onClick={() => setInvoiceForm({ ...invoiceForm, metodoPago: 'PPD', formaPago: '99' })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      invoiceForm.metodoPago === 'PPD'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-semibold">PPD — Crédito</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Pago en parcialidades o diferido</p>
                  </button>
                </div>
              </div>

              {/* Forma de Pago — solo si PUE */}
              {invoiceForm.metodoPago === 'PUE' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Forma de Pago</label>
                  <select
                    value={invoiceForm.formaPago}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, formaPago: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  >
                    <option value="01">01 — Efectivo</option>
                    <option value="02">02 — Cheque nominativo</option>
                    <option value="03">03 — Transferencia electrónica</option>
                    <option value="04">04 — Tarjeta de crédito</option>
                    <option value="28">28 — Tarjeta de débito</option>
                  </select>
                </div>
              )}

              {/* Condiciones de pago — solo si PPD */}
              {invoiceForm.metodoPago === 'PPD' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Condiciones de Pago</label>
                  <input
                    type="text"
                    value={invoiceForm.condicionesPago}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, condicionesPago: e.target.value })}
                    placeholder="Ej: Crédito 30 días"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              )}

              {/* Uso CFDI */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Uso del CFDI</label>
                <select
                  value={invoiceForm.usoCfdi}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, usoCfdi: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                >
                  <option value="G01">G01 — Adquisición de mercancías</option>
                  <option value="G03">G03 — Gastos en general</option>
                  <option value="P01">P01 — Por definir</option>
                  <option value="S01">S01 — Sin efectos fiscales</option>
                </select>
              </div>
            </div>

            {/* Info */}
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
              <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <p>Se generará un CFDI de Ingreso con timbrado automático ante el SAT. El XML y PDF estarán disponibles para descarga inmediatamente.</p>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setInvoiceModal(null)}
                disabled={invoicing}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setInvoicing(true);
                  try {
                    const { data } = await api.post(`/invoicing/${invoiceModal}/create`, invoiceForm);
                    toast.success(`Factura timbrada exitosamente — UUID: ${data.uuid?.substring(0, 8)}...`);
                    setInvoiceModal(null);
                    refetchDetail();
                  } catch (e: any) {
                    toast.error(e?.response?.data?.message || 'Error al facturar');
                  }
                  setInvoicing(false);
                }}
                disabled={invoicing}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-800 text-sm font-medium transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {invoicing ? (
                  <><Loader2 size={16} className="animate-spin" /> Timbrando...</>
                ) : (
                  <><FileText size={16} /> Facturar y Timbrar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === VALIDAR DATOS DE ENTREGA MODAL === */}
      {deliveryModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => !confirmingDelivery && setDeliveryModalOrder(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                  <Truck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Validar Datos de Entrega</h3>
                  <p className="text-xs text-gray-500">
                    Pedido <span className="font-mono font-bold text-amber-700">{deliveryModalOrder.codigo}</span> · {deliveryModalOrder.client?.nombre}
                  </p>
                </div>
              </div>
              <button onClick={() => setDeliveryModalOrder(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Domicilio de Destino</label>
                <select
                  value={deliveryForm.deliveryAddressId}
                  onChange={e => {
                    const aId = e.target.value;
                    const addr = deliveryOrderAddresses.find(a => a.id === aId);
                    setDeliveryForm({
                      ...deliveryForm,
                      deliveryAddressId: aId,
                      deliveryContactName: addr?.contactoNombre || deliveryForm.deliveryContactName,
                      deliveryContactPhone: addr?.contactoTelefono || deliveryForm.deliveryContactPhone,
                      deliverySchedule: addr?.horarioRecepcion || deliveryForm.deliverySchedule,
                    });
                  }}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Domicilio Fiscal / Matriz del Cliente</option>
                  {deliveryOrderAddresses.map(addr => (
                    <option key={addr.id} value={addr.id}>
                      {addr.alias} — {addr.calleNumero} ({addr.municipio || 'Jalisco'})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">Selecciona entre las sucursales o talleres registrados del cliente</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Nombre de Receptor</label>
                  <input
                    type="text"
                    value={deliveryForm.deliveryContactName}
                    onChange={e => setDeliveryForm({ ...deliveryForm, deliveryContactName: e.target.value })}
                    placeholder="Persona que recibe"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Teléfono Receptor</label>
                  <input
                    type="text"
                    value={deliveryForm.deliveryContactPhone}
                    onChange={e => setDeliveryForm({ ...deliveryForm, deliveryContactPhone: e.target.value })}
                    placeholder="Teléfono móvil directo"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Fletera Asignada</label>
                  <select
                    value={deliveryForm.fletera}
                    onChange={e => setDeliveryForm({ ...deliveryForm, fletera: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  >
                    <option value="Transportes Castores">Transportes Castores</option>
                    <option value="Tres Guerras">Tres Guerras</option>
                    <option value="Paquetexpress">Paquetexpress</option>
                    <option value="Estafeta Carga">Estafeta Carga</option>
                    <option value="Chofer Local Formatex">Chofer Local Formatex</option>
                    <option value="Ocurre en Almacén">Ocurre en Almacén Formatex</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Horario de Recepción</label>
                  <input
                    type="text"
                    value={deliveryForm.deliverySchedule}
                    onChange={e => setDeliveryForm({ ...deliveryForm, deliverySchedule: e.target.value })}
                    placeholder="Ej: L-V 09:00 a 14:00"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={deliveryForm.envioAsegurado}
                    onChange={e => setDeliveryForm({ ...deliveryForm, envioAsegurado: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded border-gray-300"
                  />
                  <span>Contratar seguro de envío con la fletera</span>
                </label>
                <p className="text-[11px] text-gray-400 ml-6">Cubre valor factura ante siniestros en carretera</p>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Notas de Logística para Almacén / Chofer</label>
                <input
                  type="text"
                  value={deliveryForm.notasEntrega}
                  onChange={e => setDeliveryForm({ ...deliveryForm, notasEntrega: e.target.value })}
                  placeholder="Ej: Llamar 30 mins antes, rampa de descarga en el callejón posterior..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDeliveryModalOrder(null)}
                disabled={confirmingDelivery}
                className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveDeliveryConfirmation}
                disabled={confirmingDelivery}
                className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {confirmingDelivery ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : <><Check size={14} /> Confirmar y Notificar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL DE GESTIÓN DE BACKORDER (CONFIRMAR VIGENCIA O CANCELAR Y RECORRER COLA) === */}
      {backorderModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !backorderActionLoading && setBackorderModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                  backorderModal.action === 'confirm' ? 'bg-blue-500/10 text-blue-700' : 'bg-rose-500/10 text-rose-700'
                }`}>
                  {backorderModal.action === 'confirm' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {backorderModal.action === 'confirm'
                      ? 'Revalidar Vigencia de Backorder (15 Días)'
                      : 'Cancelar y Recorrer Cola Automáticamente'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Pedido <span className="font-mono font-bold text-blue-700">{backorderModal.order.codigo}</span> · {backorderModal.order.client?.nombre}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBackorderModal(null)}
                disabled={backorderActionLoading}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Info summary */}
            <div className="bg-gray-50 rounded-xl p-3.5 space-y-1.5 text-xs text-gray-700 border border-gray-200/60">
              <div className="flex justify-between">
                <span className="text-gray-500">Contenedor:</span>
                <span className="font-mono font-bold text-gray-900">
                  {backorderModal.order.contenedorNumero || 'En tránsito'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ETA Arribo:</span>
                <span className="font-semibold">
                  {backorderModal.order.fechaEstimadaArriboContenedor
                    ? new Date(backorderModal.order.fechaEstimadaArriboContenedor).toLocaleDateString('es-MX')
                    : 'Por definir'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Turno en Cola:</span>
                <span className="font-mono font-bold text-blue-700">
                  Posición #{backorderModal.order.posicionCola || 1}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Condición Comercial:</span>
                <span className="font-semibold text-gray-800">
                  {backorderModal.order.condicionBackorder === 'CONTADO_ANTICIPO' ? 'Contado con Anticipo' :
                   backorderModal.order.condicionBackorder === 'CONTADO_AL_ARRIBO' ? 'Contado al Arribo (Fiscal)' : 'Crédito Comercial'}
                </span>
              </div>
            </div>

            {backorderModal.action === 'confirm' ? (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex items-start gap-2">
                  <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <p>
                    Al confirmar la vigencia, se registra que ATC contactó al cliente a 15 días del arribo y que éste revalida su pedido y orden de compra. El apartado permanecerá activo para surtido directo una vez arribe el contenedor.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Notas de la llamada con el cliente (opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={backorderNotes}
                    onChange={e => setBackorderNotes(e.target.value)}
                    placeholder="Ej: Cliente confirma vía telefónica que requiere los rollos; programar entrega el día posterior al arribo..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setBackorderModal(null)}
                    disabled={backorderActionLoading}
                    className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmBackorderVigencia}
                    disabled={backorderActionLoading}
                    className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {backorderActionLoading ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : <><Check size={14} /> Revalidar y Mantener Apartado</>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Aviso de Recorrido de Cola FIFO:</strong>
                    <p className="mt-0.5">
                      Al cancelar este pedido, el metraje se liberará y la posición de todos los clientes que esperan detrás en este contenedor (#{backorderModal.order.posicionCola + 1} en adelante) se recorrerá automáticamente un lugar hacia arriba.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Motivo de la cancelación / cesión de metraje *
                  </label>
                  <input
                    type="text"
                    value={backorderNotes}
                    onChange={e => setBackorderNotes(e.target.value)}
                    placeholder="Ej: Cliente no confirmó vigencia a los 15 días / Adquirió otro producto"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setBackorderModal(null)}
                    disabled={backorderActionLoading}
                    className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors"
                  >
                    No cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelAndReassignBackorder}
                    disabled={backorderActionLoading || !backorderNotes.trim()}
                    className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {backorderActionLoading ? <><Loader2 size={14} className="animate-spin" /> Procesando...</> : <><X size={14} /> Cancelar y Recorrer Cola</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Express Ingest Modal */}
      <ExpressIngestModal
        open={!!expressIngestTarget}
        onClose={() => setExpressIngestTarget(null)}
        initialSkuId={expressIngestTarget?.skuId}
        initialOrderLineId={expressIngestTarget?.orderLineId}
        initialMetrajeRequerido={expressIngestTarget?.metrajeRequerido}
        onSuccess={() => {
          refetchDetail();
        }}
      />

      {/* Cotización Oficial Formatex Modal (PDF Cliente) */}
      {quotationOrder && (
        <QuotationModal
          order={quotationOrder}
          onClose={() => setQuotationOrder(null)}
        />
      )}

      {/* Packing List Oficial Formatex Modal */}
      {packingSlipOrder && (
        <PackingSlipModal
          order={packingSlipOrder}
          onClose={() => setPackingSlipOrder(null)}
        />
      )}
    </div>
  );
}

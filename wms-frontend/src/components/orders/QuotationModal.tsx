import { useRef } from 'react';
import {
  Printer, X, Building, Phone, Mail, FileText,
  Share2, ShieldCheck, CreditCard, Clock, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';

interface QuotationModalProps {
  order: any;
  onClose: () => void;
}

// Helper para convertir números a formato moneda en texto (Español México)
function numeroALetras(monto: number): string {
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const diezY = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  function convertirGrupo(n: number): string {
    let salida = '';
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (n === 100) return 'CIEN';
    if (c > 0) salida += centenas[c] + ' ';

    const resto = n % 100;
    if (resto >= 10 && resto < 20) {
      salida += diezY[resto - 10] + ' ';
    } else {
      if (d > 0) {
        if (d === 2 && u > 0) {
          salida += 'VEINTI' + unidades[u] + ' ';
          return salida.trim();
        }
        salida += decenas[d] + (u > 0 ? ' Y ' : ' ');
      }
      if (u > 0 && d !== 2) salida += unidades[u] + ' ';
    }
    return salida.trim();
  }

  const partes = Number(monto || 0).toFixed(2).split('.');
  let entero = parseInt(partes[0], 10);
  const centavos = partes[1];

  if (entero === 0) return `CERO PESOS ${centavos}/100 M.N.`;

  let resultado = '';
  if (entero >= 1000000) {
    const millones = Math.floor(entero / 1000000);
    resultado += (millones === 1 ? 'UN MILLÓN ' : convertirGrupo(millones) + ' MILLONES ');
    entero %= 1000000;
  }
  if (entero >= 1000) {
    const miles = Math.floor(entero / 1000);
    resultado += (miles === 1 ? 'MIL ' : convertirGrupo(miles) + ' MIL ');
    entero %= 1000;
  }
  if (entero > 0) {
    resultado += convertirGrupo(entero) + ' ';
  }

  return `${resultado.trim()} PESOS ${centavos}/100 M.N.`;
}

export default function QuotationModal({ order, onClose }: QuotationModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Cargar configuraciones oficiales dinámicas desde el backend
  const { data: settings } = useApi<any[]>(['system-settings'], '/admin/settings');
  const getVal = (clave: string, fallback: string) => {
    const s = settings?.find((item: any) => item.clave === clave);
    return s && s.valor ? s.valor : fallback;
  };

  const empresaNombre = getVal('empresa_nombre', 'FORMA TEXTIL S. DE R.L. DE C.V.');
  const empresaRfc = getVal('empresa_rfc', 'FTE140429FP3');
  const empresaDireccion = getVal('empresa_direccion', 'Río La Barca No. 1680, Col. Atlas, C.P. 44870, Guadalajara, Jalisco');
  const empresaTelefono = getVal('empresa_telefono', '(33) 3650-5447');

  const bancoBeneficiario = getVal('banco_beneficiario', empresaNombre);
  const bancoNombre = getVal('banco_nombre', getVal('empresa_banco', 'BBVA México'));
  const bancoCuenta = getVal('banco_cuenta', '0114 8592 31');
  const bancoClabe = getVal('banco_clabe', getVal('empresa_clabe', '0123 2000 1148 5923 18'));
  const vigenciaHoras = getVal('cotizacion_vigencia_horas', '24');
  const emailCobranza = getVal('cotizacion_email_comprobantes', getVal('empresa_email_cobranza', 'cobranza@formatex.mx'));
  const whatsappContacto = getVal('cotizacion_whatsapp_contacto', empresaTelefono || '3336505447');
  const pieNota = getVal('cotizacion_pie_nota', 'Gracias por su preferencia. En Formatex estamos comprometidos con la calidad textil de su negocio.');
  const terminosTexto = getVal('cotizacion_terminos_condiciones', `• Los precios están expresados en Moneda Nacional (MXN) e incluyen IVA (16%). Sujetos a cambio sin previo aviso.
• Vigencia de Apartado: El inventario apartado para esta cotización se reserva físicamente por un lapso de 24 horas hábiles. Concluido este periodo sin confirmación de pago en Cobranza, el sistema libera la mercancía automáticamente.
• Corte y Preparación: Todo proceso de corte o preparación en almacén iniciará una vez validado y liberado el pago por el departamento de Cobranza.
• Cancelaciones: Toda tela cortada por metraje a solicitud expresa del comprador no admite cambios, devoluciones ni cancelaciones.
• Envíos y Fletes: Las entregas foráneas se despachan por fletera convenida por cobrar a destino, viajando por cuenta y riesgo del comprador, salvo que el cliente haya contratado póliza de seguro de carga.`);

  if (!order) return null;

  const client = order.client || {};
  const deliveryAddress = order.deliveryAddress;
  const lineas = order.lineas || [];

  // Cálculos comerciales
  const subtotal = Number(order.subtotal || 0);
  const iva = Number(order.iva || 0);
  const total = Number(order.total || 0);

  let totalMetros = 0;
  lineas.forEach((l: any) => {
    totalMetros += Number(l.metrajeRequerido || l.metrajeSurtido || 0);
  });

  const fechaEmision = order.fechaCotizacion || order.createdAt
    ? new Date(order.fechaCotizacion || order.createdAt).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
      })
    : new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: '2-digit' });

  const esCotizado = order.estado === 'COTIZADO';
  const docTitulo = esCotizado ? 'COTIZACIÓN COMERCIAL' : 'ORDEN DE PEDIDO';

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const nombreCliente = client.nombre || 'Cliente';
    const folio = order.codigo;
    const totalFmt = `$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`;
    const lineasTexto = lineas
      .map((l: any) => `• *${l.sku?.nombre || l.sku?.codigo || 'Tela'}* (${l.sku?.color || ''}): ${l.metrajeRequerido}m x $${Number(l.precioUnitario || 0).toFixed(2)} = $${Number(l.subtotal || (l.metrajeRequerido * (l.precioUnitario || 0))).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`)
      .join('%0A');

    const mensaje = `*FORMA TEXTIL — ${docTitulo}*%0A` +
      `Hola *${nombreCliente}*, adjuntamos el detalle de su cotización formal:%0A%0A` +
      `📄 *Folio:* ${folio}%0A` +
      `📅 *Fecha:* ${fechaEmision}%0A` +
      `⏱️ *Vigencia de Apartado:* ${vigenciaHoras} Horas Hábiles%0A%0A` +
      `*Partidas:*%0A${lineasTexto}%0A%0A` +
      `💰 *Total a Liquidar:* *${totalFmt}*%0A%0A` +
      `*Datos Oficiales de Pago ${bancoNombre}:*%0A` +
      `Beneficiario: ${bancoBeneficiario}%0A` +
      (bancoCuenta ? `Cuenta: ${bancoCuenta}%0A` : '') +
      `CLABE Interbancaria: ${bancoClabe}%0A` +
      `Referencia Obligatoria: ${folio}%0A%0A` +
      `Favor de enviar su comprobante al correo ${emailCobranza} o a este WhatsApp indicando el folio ${folio}. Quedamos a su servicio para confirmar el surtido inmediato.`;

    const tel = (client.telefono || '').replace(/\D/g, '');
    const url = tel && tel.length >= 10
      ? `https://wa.me/52${tel}?text=${mensaje}`
      : `https://wa.me/?text=${mensaje}`;
    window.open(url, '_blank');
    toast.success('Resumen preparado para WhatsApp');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Contenedor Modal */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:w-full print:rounded-none">
        
        {/* Barra Superior de Herramientas (Oculta en Impresión) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-cyan-400 flex items-center justify-center border border-cyan-400/30">
              <FileText size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight">{docTitulo} — {order.codigo}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  esCotizado ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {esCotizado ? 'Cotización Pendiente' : 'Pedido en Firme'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {client.nombre || 'Cliente General'} · Documento Oficial para Cliente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Compartir resumen por WhatsApp"
            >
              <Share2 size={14} />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Imprimir o Guardar en PDF"
            >
              <Printer size={15} />
              <span>Imprimir / Descargar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Cuerpo del Documento Imprimible */}
        <div className="p-8 overflow-y-auto flex-1 print:p-0 print:overflow-visible text-gray-800" ref={printRef}>
          {/* Estilos de Impresión CSS */}
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              .printable-quotation, .printable-quotation * {
                visibility: visible;
              }
              .printable-quotation {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 12mm 15mm;
                font-size: 10.5pt;
                color: #0f172a;
                background: #ffffff;
              }
              @page {
                size: letter portrait;
                margin: 10mm;
              }
            }
          `}</style>

          <div className="printable-quotation space-y-6 max-w-3xl mx-auto">
            
            {/* 1. Encabezado Oficial Formatex */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-slate-950 tracking-tight">FORMA TEXTIL</h1>
                  <span className="text-xs bg-slate-900 text-white font-bold px-2 py-0.5 rounded">MÉXICO</span>
                </div>
                <p className="text-xs text-gray-700 font-bold mt-0.5">{empresaNombre}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  RFC: <strong className="font-mono text-gray-800 font-bold">{empresaRfc}</strong>
                </p>
                <p className="text-[11px] text-gray-500 leading-tight">
                  {empresaDireccion}<br />
                  México · Tel: {empresaTelefono}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                  <span>{emailCobranza}</span>
                  <span>·</span>
                  <span>www.formatex.mx</span>
                </p>
              </div>

              <div className="text-right">
                <div className="inline-block bg-blue-900 text-white font-mono font-extrabold text-xs uppercase px-3 py-1.5 rounded tracking-wide shadow-xs">
                  {docTitulo}
                </div>
                <p className="text-xl font-black text-slate-950 font-mono mt-1.5">{order.codigo}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Fecha: <strong className="text-slate-900 font-semibold">{fechaEmision}</strong>
                </p>
                <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  <Clock size={11} className="text-amber-700" />
                  <span>Vigencia de Apartado: {vigenciaHoras} Horas Hábiles</span>
                </div>
              </div>
            </div>

            {/* 2. Información del Cliente y Datos Comerciales */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* Tarjeta Cliente */}
              <div className="border border-gray-200 rounded-xl p-3.5 bg-slate-50/60 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px] uppercase tracking-wide border-b border-gray-200 pb-1 mb-1">
                  <Building size={13} className="text-blue-600" />
                  <span>Datos del Cliente</span>
                </div>
                <p className="font-bold text-sm text-slate-950">{client.nombre || '—'}</p>
                <p className="text-gray-600">
                  RFC: <strong className="font-mono text-gray-800">{client.rfc || 'XAXX010101000'}</strong>
                </p>
                <p className="text-gray-600 leading-tight">
                  {client.direccion || 'Dirección fiscal registrada en catálogo'}
                </p>
                {client.cp && <p className="text-gray-600">C.P.: <strong>{client.cp}</strong></p>}
                {client.telefono && <p className="text-gray-600">Teléfono: <strong>{client.telefono}</strong></p>}
                {client.email && <p className="text-gray-600">Email: {client.email}</p>}
              </div>

              {/* Tarjeta Condiciones Comerciales y Logística */}
              <div className="border border-gray-200 rounded-xl p-3.5 bg-slate-50/60 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px] uppercase tracking-wide border-b border-gray-200 pb-1 mb-1">
                  <CreditCard size={13} className="text-indigo-600" />
                  <span>Condiciones y Entrega</span>
                </div>
                <div className="space-y-1 text-gray-700">
                  <p className="flex justify-between">
                    <span className="text-gray-500">Lista / Tarifa:</span>
                    <strong className="text-slate-900">
                      {order.lineas?.[0]?.listaPrecios || client.listaPrecios || 'Lista Oficial Formatex'}
                    </strong>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-500">Agente Comercial:</span>
                    <strong className="text-slate-900">{order.vendor?.nombre || 'Atención al Cliente (ATC)'}</strong>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-500">Destino de Entrega:</span>
                    <strong className="text-slate-900 text-right truncate max-w-[200px]">
                      {deliveryAddress?.alias || 'Domicilio Fiscal'}
                    </strong>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-500">Flete / Transporte:</span>
                    <strong className="text-slate-900">
                      {order.fletera ? `${order.fletera} (Por Cobrar)` : 'Por convenir / Paquetería'}
                    </strong>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-500">Seguro de Mercancía:</span>
                    <strong className={order.envioAsegurado ? 'text-indigo-700' : 'text-gray-600'}>
                      {order.envioAsegurado ? 'Asegurado por Cliente' : 'Sin Seguro (Por cuenta del cliente)'}
                    </strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Alerta de Backorder en Tránsito Marítimo (si aplica) */}
            {order.esBackorder && (
              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
                <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-blue-950">
                    Apartado Especial en Tránsito Marítimo — Cola #{order.posicionCola || 1}
                  </p>
                  <p className="text-[11px] text-blue-800 mt-0.5">
                    Este pedido asegura metraje exclusivo dentro del contenedor marítimo <strong>{order.contenedorNumero || 'En Altamar'}</strong>.
                    {order.fechaEstimadaArriboContenedor && (
                      <span> Fecha estimada de arribo a bodega: <strong>{new Date(order.fechaEstimadaArriboContenedor).toLocaleDateString('es-MX')}</strong>.</span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* 3. Tabla Detallada de Partidas (100% Comercial — SIN HUs NI RACKS) */}
            <div className="border border-slate-900 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 w-28">Código</th>
                    <th className="py-2.5 px-3">Descripción de Tela</th>
                    <th className="py-2.5 px-3 w-20 text-center">Unidad</th>
                    <th className="py-2.5 px-3 w-24 text-right">Cantidad</th>
                    <th className="py-2.5 px-3 w-24 text-right">Precio Unit.</th>
                    <th className="py-2.5 px-3 w-20 text-center">Desc.</th>
                    <th className="py-2.5 px-3 w-28 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lineas.map((line: any, idx: number) => {
                    const sku = line.sku || {};
                    const cant = Number(line.metrajeRequerido || line.metrajeSurtido || 0);
                    const pu = Number(line.precioUnitario || sku.precioReferencia || 0);
                    const descPct = Number(line.descuentoPct || 0);
                    const subtotalLinea = Number(line.subtotal || (cant * pu * (1 - descPct / 100)));

                    return (
                      <tr key={line.id || idx} className="bg-white hover:bg-slate-50/50">
                        <td className="py-3 px-3 text-center text-gray-400 font-mono font-bold">{idx + 1}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{sku.codigo || '—'}</td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-950 text-[12px]">{sku.nombre || 'Tela Sintética'}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {sku.color ? `Color: ${sku.color}` : ''}
                            {sku.anchoMetros ? ` · Ancho: ${sku.anchoMetros}m` : ''}
                            {sku.composicion ? ` · Comp: ${sku.composicion}` : ''}
                          </p>
                          {line.notas && (
                            <p className="text-[10px] text-amber-700 italic mt-0.5">Nota: {line.notas}</p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-gray-600">
                          {sku.unidadMedida || 'MTR'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {cant.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-gray-700">
                          ${pu.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-gray-600">
                          {descPct > 0 ? `${descPct}%` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-950">
                          ${subtotalLinea.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 4. Bloque de Totales y Letra */}
            <div className="flex justify-between items-start gap-4">
              {/* Importe con Letra */}
              <div className="flex-1 bg-slate-50 border border-gray-200 rounded-xl p-3 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  Importe Total con Letra
                </span>
                <p className="font-bold text-slate-900 text-[11px] uppercase leading-snug">
                  {numeroALetras(total > 0 ? total : subtotal + iva)}
                </p>
                <p className="text-[10px] text-gray-500 pt-1 border-t border-gray-200">
                  Total de metros cotizados: <strong className="text-slate-900 font-mono">{totalMetros.toFixed(2)} MTS</strong> en {lineas.length} partidas.
                </p>
              </div>

              {/* Desglose Numérico de Totales */}
              <div className="w-64 border border-slate-900 rounded-xl overflow-hidden text-xs bg-white">
                <div className="p-3 space-y-1.5">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>IVA (16%):</span>
                    <span className="font-mono font-semibold text-slate-900">
                      ${iva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-900 text-white px-3 py-2 flex justify-between items-center">
                  <span className="font-bold text-xs uppercase tracking-wider">Total a Pagar:</span>
                  <span className="font-mono font-black text-sm text-cyan-300">
                    ${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Cuentas Bancarias Oficiales Formatex para Liquidación */}
            <div className="border border-blue-200 rounded-xl p-3.5 bg-blue-50/40 text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-blue-200/80 pb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-blue-950 text-[11px] uppercase tracking-wide">
                  <CreditCard size={14} className="text-blue-700" />
                  <span>Datos Bancarios Oficiales para Pago y Transferencia</span>
                </div>
                <span className="text-[10px] text-blue-800 font-semibold">
                  Referencia Obligatoria: <strong className="font-mono font-bold text-blue-950">{order.codigo}</strong>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-[11px] text-slate-800">
                <div>
                  <span className="block text-gray-500 text-[10px]">Beneficiario:</span>
                  <strong className="font-bold">{bancoBeneficiario}</strong>
                </div>
                <div>
                  <span className="block text-gray-500 text-[10px]">Banco:</span>
                  <strong className="font-bold">{bancoNombre}</strong>
                  {bancoCuenta && <span className="text-gray-600 block text-[10px]">Cuenta: {bancoCuenta}</span>}
                </div>
                <div>
                  <span className="block text-gray-500 text-[10px]">CLABE Interbancaria (SPEI):</span>
                  <strong className="font-mono font-bold text-blue-950">{bancoClabe}</strong>
                </div>
              </div>
              <p className="text-[10px] text-blue-900/80 pt-1 border-t border-blue-200/50">
                Favor de enviar su comprobante de pago al correo <strong>{emailCobranza}</strong> o al WhatsApp <strong>{whatsappContacto}</strong> indicando el folio <strong>{order.codigo}</strong>.
              </p>
            </div>

            {/* 6. Políticas Comerciales y Términos al Pie */}
            <div className="text-[9.5px] text-gray-500 space-y-1 border-t border-gray-200 pt-3 leading-relaxed">
              <p className="font-bold text-gray-700 uppercase">Términos y Condiciones Comerciales:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {terminosTexto.split('\n').filter(Boolean).map((line, idx) => (
                  <li key={idx}>
                    {line.replace(/^[•\-\*]\s*/, '')}
                  </li>
                ))}
              </ul>
              {pieNota && (
                <p className="text-[10px] text-gray-600 italic pt-1 border-t border-gray-100 mt-1">
                  {pieNota}
                </p>
              )}
            </div>

            {/* Pie de Firma / Aceptación */}
            <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs text-gray-600">
              <div className="border-t border-gray-400 pt-2">
                <p className="font-bold text-slate-900">{bancoBeneficiario || empresaNombre}</p>
                <p className="text-[10px] text-gray-500">Atención al Cliente y Ventas</p>
              </div>
              <div className="border-t border-gray-400 pt-2">
                <p className="font-bold text-slate-900">{client.nombre || 'Firma / Aceptación del Cliente'}</p>
                <p className="text-[10px] text-gray-500">Nombre, Firma y Fecha de Autorización</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

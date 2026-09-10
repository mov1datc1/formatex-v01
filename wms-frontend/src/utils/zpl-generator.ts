/**
 * ZPL Generator — Genera código ZPL para impresoras Zebra térmicas
 * Formatos: 4x6", 2x1", 3x2"
 */

export interface LabelData {
  codigo: string;
  tela: string;
  sku: string;
  color: string;
  metraje: number;
  ancho: number;
  ubicacion: string;
  tipo: 'ENTERO' | 'RETAZO' | 'CORTE_CLIENTE';
  lote?: string;
  barcode?: string;
  fecha?: string;
  origen?: string;
  generacion?: number;
  pedido?: string;
  cliente?: string;
  mesa?: string;
  carrito?: string;
  cortador?: string;
}

/**
 * Etiqueta 4x6" (101.6 x 152.4mm) — Estándar para rollos y pedidos
 * Zebra ZD420/ZD620 @ 203 DPI
 */
export function generateZPL4x6(data: LabelData): string {
  const barcode = data.barcode || data.codigo;
  const isCorteCliente = data.tipo === 'CORTE_CLIENTE';

  if (isCorteCliente) {
    return `^XA
^FO20,20^GB780,1180,3^FS
^FO20,20^GB780,90,90^FS
^FO30,30^A0N,45,45^FR^FDFORMATEX — PEDIDO CLIENTE^FS
^FO550,40^A0N,24,20^FR^FD${data.fecha || new Date().toLocaleDateString()}^FS

^FO30,130^A0N,24,24^FDPEDIDO:^FS
^FO150,120^A0N,45,42^FD${data.pedido || data.codigo}^FS

^FO30,180^A0N,22,22^FDCLIENTE:^FS
^FO150,175^A0N,30,28^FD${(data.cliente || 'CLIENTE DIRECTO').substring(0, 32)}^FS

^FO30,225^A0N,22,22^FDTela: ${data.tela}^FS
^FO30,255^A0N,20,20^FDSKU: ${data.sku} | Color: ${data.color}^FS
^FO30,285^A0N,20,20^FDAncho: ${data.ancho}m | Rollo Madre: ${data.origen || 'N/A'}^FS

^FO30,330^GB740,110,110^FS
^FO60,350^A0N,24,20^FR^FDMETROS SURTIDOS^FS
^FO280,340^A0N,75,70^FR^FD${data.metraje}m^FS

^FO60,470^BQN,2,6^FDQA,${JSON.stringify({ ped: data.pedido || data.codigo, m: data.metraje, sku: data.sku })}^FS
^FO350,470^BY2,3,100^BCN,100,Y,N,N^FD${barcode}^FS

^FO30,620^A0N,26,24^FDESTACIÓN:^FS
^FO160,615^A0N,32,30^FD${data.mesa || 'MESA DE CORTE'} ${data.carrito ? '· ' + data.carrito : ''}^FS

^FO30,670^A0N,22,22^FDDESTINO:^FS
^FO160,665^A0N,28,26^FDÁREA DE EMPAQUE / EMBARQUES^FS

^FO20,730^GB780,3,3^FS
^FO30,745^A0N,18,18^FDCORTE: ${data.codigo} | FORMA TEXTIL S. DE R.L. DE C.V.^FS
^XZ`;
  }

  return `^XA
^FO20,20^GB780,1180,3^FS
^FO20,20^GB780,80,80^FS
^FO30,30^A0N,50,50^FR^FDFORMATEX^FS
^FO500,30^A0N,30,25^FR^FDWMS 360+^FS
^FO650,30^A0N,25,20^FR^FD${data.fecha || new Date().toLocaleDateString()}^FS

^FO30,120^A0N,28,28^FDHU:^FS
^FO100,110^A0N,45,42^FD${data.codigo}^FS
^FO30,170^A0N,22,22^FDTela: ${data.tela}^FS
^FO30,200^A0N,22,22^FDSKU: ${data.sku}^FS
^FO30,230^A0N,22,22^FDColor: ${data.color}^FS
^FO30,260^A0N,22,22^FDAncho: ${data.ancho}m^FS

^FO30,310^GB740,100,100^FS
^FO60,325^A0N,20,18^FR^FDMETRAJE ACTUAL^FS
^FO200,320^A0N,65,60^FR^FD${data.metraje}m^FS

^FO60,430^BQN,2,6^FDQA,${JSON.stringify({ hu: data.codigo, sku: data.sku, m: data.metraje })}^FS

^FO350,430^BY2,3,100^BCN,100,Y,N,N^FD${barcode}^FS

^FO30,600^A0N,22,22^FDUbicación:^FS
^FO200,590^A0N,40,35^FD${data.ubicacion || 'SIN UBICAR'}^FS

^FO30,650^A0N,22,22^FDTipo:^FS
^FO120,640^A0N,35,32^FD${data.tipo}^FS
${data.tipo === 'RETAZO' && data.origen ? `^FO30,690^A0N,18,18^FDOrigen: ${data.origen} | Gen: ${data.generacion || 1}^FS` : ''}

^FO20,720^GB780,3,3^FS
^FO30,730^A0N,16,16^FDFORMA TEXTIL S. DE R.L. DE C.V.^FS
^XZ`;
}

/**
 * Etiqueta 2x1" (50.8 x 25.4mm) — Pequeña para retazos
 * Zebra GK420 @ 203 DPI
 */
export function generateZPL2x1(data: LabelData): string {
  const isCorte = data.tipo === 'CORTE_CLIENTE';
  return `^XA
^FO5,5^A0N,18,16^FD${isCorte ? (data.pedido || data.codigo) : data.codigo}^FS
^FO5,28^A0N,14,12^FD${data.tela.substring(0, 18)}^FS
^FO280,5^A0N,30,28^FD${data.metraje}m^FS
^FO5,48^BQN,2,2^FDQA,${data.codigo}^FS
^FO120,48^A0N,12,10^FD${isCorte ? 'A EMPAQUE' : data.ubicacion}^FS
^FO120,65^A0N,10,8^FD${data.tipo === 'RETAZO' ? 'RETAZO' : isCorte ? 'PEDIDO' : 'ENTERO'}^FS
^XZ`;
}

/**
 * Etiqueta 3x2" (76.2 x 50.8mm) — Mediana
 * Zebra LP2844 / EPL compatible
 */
export function generateZPL3x2(data: LabelData): string {
  const barcode = data.barcode || data.codigo;
  const isCorteCliente = data.tipo === 'CORTE_CLIENTE';

  if (isCorteCliente) {
    return `^XA
^FO10,10^GB590,380,2^FS
^FO10,10^GB590,50,50^FS
^FO20,18^A0N,28,24^FR^FDPEDIDO: ${data.pedido || data.codigo}^FS
^FO400,18^A0N,20,18^FR^FD${data.fecha || new Date().toLocaleDateString()}^FS

^FO20,70^A0N,22,20^FDCLIENTE: ${(data.cliente || 'CLIENTE DIRECTO').substring(0, 26)}^FS
^FO20,95^A0N,18,16^FD${data.tela} · ${data.color}^FS

^FO20,130^GB270,65,65^FS
^FO35,145^A0N,14,12^FR^FDSURTIDOS^FS
^FO100,135^A0N,45,40^FR^FD${data.metraje}m^FS

^FO310,130^A0N,16,14^FD${data.mesa || 'MESA CORTE'}^FS
^FO310,155^A0N,14,14^FD${data.carrito || 'A EMPAQUE'}^FS
^FO310,180^A0N,12,12^FDMadre: ${data.origen || 'N/A'}^FS

^FO30,220^BQN,2,4^FDQA,${JSON.stringify({ ped: data.pedido, m: data.metraje })}^FS
^FO220,220^BY2,2.5,70^BCN,70,Y,N,N^FD${barcode}^FS

^FO20,360^A0N,12,10^FDFORMATEX — EMPAQUE / EMBARQUES^FS
^XZ`;
  }

  return `^XA
^FO10,10^GB590,380,2^FS
^FO10,10^GB590,50,50^FS
^FO20,18^A0N,30,26^FR^FDFORMATEX^FS
^FO400,18^A0N,20,18^FR^FD${data.fecha || new Date().toLocaleDateString()}^FS

^FO20,75^A0N,24,22^FD${data.codigo}^FS
^FO20,105^A0N,18,16^FD${data.tela}^FS
^FO20,130^A0N,18,16^FD${data.color} | ${data.ancho}m ancho^FS

^FO20,165^GB270,60,60^FS
^FO35,175^A0N,14,12^FR^FDMETRAJE^FS
^FO100,170^A0N,40,36^FR^FD${data.metraje}m^FS

^FO320,165^A0N,18,16^FDUbic: ${data.ubicacion}^FS
^FO320,190^A0N,14,14^FD${data.tipo}^FS

^FO30,250^BQN,2,4^FDQA,${JSON.stringify({ hu: data.codigo, sku: data.sku, m: data.metraje })}^FS
^FO250,250^BY2,2.5,80^BCN,80,Y,N,N^FD${barcode}^FS

^FO20,360^A0N,12,10^FDFORMA TEXTIL S. DE R.L. DE C.V.^FS
^XZ`;
}

/**
 * Generar HTML para impresión en impresora láser (A4/Carta)
 * 4 etiquetas por página
 */
export function generateHTMLLabel(data: LabelData): string {
  if (data.tipo === 'CORTE_CLIENTE') {
    return `
      <div style="width: 95mm; height: 65mm; border: 2px solid #7c3aed; padding: 4mm; font-family: 'Inter', Arial, sans-serif; page-break-inside: avoid; display: inline-block; margin: 3mm; box-sizing: border-box; background: #faf5ff; border-radius: 3mm;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #7c3aed; padding-bottom: 2mm; margin-bottom: 2mm;">
          <div><strong style="font-size: 14px; color: #6b21a8;">FORMATEX</strong><br/><span style="font-size: 8px; color: #7c3aed; font-weight: 800; letter-spacing: 0.5px;">PEDIDO CLIENTE (CORTE)</span></div>
          <div style="text-align: right; font-size: 8px; color: #666;">${data.fecha || new Date().toLocaleDateString()}</div>
        </div>
        <div style="display: flex; gap: 3mm; margin-bottom: 2mm;">
          <div style="flex: 1;">
            <div style="font-size: 15px; font-weight: 900; color: #6b21a8; font-family: monospace;">${data.pedido || data.codigo}</div>
            <div style="font-size: 11px; font-weight: 800; color: #111; line-height: 1.2; margin-top: 1mm;">${data.cliente || 'CLIENTE DIRECTO'}</div>
            <div style="font-size: 10px; margin-top: 1mm; color: #333;"><strong>Tela:</strong> ${data.tela} ${data.color ? '· ' + data.color : ''}</div>
            <div style="font-size: 9px; color: #555;"><strong>SKU:</strong> ${data.sku} · <strong>Ancho:</strong> ${data.ancho}m</div>
          </div>
          <div style="width: 22mm; height: 22mm; border: 1px solid #7c3aed; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #7c3aed; background: #f3e8ff; font-weight: bold; border-radius: 1mm;">QR</div>
        </div>
        <div style="background: #7c3aed; color: #fff; text-align: center; padding: 2mm; border-radius: 2mm; font-size: 22px; font-weight: 900; letter-spacing: 0.5px;">${data.metraje}m SURTIDOS</div>
        <div style="display: flex; justify-content: space-between; margin-top: 2mm; font-size: 9px;">
          <div style="background: #f3e8ff; color: #6b21a8; padding: 1mm 3mm; border-radius: 2mm; font-weight: 800;">📍 ${data.mesa || 'MESA CORTE'} ${data.carrito ? '· ' + data.carrito : ''}</div>
          <div style="background: #e0e7ff; color: #3730a3; padding: 1mm 3mm; border-radius: 2mm; font-weight: 800;">📦 EN PROCESO DE EMPAQUE</div>
        </div>
        ${data.origen ? `<div style="font-size: 7.5px; color: #777; margin-top: 1.5mm; border-top: 1px solid #e9d5ff; padding-top: 1mm;">Rollo Madre: <strong>${data.origen}</strong> | Corte: ${data.codigo}</div>` : ''}
      </div>
    `;
  }

  return `
    <div style="width: 95mm; height: 65mm; border: 1px solid #000; padding: 4mm; font-family: 'Inter', Arial, sans-serif; page-break-inside: avoid; display: inline-block; margin: 3mm; box-sizing: border-box;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 2mm; margin-bottom: 2mm;">
        <div><strong style="font-size: 14px;">FORMATEX</strong><br/><span style="font-size: 8px; color: #666;">WMS 360+</span></div>
        <div style="text-align: right; font-size: 8px; color: #666;">${data.fecha || new Date().toLocaleDateString()}</div>
      </div>
      <div style="display: flex; gap: 3mm; margin-bottom: 2mm;">
        <div style="flex: 1;">
          <div style="font-size: 16px; font-weight: 800; color: #1a3cb8; font-family: monospace;">${data.codigo}</div>
          <div style="font-size: 10px; margin-top: 1mm;"><strong>Tela:</strong> ${data.tela}</div>
          <div style="font-size: 10px;"><strong>SKU:</strong> ${data.sku}</div>
          <div style="font-size: 10px;"><strong>Color:</strong> ${data.color}</div>
          <div style="font-size: 10px;"><strong>Ancho:</strong> ${data.ancho}m</div>
        </div>
        <div style="width: 22mm; height: 22mm; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #999; background: #f5f5f5;">QR</div>
      </div>
      <div style="background: #000; color: #fff; text-align: center; padding: 2mm; border-radius: 2mm; font-size: 20px; font-weight: 900;">${data.metraje}m</div>
      <div style="display: flex; justify-content: space-between; margin-top: 2mm; font-size: 9px;">
        <div style="background: #e0e8ff; color: #1a3cb8; padding: 1mm 3mm; border-radius: 2mm; font-family: monospace; font-weight: 700;">📍 ${data.ubicacion || 'SIN UBICAR'}</div>
        <div style="background: ${data.tipo === 'ENTERO' ? '#d1fae5' : '#ffedd5'}; color: ${data.tipo === 'ENTERO' ? '#065f46' : '#9a3412'}; padding: 1mm 3mm; border-radius: 2mm; font-weight: 700;">${data.tipo}</div>
      </div>
      ${data.tipo === 'RETAZO' && data.origen ? `<div style="font-size: 7px; color: #999; margin-top: 1.5mm; border-top: 1px solid #eee; padding-top: 1mm;">Origen: ${data.origen} | Gen: ${data.generacion || 1}</div>` : ''}
    </div>
  `;
}

export type LabelFormat = '4x6' | '2x1' | '3x2' | 'pdf';

export const LABEL_FORMATS: Record<LabelFormat, { name: string; desc: string; dims: string; printer: string }> = {
  '4x6': { name: 'ZPL 4×6"',  desc: 'Etiqueta estándar rollo', dims: '101.6 × 152.4mm', printer: 'Zebra ZD420/ZD620' },
  '3x2': { name: 'ZPL 3×2"',  desc: 'Etiqueta mediana',        dims: '76.2 × 50.8mm',   printer: 'Zebra LP2844' },
  '2x1': { name: 'ZPL 2×1"',  desc: 'Etiqueta retazos',        dims: '50.8 × 25.4mm',   printer: 'Zebra GK420' },
  'pdf': { name: 'PDF A4',     desc: '4 etiquetas por hoja',    dims: '210 × 297mm',      printer: 'Impresora láser' },
};

export function generateLabel(data: LabelData, format: LabelFormat): string {
  switch (format) {
    case '4x6': return generateZPL4x6(data);
    case '3x2': return generateZPL3x2(data);
    case '2x1': return generateZPL2x1(data);
    case 'pdf': return generateHTMLLabel(data);
  }
}

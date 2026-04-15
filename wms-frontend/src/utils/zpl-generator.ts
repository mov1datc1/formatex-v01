/**
 * ZPL Generator — Genera código ZPL para impresoras Zebra térmicas
 * Formatos: 4x6", 2x1", 3x2"
 */

interface LabelData {
  codigo: string;
  tela: string;
  sku: string;
  color: string;
  metraje: number;
  ancho: number;
  ubicacion: string;
  tipo: 'ENTERO' | 'RETAZO';
  lote?: string;
  barcode?: string;
  fecha?: string;
  origen?: string;
  generacion?: number;
}

/**
 * Etiqueta 4x6" (101.6 x 152.4mm) — Estándar para rollos
 * Zebra ZD420/ZD620 @ 203 DPI
 */
export function generateZPL4x6(data: LabelData): string {
  const barcode = data.barcode || data.codigo;
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
  return `^XA
^FO5,5^A0N,18,16^FD${data.codigo}^FS
^FO5,28^A0N,14,12^FD${data.tela.substring(0, 18)}^FS
^FO280,5^A0N,30,28^FD${data.metraje}m^FS
^FO5,48^BQN,2,2^FDQA,${data.codigo}^FS
^FO120,48^A0N,12,10^FD${data.ubicacion}^FS
^FO120,65^A0N,10,8^FD${data.tipo === 'RETAZO' ? 'RET' : 'ENT'}^FS
^XZ`;
}

/**
 * Etiqueta 3x2" (76.2 x 50.8mm) — Mediana
 * Zebra LP2844 / EPL compatible
 */
export function generateZPL3x2(data: LabelData): string {
  const barcode = data.barcode || data.codigo;
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

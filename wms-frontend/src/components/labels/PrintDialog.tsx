import { useState } from 'react';
import { WmsIcon } from '../icons/WmsIcons';
import { LABEL_FORMATS, generateLabel, generateHTMLLabel, type LabelFormat } from '../../utils/zpl-generator';
import { X, Copy, Check, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

interface PrintDialogProps {
  open: boolean;
  onClose: () => void;
  hus: any[];
}

export default function PrintDialog({ open, onClose, hus }: PrintDialogProps) {
  const [format, setFormat] = useState<LabelFormat>('pdf');
  const [copied, setCopied] = useState(false);

  if (!open || hus.length === 0) return null;

  const labelDataList = hus.map(hu => ({
    codigo: hu.codigo,
    tela: hu.sku?.nombre || '',
    sku: hu.sku?.codigo || '',
    color: hu.sku?.color || '',
    metraje: hu.metrajeActual,
    ancho: hu.anchoMetros || hu.sku?.anchoMetros || 1.5,
    ubicacion: hu.ubicacion?.codigo || 'SIN UBICAR',
    tipo: hu.tipoRollo as 'ENTERO' | 'RETAZO',
    barcode: hu.sku?.codigoBarras || hu.codigo,
    fecha: new Date().toLocaleDateString(),
    origen: hu.parentHu?.codigo,
    generacion: hu.generacion,
  }));

  const handlePrint = () => {
    if (format === 'pdf') {
      // HTML print via iframe
      const htmlLabels = labelDataList.map(d => generateHTMLLabel(d)).join('');
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) return toast.error('Habilita los popups para imprimir');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html><head>
          <title>Etiquetas Formatex WMS 360+</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
          <style>
            body { margin: 10mm; font-family: 'Inter', Arial, sans-serif; }
            @media print {
              body { margin: 5mm; }
              @page { size: A4; margin: 10mm; }
            }
          </style>
        </head><body>
          <div style="display: flex; flex-wrap: wrap; gap: 0;">
            ${htmlLabels}
          </div>
          <script>window.onload = () => { window.print(); }</script>
        </body></html>
      `);
      printWindow.document.close();
      toast.success(`Imprimiendo ${labelDataList.length} etiqueta(s) en formato PDF`);
    } else {
      // ZPL — copy to clipboard
      const zplAll = labelDataList.map(d => generateLabel(d, format)).join('\n');
      navigator.clipboard.writeText(zplAll);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast.success(`ZPL copiado al portapapeles — ${labelDataList.length} etiqueta(s) en formato ${LABEL_FORMATS[format].name}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <WmsIcon.Print className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Imprimir Etiquetas</h2>
              <p className="text-xs text-gray-400">{hus.length} etiqueta(s) seleccionada(s)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        {/* Format selector */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-3 block">Formato de Impresión</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(LABEL_FORMATS) as [LabelFormat, typeof LABEL_FORMATS[LabelFormat]][]).map(([key, fmt]) => (
                <button
                  key={key}
                  onClick={() => setFormat(key)}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    format === key ? 'border-primary-500 bg-primary-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <p className="font-semibold text-sm">{fmt.name}</p>
                  <p className="text-xs text-gray-500">{fmt.desc}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{fmt.dims} · {fmt.printer}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Preview info */}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Vista previa:</p>
            <div className="space-y-1">
              {labelDataList.slice(0, 3).map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-primary-600">{d.codigo}</span>
                  <span className="text-gray-500">{d.tela} · {d.metraje}m · {d.tipo}</span>
                </div>
              ))}
              {labelDataList.length > 3 && <p className="text-xs text-gray-400 italic">...y {labelDataList.length - 3} más</p>}
            </div>
          </div>

          {/* ZPL note */}
          {format !== 'pdf' && (
            <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700">
              <p className="font-medium mb-1">Impresora Térmica (ZPL)</p>
              <p>El código ZPL se copiará al portapapeles. Envíalo al puerto de la impresora Zebra con:</p>
              <code className="block mt-1 bg-amber-100 rounded px-2 py-1 font-mono text-[10px]">copy etiqueta.zpl /dev/usb/lp0</code>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-xl font-medium">Cancelar</button>
          <button onClick={handlePrint} className="flex-1 px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 text-sm font-medium flex items-center justify-center gap-2 shadow-sm">
            {format === 'pdf' ? (
              <><Printer size={16} /> Imprimir PDF</>
            ) : copied ? (
              <><Check size={16} /> Copiado!</>
            ) : (
              <><Copy size={16} /> Copiar ZPL</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

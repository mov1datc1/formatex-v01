import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../config/api';
import toast from 'react-hot-toast';
import { WmsIcon, KpiIcon } from '../../components/icons/WmsIcons';
import { ArrowRight, X, FileText, Printer } from 'lucide-react';

export default function EnvioPage() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [transportista, setTransportista] = useState('');
  const [guia, setGuia] = useState('');
  const [notas, setNotas] = useState('');
  const [firmaRecibido, setFirmaRecibido] = useState(false);

  const { data: orders, refetch } = useApi<any[]>(['shipping-orders'], '/orders', { estado: 'FACTURADO', limit: 20 });

  const loadDetail = async (orderId: string) => {
    try {
      const resp = await api.get(`/orders/${orderId}`);
      setSelectedOrder(resp.data);
    } catch { toast.error('Error al cargar pedido'); }
  };

  const dispatch = async () => {
    if (!selectedOrder) return;
    if (!transportista) return toast.error('Ingresa el transportista');
    try {
      await api.put(`/orders/${selectedOrder.id}/status`, { estado: 'DESPACHADO' });
      toast.success('Pedido DESPACHADO exitosamente');
      setSelectedOrder(null);
      setTransportista('');
      setGuia('');
      setNotas('');
      setFirmaRecibido(false);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al despachar');
    }
  };

  const printSalida = () => {
    if (!selectedOrder) return;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return toast.error('Habilita los popups');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head>
        <title>Hoja de Salida — ${selectedOrder.codigo}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; margin: 20mm; color: #333; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .header { border-bottom: 2px solid #1a3cb8; padding-bottom: 8px; margin-bottom: 16px; }
          .brand { color: #1a3cb8; font-weight: 800; font-size: 22px; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; font-size: 12px; }
          th { background: #f5f5f5; font-weight: 600; }
          .totals { text-align: right; margin-top: 16px; }
          .totals .total { font-size: 18px; font-weight: 800; color: #059669; }
          .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
          .sig-box { width: 200px; text-align: center; border-top: 1px solid #333; padding-top: 8px; font-size: 11px; }
          @media print { @page { size: A4; margin: 15mm; } }
        </style>
      </head><body>
        <div class="header">
          <span class="brand">FORMATEX</span> — WMS 360+
          <div style="float: right; font-size: 12px; color: #666;">FORMA TEXTIL S. DE R.L. DE C.V.</div>
        </div>
        <h1>HOJA DE SALIDA</h1>
        <p style="font-size: 12px; color: #666;">Folio: <strong>${selectedOrder.codigo}</strong> · Fecha: ${new Date().toLocaleDateString()} · ${transportista ? `Transportista: ${transportista}` : ''} ${guia ? `· Guía: ${guia}` : ''}</p>
        <table>
          <thead>
            <tr>
              <th>Tela / SKU</th>
              <th>Color</th>
              <th>Mts Solicitados</th>
              <th>Mts Surtidos</th>
              <th>Precio/m</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
            ${selectedOrder.lineas?.map((l: any) => `
              <tr>
                <td>${l.sku?.nombre || '—'}<br/><small style="color: #999;">${l.sku?.codigo || ''}</small></td>
                <td>${l.sku?.color || '—'}</td>
                <td>${l.metrajeRequerido}m</td>
                <td><strong>${l.metrajeSurtido}m</strong></td>
                <td>$${Number(l.precioUnitario || 0).toFixed(2)}</td>
                <td>$${Number(l.importe || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="totals">
          <p>Subtotal: $${Number(selectedOrder.subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          <p>IVA 16%: $${Number(selectedOrder.iva || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          <p class="total">Total: $${Number(selectedOrder.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        </div>
        ${notas ? `<p style="margin-top: 16px; font-size: 11px; color: #666;">Notas: ${notas}</p>` : ''}
        <div class="signatures">
          <div class="sig-box">Entregó (Almacén)</div>
          <div class="sig-box">Recibió (Transportista)</div>
          <div class="sig-box">Autorizó</div>
        </div>
        <script>window.onload = () => { window.print(); }</script>
      </body></html>
    `);
    printWindow.document.close();
    toast.success('Imprimiendo hoja de salida');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <KpiIcon icon={WmsIcon.Shipping} gradient="from-gray-700 to-gray-900" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Envío / Despacho</h1>
          <p className="text-gray-500 text-sm">Registrar transportista, guía, y despachar pedidos facturados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order list */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="font-semibold text-sm text-gray-600">Facturados ({orders?.length || 0})</h2>
          {!orders?.length ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
              <WmsIcon.Shipping size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No hay pedidos para despachar</p>
            </div>
          ) : orders.map((o: any) => (
            <button key={o.id} onClick={() => loadDetail(o.id)} className={`w-full text-left bg-white rounded-xl border p-4 hover:shadow-md transition-all ${selectedOrder?.id === o.id ? 'border-gray-400 ring-1 ring-gray-300' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-semibold text-emerald-600">{o.codigo}</span>
                <ArrowRight size={16} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-700 mt-1">{o.client?.nombre}</p>
              <p className="text-xs text-gray-400">${Number(o.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          {!selectedOrder ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
              <WmsIcon.Shipping size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-500">Selecciona un pedido para despachar</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border p-6 space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedOrder.codigo}</h2>
                  <p className="text-sm text-gray-600">{selectedOrder.client?.nombre}</p>
                  {selectedOrder.facturaRef && (
                    <div className="flex items-center gap-1 mt-1">
                      <FileText size={12} className="text-emerald-500" />
                      <span className="text-xs text-emerald-600 font-medium">Factura: {selectedOrder.facturaRef}</span>
                    </div>
                  )}
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500">Líneas</p>
                    <p className="text-lg font-bold">{selectedOrder.lineas?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Metros Totales</p>
                    <p className="text-lg font-bold text-blue-600">{selectedOrder.lineas?.reduce((a: number, l: any) => a + (l.metrajeSurtido || 0), 0)}m</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-lg font-bold text-emerald-600">${Number(selectedOrder.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>

              {/* Transport info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Transportista / Courier *</label>
                  <input value={transportista} onChange={e => setTransportista(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm" placeholder="Estafeta, DHL, Propio..." />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Guía / Tracking</label>
                  <input value={guia} onChange={e => setGuia(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm" placeholder="Número de guía..." />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Notas de envío</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} className="w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm" placeholder="Instrucciones especiales..." />
              </div>

              {/* Confirmation */}
              <label className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl cursor-pointer">
                <input type="checkbox" checked={firmaRecibido} onChange={e => setFirmaRecibido(e.target.checked)} className="w-5 h-5 rounded" />
                <span className="text-sm text-amber-700">Confirmo que la mercancía fue verificada y está completa</span>
              </label>

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={printSalida} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 flex items-center justify-center gap-2">
                  <Printer size={16} /> Hoja de Salida
                </button>
                <button onClick={dispatch} disabled={!firmaRecibido || !transportista} className="flex-1 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl font-semibold text-sm disabled:opacity-40 hover:shadow-lg transition-all flex items-center justify-center gap-2 shadow-sm">
                  <WmsIcon.Dispatched size={18} />
                  Despachar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

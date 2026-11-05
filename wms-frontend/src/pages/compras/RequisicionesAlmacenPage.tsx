import { Building2 } from 'lucide-react';
import { KpiIcon } from '../../components/icons/WmsIcons';
import RequisicionesTelaresTab from './RequisicionesTelaresTab';

export default function RequisicionesAlmacenPage() {
  return (
    <div className="space-y-6 animate-fade-in pb-12 text-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <KpiIcon icon={Building2} gradient="from-slate-800 to-indigo-950" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Requisiciones a Telares &amp; Monitor de Backorders
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                Jefe de Almacén
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-0.5">
              Monitoreo de pedidos en Backorder vs. stock local y emisión de Orden de Compra PDF (STO) para la encargada de Telares y Tejidos.
            </p>
          </div>
        </div>
      </div>

      <RequisicionesTelaresTab />
    </div>
  );
}

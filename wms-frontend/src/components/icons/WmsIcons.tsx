/**
 * WMS 360+ Formatex — Professional Icon System
 * ============================================
 * SVG icons that match the WMS design system palette.
 * All icons use currentColor for flexibility with tailwind text-* classes.
 * 
 * Usage: <WmsIcon.Rolls className="w-5 h-5 text-primary-500" />
 */
import {
  Package, Scissors, Truck, ClipboardList, ScanBarcode, Tag,
  ArrowDownToLine, ArrowUpFromLine, Search, Ship, Wallet,
  CheckCircle2, CircleDollarSign, PackageCheck, FileText,
  Layers, BarChart3, MapPin, ShieldCheck, Printer,
  Ruler, Timer, Lock, LockOpen, Ban, TrendingUp,
  Boxes, SquareStack, Box, Scroll, Warehouse, Clock,
  type LucideProps,
} from 'lucide-react';
import type { FC } from 'react';

/* ------------------------------------------------------------------ */
/*  Re‑export Lucide icons with semantic naming for the WMS domain    */
/* ------------------------------------------------------------------ */
export const WmsIcon = {
  // ─── Core inventory ────────────────────────────────────────────
  Rolls:        Scroll,
  Remnant:      Scissors,
  HU:           Box,
  Stock:        Boxes,
  Location:     MapPin,
  Warehouse:    Warehouse,
  Layers:       Layers,

  // ─── Operations ────────────────────────────────────────────────
  Reception:    ArrowDownToLine,
  Dispatch:     ArrowUpFromLine,
  Picking:      Package,
  Cut:          Scissors,
  Packing:      PackageCheck,
  Shipping:     Truck,
  Scan:         ScanBarcode,
  Label:        Tag,
  Print:        Printer,

  // ─── Order pipeline ────────────────────────────────────────────
  Quote:        ClipboardList,
  Payment:      Wallet,
  PayReceived:  CheckCircle2,
  ToFulfill:    Package,
  InFulfill:    SquareStack,
  InCut:        Scissors,
  Packed:       PackageCheck,
  Invoiced:     FileText,
  Dispatched:   Truck,

  // ─── Financial / Status ────────────────────────────────────────
  Dollar:       CircleDollarSign,
  Locked:       Lock,
  Unlocked:     LockOpen,
  Cancelled:    Ban,
  Timer:        Timer,
  Clock:        Clock,
  Verified:     ShieldCheck,
  Search:       Search,
  Transit:      Ship,
  Trend:        TrendingUp,
  Chart:        BarChart3,
  Ruler:        Ruler,
} as const;

/* ------------------------------------------------------------------ */
/*  KPI Card Icon — rounded container with gradient background         */
/* ------------------------------------------------------------------ */
interface KpiIconProps {
  icon: FC<LucideProps>;
  gradient: string; // e.g. "from-blue-500 to-blue-600"
  className?: string;
}

export function KpiIcon({ icon: Icon, gradient, className = '' }: KpiIconProps) {
  return (
    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg shadow-black/10 ${className}`}>
      <Icon className="w-5 h-5 text-white" strokeWidth={1.75} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pipeline Stage Icon — colored badge with icon                      */
/* ------------------------------------------------------------------ */
interface PipelineIconProps {
  icon: FC<LucideProps>;
  bgClass: string;     // e.g. "bg-amber-100"
  iconClass: string;   // e.g. "text-amber-600"
  size?: number;
}

export function PipelineIcon({ icon: Icon, bgClass, iconClass, size = 28 }: PipelineIconProps) {
  return (
    <div className={`w-9 h-9 rounded-lg ${bgClass} flex items-center justify-center`}>
      <Icon className={`${iconClass}`} size={size} strokeWidth={1.75} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Status Badge — inline icon + text for order/HU statuses            */
/* ------------------------------------------------------------------ */
interface StatusBadgeProps {
  icon: FC<LucideProps>;
  label: string;
  bgClass: string;
  textClass: string;
}

export function StatusBadge({ icon: Icon, label, bgClass, textClass }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bgClass} ${textClass}`}>
      <Icon size={13} strokeWidth={2} />
      {label}
    </span>
  );
}

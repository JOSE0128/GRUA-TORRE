import React from 'react';
import { AlertCircle, CheckCircle2, HelpCircle, ShoppingCart, Slash } from 'lucide-react';
import { DataStatus } from '../types/crane';

interface StatusChipProps {
  status: DataStatus;
  className?: string;
}

const STYLE_MAP: Record<DataStatus, string> = {
  CONFIRMADO: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/35',
  'POR CONFIRMAR': 'bg-amber-400/15 text-amber-300 border-amber-400/50',
  PROPUESTO: 'bg-sky-500/15 text-sky-300 border-sky-400/40',
  'POR COMPRAR': 'bg-rose-500/15 text-rose-300 border-rose-500/45',
  'NO USADO': 'bg-slate-800/80 text-slate-300 border-slate-600/50',
  'POR DEFINIR': 'bg-violet-500/15 text-violet-300 border-violet-400/40',
};

function getIcon(status: DataStatus) {
  switch (status) {
    case 'CONFIRMADO':
      return <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />;
    case 'POR CONFIRMAR':
      return <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />;
    case 'POR COMPRAR':
      return <ShoppingCart className="w-3 h-3 shrink-0" aria-hidden="true" />;
    case 'NO USADO':
      return <Slash className="w-3 h-3 shrink-0" aria-hidden="true" />;
    default:
      return <HelpCircle className="w-3 h-3 shrink-0" aria-hidden="true" />;
  }
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide border whitespace-nowrap shrink-0 ${STYLE_MAP[status]} ${className}`}
    >
      {getIcon(status)}
      <span>{status}</span>
    </span>
  );
};

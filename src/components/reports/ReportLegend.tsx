import React from 'react';
import { cn } from '@/lib/utils';

export const REPORT_LEGEND = [
  { 
    label: 'Zona Vermelha',
    range: '0% a 39.99%',
    description: 'Risco elevado: ação corretiva imediata.',
    min: 0, 
    max: 40,
    color: 'bg-red-500',
    textColor: 'text-red-700',
    borderColor: 'border-red-500',
    bgColor: 'bg-red-50',
  },
  { 
    label: 'Zona Amarela', 
    range: '40% a 74.99%',
    description: 'Atenção: possível risco psicossocial; revisar práticas.',
    min: 40, 
    max: 75,
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-500',
    bgColor: 'bg-yellow-50',
  },
  { 
    label: 'Zona Verde', 
    range: '75% a 100%',
    description: 'Ambiente psicossocial satisfatório: manter boas práticas.',
    min: 75, 
    max: 100,
    color: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-500',
    bgColor: 'bg-emerald-50',
  },
];

const ReportLegend = ({ horizontal = false }: { horizontal?: boolean }) => {
  if (horizontal) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
        {REPORT_LEGEND.map((item) => (
          <div key={item.label} className={cn('p-4 rounded-lg border', item.borderColor, item.bgColor)}>
            <div className="flex items-center gap-2">
              <div className={cn('h-3 w-3 rounded-sm shrink-0', item.color)} />
              <h4 className={cn('font-semibold', item.textColor)}>{item.label} <span className="font-normal">({item.range})</span></h4>
            </div>
            <p className={cn('text-sm mt-2', item.textColor)}>{item.description}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {REPORT_LEGEND.map((item) => (
        <div key={item.label} className={cn('p-4 rounded-lg border', item.borderColor, item.bgColor)}>
          <div className="flex items-start gap-3">
            <div className={cn('h-3 w-3 mt-1.5 rounded-sm shrink-0', item.color)} />
            <div>
              <h4 className={cn('font-semibold', item.textColor)}>{item.label}</h4>
              <p className={cn('text-sm font-semibold', item.textColor)}>({item.range})</p>
            </div>
          </div>
          <p className={cn('text-sm mt-2', item.textColor)}>{item.description}</p>
        </div>
      ))}
    </div>
  );
};

export default ReportLegend;
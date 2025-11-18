import React from 'react';
import { cn } from '@/lib/utils';

interface ResponseDistributionChartProps {
  distribution: {
    favorable: number;
    neutral: number;
    unfavorable: number;
  };
}

const ResponseDistributionChart = ({ distribution }: ResponseDistributionChartProps) => {
  const { favorable, neutral, unfavorable } = distribution;

  // Ordem corrigida para corresponder à exibição visual (verde, amarelo, vermelho)
  const segments = [
    { value: favorable, color: 'bg-emerald-500', label: 'Favorável' },
    { value: neutral, color: 'bg-yellow-400', label: 'Neutro' },
    { value: unfavorable, color: 'bg-red-500', label: 'Desfavorável' },
  ];

  const formatPercentage = (value: number) => {
    const fixed = value.toFixed(1);
    if (fixed.endsWith('.0')) {
      return `${value.toFixed(0)}%`;
    }
    return `${fixed}%`;
  };

  return (
    <div className="w-full">
      <div className="flex w-full h-6 rounded-md overflow-hidden text-white text-sm font-bold border">
        {segments.map((segment, index) => (
          segment.value > 0 && (
            <div
              key={index}
              className={cn('flex items-center justify-center', segment.color)}
              style={{ width: `${segment.value}%` }}
              title={`${segment.label}: ${segment.value.toFixed(1)}%`}
            >
              {segment.value > 5 && formatPercentage(segment.value)}
            </div>
          )
        ))}
      </div>
    </div>
  );
};

export default ResponseDistributionChart;
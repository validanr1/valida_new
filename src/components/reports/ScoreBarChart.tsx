import React from 'react';
import { cn } from '@/lib/utils';
import { REPORT_LEGEND } from './ReportLegend';

type ScoreBarChartProps = {
  score: number;
};

const ScoreBarChart = ({ score }: ScoreBarChartProps) => {
  const sortedLegend = [...REPORT_LEGEND].sort((a, b) => a.min - b.min);

  // Normaliza score: aceita 0–1 ou 0–100
  let s = Number.isFinite(score) ? Number(score) : 0;
  if (s <= 1) s = s * 100; // casos em que vem 0..1
  s = Math.max(0, Math.min(100, s));

  const scoreColor = sortedLegend.find(item => s >= item.min && s < item.max) || REPORT_LEGEND.find(l => l.max === 100);
  const indicatorColorClass = scoreColor?.color || 'bg-gray-400';

  return (
    <div className="w-full py-2">
      <div className="relative h-2.5 w-full rounded-full overflow-hidden bg-muted">
        <div
          className={cn("h-full transition-all duration-300", indicatorColorClass)}
          style={{ width: `${s}%` }}
        />
        {/* Indicador na borda do preenchimento */}
        <div
          className="absolute top-1/2 h-4 w-1"
          style={{ left: `${s}%`, transform: `translate(-50%, -50%)` }}
        >
          <div className={cn("h-full w-full rounded-full ring-2 ring-background", indicatorColorClass)} />
        </div>
      </div>
    </div>
  );
};

export default ScoreBarChart;
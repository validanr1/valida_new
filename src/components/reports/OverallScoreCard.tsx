import React from 'react';
import { Card } from '@/components/ui/card';
import { Gauge } from 'lucide-react';
import { REPORT_LEGEND } from './ReportLegend';

interface OverallScoreCardProps {
  score: number | null;
  loading: boolean;
}

const getScoreColor = (score: number) => {
  const category = REPORT_LEGEND.find(item => score >= item.min && score < item.max) || REPORT_LEGEND.find(l => l.max === 100);
  return category ? category.textColor : 'text-muted-foreground';
};

const OverallScoreCard = ({ score, loading }: OverallScoreCardProps) => {
  const displayScore = typeof score === 'number' ? score.toFixed(1) : '—';
  const scoreColorClass = typeof score === 'number' ? getScoreColor(score) : 'text-muted-foreground';

  return (
    <Card className="p-6 flex items-center justify-between">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground">Média Geral da Empresa</h3>
        {loading ? (
          <div className="text-3xl font-bold mt-2">Carregando...</div>
        ) : (
          <div className={`text-5xl font-extrabold mt-2 ${scoreColorClass}`}>
            {displayScore}%
          </div>
        )}
      </div>
      <Gauge className={`h-12 w-12 ${scoreColorClass}`} />
    </Card>
  );
};

export default OverallScoreCard;
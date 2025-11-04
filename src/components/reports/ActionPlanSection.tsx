import React from 'react';
import { Card } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

interface ActionPlanSectionProps {
  actionPlanText: string;
  loading: boolean;
}

const ActionPlanSection = ({ actionPlanText, loading }: ActionPlanSectionProps) => {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Lightbulb className="h-6 w-6 text-blue-500" />
        <h3 className="text-xl font-semibold">Plano de Ação Sugerido</h3>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Gerando plano de ação...</p>
      ) : (
        <p className="text-muted-foreground whitespace-pre-wrap">{actionPlanText}</p>
      )}
    </Card>
  );
};

export default ActionPlanSection;
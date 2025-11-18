import React from 'react';
import { Card } from '@/components/ui/card';
import { Folder, Briefcase, Users, MessageSquare, Shield, Heart, Brain, Activity, ClipboardList, Star, Building2, Clock3, Repeat, Settings } from 'lucide-react';
import { REPORT_LEGEND } from './ReportLegend';
import { cn } from '@/lib/utils';

interface CategoryIndicatorProps {
  categoryName: string;
  averageScore: number;
  description?: string;
}

const getBgClasses = (score: number) => {
  if (score < 40) return { bg: 'bg-red-500', text: 'text-white' };
  if (score < 75) return { bg: 'bg-yellow-400', text: 'text-white' };
  return { bg: 'bg-emerald-500', text: 'text-white' };
};

const getScoreLabelDetails = (score: number) => {
  const legendItem = REPORT_LEGEND.find(item => score < item.max);
  if (legendItem?.label === 'Zona Vermelha') return { text: 'Desfavorável', color: 'text-red-500', emoji: '🔴' };
  if (legendItem?.label === 'Zona Amarela') return { text: 'Neutro', color: 'text-yellow-400', emoji: '🟡' };
  if (legendItem?.label === 'Zona Verde') return { text: 'Favorável', color: 'text-emerald-500', emoji: '🟢' };
  // Fallback for score === 100
  if (score === 100) return { text: 'Favorável', color: 'text-emerald-500', emoji: '🟢' };
  return null;
};

const getCategoryIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('demanda') || n.includes('pressão') || n.includes('carga')) return Activity;
  if (n.includes('autonomia') || n.includes('controle')) return Settings;
  if (n.includes('chefia') || n.includes('gestão') || n.includes('lider')) return Briefcase;
  if (n.includes('colega') || n.includes('apoio dos colegas') || n.includes('equipe') || n.includes('time')) return Users;
  if (n.includes('relacionamento')) return Heart;
  if (n.includes('clareza') || n.includes('papéis') || n.includes('responsabil')) return ClipboardList;
  if (n.includes('comunicação') || n.includes('mudança')) return Repeat;
  if (n.includes('ambiente') || n.includes('físico')) return Building2;
  if (n.includes('jornada') || n.includes('tempo') || n.includes('horário')) return Clock3;
  if (n.includes('reconhecimento') || n.includes('mérito')) return Star;
  if (n.includes('segurança') || n.includes('proteção')) return Shield;
  if (n.includes('saúde') || n.includes('mental')) return Brain;
  return Folder;
};

const CategoryIndicator = ({ categoryName, averageScore, description }: CategoryIndicatorProps) => {
  const { bg, text } = getBgClasses(averageScore);
  const labelDetails = getScoreLabelDetails(averageScore);

  const Icon = getCategoryIcon(categoryName);
  return (
    <Card className={cn("relative overflow-hidden p-4 rounded-xl border-0 shadow-sm", bg)}>
      <Icon className="absolute right-2 top-2 h-6 w-6 opacity-70 text-white" />
      <div className="relative z-10">
        <h4 className={cn("text-xs font-semibold uppercase tracking-wide", text)}>{categoryName}</h4>
        <div className={cn("mt-2 text-3xl font-extrabold", text)}>{averageScore.toFixed(1)}%</div>
        {labelDetails && (
          <div className={cn("mt-1 text-sm font-medium text-white")}>{labelDetails.text}</div>
        )}
      </div>
    </Card>
  );
};

interface CategoryIndicatorsProps {
  categories: Array<{
    id: string;
    name: string;
    description?: string;
    averageScore: number;
  }>;
  loading: boolean;
}

const CategoryIndicators = ({ categories, loading }: CategoryIndicatorsProps) => {
  if (loading) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        Carregando indicadores por categoria...
      </Card>
    );
  }

  if (categories.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        Nenhum indicador por categoria disponível.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Indicadores por Categoria</h3>
      <div className="grid gap-4 md:grid-cols-3">
        {categories.map((cat) => (
          <CategoryIndicator
            key={cat.id}
            categoryName={cat.name}
            averageScore={cat.averageScore}
            description={cat.description}
          />
        ))}
      </div>
    </div>
  );
};

export default CategoryIndicators;
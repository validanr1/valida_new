import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ResponseDistributionChart from './ResponseDistributionChart';
import ReportLegend from './ReportLegend';

interface ProcessedQuestion {
  id: string;
  text: string;
  responseDistribution: {
    favorable: number;
    neutral: number;
    unfavorable: number;
  };
}

interface ProcessedCategory {
  id: string;
  name: string;
  questions: ProcessedQuestion[];
}

type QuestionIndicatorsProps = {
  categories: ProcessedCategory[];
  loading: boolean;
};

const QuestionIndicators = ({ categories, loading }: QuestionIndicatorsProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resultado das Avaliações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando indicadores...</p>
        </CardContent>
      </Card>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resultado das Avaliações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nenhum indicador por pergunta disponível.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultado das Avaliações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-10">
        {categories.map(category => (
          <div key={category.id}>
            <h3 className="text-xl font-semibold mb-6 border-b pb-3">{category.name}</h3>
            <div className="space-y-5 py-4">
              {category.questions.map((q) => (
                <div key={q.id} className="grid grid-cols-1 md:grid-cols-12 items-center gap-x-6 gap-y-2">
                  <p className="col-span-1 md:col-span-6 text-sm text-muted-foreground md:text-right">{q.text}</p>
                  <div className="col-span-1 md:col-span-6">
                    <ResponseDistributionChart distribution={q.responseDistribution} />
                    <div className="text-xs text-muted-foreground mt-1 text-right pr-2">
                      F: {q.responseDistribution.favorable.toFixed(1)}% | N: {q.responseDistribution.neutral.toFixed(1)}% | D: {q.responseDistribution.unfavorable.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <ReportLegend horizontal />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default QuestionIndicators;
import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Printer, FileText } from 'lucide-react'; // Add FileText

interface ReportActionsProps {
  onSave: () => void;
  onGeneratePdf: () => void;
  onOpenNewTemplate?: () => void; // Open /partner/reports/new_template
  loading: boolean;
}

const ReportActions = ({ onSave, onGeneratePdf, onOpenNewTemplate, loading }: ReportActionsProps) => {

  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={onSave} disabled={loading}>
        <Save className="mr-2 h-4 w-4" /> Salvar Relatório
      </Button>
      <Button variant="secondary" onClick={onGeneratePdf} disabled={loading}>
        <Printer className="mr-2 h-4 w-4" /> Gerar PDF
      </Button>
      {onOpenNewTemplate && (
        <Button variant="outline" onClick={onOpenNewTemplate} disabled={loading}>
          <FileText className="mr-2 h-4 w-4" /> Versão Completa
        </Button>
      )}
    </div>
  );
};

export default ReportActions;
import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, FileText } from 'lucide-react';

interface ReportActionsProps {
  onSave: () => void;
  onOpenNewTemplate?: () => void;
  loading: boolean;
}

const ReportActions = ({ onSave, onOpenNewTemplate, loading }: ReportActionsProps) => {

  return (
    <div className="flex flex-wrap gap-3 justify-end">
      <Button onClick={onSave} disabled={loading}>
        <Save className="mr-2 h-4 w-4" /> Salvar Relatório
      </Button>
      {onOpenNewTemplate && (
        <Button 
          onClick={onOpenNewTemplate} 
          disabled={loading}
          className="bg-[#1B365D] hover:bg-[#152a4a] text-white"
        >
          <FileText className="mr-2 h-4 w-4" /> Relatório Geral
        </Button>
      )}
    </div>
  );
};

export default ReportActions;
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Building2, Plus } from 'lucide-react';

const NoCompanySelected = () => {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4">
      <Card className="w-full max-w-lg p-8 text-center space-y-4">
        <Building2 className="h-16 w-16 text-muted-foreground mx-auto" />
        <h2 className="text-2xl font-bold">Nenhuma Empresa Selecionada</h2>
        <p className="text-muted-foreground">
          Parece que você não tem uma empresa selecionada ou cadastrada.
          Para começar a usar a plataforma, por favor, adicione sua primeira empresa.
        </p>
        <Link to="/partner/empresas">
          <Button className="mt-4">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Empresa
          </Button>
        </Link>
      </Card>
    </div>
  );
};

export default NoCompanySelected;
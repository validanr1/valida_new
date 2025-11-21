import { Card } from "@/components/ui/card";
import { Pencil, Trash2, Building2, CheckCircle2, MousePointerClick } from "lucide-react";

type Props = {
  selected?: boolean;
  name: string;
  cnpj?: string;
  responsibleName?: string;
  responsibleEmail?: string;
  responsiblePosition?: string; // Cargo do responsável
  cnae?: string;
  riskGradeName?: string;
  templateAcronym?: string;
  templateName?: string;
  assessmentQuota?: number; // Cota de avaliações
  usedAssessments?: number; // Avaliações usadas
  onEdit: () => void;
  onDelete: () => void;
  onSelect: () => void;
};

const CompanyCard = ({
  selected,
  name,
  cnpj,
  responsibleName,
  responsibleEmail,
  responsiblePosition,
  cnae,
  riskGradeName,
  templateAcronym,
  templateName,
  assessmentQuota,
  usedAssessments,
  onEdit,
  onDelete,
  onSelect,
}: Props) => {
  return (
    <Card
      onClick={onSelect}
      className={[
        "group relative flex h-full flex-col justify-between rounded-2xl border transition-all duration-300 cursor-pointer",
        selected
          ? "border-teal-600 bg-teal-50/40 shadow-md ring-1 ring-teal-600/20"
          : "border-zinc-200 bg-white hover:border-teal-300 hover:shadow-lg hover:-translate-y-1",
        "p-5",
      ].join(" ")}
    >
      {/* Badge Selecionar no Hover */}
      {!selected && (
        <div className="absolute top-4 right-4 z-10 opacity-0 transform translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm">
            <MousePointerClick className="h-3.5 w-3.5" />
            Selecionar
          </span>
        </div>
      )}

      {/* Badge Selecionado Moderno */}
      {selected && (
        <div className="absolute top-4 right-4 z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm animate-in fade-in zoom-in duration-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Selecionada
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 w-full">
          <div className="flex items-center gap-2 pr-24">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${selected ? 'bg-teal-100 text-teal-700' : 'bg-zinc-100 text-zinc-500 group-hover:bg-teal-50 group-hover:text-teal-600'} transition-colors`}>
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className={`text-lg font-semibold truncate ${selected ? 'text-teal-900' : 'text-zinc-900'}`} title={name}>
                {name}
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <span className="truncate">CNPJ: {cnpj || "—"}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {templateAcronym && (
                <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 border border-zinc-200">
                  {templateAcronym}
                </span>
              )}
              {riskGradeName && (
                <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 border border-zinc-200">
                  {riskGradeName}
                </span>
              )}
            </div>

            {/* Informações do Responsável */}
            {(responsibleName || responsibleEmail || responsiblePosition) && (
              <div className="rounded-lg bg-zinc-50/80 p-3 text-sm border border-zinc-100">
                <div className="font-medium text-zinc-700 mb-1">Responsável</div>
                {responsibleName && <div className="text-zinc-600 truncate">{responsibleName}</div>}
                {responsiblePosition && <div className="text-xs text-zinc-500 truncate">{responsiblePosition}</div>}
                {responsibleEmail && <div className="text-xs text-zinc-400 truncate">{responsibleEmail}</div>}
              </div>
            )}

            {/* Cota de Avaliações */}
            {typeof assessmentQuota === 'number' && assessmentQuota > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Avaliações utilizadas</span>
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${usedAssessments && usedAssessments >= assessmentQuota ? 'text-red-600' : 'text-zinc-700'}`}>
                    {usedAssessments || 0} / {assessmentQuota}
                  </span>
                  {usedAssessments && usedAssessments >= assessmentQuota && (
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" title="Cota atingida" />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-zinc-100 flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-white border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors shadow-sm"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-zinc-200 text-zinc-400 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors shadow-sm"
          title="Excluir"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
};

export default CompanyCard;
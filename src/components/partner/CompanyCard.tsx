import { Card } from "@/components/ui/card";
import { Pencil, Trash2, Building2 } from "lucide-react";

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
};

const Badge = ({ label }: { label?: string }) => {
  if (!label) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
      {label}
    </span>
  );
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
}: Props) => {
  return (
    <Card
      className={[
        "relative flex h-full flex-col justify-between rounded-2xl border",
        selected ? "border-teal-600 shadow-[0_0_0_3px_rgba(13,148,136,0.25)]" : "border-zinc-200",
        "bg-white p-5",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-zinc-700" />
            <div className="text-lg font-semibold text-zinc-900">{name}</div>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-zinc-500">
            <span>CNPJ: {cnpj || "—"}</span>
            {templateAcronym ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-bold text-white">
                {templateAcronym}
              </span>
            ) : <span />}
          </div>
          
          {/* Informações do Responsável */}
          {(responsibleName || responsibleEmail || responsiblePosition) && (
            <div className="mt-3 text-sm text-zinc-600">
              <div className="font-medium text-zinc-700">Responsável:</div>
              {responsibleName && <div>{responsibleName}</div>}
              {responsiblePosition && <div className="text-xs text-zinc-500">{responsiblePosition}</div>}
              {responsibleEmail && <div className="text-xs text-zinc-500">{responsibleEmail}</div>}
            </div>
          )}
          
          {/* Cota de Avaliações */}
          {typeof assessmentQuota === 'number' && assessmentQuota > 0 && (
            <div className="mt-2 text-xs text-zinc-600">
              <span className="font-medium">Avaliações:</span> {usedAssessments || 0} / {assessmentQuota}
              {usedAssessments >= assessmentQuota && (
                <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                  Cota atingida
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200"
        >
          <Pencil className="h-4 w-4" />
          Editar
        </button>
        <button
          onClick={onDelete}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100"
          title="Excluir"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
};

export default CompanyCard;
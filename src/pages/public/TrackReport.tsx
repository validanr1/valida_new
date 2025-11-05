import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Search, Clock, CheckCircle2, XCircle, AlertCircle, FileText, Calendar } from "lucide-react";

type Report = {
  id: string;
  title?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

type Comment = {
  id: string;
  comment?: string;
  status_changed_to?: string;
  created_at?: string;
};

const TrackReport = () => {
  const [protocol, setProtocol] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fmtDate = (iso?: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const fmtStatusPtBR = (s?: string) => {
    if (!s) return "—";
    const map: Record<string, string> = {
      open: "Aberta",
      in_progress: "Em andamento",
      resolved: "Resolvida",
      rejected: "Rejeitada",
    };
    return map[s] ?? s.charAt(0).toUpperCase() + s.slice(1);
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "resolved":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "resolved":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const handleSearch = async () => {
    if (!protocol.trim()) {
      showError("Informe o protocolo da denúncia");
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      // Search for report by ID
      const { data: reportData, error: reportError } = await supabase
        .from("denuncias")
        .select("id, title:titulo, status, created_at, updated_at")
        .eq("id", protocol.trim())
        .single();

      if (reportError || !reportData) {
        setReport(null);
        setComments([]);
        setLoading(false);
        return;
      }

      setReport(reportData as Report);

      // Load comments/timeline
      const { data: commentsData } = await supabase
        .from("denuncia_comments")
        .select("id, comment, status_changed_to, created_at")
        .eq("denuncia_id", protocol.trim())
        .order("created_at", { ascending: true });

      setComments((commentsData as Comment[]) || []);
    } catch (error) {
      console.error("Error searching report:", error);
      setReport(null);
      setComments([]);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FileText className="h-10 w-10 text-[#1B365D]" />
            <h1 className="text-3xl font-bold text-[#1B365D]">Acompanhar Denúncia</h1>
          </div>
          <p className="text-muted-foreground">
            Consulte o status da sua denúncia usando o protocolo fornecido
          </p>
        </div>

        {/* Search Card */}
        <Card className="p-6 mb-6 shadow-lg">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Protocolo da Denúncia</label>
              <div className="flex gap-2">
                <Input
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                  placeholder="Cole aqui o ID/protocolo da denúncia"
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={loading} className="bg-[#1B365D] hover:bg-[#152a4a]">
                  {loading ? (
                    "Buscando..."
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Buscar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Results */}
        {searched && !report && !loading && (
          <Card className="p-8 text-center shadow-lg">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Denúncia não encontrada</h3>
            <p className="text-muted-foreground">
              Verifique se o protocolo está correto e tente novamente.
            </p>
          </Card>
        )}

        {report && (
          <div className="space-y-6">
            {/* Status Card */}
            <Card className="p-6 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {getStatusIcon(report.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-semibold">Status da Denúncia</h2>
                    <Badge className={`${getStatusColor(report.status)} border`}>
                      {fmtStatusPtBR(report.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Protocolo: <span className="font-mono font-medium">{report.id}</span>
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Criada em:</span>
                      <span className="font-medium">{fmtDate(report.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Atualizada em:</span>
                      <span className="font-medium">{fmtDate(report.updated_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Timeline Card */}
            <Card className="p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Linha do Tempo
              </h3>
              <div className="space-y-4">
                {/* Creation event */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <div className="w-0.5 h-full bg-blue-200 mt-2"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="text-xs text-muted-foreground mb-1">{fmtDate(report.created_at)}</div>
                    <div className="font-medium">Denúncia registrada</div>
                    <div className="text-sm text-muted-foreground">
                      Sua denúncia foi recebida e está sendo analisada
                    </div>
                  </div>
                </div>

                {/* Comments/Updates */}
                {comments.map((comment, idx) => (
                  <div key={comment.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      {idx < comments.length - 1 && <div className="w-0.5 h-full bg-green-200 mt-2"></div>}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="text-xs text-muted-foreground mb-1">{fmtDate(comment.created_at)}</div>
                      {comment.status_changed_to && (
                        <div className="font-medium mb-1">
                          Status alterado para:{" "}
                          <Badge variant="outline" className="ml-1">
                            {fmtStatusPtBR(comment.status_changed_to)}
                          </Badge>
                        </div>
                      )}
                      {comment.comment && (
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {comment.comment}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {comments.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aguardando atualizações...</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Info Card */}
            <Card className="p-6 bg-blue-50 border-blue-200 shadow-lg">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Informações importantes:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li>Guarde o protocolo para consultas futuras</li>
                    <li>Você será notificado sobre atualizações importantes</li>
                    <li>O prazo de análise pode variar conforme a complexidade</li>
                    <li>Todas as denúncias são tratadas com confidencialidade</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackReport;

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";

type Company = { id: string; name: string; partner_id: string };
type Department = { id: string; name: string };
type RoleItem = { id: string; name: string };

const FormDenuncia = () => {
  const [params] = useSearchParams();
  const companyParam = params.get("company") || "";

  const [loading, setLoading] = useState(true);
  const [platformName, setPlatformName] = useState("Valida NR1");
  const [effectiveLogoPrimaryDataUrl, setEffectiveLogoPrimaryDataUrl] = useState<string | undefined>(undefined);
  const [company, setCompany] = useState<Company | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);

  // form
  const [anonymous, setAnonymous] = useState<boolean>(true);
  const [firstName, setFirstName] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // Novo: status do formulário
  const [formEnabled, setFormEnabled] = useState<boolean>(true);
  const [statusChecked, setStatusChecked] = useState<boolean>(false);

  const fetchFormStatus = useCallback(async (partnerId: string) => {
    try {
      const { data, error } = await supabase
        .from("forms")
        .select("enabled, updated_at, created_at")
        .eq("partner_id", partnerId)
        .eq("type", "denunciation")
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      const enabled = (data as any)?.enabled;
      setFormEnabled(Boolean(enabled));
    } catch (e) {
      console.error("Erro ao buscar status do formulário de denúncia:", e);
      setFormEnabled(false);
    } finally {
      setStatusChecked(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        if (!companyParam) {
          setCompany(null);
          setLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from("companies")
          .select("id,name,partner_id")
          .eq("id", companyParam)
          .maybeSingle();
        if (error) {
          console.error("[Form] Falha ao carregar empresa:", error);
          setCompany(null);
        } else {
          const comp = (data as Company) ?? null;
          setCompany(comp);
          if (comp?.partner_id) {
            const { data: partnerSettings } = await supabase
              .from("partners")
              .select("platform_name, logo_data_url")
              .eq("id", comp.partner_id)
              .maybeSingle();
            if (partnerSettings) {
              setPlatformName((partnerSettings as any)?.platform_name ?? platformName);
              setEffectiveLogoPrimaryDataUrl((partnerSettings as any)?.logo_data_url ?? undefined);
            }
            await fetchFormStatus(comp.partner_id);
          } else {
            setStatusChecked(true);
          }
        }
      } catch (e) {
        console.error("Erro inesperado ao carregar formulário de denúncia:", e);
        setStatusChecked(true);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [companyParam, fetchFormStatus]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!company?.id) {
        setDepartments([]);
        setRoles([]);
        return;
      }
      const [{ data: deps }, { data: rols }] = await Promise.all([
        supabase.from("departments").select("id,name").eq("company_id", company.id).order("name", { ascending: true }),
        supabase.from("roles").select("id,name").eq("company_id", company.id).order("name", { ascending: true }),
      ]);
      if (!mounted) return;
      setDepartments((deps as any) ?? []);
      setRoles((rols as any) ?? []);
    })();
    return () => { mounted = false; };
  }, [company?.id]);

  const companyName = useMemo(() => company?.name ?? "Empresa", [company]);
  const selectedDepartmentId = useMemo(() => departments.find(d => d.name === department)?.id, [departments, department]);
  const selectedRoleId = useMemo(() => roles.find(r => r.name === role)?.id, [roles, role]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEnabled) {
      showError("Este formulário está desativado no momento.");
      return;
    }
    if (!company?.id || !company.partner_id) {
      showError("Link inválido. Empresa não encontrada.");
      return;
    }
    // Se o título não for informado, cria um automaticamente a partir da categoria/descrição
    let finalTitle = title.trim();
    if (!finalTitle) {
      const base = category?.trim() || description?.trim().slice(0, 40) || "Denúncia";
      finalTitle = `Denúncia - ${base}`;
    }
    if (finalTitle.length < 3) finalTitle = "Denúncia";
    if (!description.trim() || description.trim().length < 10) {
      showError("Descreva o ocorrido (mín. 10 caracteres).");
      return;
    }
    if (!consent) {
      showError("Você precisa aceitar os termos para enviar a denúncia.");
      return;
    }

    setSubmitting(true);
    const basePayload: any = {
      partner_id: company.partner_id,
      company_id: company.id,
      titulo: finalTitle,
      descricao: description.trim(),
    };
    // Inclui campos opcionais somente se informados (Português)
    if (department.trim()) basePayload.setor = department.trim();
    if (role.trim()) basePayload.cargo = role.trim();
    if (category) basePayload.categoria = category;
    basePayload.anonimo = anonymous;
    if (!anonymous && firstName.trim()) basePayload.nome = firstName.trim();
    if (!anonymous && age) basePayload.idade = Number(age);
    if (!anonymous && gender) basePayload.sexo = gender;
    basePayload.consentimento = Boolean(consent);

    const tryInsert = async (p: any) => {
      const { data, error } = await supabase
        .from("denuncias")
        .insert(p as any)
        .select("id")
        .single();
      return { id: (data as any)?.id as string | undefined, error };
    };

    let { id: denunciaId, error: insertError } = await tryInsert(basePayload);

    // Tratativa: se coluna não existir (schema atrasado), tenta remover e reenviar
    if (insertError) {
      const detail = insertError?.message || insertError?.hint || insertError?.details || "";
      // Verifica tanto termos em PT (setor/cargo) quanto os antigos em EN (department/role)
      const mentionsDepartment = /\b(setor|department)\b/i.test(detail);
      const mentionsRole = /\b(cargo|role)\b/i.test(detail);
      const mentionsCategoria = /\b(categoria)\b/i.test(detail);
      const mentionsAnonimo = /\b(anonimo)\b/i.test(detail);
      const mentionsNome = /\b(nome)\b/i.test(detail);
      const mentionsIdade = /\b(idade)\b/i.test(detail);
      const mentionsSexo = /\b(sexo)\b/i.test(detail);
      const mentionsConsent = /\b(consentimento)\b/i.test(detail);

      // Remove apenas os campos que causaram erro específico
      const fallbackPayload = { ...basePayload } as any;
      if (mentionsDepartment && ("setor" in fallbackPayload)) {
        delete fallbackPayload.setor;
      }
      if (mentionsRole && ("cargo" in fallbackPayload)) {
        delete fallbackPayload.cargo;
      }
      if (mentionsCategoria && ("categoria" in fallbackPayload)) delete fallbackPayload.categoria;
      if (mentionsAnonimo && ("anonimo" in fallbackPayload)) delete fallbackPayload.anonimo;
      if (mentionsNome && ("nome" in fallbackPayload)) delete fallbackPayload.nome;
      if (mentionsIdade && ("idade" in fallbackPayload)) delete fallbackPayload.idade;
      if (mentionsSexo && ("sexo" in fallbackPayload)) delete fallbackPayload.sexo;
      if (mentionsConsent && ("consentimento" in fallbackPayload)) delete fallbackPayload.consentimento;

      // Só tenta novamente se algo tiver sido removido
      if (
        (mentionsDepartment && basePayload.setor !== undefined) ||
        (mentionsRole && basePayload.cargo !== undefined) ||
        mentionsCategoria || mentionsAnonimo || mentionsNome || mentionsIdade || mentionsSexo || mentionsConsent
      ) {
        const retry = await tryInsert(fallbackPayload);
        denunciaId = retry.id;
        insertError = retry.error;
      }
    }

    setSubmitting(false);

    if (insertError) {
      console.error("[Form] Falha ao enviar denúncia:", { error: insertError, payload: basePayload, company });
      const detail = insertError?.message || insertError?.hint || insertError?.details || "";
      showError(`Não foi possível enviar sua denúncia. Detalhes: ${detail}`);
      return;
    }
    // Upload de anexos (opcional)
    if (files.length > 0 && denunciaId) {
      try {
        const bucket = supabase.storage.from("denuncias");
        let uploaded = 0;
        const paths: string[] = [];
        const failures: { name: string; message: string }[] = [];
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        for (const f of files) {
          if (f.size > MAX_SIZE) {
            failures.push({ name: f.name, message: `Arquivo maior que 10MB (${Math.ceil(f.size/1024/1024)}MB)` });
            continue;
          }
          const safeName = f.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
          const path = `${company.id}/${denunciaId}/${Date.now()}_${safeName}`;
          const { error: upErr } = await bucket.upload(path, f, {
            upsert: true,
            cacheControl: "3600",
            contentType: f.type || "application/octet-stream",
          });
          if (!upErr) {
            uploaded++;
            paths.push(path);
          } else {
            console.error("[Form] Upload falhou:", upErr);
            failures.push({ name: f.name, message: upErr.message || String(upErr) });
          }
        }
        // Salva paths no registro (se coluna existir)
        if (paths.length > 0) {
          await (supabase as any)
            .from("denuncias")
            .update({ anexos: paths, updated_at: new Date().toISOString() } as any)
            .eq("id", denunciaId);
        }
        if (uploaded > 0 && failures.length === 0) {
          showSuccess(`Denúncia enviada e ${uploaded} arquivo(s) anexado(s).`);
        } else if (uploaded > 0 && failures.length > 0) {
          showSuccess(`Denúncia enviada. ${uploaded} arquivo(s) anexado(s), ${failures.length} falhou(falharam).`);
          showError(`Falha ao anexar: ${failures.map(f => f.name).join(", ")}`);
        } else if (uploaded === 0 && failures.length > 0) {
          showSuccess("Denúncia enviada com sucesso. (Falha ao anexar arquivos)");
          showError(`Falha ao anexar: ${failures.map(f => f.name).join(", ")}`);
        } else {
          showSuccess("Denúncia enviada com sucesso. (Nenhum arquivo anexado)");
        }
      } catch (err: any) {
        console.error("[Form] Erro inesperado no upload:", err);
        const msg = err?.message || String(err);
        showError(`Falha no upload de anexos: ${msg}`);
        showSuccess("Denúncia enviada com sucesso. (Falha ao anexar arquivos)");
      }
    } else {
      showSuccess("Denúncia enviada com sucesso.");
    }
    setSubmitted(true);
    setAnonymous(true);
    setFirstName("");
    setAge("");
    setGender("");
    setCategory("");
    setTitle("");
    setDepartment("");
    setRole("");
    setDescription("");
    setFiles([]);
    setConsent(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="rounded-xl border bg-white p-6 text-sm text-muted-foreground shadow-sm">
          Carregando formulário...
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Card className="w-full max-w-xl p-6">
          <h1 className="text-xl font-semibold">Formulário de Denúncia</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Link inválido ou empresa não encontrada.
          </p>
        </Card>
      </div>
    );
  }

  if (statusChecked && !formEnabled) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-2xl rounded-2xl p-6 sm:p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-red-600 mx-auto mb-3" />
          <h1 className="text-xl font-semibold">Formulário indisponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este formulário de denúncias está desativado no momento. Tente novamente mais tarde.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-2xl rounded-2xl p-6 sm:p-8">
        <div className="mb-6 text-center">
          {effectiveLogoPrimaryDataUrl ? (
            <img src={effectiveLogoPrimaryDataUrl} alt={platformName} className="mx-auto h-[78px] w-auto object-contain mb-2" />
          ) : (
            <img src="https://fbf643ab170cf8b59974997c7d9a22c0.cdn.bubble.io/cdn-cgi/image/w=192,h=125,f=auto,dpr=1.25,fit=contain/f1754152545015x300104446190593300/Logo%201.png" alt="Valida NR1" width={120} height={78} className="mx-auto h-[78px] w-[120px] mb-2" />
          )}
          <div className="text-xs text-muted-foreground">{platformName}</div>
        </div>

        <div className="mb-6">
          <div className="text-xs text-muted-foreground">Canal de Denúncia</div>
          <h1 className="text-2xl font-semibold leading-tight">Envie uma denúncia — {companyName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Processo totalmente anônimo e seguro</p>
        </div>

        <div className="mb-4">
          <Card className="border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <div className="font-semibold text-blue-800">GARANTIA DE ANONIMATO</div>
                <p className="text-sm text-blue-700">Nenhuma informação será compartilhada de forma individualizada. Apenas análises agregadas serão utilizadas.</p>
              </div>
            </div>
          </Card>
        </div>

        <button type="button" onClick={() => setAnonymous((p) => !p)} className="w-full text-left rounded-lg border p-3 mb-4 flex items-center justify-between">
          <span className="text-sm">Desejo enviar esta denúncia de forma anônima</span>
          <span className={`inline-flex h-5 w-9 items-center rounded-full ${anonymous ? "bg-emerald-500" : "bg-zinc-300"}`}>
            <span className={`h-4 w-4 rounded-full bg-white transition-transform ${anonymous ? "translate-x-4" : "translate-x-1"}`} />
          </span>
        </button>

        {submitted ? (
          <div className="rounded-lg border bg-emerald-50 p-4 text-sm text-emerald-700">Obrigado! Sua denúncia foi registrada. Caso precise, envie outra denúncia usando o mesmo link.</div>
        ) : (
          <form onSubmit={onSubmit} className={`space-y-4 ${!formEnabled ? "pointer-events-none opacity-60" : ""}`}>
            {!anonymous && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome (opcional)</label>
                  <Input placeholder="Digite seu primeiro nome" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-10 rounded-xl" disabled={!formEnabled} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Idade (opcional)</label>
                  <Input placeholder="Informe a sua idade..." type="number" value={age} onChange={(e) => setAge(e.target.value)} className="h-10 rounded-xl" disabled={!formEnabled} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sexo</label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="h-10 rounded-xl" disabled={!formEnabled}>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="nao-binario">Não binário</SelectItem>
                      <SelectItem value="prefiro-nao-dizer">Prefiro não dizer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Setor (opcional)</label>
                <Select
                  value={selectedDepartmentId}
                  onValueChange={(v) => {
                    const d = departments.find(x => x.id === v);
                    setDepartment(d?.name || "");
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl" disabled={!formEnabled}>
                    <SelectValue placeholder="Selecione um setor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.length === 0 ? (
                      <SelectItem value="no-departments" disabled>Nenhum setor disponível</SelectItem>
                    ) : (
                      departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Cargo (opcional)</label>
                <Select
                  value={selectedRoleId}
                  onValueChange={(v) => {
                    const r = roles.find(x => x.id === v);
                    setRole(r?.name || "");
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl" disabled={!formEnabled}>
                    <SelectValue placeholder="Selecione um cargo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.length === 0 ? (
                      <SelectItem value="no-roles" disabled>Nenhum cargo disponível</SelectItem>
                    ) : (
                      roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria da denúncia</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10 rounded-xl" disabled={!formEnabled}>
                  <SelectValue placeholder="Selecione a categoria..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assedio">Assédio</SelectItem>
                  <SelectItem value="discriminacao">Discriminação</SelectItem>
                  <SelectItem value="fraude">Fraude</SelectItem>
                  <SelectItem value="seguranca-trabalho">Segurança do trabalho</SelectItem>
                  <SelectItem value="conflito-interesses">Conflito de interesses</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea placeholder="Descreva o ocorrido com detalhes (datas, locais, pessoas envolvidas)..." value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[120px] rounded-xl" disabled={!formEnabled} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Anexos (opcional)</label>
              <input
                type="file"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="block w-full rounded-xl border p-2 text-sm"
                disabled={!formEnabled}
              />
              {files.length > 0 && (
                <div className="text-xs text-muted-foreground">{files.length} arquivo(s) selecionado(s)</div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="h-4 w-4" disabled={!formEnabled} />
              Confirmo que as informações são verdadeiras e concordo com o tratamento dos dados conforme as políticas da empresa.
            </label>

            <div className="pt-2">
              <Button type="submit" disabled={submitting || !formEnabled} className="w-full">{submitting ? "Enviando..." : "Enviar Denúncia"}</Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

export default FormDenuncia;
import { useEffect, useState, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setCurrentCompany } from "@/services/auth"; // Importa a função agora exportada
import { showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";

type Company = { id: string; name: string; partner_id: string };

const CompanySelect = () => {
  const { session } = useSession();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedValue, setSelectedValue] = useState<string | undefined>(session?.company_id);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  // Atualiza o estado local quando session.company_id muda
  useEffect(() => {
    console.log("[CompanySelect] useEffect[session?.company_id]: session.company_id changed to:", session?.company_id);
    setSelectedValue(session?.company_id);
  }, [session?.company_id]);

  const loadCompaniesAndSetDefault = useCallback(async () => {
    setLoadingCompanies(true);
    console.log("[CompanySelect] loadCompaniesAndSetDefault: start");

    const partnerId = session?.partnerId;
    const currentCompanyInSession = session?.company_id;

    if (!partnerId) {
      console.log("[CompanySelect] No partnerId in session, clearing companies.");
      setCompanies([]);
      setSelectedValue(undefined);
      setLoadingCompanies(false);
      return;
    }

    console.log("[CompanySelect] Fetching companies for partnerId:", partnerId);
    const { data, error } = await supabase
      .from("companies")
      .select("id,name,partner_id")
      .eq("partner_id", partnerId)
      .order("name", { ascending: true });

    if (error) {
      console.error("[CompanySelect] Error fetching companies:", error);
    }

    const fetchedCompanies = (data ?? []) as Company[];
    setCompanies(fetchedCompanies);
    console.log("[CompanySelect] Fetched companies:", fetchedCompanies);

    const isCurrentCompanyValid = fetchedCompanies.some(c => c.id === currentCompanyInSession);
    if (!currentCompanyInSession || !isCurrentCompanyValid) {
      const defaultCompanyId = fetchedCompanies[0]?.id;
      if (defaultCompanyId && defaultCompanyId !== currentCompanyInSession) {
        console.log("[CompanySelect] Setting default company:", defaultCompanyId);
        setCurrentCompany(defaultCompanyId);
      } else if (!defaultCompanyId && currentCompanyInSession) {
        console.log("[CompanySelect] Current company invalid and no default available, clearing company_id.");
        setCurrentCompany("");
      } else {
        console.log("[CompanySelect] No default company to set or current company is already valid.");
      }
    } else {
      console.log("[CompanySelect] Session company_id is valid and matches, no action needed:", currentCompanyInSession);
    }

    setLoadingCompanies(false);
    console.log("[CompanySelect] loadCompaniesAndSetDefault: Finished.");
  }, [session?.partnerId, session?.company_id]);

  // Carrega as empresas e define uma padrão se necessário
  useEffect(() => {
    loadCompaniesAndSetDefault();
  }, [loadCompaniesAndSetDefault]);

  // Reage a mudanças externas (criação/edição/exclusão) via evento global
  useEffect(() => {
    const handler = () => {
      console.log("[CompanySelect] 'companies_changed' event received. Reloading companies.");
      loadCompaniesAndSetDefault();
    };
    window.addEventListener("companies_changed", handler);
    return () => window.removeEventListener("companies_changed", handler);
  }, [loadCompaniesAndSetDefault]);

  const onChange = (val: string) => {
    console.log("[CompanySelect] User selected company:", val);
    setCurrentCompany(val); // Isso dispara o evento e atualiza a sessão
    showSuccess("Empresa selecionada atualizada.");
  };

  return (
    <Select value={selectedValue} onValueChange={onChange} disabled={loadingCompanies || companies.length === 0}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Selecionar empresa" />
      </SelectTrigger>
      <SelectContent>
        {companies.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
        {companies.length === 0 && (
          <SelectItem value="no-company" disabled>Nenhuma empresa disponível</SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};

export default CompanySelect;
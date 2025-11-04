import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showError, showSuccess } from "@/utils/toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider"; // Import useSession

type ProfileRow = { id: string; first_name?: string; last_name?: string; avatar_url?: string };

const Profile = () => {
  const navigate = useNavigate();
  const { session } = useSession(); // Use the reactive session

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [email, setEmail] = useState("");

  // form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // password change
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  // avatar
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);

  const role = useMemo(() => session?.roleContext ?? "—", [session?.roleContext]);

  useEffect(() => {
    // Depend on session.user.id to re-fetch profile if user changes
    if (!session?.user?.id) {
      setProfile(null);
      setEmail("");
      setFirstName("");
      setLastName("");
      setAvatarPreview(undefined);
      return;
    }
    (async () => {
      const { data: ures } = await supabase.auth.getUser();
      const user = ures?.user;
      if (!user) return;
      setEmail(user.email ?? "");
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      const row: ProfileRow = prof ?? { id: user.id };
      setProfile(row);
      setFirstName(row.first_name ?? "");
      setLastName(row.last_name ?? "");
      setAvatarPreview(row.avatar_url);
    })();
  }, [session?.user?.id]); // Depend on reactive session.user.id

  const onSaveProfile = async () => {
    const { data: ures } = await supabase.auth.getUser();
    const user = ures?.user;
    if (!user) return;

    // Atualiza profiles
    const { error: upErr } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        avatar_url: avatarPreview || null, // Se avatarPreview for undefined, salva null
        updated_at: new Date().toISOString(),
      } satisfies ProfileRow);

    if (upErr) {
      showError("Falha ao salvar o perfil.");
      return;
    }

    // Atualiza e-mail caso tenha mudado
    if (email && email !== (user.email ?? "")) {
      const { error: updErr } = await supabase.auth.updateUser({ email: email.trim().toLowerCase() });
      if (updErr) {
        showError("Não foi possível atualizar o e-mail.");
        return;
      }
    }

    showSuccess("Perfil atualizado.");
  };

  const onChangePassword = async () => {
    if (!newPass || !confirmPass) {
      showError("Preencha a nova senha e a confirmação.");
      return;
    }
    if (newPass.length < 4) {
      showError("A nova senha deve ter pelo menos 4 caracteres.");
      return;
    }
    if (newPass !== confirmPass) {
      showError("A confirmação de senha não confere.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) {
      showError("Não foi possível alterar a senha.");
      return;
    }
    setNewPass("");
    setConfirmPass("");
    showSuccess("Senha alterada com sucesso.");
  };

  const onAvatarChange = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarPreview(dataUrl);
      setUploading(false);
      showSuccess("Foto de perfil atualizada."); // Mensagem simplificada
    };
    reader.readAsDataURL(file);
  };

  const onRemoveAvatar = () => {
    setAvatarPreview(undefined);
    showSuccess("Foto removida. Salve as alterações para confirmar.");
  };

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-xl font-semibold">Meu perfil</h1>

      <Card className="p-6">
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="h-28 w-28 overflow-hidden rounded-full bg-muted">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">Sem foto</div>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <label className="inline-flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-muted">
                {uploading ? "Carregando..." : "Trocar foto"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onAvatarChange(e.target.files?.[0])}
                />
              </label>
              {avatarPreview && (
                <Button variant="outline" size="sm" onClick={onRemoveAvatar}>
                  Remover
                </Button>
              )}
            </div>
          </div>

          {/* Dados pessoais */}
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sobrenome</label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Papel</label>
                <Input value={role} disabled className="h-10" />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => navigate("/admin")}>Voltar ao painel</Button>
              <Button onClick={onSaveProfile}>Salvar alterações</Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-3 text-sm font-medium">Trocar senha</div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nova senha</label>
            <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="h-10" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Confirmar nova senha</label>
            <Input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} className="h-10" />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={onChangePassword}>Atualizar senha</Button>
        </div>
      </Card>
    </div>
  );
};

export default Profile;
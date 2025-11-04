import { showSuccess, showError } from "@/utils/toast";

export const copyToClipboard = async (text: string, successMessage: string = "Copiado para a área de transferência.") => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showSuccess(successMessage);
  } catch (err) {
    console.error("[clipboard] Falha ao copiar texto:", err);
    showError("Não foi possível copiar o texto.");
  }
};
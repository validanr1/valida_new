import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import SupabaseProvider from "./integrations/supabase/SupabaseProvider";

console.log("Aplicação inicializada/recarregada."); // Adicionado para diagnóstico

// Registrar Service Worker otimizado
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[SW] Registrado com sucesso:', registration.scope);
      })
      .catch((error) => {
        console.error('[SW] Falha no registro:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SupabaseProvider>
      <App />
    </SupabaseProvider>
  </React.StrictMode>
);
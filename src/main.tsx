import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import SupabaseProvider from "./integrations/supabase/SupabaseProvider";

console.log("Aplicação inicializada/recarregada."); // Adicionado para diagnóstico

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SupabaseProvider>
      <App />
    </SupabaseProvider>
  </React.StrictMode>
);
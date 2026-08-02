import { createClient } from "@supabase/supabase-js";

// Este cliente usa la Service Role Key: solo se ejecuta en el servidor
// (funciones de /api), nunca llega al navegador. Bypassa RLS a propósito
// porque el webhook de Mercado Pago necesita poder confirmar cualquier pago.
export function crearClienteAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno del servidor.");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

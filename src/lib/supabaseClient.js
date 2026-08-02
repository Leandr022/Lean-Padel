import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Si faltan las variables de entorno, "createClient" tira una excepción y
// rompe TODA la app (pantalla en blanco, sin ningún mensaje). Para evitar
// eso, en ese caso armamos el cliente apuntando a una URL de relleno y
// dejamos marcado `supabaseConfigurado en false`; el resto de la app usa
// ese flag para mostrar una pantalla de aviso en vez de romperse.
export const supabaseConfigurado = Boolean(url && anonKey);

if (!supabaseConfigurado) {
  // eslint-disable-next-line no-console
  console.error(
    "Faltan variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. " +
      "Copiá .env.example a .env.local (en desarrollo) o cargalas en Vercel (en producción) con los valores de tu proyecto de Supabase."
  );
}

export const supabase = createClient(url || "https://falta-configurar.supabase.co", anonKey || "clave-de-relleno", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

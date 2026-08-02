import { supabase } from "../lib/supabaseClient.js";

export async function listarRendiciones({ profesorId } = {}) {
  let consulta = supabase.from("rendiciones").select("*, perfiles:profesor_id(nombre)").order("creado_en", { ascending: false });
  if (profesorId) consulta = consulta.eq("profesor_id", profesorId);
  const { data, error } = await consulta;
  if (error) throw error;
  return data;
}

export async function crearRendicion({ profesorId, periodo, desde, hasta, monto }) {
  const { data, error } = await supabase
    .from("rendiciones")
    .insert({ profesor_id: profesorId, periodo, desde, hasta, monto })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function marcarRendicionPagada(id, estado) {
  const { data, error } = await supabase
    .from("rendiciones")
    .update({ estado, pagado_en: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function subirComprobanteRendicion(rendicionId, archivo) {
  const ruta = `rendiciones/${rendicionId}/${Date.now()}-${archivo.name}`;
  const { error: errorSubida } = await supabase.storage.from("comprobantes").upload(ruta, archivo, { upsert: true });
  if (errorSubida) throw errorSubida;
  const { data, error } = await supabase.from("rendiciones").update({ comprobante_url: ruta }).eq("id", rendicionId).select().single();
  if (error) throw error;
  return data;
}

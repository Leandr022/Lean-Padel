import { supabase } from "../lib/supabaseClient.js";

export async function obtenerPerfil(id) {
  const { data, error } = await supabase.from("perfiles").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function listarAlumnos() {
  const { data, error } = await supabase
    .from("perfiles")
    .select("*")
    .eq("rol", "ALUMNO")
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data;
}

export async function actualizarPerfil(id, cambios) {
  const { data, error } = await supabase.from("perfiles").update(cambios).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function subirFotoPerfil(id, archivo) {
  const ruta = `${id}/foto-${Date.now()}-${archivo.name}`;
  const { error: errorSubida } = await supabase.storage.from("fotos").upload(ruta, archivo, { upsert: true });
  if (errorSubida) throw errorSubida;
  const { data } = supabase.storage.from("fotos").getPublicUrl(ruta);
  return data.publicUrl;
}

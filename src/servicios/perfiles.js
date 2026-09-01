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

/** Todas las cuentas del club (alumnos, profesores y admins), para la
 * pantalla de "Gestión de usuarios" del admin. */
export async function listarTodosLosUsuarios() {
  const { data, error } = await supabase
    .from("perfiles")
    .select("id, rol, nombre, apellido, email, creado_en")
    .order("creado_en", { ascending: true });
  if (error) throw error;
  return data;
}

/** Cambia el rol de una cuenta ya existente (por ejemplo, promover un
 * alumno a profesor). Solo funciona si quien llama es ADMIN: la política de
 * la base (perfiles_update_admin) y el trigger que blinda la columna "rol"
 * (proteger_columnas_perfil) lo exigen del lado del servidor, así que esto
 * no es más que una comodidad del lado del cliente. */
export async function cambiarRolUsuario(id, rol) {
  return actualizarPerfil(id, { rol });
}

/** Crea una cuenta nueva de profesor con email y contraseña, sin pasar por
 * el formulario público de registro. Requiere que quien llama esté logueado
 * como ADMIN: el endpoint del servidor vuelve a validarlo con la sesión
 * actual antes de crear nada (ver api/admin-crear-usuario.js). */
export async function crearProfesor({ nombre, email, password }) {
  const { data: sesion } = await supabase.auth.getSession();
  const token = sesion?.session?.access_token;
  if (!token) throw new Error("Tu sesión expiró, volvé a iniciar sesión.");

  const respuesta = await fetch("/api/admin-crear-usuario", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    // El endpoint siempre crea la cuenta como PROFESOR (no hace falta ni se
    // usa un campo "rol" acá: para crear un ADMIN se promueve una cuenta ya
    // existente desde la lista de abajo).
    body: JSON.stringify({ nombre, email, password }),
  });
  const resultado = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(resultado.error || "No se pudo crear la cuenta.");
  return resultado;
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

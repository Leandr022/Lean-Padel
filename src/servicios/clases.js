import { supabase } from "../lib/supabaseClient.js";
import { horariosApertura } from "../datos/clases.js";

/** Trae las clases entre dos fechas (yyyy-mm-dd) junto con sus reservas y los datos del alumno. */
export async function listarClasesRango(desde, hasta) {
  const { data, error } = await supabase
    .from("clases")
    .select("*, reservas(*, perfiles:alumno_id(id, nombre, categoria, genero, telefono))")
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: true })
    .order("hora", { ascending: true });
  if (error) throw error;
  return data;
}

export async function crearOActualizarClase({ id, fecha, hora, profesorId, estado, tipo, estadoClase, motivo }) {
  const payload = {
    fecha,
    hora,
    profesor_id: profesorId,
    estado,
    tipo: tipo || null,
    estado_clase: estadoClase || "pendiente",
    motivo: motivo || null,
  };
  if (id) {
    const { data, error } = await supabase.from("clases").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("clases").upsert(payload, { onConflict: "fecha,hora,profesor_id" }).select().single();
  if (error) throw error;
  return data;
}

export async function eliminarClase(id) {
  const { error } = await supabase.from("clases").delete().eq("id", id);
  if (error) throw error;
}

export async function bloquearHorario({ fecha, hora, profesorId, motivo }) {
  return crearOActualizarClase({ fecha, hora, profesorId, estado: "bloqueada", motivo });
}

/** Abre como "disponible" todos los horarios (de una semana, de varias, o
 * de los días puntuales que se le pasen) que todavía no existan como fila
 * en Supabase. No pisa clases ya creadas (reservadas, bloqueadas o
 * editadas): usa ignoreDuplicates, así que una fecha/hora que ya existe
 * queda tal cual estaba. */
export async function generarHorariosSemana({ fechas, horarios, profesorId }) {
  const filas = fechas.flatMap((fecha) =>
    horarios.map((hora) => ({ fecha, hora, profesor_id: profesorId, estado: "disponible", estado_clase: "pendiente" }))
  );
  const { data, error } = await supabase
    .from("clases")
    .upsert(filas, { onConflict: "fecha,hora,profesor_id", ignoreDuplicates: true })
    .select();
  if (error) throw error;
  return data;
}

/** Bloquea TODO un día de una sola vez (en vez de horario por horario).
 * Nunca pisa un tramo que ya tenga alumnos anotados (estado "reservada"):
 * esos se saltean y se devuelven en `yaReservados` para avisarle al
 * profesor que los tiene que resolver a mano si hace falta. */
export async function bloquearDiaCompleto({ fecha, profesorId, motivo }) {
  const { data: existentes, error: errorExistentes } = await supabase
    .from("clases")
    .select("hora, estado")
    .eq("fecha", fecha)
    .eq("profesor_id", profesorId);
  if (errorExistentes) throw errorExistentes;

  const porHora = new Map((existentes || []).map((c) => [c.hora, c]));
  const yaReservados = [];
  const filas = [];
  for (const hora of horariosApertura) {
    const actual = porHora.get(hora);
    if (actual && actual.estado === "reservada") {
      yaReservados.push(hora);
      continue;
    }
    filas.push({
      fecha,
      hora,
      profesor_id: profesorId,
      estado: "bloqueada",
      estado_clase: "pendiente",
      motivo: motivo || "Bloqueado por el profesor",
    });
  }

  if (filas.length) {
    const { error } = await supabase.from("clases").upsert(filas, { onConflict: "fecha,hora,profesor_id" });
    if (error) throw error;
  }

  return { bloqueados: filas.length, yaReservados };
}

/** Vuelve a dejar "disponibles" los horarios bloqueados de un día (no toca
 * los que tienen alumnos anotados, esos no se ven afectados). */
export async function desbloquearDiaCompleto({ fecha, profesorId }) {
  const { error } = await supabase
    .from("clases")
    .update({ estado: "disponible", motivo: null })
    .eq("fecha", fecha)
    .eq("profesor_id", profesorId)
    .eq("estado", "bloqueada");
  if (error) throw error;
}

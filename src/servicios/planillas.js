import { supabase } from "../lib/supabaseClient.js";

export async function obtenerPlanillaAlumno(alumnoId) {
  const { data, error } = await supabase.from("planillas_tecnicas").select("*").eq("alumno_id", alumnoId);
  if (error) throw error;
  return data;
}

export async function guardarItemPlanilla({ alumnoId, categoriaId, golpe, trabajado, puntajeAlumno, puntajeProfesor, observacion }) {
  const { data, error } = await supabase
    .from("planillas_tecnicas")
    .upsert(
      {
        alumno_id: alumnoId,
        categoria_id: categoriaId,
        golpe,
        trabajado,
        puntaje_alumno: puntajeAlumno,
        puntaje_profesor: puntajeProfesor,
        observacion,
        actualizado_en: new Date().toISOString(),
      },
      { onConflict: "alumno_id,categoria_id,golpe" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

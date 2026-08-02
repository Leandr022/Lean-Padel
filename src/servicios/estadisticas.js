import { supabase } from "../lib/supabaseClient.js";
import { calcularComision } from "../utilidades/precios.js";
import { claveFecha } from "../utilidades/fechas.js";

function primerYUltimoDiaDelMes(fecha = new Date()) {
  const primero = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  const ultimo = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
  return { desde: claveFecha(primero), hasta: claveFecha(ultimo) };
}

/** Próxima clase reservada de un alumno (hoy o en adelante). */
export async function proximaClaseAlumno(alumnoId) {
  const hoy = claveFecha(new Date());
  const { data, error } = await supabase
    .from("reservas")
    .select("*, clases:clase_id(fecha, hora, estado_clase)")
    .eq("alumno_id", alumnoId);
  if (error) throw error;
  const futuras = (data || [])
    .filter((r) => r.clases && r.clases.fecha >= hoy)
    .sort((a, b) => (a.clases.fecha + a.clases.hora).localeCompare(b.clases.fecha + b.clases.hora));
  return futuras[0] || null;
}

/** Última clase ya dada de un alumno, con la cantidad de compañeros.
 * Usamos clases.cupo_ocupado (visible para cualquier autenticado) en vez de
 * contar filas de "reservas": un alumno no puede ver las reservas de otros
 * alumnos por RLS, así que contarlas directamente daría siempre 1. */
export async function ultimaClaseAlumno(alumnoId) {
  const hoy = claveFecha(new Date());
  const { data, error } = await supabase
    .from("reservas")
    .select("*, clases:clase_id(id, fecha, hora, estado_clase, cupo_ocupado)")
    .eq("alumno_id", alumnoId);
  if (error) throw error;
  const pasadas = (data || [])
    .filter((r) => r.clases && r.clases.fecha <= hoy)
    .sort((a, b) => (b.clases.fecha + b.clases.hora).localeCompare(a.clases.fecha + a.clases.hora));
  const ultima = pasadas[0];
  if (!ultima) return null;
  return { ...ultima, companeros: Math.max((ultima.clases.cupo_ocupado || 1) - 1, 0) };
}

export async function tienePagosPendientes(alumnoId) {
  const { count, error } = await supabase
    .from("reservas")
    .select("id", { count: "exact", head: true })
    .eq("alumno_id", alumnoId)
    .eq("pagado", false);
  if (error) throw error;
  return (count || 0) > 0;
}

/** Panel del profesor: clases de hoy, del mes, facturado y a rendir al club. */
export async function estadisticasProfesor(profesorId, comisiones) {
  const hoy = claveFecha(new Date());
  const { desde, hasta } = primerYUltimoDiaDelMes();
  const { data, error } = await supabase
    .from("clases")
    .select("*, reservas(*)")
    .eq("profesor_id", profesorId)
    .eq("estado", "reservada")
    .gte("fecha", desde)
    .lte("fecha", hasta);
  if (error) throw error;

  const clasesDelMes = data || [];
  const clasesHoy = clasesDelMes.filter((c) => c.fecha === hoy).length;

  let facturado = 0;
  let aRendir = 0;
  clasesDelMes.forEach((clase) => {
    const pagadas = (clase.reservas || []).filter((r) => r.pagado);
    const total = pagadas.reduce((acc, r) => acc + Number(r.monto), 0);
    facturado += total;
    if (total > 0) {
      const { comision } = calcularComision(total, clase.reservas.length, comisiones || {});
      aRendir += comision;
    }
  });

  return { clasesHoy, clasesDelMes: clasesDelMes.length, facturado, aRendir };
}

/** Panel y estadísticas del admin: agregados de todo el club. */
export async function estadisticasClub() {
  const { desde, hasta } = primerYUltimoDiaDelMes();

  const [{ data: alumnos, error: errorAlumnos }, { data: clasesMes, error: errorClases }] = await Promise.all([
    supabase.from("perfiles").select("categoria, genero, activo").eq("rol", "ALUMNO"),
    supabase.from("clases").select("fecha, hora").eq("estado", "reservada").gte("fecha", desde).lte("fecha", hasta),
  ]);
  if (errorAlumnos) throw errorAlumnos;
  if (errorClases) throw errorClases;

  const activos = (alumnos || []).filter((a) => a.activo);
  const conteoCategorias = {};
  const conteoGenero = { Caballero: 0, Dama: 0 };
  activos.forEach((a) => {
    if (a.categoria) conteoCategorias[a.categoria] = (conteoCategorias[a.categoria] || 0) + 1;
    if (a.genero) conteoGenero[a.genero] = (conteoGenero[a.genero] || 0) + 1;
  });
  const categoriaPrincipal = Object.entries(conteoCategorias).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const conteoDias = {};
  const conteoHorarios = {};
  (clasesMes || []).forEach((c) => {
    const dia = new Date(`${c.fecha}T00:00:00`).toLocaleDateString("es-AR", { weekday: "long" });
    conteoDias[dia] = (conteoDias[dia] || 0) + 1;
    conteoHorarios[c.hora] = (conteoHorarios[c.hora] || 0) + 1;
  });
  const diaMasConcurrido = Object.entries(conteoDias).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  const horarioMasSolicitado = Object.entries(conteoHorarios).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const totalGenero = conteoGenero.Caballero + conteoGenero.Dama || 1;
  const porcentajeHombres = Math.round((conteoGenero.Caballero / totalGenero) * 100);
  const porcentajeMujeres = 100 - porcentajeHombres;

  return {
    alumnosActivos: activos.length,
    categoriaPrincipal,
    clasesDelMes: (clasesMes || []).length,
    diaMasConcurrido,
    horarioMasSolicitado,
    porcentajeHombres,
    porcentajeMujeres,
  };
}

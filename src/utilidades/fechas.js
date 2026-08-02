export const nombresDia = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Mismo orden que devuelve obtenerSemana() (lunes a sábado, sin domingo):
// útil para armar selectores de "qué días de la semana" sin repetir el
// mapeo en cada componente.
export const nombresDiaSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function aMedianoche(fecha) {
  const copia = new Date(fecha);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

/** Lunes de la semana que contiene "fecha" (o de hoy si no se pasa nada). */
export function inicioDeSemana(fecha = new Date()) {
  const base = aMedianoche(fecha);
  const diaSemana = base.getDay(); // 0 = domingo
  const offset = diaSemana === 0 ? -6 : 1 - diaSemana;
  base.setDate(base.getDate() + offset);
  return base;
}

/** Array de 6 fechas (lunes a sábado) para la semana actual + offsetSemanas. */
export function obtenerSemana(offsetSemanas = 0) {
  const lunes = inicioDeSemana();
  lunes.setDate(lunes.getDate() + offsetSemanas * 7);
  return Array.from({ length: 6 }, (_, i) => {
    const dia = new Date(lunes);
    dia.setDate(dia.getDate() + i);
    return dia;
  });
}

/** yyyy-mm-dd, la clave que se guarda en Supabase. */
export function claveFecha(fecha) {
  const d = aMedianoche(fecha);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "Lun 04/08" para encabezados de columna. */
export function formatearCorto(fecha) {
  return fecha.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

/** "Lunes 4 de agosto" para títulos y modales. */
export function formatearLargo(fecha) {
  const texto = fecha.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function esHoy(fecha) {
  return claveFecha(fecha) === claveFecha(new Date());
}

export function esPasado(fecha, hora) {
  const [h, m] = hora.split(":").map(Number);
  const fechaHora = new Date(fecha);
  fechaHora.setHours(h, m, 0, 0);
  return fechaHora.getTime() < Date.now();
}

/** Rango [lunes, sábado] de una semana, como claves yyyy-mm-dd, para consultar Supabase. */
export function rangoSemana(offsetSemanas = 0) {
  const semana = obtenerSemana(offsetSemanas);
  return { desde: claveFecha(semana[0]), hasta: claveFecha(semana[5]) };
}

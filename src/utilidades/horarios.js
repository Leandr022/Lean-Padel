// Helpers para trabajar con horarios "HH:MM" en la grilla de 30 minutos.

export function minutosDesdeMedianoche(hora) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function sumarMinutos(hora, minutos) {
  const total = minutosDesdeMedianoche(hora) + minutos;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** ¿Una clase de "minutos" que arranca en "hora" termina a tiempo (antes o justo al cierre)? */
export function cabeEnCalendario(hora, minutos, cierre) {
  return minutosDesdeMedianoche(sumarMinutos(hora, minutos)) <= minutosDesdeMedianoche(cierre);
}

/** "11:00 a 12:30", para mostrar el rango completo de una reserva. */
export function rangoHorario(hora, minutos) {
  return `${hora} a ${sumarMinutos(hora, minutos)}`;
}

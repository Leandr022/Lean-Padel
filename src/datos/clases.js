// Grilla de la agenda: turnos cada 30 minutos, de 08:00 a 15:30 (el último
// turno posible), siempre cerrando a las 16:30. Igual que en la planilla de
// referencia ("Alquilá tu cancha"), el alumno puede arrancar en cualquier
// medio horario y elegir cuánto dura la clase.
function generarGrilla(desde, hasta) {
  const [horaInicio, minInicio] = desde.split(":").map(Number);
  const [horaFin, minFin] = hasta.split(":").map(Number);
  const horarios = [];
  let minutos = horaInicio * 60 + minInicio;
  const limite = horaFin * 60 + minFin;
  while (minutos <= limite) {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    horarios.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    minutos += 30;
  }
  return horarios;
}

export const aperturaCalendario = "08:00";
export const cierreCalendario = "16:30";

// Horarios de INICIO que puede elegir un alumno/profesor: el último es
// 15:30 (para que una clase de 1h termine justo a las 16:30, el cierre).
export const horariosClase = generarGrilla(aperturaCalendario, "15:30");

// Horarios que hay que abrir en la base (un tramo de 30' más que
// "horariosClase"): una clase de 1h30 que arranca a las 15:00 ocupa el
// tramo de las 15:30 Y el de las 16:00, aunque las 16:00 nunca se ofrezcan
// como inicio posible. Sin este tramo "de cola" abierto, esa reserva no
// tendría dónde bloquear la continuidad.
export const horariosApertura = generarGrilla(aperturaCalendario, "16:00");

export const capacidadGrupal = 4;

// Duraciones que puede elegir el alumno, sea Individual o Grupal: los
// horarios disponibles son los mismos para las dos modalidades.
export const duracionesClase = [
  { minutos: 60, etiqueta: "1 hora" },
  { minutos: 90, etiqueta: "1 hora y media" },
];

import { Fragment } from "react";
import { capacidadGrupal, horariosClase } from "../../datos/clases.js";
import { formatearMoneda, precioPorTipo } from "../../utilidades/precios.js";
import { sumarMinutos } from "../../utilidades/horarios.js";
import { claveFecha, esHoy, esPasado, formatearCorto, formatearLargo } from "../../utilidades/fechas.js";

function textoDeSlot(clase, pasado) {
  if (!clase) return pasado ? "No disponible" : "Todavía sin abrir";
  if (clase.es_continuacion) return "Continúa clase anterior";
  if (clase.estado === "bloqueada") return clase.motivo || "Bloqueado";
  if (clase.estado === "reservada") {
    const cantidad = clase.cupo_ocupado || 0;
    const duracion = clase.duracion_minutos === 90 ? " · 1h30" : "";
    return `${clase.tipo} · ${cantidad} alumno${cantidad === 1 ? "" : "s"}${duracion}`;
  }
  return "Disponible";
}

export default function CalendarioUnificado({ semana, semanaOffset, clases, rol, precios, cargando, onSeleccionar, onCrear, onCambiarSemana, onGenerarSemana }) {
  function buscarClase(fecha, hora) {
    const clave = claveFecha(fecha);
    return clases.find((c) => c.fecha === clave && c.hora === hora);
  }

  return (
    <section className="calendario-card">
      <div className="calendario-cabecera">
        <div>
          <h2>Calendario semanal</h2>
          <p>{formatearLargo(semana[0])} — {formatearLargo(semana[5])}</p>
        </div>
        <div className="calendario-acciones">
          <button type="button" className="boton-secundario" onClick={() => onCambiarSemana(semanaOffset - 1)}>‹ Anterior</button>
          <button type="button" className="boton-secundario" onClick={() => onCambiarSemana(0)} disabled={semanaOffset === 0}>Esta semana</button>
          <button type="button" className="boton-secundario" onClick={() => onCambiarSemana(semanaOffset + 1)}>Siguiente ›</button>
          {rol !== "ALUMNO" && (
            <>
              <button type="button" className="boton-secundario" onClick={onGenerarSemana}>Abrir horarios de esta semana</button>
              <button type="button" className="boton-principal" onClick={onCrear}>Crear clase puntual</button>
            </>
          )}
        </div>
      </div>

      {cargando ? (
        <p className="texto-muted">Cargando calendario…</p>
      ) : (
        <div className="calendario-grid">
          <div className="celda hora-label"></div>
          {semana.map((fecha) => (
            <div className={esHoy(fecha) ? "celda dia-label hoy" : "celda dia-label"} key={claveFecha(fecha)}>
              {formatearCorto(fecha)}
            </div>
          ))}
          {horariosClase.map((hora) => (
            <Fragment key={hora}>
              <div className="celda hora-label">{hora}</div>
              {semana.map((fecha) => {
                const clase = buscarClase(fecha, hora);
                const pasado = esPasado(fecha, hora);
                const esContinuacion = Boolean(clase?.es_continuacion);

                if (esContinuacion) {
                  return (
                    <div key={`${claveFecha(fecha)}-${hora}`} className={`slot continuacion${pasado ? " pasado" : ""}`}>
                      <strong>{textoDeSlot(clase, pasado)}</strong>
                    </div>
                  );
                }

                const estado = clase ? clase.estado : "cerrado";
                const bloqueadoParaAlumno =
                  rol === "ALUMNO" &&
                  (pasado ||
                    !clase ||
                    clase.estado === "bloqueada" ||
                    (clase.estado === "reservada" && clase.tipo === "Individual") ||
                    (clase.estado === "reservada" && (clase.cupo_ocupado || 0) >= capacidadGrupal));

                // Los próximos dos tramos de 30' (los que puede necesitar
                // ocupar una clase de 60' o 90' que arranque acá), para que
                // el modal de reserva sepa qué duraciones ofrecer.
                const tramosSiguientes = [
                  buscarClase(fecha, sumarMinutos(hora, 30)),
                  buscarClase(fecha, sumarMinutos(hora, 60)),
                ];

                return (
                  <button
                    key={`${claveFecha(fecha)}-${hora}`}
                    type="button"
                    className={`slot ${estado}${pasado ? " pasado" : ""}`}
                    disabled={bloqueadoParaAlumno}
                    onClick={() => onSeleccionar({ clase, fecha: claveFecha(fecha), hora, tramosSiguientes })}
                  >
                    <strong>{textoDeSlot(clase, pasado)}</strong>
                    {rol !== "ALUMNO" && clase?.reservas?.[0]?.perfiles?.nombre && <small>{clase.reservas[0].perfiles.nombre}</small>}
                    {clase?.estado === "disponible" && !pasado && (
                      <small>
                        Desde {formatearMoneda(precioPorTipo("Individual", precios))} / {formatearMoneda(precioPorTipo("Grupal", precios))}
                      </small>
                    )}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      )}
    </section>
  );
}

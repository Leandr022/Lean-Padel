import { useEffect, useState } from "react";
import { horariosClase } from "../../datos/clases.js";
import { formatearMoneda, precioPorTipo } from "../../utilidades/precios.js";
import { rangoHorario } from "../../utilidades/horarios.js";
import { formatearLargo } from "../../utilidades/fechas.js";
import { crearOActualizarClase, eliminarClase } from "../../servicios/clases.js";
import { cancelarReserva, crearReserva, marcarPagoReserva, urlFirmadaComprobante } from "../../servicios/reservas.js";
import { listarAlumnos } from "../../servicios/perfiles.js";

export default function ModalClaseProfesor({ info, precios, profesorId, onCerrar, onGuardado, onActualizar }) {
  const { clase, editable } = info;
  const [fecha, setFecha] = useState(info.fecha);
  const [hora, setHora] = useState(info.hora);
  const [motivo, setMotivo] = useState(clase?.motivo || "");
  const [estadoClase, setEstadoClase] = useState(clase?.estado_clase || "pendiente");
  const [alumnos, setAlumnos] = useState([]);
  const [alumnoElegido, setAlumnoElegido] = useState("");
  const [tipoManual, setTipoManual] = useState(clase?.tipo || "Individual");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const reservas = clase?.reservas || [];
  const hayLugarGrupal = !clase || clase.estado === "disponible" || (clase.tipo === "Grupal" && reservas.length < 4);

  useEffect(() => {
    if (!clase || clase.estado !== "bloqueada") {
      listarAlumnos().then(setAlumnos).catch(() => {});
    }
  }, [clase]);

  // Para acciones que cambian la naturaleza del horario (abrir, bloquear,
  // cerrar): se cierra el modal y se refresca la grilla.
  async function ejecutar(accion) {
    setError("");
    setEnviando(true);
    try {
      await accion();
      onGuardado();
    } catch (err) {
      setError(err.message || "Ocurrió un error, probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  // Para acciones dentro de una misma clase (marcar pagos, anotar otro
  // alumno): se refresca pero el modal queda abierto para seguir operando.
  async function ejecutarSinCerrar(accion) {
    setError("");
    setEnviando(true);
    try {
      await accion();
      await onActualizar();
    } catch (err) {
      setError(err.message || "Ocurrió un error, probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const abrirHorario = () =>
    ejecutar(() => crearOActualizarClase({ id: clase?.id, fecha, hora, profesorId, estado: "disponible", tipo: null, motivo: null }));

  const bloquear = () =>
    ejecutar(() => crearOActualizarClase({ id: clase?.id, fecha, hora, profesorId, estado: "bloqueada", motivo: motivo || "Bloqueado por el profesor" }));

  const cambiarEstadoClase = (nuevoEstado) => {
    setEstadoClase(nuevoEstado);
    ejecutarSinCerrar(() =>
      crearOActualizarClase({ id: clase.id, fecha, hora, profesorId, estado: clase.estado, tipo: clase.tipo, estadoClase: nuevoEstado })
    );
  };

  const eliminarFranja = () => ejecutar(() => eliminarClase(clase.id));

  const anotarAlumno = () =>
    ejecutarSinCerrar(async () => {
      if (!alumnoElegido) throw new Error("Elegí un alumno de la lista.");
      let claseId = clase?.id;
      if (!claseId) {
        const nueva = await crearOActualizarClase({ fecha, hora, profesorId, estado: "disponible" });
        claseId = nueva.id;
      }
      await crearReserva({
        claseId,
        alumnoId: alumnoElegido,
        tipo: tipoManual,
        formaPago: "clase",
        metodoPago: "efectivo",
        monto: precioPorTipo(tipoManual, precios),
      });
      setAlumnoElegido("");
    });

  async function verComprobante(ruta) {
    try {
      const url = await urlFirmadaComprobante(ruta);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError("No se pudo abrir el comprobante.");
    }
  }

  return (
    <div className="modal-fondo">
      <article className="modal limpio">
        <button className="cerrar" onClick={onCerrar}>×</button>
        <h2>{editable ? "Crear clase puntual" : formatearLargo(new Date(`${fecha}T00:00:00`))}</h2>
        {!editable && (
          <p className="texto-muted">
            {clase?.estado === "reservada" ? rangoHorario(hora, clase.duracion_minutos || 60) : hora} hs
          </p>
        )}

        {editable && (
          <div className="form-grid">
            <label>
              Fecha
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </label>
            <label>
              Horario
              <select value={hora} onChange={(e) => setHora(e.target.value)}>
                {horariosClase.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </label>
            <small className="texto-muted ancho-total">
              La grilla es de 30 en 30 minutos. Si querés que un alumno pueda reservar acá una clase completa de 1
              hora (o 1h30), abrí también el o los horarios siguientes.
            </small>
          </div>
        )}

        <div className="panel-resumen">
          <p>Individual: <strong>{formatearMoneda(precios.individual)}</strong> · Grupal: <strong>{formatearMoneda(precios.grupal)}</strong> por persona</p>
        </div>

        {error && <div className="error-box">{error}</div>}

        {(!clase || clase.estado === "disponible") && (
          <div className="acciones-modal">
            {!clase && (
              <button className="boton-principal" disabled={enviando} onClick={abrirHorario}>
                Abrir este horario
              </button>
            )}
            <label>
              Motivo del bloqueo (opcional)
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: evento del club" />
            </label>
            <button className="boton-secundario" disabled={enviando} onClick={bloquear}>
              Bloquear horario
            </button>
            {clase && (
              <button className="boton-peligro" disabled={enviando} onClick={eliminarFranja}>
                Cerrar horario
              </button>
            )}
          </div>
        )}

        {clase?.estado === "bloqueada" && (
          <div className="acciones-modal">
            <p className="texto-muted">Motivo: {clase.motivo || "Sin especificar"}</p>
            <button className="boton-principal" disabled={enviando} onClick={abrirHorario}>
              Desbloquear
            </button>
          </div>
        )}

        {clase?.estado === "reservada" && (
          <>
            <div className="lista-alumnos">
              <h3>Alumnos y pagos</h3>
              {reservas.map((r) => (
                <div className="fila-alumno" key={r.id}>
                  <span>{r.perfiles?.nombre} · {r.perfiles?.categoria}</span>
                  <strong className={r.pagado ? "ok" : "pendiente"}>{r.pagado ? "Abonó" : "Debe"}</strong>
                  <small>
                    {r.comprobante_url ? (
                      <button type="button" className="link-comprobante" onClick={() => verComprobante(r.comprobante_url)}>Ver comprobante</button>
                    ) : (
                      "Sin comprobante"
                    )}
                  </small>
                  <div className="acciones-modal">
                    <button
                      type="button"
                      className="boton-secundario"
                      disabled={enviando}
                      onClick={() => ejecutarSinCerrar(() => marcarPagoReserva(r.id, { pagado: !r.pagado }))}
                    >
                      {r.pagado ? "Marcar como no pagado" : "Marcar como pagado"}
                    </button>
                    <button type="button" className="boton-peligro" disabled={enviando} onClick={() => ejecutarSinCerrar(() => cancelarReserva(r.id))}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <label>
              Estado de la clase
              <select value={estadoClase} onChange={(e) => cambiarEstadoClase(e.target.value)}>
                <option value="pendiente">Pendiente</option>
                <option value="en proceso">En proceso</option>
                <option value="finalizada">Finalizada</option>
              </select>
            </label>
          </>
        )}

        {hayLugarGrupal && clase?.estado !== "bloqueada" && (
          <div className="form-card">
            <h3>Anotar alumno manualmente</h3>
            <p className="texto-muted">
              Para reservas que te avisaron por fuera de la app (WhatsApp, en persona, etc). Quedan siempre como
              clase de 1 hora; si es de 1h30 anotá también al alumno en el horario siguiente.
            </p>
            <div className="form-grid">
              <label>
                Alumno
                <select value={alumnoElegido} onChange={(e) => setAlumnoElegido(e.target.value)}>
                  <option value="">Elegir…</option>
                  {alumnos.map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre} ({a.categoria})</option>
                  ))}
                </select>
              </label>
              <label>
                Tipo
                <select value={tipoManual} onChange={(e) => setTipoManual(e.target.value)} disabled={!!clase?.tipo}>
                  <option>Individual</option>
                  <option>Grupal</option>
                </select>
              </label>
            </div>
            <button className="boton-principal" disabled={enviando} onClick={anotarAlumno}>
              Anotar
            </button>
          </div>
        )}
      </article>
    </div>
  );
}

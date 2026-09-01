import { useState } from "react";
import { capacidadGrupal, duracionesClase, cierreCalendario } from "../../datos/clases.js";
import { formatearMoneda, precioAbono, precioPorDuracion } from "../../utilidades/precios.js";
import { cabeEnCalendario, rangoHorario } from "../../utilidades/horarios.js";
import { formatearLargo } from "../../utilidades/fechas.js";
import { crearReserva, subirComprobante } from "../../servicios/reservas.js";
import { iniciarPagoMercadoPago } from "../../servicios/mercadopago.js";

export default function ModalReservaAlumno({ info, precios, usuario, onCerrar, onReservado }) {
  const { clase, fecha, hora, tramosSiguientes = [] } = info;
  const yaCompleto = clase?.estado === "reservada" && (clase.tipo === "Individual" || (clase.cupo_ocupado || 0) >= capacidadGrupal);
  const bloqueado = clase?.estado === "bloqueada";
  // Si ya hay al menos un alumno anotado (clase Grupal con lugar), la
  // duración quedó fijada por quien reservó primero: no se puede elegir.
  const esClaseNueva = !clase || clase.estado === "disponible";

  const [tipo, setTipo] = useState(clase?.tipo || "Individual");

  // Duraciones que realmente entran: tienen que terminar antes del cierre
  // (16:30) y, si son nuevas, los tramos de 30' siguientes tienen que estar
  // libres (si no, alguien más ya reservó encima de la continuidad). Vale
  // igual para Individual y Grupal: los horarios son los mismos para las
  // dos modalidades.
  const opcionesDuracion = esClaseNueva
    ? duracionesClase.filter((d) => {
        if (!cabeEnCalendario(hora, d.minutos, cierreCalendario)) return false;
        const pasos = d.minutos / 30 - 1;
        for (let i = 0; i < pasos; i++) {
          const tramo = tramosSiguientes[i];
          if (!tramo || tramo.estado !== "disponible") return false;
        }
        return true;
      })
    : [{ minutos: clase.duracion_minutos || 60, etiqueta: (clase.duracion_minutos || 60) === 90 ? "1 hora y media" : "1 hora" }];

  const sinContinuidad = esClaseNueva && opcionesDuracion.length === 0;

  const [duracionMinutos, setDuracionMinutos] = useState(opcionesDuracion[0]?.minutos || 60);
  const [formaPago, setFormaPago] = useState("clase");
  const [metodoPago, setMetodoPago] = useState("mercadopago");
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const precio = precioPorDuracion(tipo, precios, duracionMinutos);
  const abono = precioAbono(tipo, precios, 4, duracionMinutos);
  const monto = formaPago === "abono" ? abono : precio;

  async function confirmar() {
    if (!clase?.id) {
      setError("Este horario todavía no está habilitado por el profesor. Probá con otro.");
      return;
    }
    setError("");
    setEnviando(true);
    try {
      const reserva = await crearReserva({
        claseId: clase.id,
        alumnoId: usuario.id,
        tipo,
        formaPago,
        metodoPago: metodoPago === "mercadopago" ? null : metodoPago,
        monto,
        duracionMinutos,
      });

      if (metodoPago === "mercadopago") {
        const initPoint = await iniciarPagoMercadoPago(reserva.id);
        window.location.href = initPoint;
        return;
      }

      if (metodoPago === "transferencia" && archivo) {
        await subirComprobante(reserva.id, archivo);
      }

      onReservado();
      onCerrar();
    } catch (err) {
      setError(err.message || "No se pudo completar la reserva.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="modal-fondo">
      <article className="modal limpio">
        <button className="cerrar" onClick={onCerrar}>×</button>
        <h2>
          {formatearLargo(new Date(`${fecha}T00:00:00`))} · {rangoHorario(hora, duracionMinutos)}
        </h2>

        {bloqueado || yaCompleto || sinContinuidad ? (
          <p className="texto-muted">
            {bloqueado
              ? clase.motivo || "Este horario está bloqueado."
              : yaCompleto
              ? "Este horario ya está completo. Elegí otro turno."
              : "Este horario no tiene continuidad libre a partir de acá (el siguiente tramo ya está ocupado). Elegí otro horario."}
          </p>
        ) : (
          <>
            <p className="texto-muted">Elegí el tipo de clase, la duración y la forma de pago. No se aceptan señas.</p>

            <div className="opciones-dos">
              <button
                type="button"
                className={tipo === "Individual" ? "opcion activa" : "opcion"}
                onClick={() => setTipo("Individual")}
                disabled={!!clase?.tipo}
              >
                <strong>Individual</strong>
                <span>{formatearMoneda(precios.individual)} la hora</span>
              </button>
              <button
                type="button"
                className={tipo === "Grupal" ? "opcion activa" : "opcion"}
                onClick={() => setTipo("Grupal")}
                disabled={!!clase?.tipo}
              >
                <strong>Grupal</strong>
                <span>{formatearMoneda(precios.grupal)} por persona</span>
              </button>
            </div>

            {esClaseNueva && (
              <>
                <label>Duración</label>
                <div className="opciones-dos">
                  {duracionesClase.map((d) => {
                    const disponible = opcionesDuracion.some((o) => o.minutos === d.minutos);
                    return (
                      <button
                        key={d.minutos}
                        type="button"
                        className={duracionMinutos === d.minutos ? "opcion activa" : "opcion"}
                        disabled={!disponible}
                        onClick={() => setDuracionMinutos(d.minutos)}
                      >
                        <strong>{d.etiqueta}</strong>
                        {!disponible && <span>No disponible</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="panel-resumen">
              <h3>Resumen</h3>
              <p>Horario: <strong>{rangoHorario(hora, duracionMinutos)}</strong></p>
              <p>Pago por clase: <strong>{formatearMoneda(precio)}</strong></p>
              <p>Abono mensual (4 clases): <strong>{formatearMoneda(abono)}</strong></p>
              <small>Podés cancelar sin problema hasta 12 horas antes de la clase. Con menos de 12 horas, la cancelación queda bloqueada.</small>
            </div>

            <label>Forma de pago</label>
            <select className="input-grande" value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
              <option value="clase">Pagar cada clase</option>
              <option value="abono">Abono mensual</option>
            </select>

            <label>Método de pago</label>
            <select className="input-grande" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
              <option value="mercadopago">Mercado Pago</option>
              <option value="transferencia">Transferencia (subo comprobante)</option>
              <option value="efectivo">Efectivo en el club</option>
            </select>

            {metodoPago === "transferencia" && (
              <label className="boton-secundario file-label">
                {archivo ? archivo.name : "Cargar comprobante"}
                <input type="file" hidden accept="image/*,application/pdf" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
              </label>
            )}

            {error && <div className="error-box">{error}</div>}

            <div className="acciones-modal">
              <button className="boton-principal" onClick={confirmar} disabled={enviando}>
                {enviando ? "Procesando…" : metodoPago === "mercadopago" ? "Ir a Mercado Pago" : "Confirmar reserva"}
              </button>
            </div>
          </>
        )}
      </article>
    </div>
  );
}

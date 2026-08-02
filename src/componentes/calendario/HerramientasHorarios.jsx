import { useState } from "react";
import { horariosApertura } from "../../datos/clases.js";
import { claveFecha, nombresDiaSemana, obtenerSemana } from "../../utilidades/fechas.js";
import { bloquearDiaCompleto, desbloquearDiaCompleto, generarHorariosSemana } from "../../servicios/clases.js";

export default function HerramientasHorarios({ profesorId, semanaOffset, onCambios }) {
  const [modoApertura, setModoApertura] = useState("semana"); // "semana" | "dias"
  const [diasElegidos, setDiasElegidos] = useState(() => new Set([0, 1, 2, 3, 4, 5]));
  const [semanasAdelante, setSemanasAdelante] = useState(4);
  const [abriendo, setAbriendo] = useState(false);
  const [avisoApertura, setAvisoApertura] = useState("");

  const [fechaBloqueo, setFechaBloqueo] = useState(() => claveFecha(new Date()));
  const [motivoBloqueo, setMotivoBloqueo] = useState("");
  const [procesandoBloqueo, setProcesandoBloqueo] = useState(false);
  const [avisoBloqueo, setAvisoBloqueo] = useState("");

  function alternarDia(indice) {
    setDiasElegidos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(indice)) siguiente.delete(indice);
      else siguiente.add(indice);
      return siguiente;
    });
  }

  async function abrirHorarios() {
    if (modoApertura === "dias" && diasElegidos.size === 0) {
      setAvisoApertura("Elegí al menos un día de la semana.");
      return;
    }
    setAbriendo(true);
    setAvisoApertura("");
    try {
      let fechas;
      if (modoApertura === "semana") {
        fechas = obtenerSemana(semanaOffset).map(claveFecha);
      } else {
        fechas = [];
        for (let i = 0; i < semanasAdelante; i++) {
          const semana = obtenerSemana(semanaOffset + i);
          semana.forEach((dia, indice) => {
            if (diasElegidos.has(indice)) fechas.push(claveFecha(dia));
          });
        }
      }
      await generarHorariosSemana({ fechas, horarios: horariosApertura, profesorId });
      setAvisoApertura(
        `Listo: se abrieron los horarios de ${fechas.length} día${fechas.length === 1 ? "" : "s"}. Los que ya existían no se tocaron.`
      );
      onCambios();
    } catch (err) {
      setAvisoApertura(`No se pudieron abrir los horarios${err?.message ? `: ${err.message}` : "."}`);
    } finally {
      setAbriendo(false);
    }
  }

  async function bloquear() {
    setProcesandoBloqueo(true);
    setAvisoBloqueo("");
    try {
      const resultado = await bloquearDiaCompleto({ fecha: fechaBloqueo, profesorId, motivo: motivoBloqueo });
      const cantidad = resultado.yaReservados.length;
      const avisoExtra = cantidad
        ? ` ${cantidad} horario${cantidad === 1 ? "" : "s"} ya ten${cantidad === 1 ? "ía" : "ían"} alumnos anotados y no se toc${
            cantidad === 1 ? "ó" : "aron"
          } (${resultado.yaReservados.join(", ")}).`
        : "";
      setAvisoBloqueo(`Día bloqueado (${resultado.bloqueados} horarios).${avisoExtra}`);
      onCambios();
    } catch (err) {
      setAvisoBloqueo(`No se pudo bloquear el día${err?.message ? `: ${err.message}` : "."}`);
    } finally {
      setProcesandoBloqueo(false);
    }
  }

  async function desbloquear() {
    setProcesandoBloqueo(true);
    setAvisoBloqueo("");
    try {
      await desbloquearDiaCompleto({ fecha: fechaBloqueo, profesorId });
      setAvisoBloqueo("Día desbloqueado.");
      onCambios();
    } catch (err) {
      setAvisoBloqueo(`No se pudo desbloquear el día${err?.message ? `: ${err.message}` : "."}`);
    } finally {
      setProcesandoBloqueo(false);
    }
  }

  return (
    <section className="form-card aviso-pagina herramientas-horarios">
      <h2>Herramientas de horarios</h2>
      <div className="herramientas-grid">
        <div>
          <h3>Abrir horarios</h3>
          <p className="texto-muted">Elegí cómo abrir la agenda para tus alumnos.</p>
          <div className="opciones-dos">
            <button type="button" className={modoApertura === "semana" ? "opcion activa" : "opcion"} onClick={() => setModoApertura("semana")}>
              <strong>Esta semana</strong>
            </button>
            <button type="button" className={modoApertura === "dias" ? "opcion activa" : "opcion"} onClick={() => setModoApertura("dias")}>
              <strong>Días recurrentes</strong>
            </button>
          </div>

          {modoApertura === "dias" && (
            <div className="form-grid">
              <label className="ancho-total">
                Días de la semana
                <div className="dias-semana-selector">
                  {nombresDiaSemana.map((nombre, indice) => (
                    <button
                      type="button"
                      key={nombre}
                      className={diasElegidos.has(indice) ? "opcion activa" : "opcion"}
                      onClick={() => alternarDia(indice)}
                    >
                      {nombre.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </label>
              <label>
                Semanas hacia adelante
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={semanasAdelante}
                  onChange={(e) => setSemanasAdelante(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                />
              </label>
            </div>
          )}

          {avisoApertura && <div className="panel-resumen">{avisoApertura}</div>}
          <div className="acciones-modal">
            <button className="boton-principal" disabled={abriendo} onClick={abrirHorarios}>
              {abriendo ? "Abriendo…" : "Abrir horarios elegidos"}
            </button>
          </div>
        </div>

        <div>
          <h3>Bloquear o desbloquear un día</h3>
          <p className="texto-muted">Para vacaciones, feriados o cualquier día que no des clase.</p>
          <div className="form-grid">
            <label>
              Fecha
              <input type="date" value={fechaBloqueo} onChange={(e) => setFechaBloqueo(e.target.value)} />
            </label>
            <label>
              Motivo (opcional)
              <input value={motivoBloqueo} onChange={(e) => setMotivoBloqueo(e.target.value)} placeholder="Ej: vacaciones, feriado" />
            </label>
          </div>
          {avisoBloqueo && <div className="panel-resumen">{avisoBloqueo}</div>}
          <div className="acciones-modal">
            <button className="boton-secundario" disabled={procesandoBloqueo} onClick={bloquear}>
              Bloquear todo el día
            </button>
            <button className="boton-secundario" disabled={procesandoBloqueo} onClick={desbloquear}>
              Desbloquear todo el día
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

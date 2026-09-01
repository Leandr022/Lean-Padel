import { useEffect, useState } from "react";
import LayoutPrincipal from "../../layouts/LayoutPrincipal.jsx";
import { listarRendiciones, marcarRendicionPagada } from "../../servicios/rendiciones.js";
import { formatearMoneda } from "../../utilidades/precios.js";
import { formatearLargo } from "../../utilidades/fechas.js";

export default function RendicionesAdmin() {
  const [periodo, setPeriodo] = useState("todos");
  const [rendiciones, setRendiciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  async function cargar() {
    setCargando(true);
    try {
      setRendiciones(await listarRendiciones());
    } catch {
      setError("No se pudieron cargar las rendiciones.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const visibles = periodo === "todos" ? rendiciones : rendiciones.filter((r) => r.periodo === periodo);

  async function confirmar(id, estado) {
    try {
      await marcarRendicionPagada(id, estado);
      cargar();
    } catch {
      setError("No se pudo actualizar la rendición.");
    }
  }

  return (
    <LayoutPrincipal titulo="Rendiciones" subtitulo="Resumen por profesor y forma de rendición.">
      <section className="form-card">
        <label>
          Período de rendición
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="semanal">Semanal</option>
            <option value="quincenal">Quincenal</option>
            <option value="mensual">Mensual</option>
          </select>
        </label>
      </section>

      {error && <div className="error-box aviso-pagina">{error}</div>}
      {cargando && <p className="texto-muted">Cargando…</p>}
      {!cargando && visibles.length === 0 && <p className="texto-muted">Todavía no hay rendiciones registradas.</p>}

      {visibles.map((r) => (
        <section className="tabla-card" key={r.id}>
          <h2>{r.perfiles?.nombre}</h2>
          <p>
            Período: {formatearLargo(new Date(`${r.desde}T00:00:00`))} — {formatearLargo(new Date(`${r.hasta}T00:00:00`))} · Comisión club: {formatearMoneda(r.monto)}
          </p>
          <div className="estado-rendicion">
            <strong className={r.estado === "pendiente" ? "pendiente" : "ok"}>
              {r.estado === "pendiente" ? "Pendiente de confirmación" : `Recibido por ${r.estado}`}
            </strong>
            {r.estado === "pendiente" && (
              <>
                <button className="boton-principal" onClick={() => confirmar(r.id, "transferencia")}>Marcar transferencia</button>
                <button className="boton-secundario" onClick={() => confirmar(r.id, "efectivo")}>Marcar efectivo</button>
              </>
            )}
          </div>
          {r.estado === "pendiente" && r.metodo_informado && (
            <small className="texto-muted">
              El profesor avisó que pagó por <strong>{r.metodo_informado}</strong> — confirmá arriba una vez que lo recibas.
            </small>
          )}
          <small>Al confirmar se guarda fecha y hora de la operación.</small>
        </section>
      ))}
    </LayoutPrincipal>
  );
}

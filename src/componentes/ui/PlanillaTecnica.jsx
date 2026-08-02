import { useEffect, useState } from "react";
import { categoriasTecnicas } from "../../datos/tecnica.js";
import { obtenerPlanillaAlumno, guardarItemPlanilla } from "../../servicios/planillas.js";

function colorPuntaje(valor) {
  if (valor >= 8) return "verde";
  if (valor >= 5) return "amarillo";
  return "rojo";
}

const vacio = { trabajado: false, alumno: 0, profesor: 0, observacion: "" };

/**
 * modoProfesor = true → el profesor puede editar y guarda en Supabase al vuelo.
 * modoProfesor = false → el alumno ve su ficha en modo solo lectura.
 */
export default function PlanillaTecnica({ alumnoId, modoProfesor = false }) {
  const [categoriaActiva, setCategoriaActiva] = useState(categoriasTecnicas[0].id);
  const categoria = categoriasTecnicas.find((c) => c.id === categoriaActiva);
  const [estado, setEstado] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!alumnoId) return;
    setCargando(true);
    obtenerPlanillaAlumno(alumnoId)
      .then((filas) => {
        const mapa = {};
        filas.forEach((f) => {
          mapa[`${f.categoria_id}__${f.golpe}`] = {
            trabajado: f.trabajado,
            alumno: f.puntaje_alumno,
            profesor: f.puntaje_profesor,
            observacion: f.observacion || "",
          };
        });
        setEstado(mapa);
      })
      .catch(() => setError("No se pudo cargar la planilla técnica."))
      .finally(() => setCargando(false));
  }, [alumnoId]);

  function clave(golpe) {
    return `${categoriaActiva}__${golpe}`;
  }

  async function guardar(golpe, item) {
    try {
      await guardarItemPlanilla({
        alumnoId,
        categoriaId: categoriaActiva,
        golpe,
        trabajado: item.trabajado,
        puntajeAlumno: item.alumno,
        puntajeProfesor: item.profesor,
        observacion: item.observacion,
      });
    } catch {
      setError("No se pudo guardar ese cambio. Probá de nuevo.");
    }
  }

  function actualizar(golpe, campo, valor) {
    const item = { ...vacio, ...(estado[clave(golpe)] || {}), [campo]: valor };
    setEstado((prev) => ({ ...prev, [clave(golpe)]: item }));
    if (campo !== "observacion") guardar(golpe, item);
  }

  function alSalirDeObservacion(golpe) {
    guardar(golpe, estado[clave(golpe)] || vacio);
  }

  if (cargando) return <p className="texto-muted">Cargando planilla técnica…</p>;

  return (
    <section className="planilla-card">
      {error && <div className="error-box">{error}</div>}
      <div className="tabs-tecnica">
        {categoriasTecnicas.map((c) => (
          <button key={c.id} className={categoriaActiva === c.id ? "tab activo" : "tab"} onClick={() => setCategoriaActiva(c.id)}>
            {c.nombre}
          </button>
        ))}
      </div>
      <div className="golpes-lista">
        {categoria.golpes.map((golpe) => {
          const item = estado[clave(golpe)] || vacio;
          return (
            <article className="golpe-card" key={golpe}>
              <div className="golpe-header">
                <h3>{golpe}</h3>
                <label className="check-limpio">
                  <input type="checkbox" checked={item.trabajado} disabled={!modoProfesor} onChange={(e) => actualizar(golpe, "trabajado", e.target.checked)} /> Trabajado
                </label>
              </div>
              <div className="rating-row">
                <span>Alumno</span>
                <input type="range" min="0" max="10" value={item.alumno} disabled={!modoProfesor} onChange={(e) => actualizar(golpe, "alumno", Number(e.target.value))} />
                <strong className={colorPuntaje(item.alumno)}>{item.alumno}/10</strong>
              </div>
              <div className="rating-row">
                <span>Profesor</span>
                <input type="range" min="0" max="10" value={item.profesor} disabled={!modoProfesor} onChange={(e) => actualizar(golpe, "profesor", Number(e.target.value))} />
                <strong className={colorPuntaje(item.profesor)}>{item.profesor}/10</strong>
              </div>
              <textarea
                className="textarea-limpio"
                placeholder="Observaciones del golpe"
                value={item.observacion}
                disabled={!modoProfesor}
                onChange={(e) => actualizar(golpe, "observacion", e.target.value)}
                onBlur={() => modoProfesor && alSalirDeObservacion(golpe)}
              />
            </article>
          );
        })}
      </div>
    </section>
  );
}

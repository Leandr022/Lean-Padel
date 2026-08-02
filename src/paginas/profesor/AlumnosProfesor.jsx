import { useEffect, useState } from "react";
import LayoutPrincipal from "../../layouts/LayoutPrincipal.jsx";
import PlanillaTecnica from "../../componentes/ui/PlanillaTecnica.jsx";
import { listarAlumnos, actualizarPerfil } from "../../servicios/perfiles.js";
import { categoriaValida, categoriasPorGenero } from "../../datos/categorias.js";

export default function AlumnosProfesor() {
  const [alumnos, setAlumnos] = useState([]);
  const [alumno, setAlumno] = useState(null);
  const [form, setForm] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  function cargar() {
    return listarAlumnos()
      .then((datos) => {
        setAlumnos(datos);
        setAlumno((actual) => {
          const siguiente = actual ? datos.find((a) => a.id === actual.id) || datos[0] || null : datos[0] || null;
          return siguiente;
        });
      })
      .catch(() => setError("No se pudo cargar la lista de alumnos."));
  }

  useEffect(() => {
    cargar().finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    if (!alumno) {
      setForm(null);
      return;
    }
    setForm({
      genero: alumno.genero || "Caballero",
      categoria: alumno.categoria,
      posicion: alumno.posicion,
      mano: alumno.mano,
      telefono: alumno.telefono || "",
      telefono_visible: alumno.telefono_visible,
      instagram: alumno.instagram || "",
    });
    setMensaje("");
    setError("");
  }, [alumno]);

  function cambiarGenero(genero) {
    setForm((prev) => ({ ...prev, genero, categoria: categoriaValida(prev.categoria, genero) }));
  }

  async function guardar() {
    if (!alumno || !form) return;
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      await actualizarPerfil(alumno.id, form);
      setMensaje("Cambios guardados.");
      await cargar();
    } catch (err) {
      setError(`No se pudieron guardar los cambios${err?.message ? `: ${err.message}` : "."}`);
    } finally {
      setGuardando(false);
    }
  }

  const opcionesCategoria = form ? categoriasPorGenero(form.genero) : [];

  return (
    <LayoutPrincipal titulo="Gestión de alumnos" subtitulo="Entrá al perfil, corregí sus datos y completá la planilla técnica.">
      {error && <div className="error-box aviso-pagina">{error}</div>}
      {cargando && <p className="texto-muted">Cargando…</p>}

      {!cargando && alumnos.length === 0 && <p className="texto-muted">Todavía no hay alumnos registrados.</p>}

      {alumno && form && (
        <div className="dos-columnas">
          <section className="lista-card">
            {alumnos.map((a) => (
              <button className={alumno.id === a.id ? "alumno-item activo" : "alumno-item"} onClick={() => setAlumno(a)} key={a.id}>
                <strong>{a.nombre}</strong>
                <span>{a.categoria} · {a.genero}</span>
              </button>
            ))}
          </section>
          <section className="detalle-card">
            <h2>{alumno.nombre}</h2>
            <p className="texto-muted">{alumno.email}</p>

            <div className="form-grid aviso-pagina">
              <label>
                Género
                <select value={form.genero} onChange={(e) => cambiarGenero(e.target.value)}>
                  <option>Caballero</option>
                  <option>Dama</option>
                </select>
              </label>
              <label>
                Categoría
                <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  {opcionesCategoria.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Posición
                <select value={form.posicion} onChange={(e) => setForm({ ...form, posicion: e.target.value })}>
                  <option>Drive</option>
                  <option>Revés</option>
                  <option>Indistinto</option>
                </select>
              </label>
              <label>
                Mano
                <select value={form.mano} onChange={(e) => setForm({ ...form, mano: e.target.value })}>
                  <option>Derecha</option>
                  <option>Izquierda</option>
                </select>
              </label>
              <label>
                Teléfono
                <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              </label>
              <label>
                Visibilidad teléfono
                <select
                  value={form.telefono_visible ? "visible" : "oculto"}
                  onChange={(e) => setForm({ ...form, telefono_visible: e.target.value === "visible" })}
                >
                  <option value="visible">Visible</option>
                  <option value="oculto">Oculto</option>
                </select>
              </label>
              <label>
                Instagram
                <input placeholder="@usuario" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
              </label>
            </div>

            {error && <div className="error-box">{error}</div>}
            {mensaje && <div className="panel-resumen">{mensaje}</div>}

            <div className="acciones-modal aviso-pagina">
              <button className="boton-principal" disabled={guardando} onClick={guardar}>
                {guardando ? "Guardando…" : "Guardar cambios del alumno"}
              </button>
            </div>

            <PlanillaTecnica alumnoId={alumno.id} modoProfesor />
          </section>
        </div>
      )}
    </LayoutPrincipal>
  );
}

import { useState } from "react";
import LayoutPrincipal from "../../layouts/LayoutPrincipal.jsx";
import usarAutenticacion from "../../ganchos/usarAutenticacion.js";
import { actualizarPerfil, subirFotoPerfil } from "../../servicios/perfiles.js";
import { categoriaValida, categoriasPorGenero } from "../../datos/categorias.js";

export default function PerfilAlumno() {
  const { usuario } = usarAutenticacion();
  const [form, setForm] = useState({
    instagram: usuario.instagram || "",
    telefono: usuario.telefono || "",
    telefono_visible: usuario.telefono_visible,
    genero: usuario.genero || "Caballero",
    categoria: usuario.categoria,
    posicion: usuario.posicion,
    foto_url: usuario.foto_url || "",
  });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const opcionesCategoria = categoriasPorGenero(form.genero);

  // Al cambiar el género hay que reacomodar la categoría: las "C" son de
  // Caballeros y las "D" de Damas.
  function cambiarGenero(genero) {
    setForm((prev) => ({ ...prev, genero, categoria: categoriaValida(prev.categoria, genero) }));
  }

  async function subirFoto(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    try {
      const url = await subirFotoPerfil(usuario.id, archivo);
      setForm((prev) => ({ ...prev, foto_url: url }));
    } catch {
      setError("No se pudo subir la foto.");
    }
  }

  async function guardar() {
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      await actualizarPerfil(usuario.id, form);
      setMensaje("Cambios guardados. Se van a ver reflejados al recargar la página.");
    } catch (err) {
      setError(`No se pudieron guardar los cambios${err?.message ? `: ${err.message}` : "."}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <LayoutPrincipal titulo="Mi perfil" subtitulo="Datos visibles para profesor y alumnos según tu configuración.">
      <section className="form-card">
        <div className="perfil-header">
          <div className="avatar-grande">{usuario.nombre?.charAt(0)}</div>
          <div>
            <h2>{usuario.nombre}</h2>
            <p>{usuario.categoria} · {usuario.genero} · {usuario.posicion}</p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            Foto de perfil
            <input type="file" accept="image/*" onChange={subirFoto} />
          </label>
          <label>
            Instagram
            <input placeholder="@usuario" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
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
        </div>
        {error && <div className="error-box">{error}</div>}
        {mensaje && <div className="panel-resumen">{mensaje}</div>}
        <button className="boton-principal" disabled={guardando} onClick={guardar}>
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </section>
    </LayoutPrincipal>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import LayoutPrincipal from "../../layouts/LayoutPrincipal.jsx";
import usarAutenticacion from "../../ganchos/usarAutenticacion.js";
import { actualizarPerfil } from "../../servicios/perfiles.js";

export default function ConfiguracionProfesor() {
  const { usuario } = usarAutenticacion();
  const [nombre, setNombre] = useState(usuario.nombre || "");
  const [avisosActivos, setAvisosActivos] = useState(usuario.avisos_whatsapp_activo !== false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  async function guardar() {
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      await actualizarPerfil(usuario.id, { nombre, avisos_whatsapp_activo: avisosActivos });
      setMensaje("Cambios guardados. Se van a ver reflejados al recargar la página.");
    } catch (err) {
      setError(`No se pudieron guardar los cambios${err?.message ? `: ${err.message}` : "."}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <LayoutPrincipal titulo="Configuración" subtitulo="Tu cuenta y tus avisos.">
      <section className="form-card">
        <h2>Mi cuenta</h2>
        <div className="form-grid">
          <label>
            Tu nombre
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre..." />
          </label>
        </div>
      </section>

      <section className="form-card">
        <h2>Notificaciones</h2>
        <p className="texto-muted">
          Elegí si querés que te llegue un WhatsApp automático cada vez que un alumno reserva una clase (necesita
          estar configurado el aviso — ver el README del proyecto si todavía no lo activaste).
        </p>
        <div className="opciones-dos">
          <button
            type="button"
            className={avisosActivos ? "opcion activa" : "opcion"}
            onClick={() => setAvisosActivos(true)}
          >
            Activado
          </button>
          <button
            type="button"
            className={!avisosActivos ? "opcion activa" : "opcion"}
            onClick={() => setAvisosActivos(false)}
          >
            Desactivado
          </button>
        </div>
      </section>

      {error && <div className="error-box">{error}</div>}
      {mensaje && <div className="panel-resumen">{mensaje}</div>}
      <button className="boton-principal" disabled={guardando} onClick={guardar}>
        {guardando ? "Guardando…" : "Guardar cambios"}
      </button>

      <section className="form-card">
        <h2>Accesos rápidos</h2>
        <div className="opciones-dos">
          <Link className="boton-secundario" to="/profesor/calendario">Mis horarios</Link>
          <Link className="boton-secundario" to="/profesor/comisiones">Comisiones club</Link>
        </div>
      </section>
    </LayoutPrincipal>
  );
}

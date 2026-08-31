import { useEffect, useState } from "react";
import LayoutPrincipal from "../../layouts/LayoutPrincipal.jsx";
import usarAutenticacion from "../../ganchos/usarAutenticacion.js";
import { listarTodosLosUsuarios, cambiarRolUsuario, crearProfesor } from "../../servicios/perfiles.js";

const etiquetaRol = { ALUMNO: "Alumno", PROFESOR: "Profesor", ADMIN: "Admin" };

export default function GestionUsuariosAdmin() {
  const { usuario } = usarAutenticacion();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [rolesEditados, setRolesEditados] = useState({});
  const [guardandoId, setGuardandoId] = useState(null);

  const [form, setForm] = useState({ nombre: "", email: "", password: "" });
  const [creando, setCreando] = useState(false);
  const [errorCreacion, setErrorCreacion] = useState("");

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      setUsuarios(await listarTodosLosUsuarios());
    } catch {
      setError("No se pudo cargar la lista de cuentas.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function guardarRol(id) {
    const nuevoRol = rolesEditados[id];
    if (!nuevoRol) return;
    setGuardandoId(id);
    setError("");
    setMensaje("");
    try {
      await cambiarRolUsuario(id, nuevoRol);
      setMensaje("Rol actualizado.");
      await cargar();
      setRolesEditados((prev) => {
        const copia = { ...prev };
        delete copia[id];
        return copia;
      });
    } catch (err) {
      setError(`No se pudo cambiar el rol${err?.message ? `: ${err.message}` : "."}`);
    } finally {
      setGuardandoId(null);
    }
  }

  async function crear(e) {
    e.preventDefault();
    setErrorCreacion("");
    setMensaje("");
    setCreando(true);
    try {
      await crearProfesor(form);
      setMensaje(`Cuenta de profesor creada para ${form.email}. Ya puede iniciar sesión con esa contraseña.`);
      setForm({ nombre: "", email: "", password: "" });
      await cargar();
    } catch (err) {
      setErrorCreacion(err?.message || "No se pudo crear la cuenta.");
    } finally {
      setCreando(false);
    }
  }

  return (
    <LayoutPrincipal titulo="Gestión de usuarios" subtitulo="Creá cuentas de profesor y validá el rol de cada cuenta del club.">
      {error && <div className="error-box aviso-pagina">{error}</div>}
      {mensaje && <div className="panel-resumen aviso-pagina">{mensaje}</div>}

      <section className="form-card aviso-pagina">
        <h2>Crear cuenta de profesor</h2>
        <p className="texto-muted">
          Para que alguien más dé clases en el club, cargá acá su nombre, email y una contraseña provisoria. La cuenta
          queda lista para usar de una: no hace falta que confirme el email.
        </p>
        <form className="form-grid" onSubmit={crear}>
          <label>
            Nombre
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label>
            Contraseña provisoria
            <input
              type="password"
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>
          {errorCreacion && <div className="error-box ancho-total">{errorCreacion}</div>}
          <button className="boton-principal ancho-total" disabled={creando}>
            {creando ? "Creando…" : "Crear cuenta de profesor"}
          </button>
        </form>
      </section>

      <section className="tabla-card">
        <h2>Todas las cuentas</h2>
        {cargando && <p className="texto-muted">Cargando…</p>}
        {!cargando && usuarios.length === 0 && <p className="texto-muted">No hay cuentas registradas.</p>}

        {!cargando && usuarios.length > 0 && (
          <div className="lista-alumnos aviso-pagina">
            {usuarios.map((u) => {
              const esUnoMismo = u.id === usuario?.id;
              const rolSeleccionado = rolesEditados[u.id] ?? u.rol;
              const hayCambio = rolSeleccionado !== u.rol;
              return (
                <div className="fila-alumno" key={u.id}>
                  <div>
                    <strong>
                      {u.nombre} {u.apellido || ""}
                    </strong>
                    <br />
                    <span className="texto-muted">{u.email}</span>
                  </div>
                  {esUnoMismo ? (
                    <span className="texto-muted">{etiquetaRol[u.rol]} (vos)</span>
                  ) : (
                    <select
                      value={rolSeleccionado}
                      onChange={(e) => setRolesEditados((prev) => ({ ...prev, [u.id]: e.target.value }))}
                    >
                      <option value="ALUMNO">Alumno</option>
                      <option value="PROFESOR">Profesor</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  )}
                  {!esUnoMismo && hayCambio && (
                    <button
                      className="boton-principal"
                      disabled={guardandoId === u.id}
                      onClick={() => guardarRol(u.id)}
                    >
                      {guardandoId === u.id ? "Guardando…" : "Guardar"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </LayoutPrincipal>
  );
}

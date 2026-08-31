import { NavLink } from "react-router-dom";
import usarAutenticacion from "../ganchos/usarAutenticacion.js";
import Icono from "../componentes/ui/Icono.jsx";

const enlaces = {
  ALUMNO: [
    ["/alumno", "Inicio", "inicio"],
    ["/alumno/reservas", "Reservas", "calendario"],
    ["/alumno/progreso", "Progreso", "progreso"],
    ["/alumno/perfil", "Perfil", "perfil"],
  ],
  PROFESOR: [
    ["/profesor", "Panel", "inicio"],
    ["/profesor/calendario", "Calendario", "calendario"],
    ["/profesor/alumnos", "Alumnos", "alumnos"],
    ["/profesor/comisiones", "Comisiones club", "comisiones"],
    ["/profesor/configuracion", "Configuración", "configuracion"],
  ],
  ADMIN: [
    ["/admin", "Panel", "inicio"],
    ["/admin/usuarios", "Usuarios", "alumnos"],
    ["/admin/rendiciones", "Rendiciones", "rendiciones"],
    ["/admin/estadisticas", "Estadísticas", "estadisticas"],
    ["/admin/configuracion", "Configuración", "configuracion"],
  ],
};

export default function LayoutPrincipal({ titulo, subtitulo, children }) {
  const { usuario, cerrarSesion } = usarAutenticacion();
  const enlacesRol = enlaces[usuario?.rol] || [];
  const esInicio = (to) => to === "/alumno" || to === "/profesor" || to === "/admin";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="marca">
          <span>LS</span>
          <div>
            <strong>Padel Coach</strong>
            <small>{usuario?.rol}</small>
          </div>
        </div>
        <nav>
          {enlacesRol.map(([to, label, icono]) => (
            <NavLink key={to} to={to} end={esInicio(to)}>
              <Icono nombre={icono} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="boton-secundario boton-salir" onClick={cerrarSesion}>
          <Icono nombre="salir" />
          <span>Cerrar sesión</span>
        </button>
      </aside>
      <main className="contenido">
        <header className="topbar">
          <div>
            <h1>{titulo}</h1>
            <p>{subtitulo}</p>
          </div>
          <div className="topbar-derecha">
            <div className="usuario-chip">
              <span className="avatar-mini">{usuario?.nombre?.charAt(0)}</span>
              <span className="usuario-nombre">{usuario?.nombre}</span>
            </div>
            <button className="boton-salir-movil" onClick={cerrarSesion} aria-label="Cerrar sesión">
              <Icono nombre="salir" />
            </button>
          </div>
        </header>
        {children}
      </main>
      <nav className="nav-movil">
        {enlacesRol.map(([to, label, icono]) => (
          <NavLink key={to} to={to} end={esInicio(to)}>
            <Icono nombre={icono} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

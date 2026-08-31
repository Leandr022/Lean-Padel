import { Navigate } from "react-router-dom";
import usarAutenticacion from "../ganchos/usarAutenticacion.js";
export default function RutaProtegida({ children, roles }) {
  const { usuario, cargando } = usarAutenticacion();
  if (cargando) return <main className="pantalla-carga">Cargando…</main>;
  if (!usuario) return <Navigate to="/login" replace />;
  // El ADMIN también puede entrar a las pantallas de PROFESOR: en clubes de
  // un solo profesor, esa cuenta suele ser la misma persona (da clases y
  // maneja la parte administrativa), así que no tiene sentido bloquearla.
  const tienePermiso = roles.includes(usuario.rol) || (usuario.rol === "ADMIN" && roles.includes("PROFESOR"));
  if (!tienePermiso) return <Navigate to="/no-autorizado" replace />;
  return children;
}

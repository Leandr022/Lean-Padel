import { Navigate } from "react-router-dom";
import usarAutenticacion from "../ganchos/usarAutenticacion.js";
export default function RutaProtegida({ children, roles }) {
  const { usuario, cargando } = usarAutenticacion();
  if (cargando) return <main className="pantalla-carga">Cargando…</main>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (!roles.includes(usuario.rol)) return <Navigate to="/no-autorizado" replace />;
  return children;
}

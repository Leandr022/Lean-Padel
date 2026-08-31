import { Navigate, Route, Routes } from "react-router-dom";
import { supabaseConfigurado } from "./lib/supabaseClient.js";
import AvisoConfiguracion from "./componentes/ui/AvisoConfiguracion.jsx";
import RutaProtegida from "./rutas/RutaProtegida.jsx";
import Login from "./paginas/autenticacion/Login.jsx";
import Registro from "./paginas/autenticacion/Registro.jsx";
import NoAutorizado from "./paginas/autenticacion/NoAutorizado.jsx";
import PanelAlumno from "./paginas/alumno/PanelAlumno.jsx";
import ReservasAlumno from "./paginas/alumno/ReservasAlumno.jsx";
import PerfilAlumno from "./paginas/alumno/PerfilAlumno.jsx";
import ProgresoAlumno from "./paginas/alumno/ProgresoAlumno.jsx";
import PanelProfesor from "./paginas/profesor/PanelProfesor.jsx";
import CalendarioProfesor from "./paginas/profesor/CalendarioProfesor.jsx";
import AlumnosProfesor from "./paginas/profesor/AlumnosProfesor.jsx";
import ComisionesProfesor from "./paginas/profesor/ComisionesProfesor.jsx";
import ConfiguracionProfesor from "./paginas/profesor/ConfiguracionProfesor.jsx";
import PanelAdmin from "./paginas/admin/PanelAdmin.jsx";
import RendicionesAdmin from "./paginas/admin/RendicionesAdmin.jsx";
import EstadisticasAdmin from "./paginas/admin/EstadisticasAdmin.jsx";
import ConfiguracionAdmin from "./paginas/admin/ConfiguracionAdmin.jsx";
import GestionUsuariosAdmin from "./paginas/admin/GestionUsuariosAdmin.jsx";

export default function App() {
  if (!supabaseConfigurado) return <AvisoConfiguracion />;

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/no-autorizado" element={<NoAutorizado />} />

      <Route path="/alumno" element={<RutaProtegida roles={["ALUMNO"]}><PanelAlumno /></RutaProtegida>} />
      <Route path="/alumno/reservas" element={<RutaProtegida roles={["ALUMNO"]}><ReservasAlumno /></RutaProtegida>} />
      <Route path="/alumno/perfil" element={<RutaProtegida roles={["ALUMNO"]}><PerfilAlumno /></RutaProtegida>} />
      <Route path="/alumno/progreso" element={<RutaProtegida roles={["ALUMNO"]}><ProgresoAlumno /></RutaProtegida>} />

      <Route path="/profesor" element={<RutaProtegida roles={["PROFESOR"]}><PanelProfesor /></RutaProtegida>} />
      <Route path="/profesor/calendario" element={<RutaProtegida roles={["PROFESOR"]}><CalendarioProfesor /></RutaProtegida>} />
      <Route path="/profesor/alumnos" element={<RutaProtegida roles={["PROFESOR"]}><AlumnosProfesor /></RutaProtegida>} />
      <Route path="/profesor/comisiones" element={<RutaProtegida roles={["PROFESOR"]}><ComisionesProfesor /></RutaProtegida>} />
      <Route path="/profesor/configuracion" element={<RutaProtegida roles={["PROFESOR"]}><ConfiguracionProfesor /></RutaProtegida>} />

      <Route path="/admin" element={<RutaProtegida roles={["ADMIN"]}><PanelAdmin /></RutaProtegida>} />
      <Route path="/admin/rendiciones" element={<RutaProtegida roles={["ADMIN"]}><RendicionesAdmin /></RutaProtegida>} />
      <Route path="/admin/estadisticas" element={<RutaProtegida roles={["ADMIN"]}><EstadisticasAdmin /></RutaProtegida>} />
      <Route path="/admin/configuracion" element={<RutaProtegida roles={["ADMIN"]}><ConfiguracionAdmin /></RutaProtegida>} />
      <Route path="/admin/usuarios" element={<RutaProtegida roles={["ADMIN"]}><GestionUsuariosAdmin /></RutaProtegida>} />
    </Routes>
  );
}

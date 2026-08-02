import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LayoutPrincipal from "../../layouts/LayoutPrincipal.jsx";
import TarjetaEstadistica from "../../componentes/ui/TarjetaEstadistica.jsx";
import Icono from "../../componentes/ui/Icono.jsx";
import { estadisticasClub } from "../../servicios/estadisticas.js";

export default function PanelAdmin() {
  const [datos, setDatos] = useState(undefined);

  useEffect(() => {
    estadisticasClub().then(setDatos).catch(() => setDatos(null));
  }, []);

  return (
    <LayoutPrincipal titulo="Panel administrador" subtitulo="Control general del club, horarios y rendiciones.">
      <section className="stats-grid">
        <TarjetaEstadistica titulo="Alumnos activos" valor={datos ? datos.alumnosActivos : "…"} />
        <TarjetaEstadistica titulo="Día más concurrido" valor={datos ? datos.diaMasConcurrido : "…"} />
        <TarjetaEstadistica titulo="Categoría principal" valor={datos ? datos.categoriaPrincipal : "…"} />
        <TarjetaEstadistica titulo="Clases del mes" valor={datos ? datos.clasesDelMes : "…"} />
      </section>
      <section className="dashboard-grid">
        <Link className="dashboard-card verde" to="/admin/rendiciones"><Icono nombre="rendiciones" /><span>Rendiciones</span></Link>
        <Link className="dashboard-card azul" to="/admin/estadisticas"><Icono nombre="estadisticas" /><span>Estadísticas</span></Link>
        <Link className="dashboard-card naranja" to="/admin/configuracion"><Icono nombre="configuracion" /><span>Configuración</span></Link>
      </section>
    </LayoutPrincipal>
  );
}

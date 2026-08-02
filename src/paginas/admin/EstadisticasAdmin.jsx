import { useEffect, useState } from "react";
import LayoutPrincipal from "../../layouts/LayoutPrincipal.jsx";
import TarjetaEstadistica from "../../componentes/ui/TarjetaEstadistica.jsx";
import { estadisticasClub } from "../../servicios/estadisticas.js";

export default function EstadisticasAdmin() {
  const [datos, setDatos] = useState(undefined);

  useEffect(() => {
    estadisticasClub().then(setDatos).catch(() => setDatos(null));
  }, []);

  return (
    <LayoutPrincipal titulo="Estadísticas" subtitulo="Datos útiles para tomar decisiones del club, calculados en base al mes actual.">
      <section className="stats-grid">
        <TarjetaEstadistica titulo="Horario más solicitado" valor={datos ? datos.horarioMasSolicitado : "…"} />
        <TarjetaEstadistica titulo="Día más concurrido" valor={datos ? datos.diaMasConcurrido : "…"} />
        <TarjetaEstadistica titulo="Alumnos activos" valor={datos ? datos.alumnosActivos : "…"} />
        <TarjetaEstadistica titulo="Hombres / Mujeres" valor={datos ? `${datos.porcentajeHombres}% / ${datos.porcentajeMujeres}%` : "…"} />
        <TarjetaEstadistica titulo="Categoría principal" valor={datos ? datos.categoriaPrincipal : "…"} />
        <TarjetaEstadistica titulo="Clases del mes" valor={datos ? datos.clasesDelMes : "…"} />
      </section>
    </LayoutPrincipal>
  );
}

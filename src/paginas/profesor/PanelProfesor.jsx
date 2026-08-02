import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LayoutPrincipal from "../../layouts/LayoutPrincipal.jsx";
import TarjetaEstadistica from "../../componentes/ui/TarjetaEstadistica.jsx";
import Icono from "../../componentes/ui/Icono.jsx";
import usarAutenticacion from "../../ganchos/usarAutenticacion.js";
import { obtenerConfiguracion } from "../../servicios/configuracion.js";
import { estadisticasProfesor } from "../../servicios/estadisticas.js";
import { formatearMoneda } from "../../utilidades/precios.js";

export default function PanelProfesor() {
  const { usuario } = usarAutenticacion();
  const [datos, setDatos] = useState(undefined);

  useEffect(() => {
    obtenerConfiguracion()
      .then((config) => estadisticasProfesor(usuario.id, config.comisiones))
      .then(setDatos)
      .catch(() => setDatos(null));
  }, [usuario.id]);

  return (
    <LayoutPrincipal titulo="Panel profesor" subtitulo="Tu agenda y gestión diaria.">
      <section className="stats-grid">
        <TarjetaEstadistica titulo="Clases hoy" valor={datos ? datos.clasesHoy : "…"} />
        <TarjetaEstadistica titulo="Clases del mes" valor={datos ? datos.clasesDelMes : "…"} />
        <TarjetaEstadistica titulo="Facturado (mes)" valor={datos ? formatearMoneda(datos.facturado) : "…"} />
        <TarjetaEstadistica titulo="A rendir club (mes)" valor={datos ? formatearMoneda(datos.aRendir) : "…"} />
      </section>
      <section className="dashboard-grid">
        <Link className="dashboard-card verde" to="/profesor/calendario"><Icono nombre="calendario" /><span>Calendario</span></Link>
        <Link className="dashboard-card azul" to="/profesor/alumnos"><Icono nombre="alumnos" /><span>Alumnos</span></Link>
        <Link className="dashboard-card naranja" to="/profesor/comisiones"><Icono nombre="comisiones" /><span>Comisiones club</span></Link>
      </section>
    </LayoutPrincipal>
  );
}

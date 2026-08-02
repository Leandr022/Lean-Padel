import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LayoutPrincipal from "../../layouts/LayoutPrincipal.jsx";
import TarjetaEstadistica from "../../componentes/ui/TarjetaEstadistica.jsx";
import Icono from "../../componentes/ui/Icono.jsx";
import usarAutenticacion from "../../ganchos/usarAutenticacion.js";
import { proximaClaseAlumno, tienePagosPendientes } from "../../servicios/estadisticas.js";
import { formatearCorto } from "../../utilidades/fechas.js";

export default function PanelAlumno() {
  const { usuario } = usarAutenticacion();
  const [proxima, setProxima] = useState(undefined);
  const [pagosPendientes, setPagosPendientes] = useState(undefined);

  useEffect(() => {
    proximaClaseAlumno(usuario.id).then(setProxima).catch(() => setProxima(null));
    tienePagosPendientes(usuario.id).then(setPagosPendientes).catch(() => setPagosPendientes(null));
  }, [usuario.id]);

  const textoProxima =
    proxima === undefined ? "Cargando…" : proxima ? `${formatearCorto(new Date(`${proxima.clases.fecha}T00:00:00`))} ${proxima.clases.hora}` : "Sin reservas";

  return (
    <LayoutPrincipal titulo="Inicio alumno" subtitulo="Reservá, pagá y seguí tu evolución.">
      <section className="stats-grid">
        <TarjetaEstadistica titulo="Próxima clase" valor={textoProxima} detalle={proxima?.tipo} />
        <TarjetaEstadistica titulo="Categoría" valor={usuario.categoria} />
        <TarjetaEstadistica
          titulo="Pagos"
          valor={pagosPendientes === undefined ? "Cargando…" : pagosPendientes ? "Con pendientes" : "Al día"}
        />
      </section>
      <section className="dashboard-grid">
        <Link className="dashboard-card verde" to="/alumno/reservas"><Icono nombre="calendario" /><span>Reservar clase</span></Link>
        <Link className="dashboard-card azul" to="/alumno/progreso"><Icono nombre="progreso" /><span>Mi progreso</span></Link>
        <Link className="dashboard-card violeta" to="/alumno/perfil"><Icono nombre="perfil" /><span>Editar perfil</span></Link>
      </section>
    </LayoutPrincipal>
  );
}

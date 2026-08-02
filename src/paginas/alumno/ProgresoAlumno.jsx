import { useEffect, useState } from "react";
import LayoutPrincipal from "../../layouts/LayoutPrincipal.jsx";
import PlanillaTecnica from "../../componentes/ui/PlanillaTecnica.jsx";
import usarAutenticacion from "../../ganchos/usarAutenticacion.js";
import { ultimaClaseAlumno } from "../../servicios/estadisticas.js";
import { formatearLargo } from "../../utilidades/fechas.js";

export default function ProgresoAlumno() {
  const { usuario } = usarAutenticacion();
  const [ultima, setUltima] = useState(undefined);

  useEffect(() => {
    ultimaClaseAlumno(usuario.id).then(setUltima).catch(() => setUltima(null));
  }, [usuario.id]);

  return (
    <LayoutPrincipal titulo="Mi progreso" subtitulo="Ficha técnica cargada por tu profesor en cada clase.">
      <section className="info-clase">
        <h2>Última clase</h2>
        {ultima === undefined && <p className="texto-muted">Cargando…</p>}
        {ultima === null && <p className="texto-muted">Todavía no tenés clases registradas.</p>}
        {ultima && (
          <p>
            {formatearLargo(new Date(`${ultima.clases.fecha}T00:00:00`))} · {ultima.tipo}
            {ultima.companeros > 0 && ` · ${ultima.companeros} compañero${ultima.companeros === 1 ? "" : "s"}`}
          </p>
        )}
      </section>
      <PlanillaTecnica alumnoId={usuario.id} />
    </LayoutPrincipal>
  );
}

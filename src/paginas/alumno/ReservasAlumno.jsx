import { useCallback, useEffect, useState } from "react";
import LayoutPrincipal from "../../layouts/LayoutPrincipal.jsx";
import CalendarioUnificado from "../../componentes/calendario/CalendarioUnificado.jsx";
import ModalReservaAlumno from "../../componentes/calendario/ModalReservaAlumno.jsx";
import usarAutenticacion from "../../ganchos/usarAutenticacion.js";
import { obtenerConfiguracion } from "../../servicios/configuracion.js";
import { listarClasesRango } from "../../servicios/clases.js";
import { cancelarReserva, listarProximasReservas } from "../../servicios/reservas.js";
import { obtenerSemana, rangoSemana, formatearLargo } from "../../utilidades/fechas.js";

export default function ReservasAlumno() {
  const { usuario } = usarAutenticacion();
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [clases, setClases] = useState([]);
  const [proximas, setProximas] = useState([]);
  const [precios, setPrecios] = useState(null);
  const [seleccion, setSeleccion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const semana = obtenerSemana(semanaOffset);

  const cargarClases = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const { desde, hasta } = rangoSemana(semanaOffset);
      const datos = await listarClasesRango(desde, hasta);
      setClases(datos);
    } catch {
      setError("No se pudo cargar el calendario. Recargá la página en unos segundos.");
    } finally {
      setCargando(false);
    }
  }, [semanaOffset]);

  const cargarProximas = useCallback(async () => {
    try {
      setProximas(await listarProximasReservas(usuario.id));
    } catch {
      // Si falla, la sección simplemente no se muestra; no es bloqueante.
    }
  }, [usuario.id]);

  useEffect(() => {
    obtenerConfiguracion()
      .then(setPrecios)
      .catch(() => setError("No se pudo cargar la configuración de precios."));
  }, []);

  useEffect(() => {
    cargarClases();
  }, [cargarClases]);

  useEffect(() => {
    cargarProximas();
  }, [cargarProximas]);

  async function refrescarTodo() {
    await Promise.all([cargarClases(), cargarProximas()]);
  }

  async function cancelar(id) {
    try {
      await cancelarReserva(id);
      refrescarTodo();
    } catch {
      setError("No se pudo cancelar la reserva. Probá de nuevo.");
    }
  }

  return (
    <LayoutPrincipal titulo="Reservar clase" subtitulo="Elegí día y horario desde el calendario semanal.">
      {error && <div className="error-box aviso-pagina">{error}</div>}

      {proximas.length > 0 && (
        <section className="tabla-card aviso-pagina">
          <h2>Mis próximas clases</h2>
          {proximas.map((r) => (
            <div className="fila-alumno" key={r.id}>
              <span>{formatearLargo(new Date(`${r.clases.fecha}T00:00:00`))} · {r.clases.hora}</span>
              <strong className={r.pagado ? "ok" : "pendiente"}>{r.tipo} · {r.pagado ? "Abonado" : "Pago pendiente"}</strong>
              <button type="button" className="boton-secundario" onClick={() => cancelar(r.id)}>Cancelar</button>
            </div>
          ))}
        </section>
      )}

      {precios ? (
        <CalendarioUnificado
          semana={semana}
          semanaOffset={semanaOffset}
          clases={clases}
          rol="ALUMNO"
          precios={precios}
          cargando={cargando}
          onSeleccionar={setSeleccion}
          onCambiarSemana={setSemanaOffset}
        />
      ) : (
        <p className="texto-muted">Cargando…</p>
      )}

      {seleccion && precios && (
        <ModalReservaAlumno
          info={seleccion}
          precios={precios}
          usuario={usuario}
          onCerrar={() => setSeleccion(null)}
          onReservado={refrescarTodo}
        />
      )}
    </LayoutPrincipal>
  );
}

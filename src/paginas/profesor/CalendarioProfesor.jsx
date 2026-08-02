import { useCallback, useEffect, useState } from "react";
import LayoutPrincipal from "../../layouts/LayoutPrincipal.jsx";
import CalendarioUnificado from "../../componentes/calendario/CalendarioUnificado.jsx";
import ModalClaseProfesor from "../../componentes/calendario/ModalClaseProfesor.jsx";
import HerramientasHorarios from "../../componentes/calendario/HerramientasHorarios.jsx";
import usarAutenticacion from "../../ganchos/usarAutenticacion.js";
import { obtenerConfiguracion } from "../../servicios/configuracion.js";
import { generarHorariosSemana, listarClasesRango } from "../../servicios/clases.js";
import { horariosApertura, horariosClase } from "../../datos/clases.js";
import { claveFecha, obtenerSemana, rangoSemana } from "../../utilidades/fechas.js";

export default function CalendarioProfesor() {
  const { usuario } = usarAutenticacion();
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [clases, setClases] = useState([]);
  const [precios, setPrecios] = useState(null);
  const [seleccion, setSeleccion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const semana = obtenerSemana(semanaOffset);

  const cargarClases = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const { desde, hasta } = rangoSemana(semanaOffset);
      const datos = await listarClasesRango(desde, hasta);
      setClases(datos);
      return datos;
    } catch {
      setError("No se pudo cargar el calendario. Recargá la página en unos segundos.");
      return null;
    } finally {
      setCargando(false);
    }
  }, [semanaOffset]);

  // Refresca la grilla sin cerrar el modal (para acciones que se hacen una
  // detrás de otra dentro de la misma clase: marcar pagos, anotar alumnos).
  async function actualizarManteniendoModal() {
    const nuevasClases = await cargarClases();
    if (!nuevasClases) return;
    setSeleccion((prev) => {
      if (!prev) return prev;
      const actualizada = nuevasClases.find((c) => c.fecha === prev.fecha && c.hora === prev.hora);
      return { ...prev, clase: actualizada || null };
    });
  }

  useEffect(() => {
    obtenerConfiguracion()
      .then(setPrecios)
      .catch(() => setError("No se pudo cargar la configuración de precios."));
  }, []);

  useEffect(() => {
    cargarClases();
  }, [cargarClases]);

  async function generarSemana() {
    setAviso("");
    try {
      await generarHorariosSemana({ fechas: semana.map(claveFecha), horarios: horariosApertura, profesorId: usuario.id });
      setAviso("Horarios abiertos para esta semana. Los que ya existían no se tocaron.");
      cargarClases();
    } catch {
      setAviso("No se pudieron abrir los horarios. Probá de nuevo.");
    }
  }

  return (
    <LayoutPrincipal titulo="Calendario profesor" subtitulo="Abrí horarios, creá clases puntuales y controlá pagos.">
      {error && <div className="error-box aviso-pagina">{error}</div>}
      {aviso && <div className="panel-resumen aviso-pagina">{aviso}</div>}

      {precios ? (
        <CalendarioUnificado
          semana={semana}
          semanaOffset={semanaOffset}
          clases={clases}
          rol="PROFESOR"
          precios={precios}
          cargando={cargando}
          onSeleccionar={setSeleccion}
          onCrear={() => setSeleccion({ clase: null, fecha: claveFecha(semana[0]), hora: horariosClase[0], editable: true })}
          onCambiarSemana={setSemanaOffset}
          onGenerarSemana={generarSemana}
        />
      ) : (
        <p className="texto-muted">Cargando…</p>
      )}

      <HerramientasHorarios profesorId={usuario.id} semanaOffset={semanaOffset} onCambios={cargarClases} />

      {seleccion && precios && (
        <ModalClaseProfesor
          info={seleccion}
          precios={precios}
          profesorId={usuario.id}
          onCerrar={() => setSeleccion(null)}
          onGuardado={() => {
            setSeleccion(null);
            cargarClases();
          }}
          onActualizar={actualizarManteniendoModal}
        />
      )}
    </LayoutPrincipal>
  );
}

import { useEffect, useState } from "react";
import LayoutPrincipal from "../../layouts/LayoutPrincipal.jsx";
import TarjetaEstadistica from "../../componentes/ui/TarjetaEstadistica.jsx";
import usarAutenticacion from "../../ganchos/usarAutenticacion.js";
import { obtenerConfiguracion, actualizarConfiguracion } from "../../servicios/configuracion.js";
import { estadisticasProfesor } from "../../servicios/estadisticas.js";
import { crearRendicion, marcarRendicionPagada, subirComprobanteRendicion } from "../../servicios/rendiciones.js";
import { formatearMoneda } from "../../utilidades/precios.js";
import { claveFecha } from "../../utilidades/fechas.js";

export default function ComisionesProfesor() {
  const { usuario } = usarAutenticacion();
  const [config, setConfig] = useState(null);
  const [borradorComisiones, setBorradorComisiones] = useState(null);
  const [datos, setDatos] = useState(null);
  const [metodo, setMetodo] = useState("transferencia");
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [guardandoComisiones, setGuardandoComisiones] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [mensajeComisiones, setMensajeComisiones] = useState("");
  const [error, setError] = useState("");
  const [errorComisiones, setErrorComisiones] = useState("");

  async function cargar() {
    try {
      const cfg = await obtenerConfiguracion();
      setConfig(cfg);
      setBorradorComisiones(cfg.comisiones);
      setDatos(await estadisticasProfesor(usuario.id, cfg.comisiones));
    } catch {
      setError("No se pudo cargar la información.");
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario.id]);

  async function guardarComisiones() {
    setGuardandoComisiones(true);
    setErrorComisiones("");
    setMensajeComisiones("");
    try {
      await actualizarConfiguracion({ comisiones: borradorComisiones });
      await cargar();
      setMensajeComisiones("Comisión actualizada.");
    } catch (err) {
      setErrorComisiones(err?.message || "No se pudieron guardar los cambios.");
    } finally {
      setGuardandoComisiones(false);
    }
  }

  async function avisarPago() {
    setEnviando(true);
    setError("");
    setMensaje("");
    try {
      const hoy = new Date();
      const desde = claveFecha(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
      const hasta = claveFecha(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));
      const rendicion = await crearRendicion({ profesorId: usuario.id, periodo: config.rendicionDefault, desde, hasta, monto: datos.aRendir });
      await marcarRendicionPagada(rendicion.id, metodo);
      if (archivo) await subirComprobanteRendicion(rendicion.id, archivo);
      setMensaje("Le avisamos al administrador. Va a confirmar la recepción del pago.");
    } catch (err) {
      setError(err.message || "No se pudo avisar el pago.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <LayoutPrincipal titulo="Comisiones club" subtitulo="Informá pagos al club y dejá comprobante.">
      <section className="stats-grid">
        <TarjetaEstadistica titulo="Facturado (mes)" valor={datos ? formatearMoneda(datos.facturado) : "…"} />
        <TarjetaEstadistica titulo="A rendir club (mes)" valor={datos ? formatearMoneda(datos.aRendir) : "…"} />
        <TarjetaEstadistica titulo="Ganancia real (mes)" valor={datos ? formatearMoneda(datos.ganancia) : "…"} />
      </section>

      <section className="form-card">
        <h2>Total a rendir este mes: {datos ? formatearMoneda(datos.aRendir) : "…"}</h2>
        <p className="texto-muted">Período de rendición: {config?.rendicionDefault || "…"}</p>
        <div className="opciones-dos">
          <button type="button" className={metodo === "transferencia" ? "opcion activa" : "opcion"} onClick={() => setMetodo("transferencia")}>
            Transferencia
          </button>
          <button type="button" className={metodo === "efectivo" ? "opcion activa" : "opcion"} onClick={() => setMetodo("efectivo")}>
            Efectivo
          </button>
        </div>
        <label className="boton-secundario file-label">
          {archivo ? archivo.name : "Cargar comprobante"}
          <input type="file" hidden accept="image/*,application/pdf" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
        </label>
        {error && <div className="error-box">{error}</div>}
        {mensaje && <div className="panel-resumen">{mensaje}</div>}
        <button className="boton-principal" disabled={enviando || !datos} onClick={avisarPago}>
          {enviando ? "Enviando…" : "Avisar pago al administrador"}
        </button>
      </section>

      {borradorComisiones && (
        <section className="form-card">
          <h2>% de comisión del club</h2>
          <p className="texto-muted">
            Según cuántos alumnos tenga la clase. Esto es lo que se calcula automáticamente como "a rendir" arriba —
            cambialo acá si el club te ajustó el porcentaje.
          </p>
          <div className="form-grid">
            {["1", "2", "3", "4"].map((cantidad) => (
              <label key={cantidad}>
                {cantidad === "1" ? "Individual (1 alumno)" : `Grupal, ${cantidad} alumnos`}
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={borradorComisiones[cantidad] ?? 0}
                  onChange={(e) =>
                    setBorradorComisiones({ ...borradorComisiones, [cantidad]: Number(e.target.value) })
                  }
                />
              </label>
            ))}
          </div>
          {errorComisiones && <div className="error-box">{errorComisiones}</div>}
          {mensajeComisiones && <div className="panel-resumen">{mensajeComisiones}</div>}
          <button className="boton-principal" disabled={guardandoComisiones} onClick={guardarComisiones}>
            {guardandoComisiones ? "Guardando…" : "Guardar comisión"}
          </button>
        </section>
      )}
    </LayoutPrincipal>
  );
}

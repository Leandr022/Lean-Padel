import { useEffect, useState } from "react";
import LayoutPrincipal from "../../layouts/LayoutPrincipal.jsx";
import usarAutenticacion from "../../ganchos/usarAutenticacion.js";
import { obtenerConfiguracion } from "../../servicios/configuracion.js";
import { estadisticasProfesor } from "../../servicios/estadisticas.js";
import { crearRendicion, marcarRendicionPagada, subirComprobanteRendicion } from "../../servicios/rendiciones.js";
import { formatearMoneda } from "../../utilidades/precios.js";
import { claveFecha } from "../../utilidades/fechas.js";

export default function ComisionesProfesor() {
  const { usuario } = usarAutenticacion();
  const [config, setConfig] = useState(null);
  const [datos, setDatos] = useState(null);
  const [metodo, setMetodo] = useState("transferencia");
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    obtenerConfiguracion()
      .then(async (cfg) => {
        setConfig(cfg);
        setDatos(await estadisticasProfesor(usuario.id, cfg.comisiones));
      })
      .catch(() => setError("No se pudo cargar la información."));
  }, [usuario.id]);

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
    </LayoutPrincipal>
  );
}

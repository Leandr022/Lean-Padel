import { useEffect, useState } from "react";
import LayoutPrincipal from "../../layouts/LayoutPrincipal.jsx";
import { obtenerConfiguracion, actualizarConfiguracion } from "../../servicios/configuracion.js";
import { formatearMoneda } from "../../utilidades/precios.js";

export default function ConfiguracionAdmin() {
  const [precios, setPrecios] = useState(null);
  const [borrador, setBorrador] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    obtenerConfiguracion()
      .then((config) => {
        setPrecios(config);
        setBorrador(config);
      })
      .catch(() => setError("No se pudo cargar la configuración."));
  }, []);

  async function confirmar() {
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const actualizado = await actualizarConfiguracion(borrador);
      setPrecios(actualizado);
      setBorrador(actualizado);
      setMensaje("Cambios guardados.");
    } catch {
      setError("No se pudieron guardar los cambios. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  // El % de IPC no toca los precios solo, es un dato suelto hasta que se
  // aplica a mano acá: sube individual y grupal ese porcentaje sobre el
  // valor ya confirmado (no sobre lo que haya sin guardar en el formulario)
  // y deja el campo en 0 para el próximo mes.
  async function aplicarAumento() {
    const porcentaje = borrador.ipc;
    if (!porcentaje) {
      setError("Cargá un porcentaje mayor a 0 antes de aplicar el aumento.");
      return;
    }
    const nuevoIndividual = Math.round(precios.individual * (1 + porcentaje / 100));
    const nuevoGrupal = Math.round(precios.grupal * (1 + porcentaje / 100));
    const confirmado = window.confirm(
      `Esto va a subir los precios un ${porcentaje}%:\n\n` +
        `Individual: ${formatearMoneda(precios.individual)} → ${formatearMoneda(nuevoIndividual)}\n` +
        `Grupal: ${formatearMoneda(precios.grupal)} → ${formatearMoneda(nuevoGrupal)}\n\n` +
        `¿Confirmás el aumento?`
    );
    if (!confirmado) return;

    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const actualizado = await actualizarConfiguracion({ individual: nuevoIndividual, grupal: nuevoGrupal, ipc: 0 });
      setPrecios(actualizado);
      setBorrador(actualizado);
      setMensaje(
        `Aumento del ${porcentaje}% aplicado. Clase individual: ${formatearMoneda(actualizado.individual)} · Grupal: ${formatearMoneda(actualizado.grupal)}.`
      );
    } catch {
      setError("No se pudo aplicar el aumento. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  if (!borrador) {
    return (
      <LayoutPrincipal titulo="Configuración" subtitulo="Valores, comisiones, IPC y bloqueos del club.">
        {error ? <div className="error-box">{error}</div> : <p className="texto-muted">Cargando…</p>}
      </LayoutPrincipal>
    );
  }

  return (
    <LayoutPrincipal titulo="Configuración" subtitulo="Valores, comisiones, IPC y bloqueos del club.">
      <section className="form-card">
        <h2>Valores actuales</h2>
        <div className="form-grid">
          <label>
            Clase individual
            <input type="number" value={borrador.individual} onChange={(e) => setBorrador({ ...borrador, individual: Number(e.target.value) })} />
          </label>
          <label>
            Clase grupal
            <input type="number" value={borrador.grupal} onChange={(e) => setBorrador({ ...borrador, grupal: Number(e.target.value) })} />
          </label>
          <label>
            Descuento abono individual %
            <input
              type="number"
              value={borrador.descuentoAbonoIndividual}
              onChange={(e) => setBorrador({ ...borrador, descuentoAbonoIndividual: Number(e.target.value) })}
            />
          </label>
          <label>
            Descuento abono grupal %
            <input
              type="number"
              value={borrador.descuentoAbonoGrupal}
              onChange={(e) => setBorrador({ ...borrador, descuentoAbonoGrupal: Number(e.target.value) })}
            />
          </label>
          <label>
            Rendición default
            <select value={borrador.rendicionDefault} onChange={(e) => setBorrador({ ...borrador, rendicionDefault: e.target.value })}>
              <option value="semanal">Semanal</option>
              <option value="quincenal">Quincenal</option>
              <option value="mensual">Mensual</option>
            </select>
          </label>
        </div>
        {error && <div className="error-box">{error}</div>}
        {mensaje && <div className="panel-resumen">{mensaje}</div>}
        <div className="acciones-modal">
          <button className="boton-principal" disabled={guardando} onClick={confirmar}>
            {guardando ? "Guardando…" : "Confirmar cambios"}
          </button>
          <button className="boton-secundario" disabled={guardando} onClick={() => setBorrador(precios)}>
            Cancelar y mantener valores anteriores
          </button>
        </div>
      </section>

      <section className="form-card aviso-pagina">
        <h2>Aumento por IPC</h2>
        <p className="texto-muted">
          Cargá el % del mes y aplicalo cuando quieras: sube la clase individual y la grupal ese porcentaje sobre el
          valor actual, y el campo vuelve a 0 para el mes que viene. No afecta los descuentos de abono.
        </p>
        <div className="form-grid">
          <label>
            IPC del mes %
            <input type="number" value={borrador.ipc} onChange={(e) => setBorrador({ ...borrador, ipc: Number(e.target.value) })} />
          </label>
        </div>
        <div className="acciones-modal">
          <button className="boton-principal" disabled={guardando} onClick={aplicarAumento}>
            Aplicar aumento a los precios
          </button>
        </div>
      </section>
    </LayoutPrincipal>
  );
}

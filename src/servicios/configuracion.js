import { supabase } from "../lib/supabaseClient.js";

// La tabla usa snake_case (estándar en Postgres); el resto de la app usa
// camelCase, como el resto de los datos del proyecto. Estos dos mapeos
// son el único lugar donde se hace la conversión.
function aCamelCase(fila) {
  return {
    individual: Number(fila.precio_individual),
    grupal: Number(fila.precio_grupal),
    descuentoAbonoIndividual: Number(fila.descuento_abono_individual),
    descuentoAbonoGrupal: Number(fila.descuento_abono_grupal),
    ipc: Number(fila.ipc),
    rendicionDefault: fila.rendicion_default,
    comisiones: fila.comisiones,
  };
}

export async function obtenerConfiguracion() {
  const { data, error } = await supabase.from("configuracion").select("*").eq("id", 1).single();
  if (error) throw error;
  return aCamelCase(data);
}

export async function actualizarConfiguracion(cambios) {
  const payload = {
    precio_individual: cambios.individual,
    precio_grupal: cambios.grupal,
    descuento_abono_individual: cambios.descuentoAbonoIndividual,
    descuento_abono_grupal: cambios.descuentoAbonoGrupal,
    ipc: cambios.ipc,
    rendicion_default: cambios.rendicionDefault,
    comisiones: cambios.comisiones,
  };
  Object.keys(payload).forEach((clave) => payload[clave] === undefined && delete payload[clave]);
  const { data, error } = await supabase.from("configuracion").update(payload).eq("id", 1).select().single();
  if (error) throw error;
  return aCamelCase(data);
}

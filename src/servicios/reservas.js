import { supabase } from "../lib/supabaseClient.js";
import { claveFecha } from "../utilidades/fechas.js";

/** Próximas reservas de un alumno, para que pueda ver y cancelar lo que ya reservó. */
export async function listarProximasReservas(alumnoId) {
  const hoy = claveFecha(new Date());
  const { data, error } = await supabase
    .from("reservas")
    .select("*, clases:clase_id(fecha, hora, estado_clase)")
    .eq("alumno_id", alumnoId);
  if (error) throw error;
  return (data || [])
    .filter((r) => r.clases && r.clases.fecha >= hoy)
    .sort((a, b) => (a.clases.fecha + a.clases.hora).localeCompare(b.clases.fecha + b.clases.hora));
}

export async function crearReserva({ claseId, alumnoId, tipo, formaPago, metodoPago, monto, duracionMinutos = 60 }) {
  const { data, error } = await supabase
    .from("reservas")
    .insert({
      clase_id: claseId,
      alumno_id: alumnoId,
      tipo,
      forma_pago: formaPago,
      metodo_pago: metodoPago || null,
      monto,
      duracion_minutos: duracionMinutos,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function cancelarReserva(id) {
  const { error } = await supabase.from("reservas").delete().eq("id", id);
  if (error) throw error;
}

export async function marcarPagoReserva(id, cambios) {
  const { data, error } = await supabase.from("reservas").update(cambios).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function subirComprobante(reservaId, archivo) {
  const ruta = `reservas/${reservaId}/${Date.now()}-${archivo.name}`;
  const { error: errorSubida } = await supabase.storage.from("comprobantes").upload(ruta, archivo, { upsert: true });
  if (errorSubida) throw errorSubida;
  const actualizada = await marcarPagoReserva(reservaId, { comprobante_url: ruta, metodo_pago: "transferencia" });
  return actualizada;
}

export async function urlFirmadaComprobante(ruta) {
  const { data, error } = await supabase.storage.from("comprobantes").createSignedUrl(ruta, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

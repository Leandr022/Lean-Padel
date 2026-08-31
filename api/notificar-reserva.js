import { crearClienteAdmin } from "./_supabaseAdmin.js";

// Supabase llama a esta URL sola (Database Webhook configurado en
// Database → Webhooks, tabla "reservas", evento INSERT) cada vez que se
// crea una reserva nueva. Le mandamos un WhatsApp al profesor con los datos
// básicos usando CallMeBot (https://www.callmebot.com), un servicio
// gratuito pensado justo para avisos personales como este — no reemplaza
// una integración oficial de WhatsApp Business si en algún momento se
// necesita mandarles mensajes a los alumnos, pero alcanza de sobra para
// avisarle al profesor.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  // Protección simple: sin este secreto compartido, cualquiera que
  // encuentre la URL podría hacerle spam de WhatsApp al profesor.
  const secretoEsperado = process.env.NOTIFICACIONES_WEBHOOK_SECRET;
  const secretoRecibido = req.headers["x-webhook-secret"];
  if (secretoEsperado && secretoRecibido !== secretoEsperado) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  try {
    const registro = req.body?.record;
    if (!registro?.id) {
      res.status(200).send("sin registro, ignorado");
      return;
    }

    const telefono = process.env.CALLMEBOT_PHONE;
    const apiKey = process.env.CALLMEBOT_APIKEY;
    if (!telefono || !apiKey) {
      console.error("Faltan CALLMEBOT_PHONE o CALLMEBOT_APIKEY, no se pudo avisar la reserva:", registro.id);
      res.status(200).send("sin configurar, ignorado");
      return;
    }

    const admin = crearClienteAdmin();
    const { data: reserva, error } = await admin
      .from("reservas")
      .select("*, perfiles:alumno_id(nombre), clases:clase_id(fecha, hora, profesor_id, profesor:profesor_id(avisos_whatsapp_activo))")
      .eq("id", registro.id)
      .single();
    if (error || !reserva) {
      console.error("No se encontró la reserva para avisar:", registro.id, error);
      res.status(200).send("reserva no encontrada, ignorado");
      return;
    }

    // El profesor puede apagar este aviso desde su pantalla de
    // Configuración (columna perfiles.avisos_whatsapp_activo).
    if (reserva.clases?.profesor?.avisos_whatsapp_activo === false) {
      res.status(200).send("aviso desactivado por el profesor, ignorado");
      return;
    }

    const duracion = reserva.duracion_minutos === 90 ? "1h30" : "1h";
    const metodo = reserva.metodo_pago === "mercadopago" ? "Mercado Pago" : reserva.metodo_pago === "transferencia" ? "Transferencia" : reserva.metodo_pago === "efectivo" ? "Efectivo" : "A definir";
    const estadoPago = reserva.pagado ? "Pagado ✅" : "Pendiente de pago ⏳";

    const texto =
      `🎾 Nueva reserva\n` +
      `Alumno: ${reserva.perfiles?.nombre || "Sin nombre"}\n` +
      `Fecha: ${reserva.clases?.fecha || "?"} ${reserva.clases?.hora || ""}\n` +
      `Tipo: ${reserva.tipo} (${duracion})\n` +
      `Pago: ${metodo} — ${estadoPago}\n` +
      `Monto: $${Number(reserva.monto).toLocaleString("es-AR")}`;

    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(telefono)}&text=${encodeURIComponent(texto)}&apikey=${encodeURIComponent(apiKey)}`;
    const respuesta = await fetch(url);
    const textoRespuesta = await respuesta.text();
    console.log("Aviso de WhatsApp enviado para reserva", registro.id, "-", textoRespuesta);

    res.status(200).send("ok");
  } catch (error) {
    console.error("Error avisando la reserva por WhatsApp:", error);
    // Devolvemos 200 igual para que Supabase no reintente en loop; el aviso
    // es una comodidad, no algo de lo que dependa la reserva en sí.
    res.status(200).send("error registrado");
  }
}

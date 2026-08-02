import { MercadoPagoConfig, Payment } from "mercadopago";
import { crearClienteAdmin } from "./_supabaseAdmin.js";

// Mercado Pago llama a esta URL solo (notification_url) cada vez que cambia
// el estado de un pago. Buscamos el pago real por su id (nunca confiamos en
// el estado que venga en la query de la notificación) y actualizamos la
// reserva correspondiente por external_reference.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(200).send("ok");
    return;
  }

  try {
    const paymentId = req.body?.data?.id || req.query["data.id"];
    const tipo = req.body?.type || req.query.type;
    if (tipo !== "payment" || !paymentId) {
      res.status(200).send("ignorado");
      return;
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const client = new MercadoPagoConfig({ accessToken });
    const pagos = new Payment(client);
    const pago = await pagos.get({ id: paymentId });

    const reservaId = pago.external_reference;
    if (!reservaId) {
      res.status(200).send("sin referencia");
      return;
    }

    const admin = crearClienteAdmin();
    if (pago.status === "approved") {
      await admin
        .from("reservas")
        .update({ pagado: true, metodo_pago: "mercadopago", mp_payment_id: String(pago.id) })
        .eq("id", reservaId);
    } else {
      await admin.from("reservas").update({ mp_payment_id: String(pago.id) }).eq("id", reservaId);
    }

    res.status(200).send("ok");
  } catch (error) {
    console.error("Error procesando webhook de Mercado Pago:", error);
    // Devolvemos 200 igual: si respondemos error, Mercado Pago reintenta en
    // loop. Preferimos loguear y revisar manualmente si algo falló.
    res.status(200).send("error registrado");
  }
}

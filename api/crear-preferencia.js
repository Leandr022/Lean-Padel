import { MercadoPagoConfig, Preference } from "mercadopago";
import { crearClienteAdmin } from "./_supabaseAdmin.js";

// Función serverless (Vercel) que crea una preferencia de pago de Mercado
// Pago para una reserva ya existente en Supabase. El monto se calcula acá,
// del lado del servidor, a partir de la configuración real guardada en la
// base — nunca se confía en un monto que venga del navegador.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const { reservaId } = req.body || {};
    if (!reservaId) {
      res.status(400).json({ error: "Falta reservaId" });
      return;
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      res.status(500).json({ error: "El servidor no tiene configurado MERCADOPAGO_ACCESS_TOKEN" });
      return;
    }

    const admin = crearClienteAdmin();

    const { data: reserva, error: errorReserva } = await admin
      .from("reservas")
      .select("*, perfiles:alumno_id(nombre, email), clases:clase_id(fecha, hora)")
      .eq("id", reservaId)
      .single();
    if (errorReserva || !reserva) {
      res.status(404).json({ error: "No se encontró la reserva" });
      return;
    }
    if (reserva.pagado) {
      res.status(400).json({ error: "Esta reserva ya está paga" });
      return;
    }

    const siteUrl = process.env.VITE_SITE_URL || "http://localhost:5173";
    const client = new MercadoPagoConfig({ accessToken });
    const preferencia = new Preference(client);

    const resultado = await preferencia.create({
      body: {
        items: [
          {
            id: reserva.id,
            title: `Clase de pádel · ${reserva.tipo} · ${reserva.clases?.fecha ?? ""} ${reserva.clases?.hora ?? ""}${reserva.duracion_minutos === 90 ? " (1h30)" : ""}`,
            quantity: 1,
            unit_price: Number(reserva.monto),
            currency_id: "ARS",
          },
        ],
        payer: { name: reserva.perfiles?.nombre, email: reserva.perfiles?.email },
        external_reference: reserva.id,
        notification_url: `${siteUrl}/api/webhook-mercadopago`,
        back_urls: {
          success: `${siteUrl}/alumno/reservas?pago=exito`,
          failure: `${siteUrl}/alumno/reservas?pago=error`,
          pending: `${siteUrl}/alumno/reservas?pago=pendiente`,
        },
        auto_return: "approved",
      },
    });

    await admin.from("reservas").update({ mp_preference_id: resultado.id }).eq("id", reservaId);

    res.status(200).json({ initPoint: resultado.init_point });
  } catch (error) {
    console.error("Error creando preferencia de Mercado Pago:", error);
    res.status(500).json({ error: "No se pudo iniciar el pago. Intentá de nuevo en unos minutos." });
  }
}

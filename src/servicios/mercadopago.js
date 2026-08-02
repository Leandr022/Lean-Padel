export async function iniciarPagoMercadoPago(reservaId) {
  const respuesta = await fetch("/api/crear-preferencia", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reservaId }),
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error || "No se pudo iniciar el pago");
  return datos.initPoint;
}

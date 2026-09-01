// Arma un link "wa.me" para que el profesor le mande un mensaje a un alumno
// con un solo clic (abre WhatsApp Web o la app con el mensaje ya cargado,
// pero SIEMPRE lo termina de enviar una persona — no es un envío automático,
// así que no hace falta ningún permiso ni API de terceros).
//
// Los teléfonos se cargan a mano y en cualquier formato ("11 5555-4444",
// "011155554444", "+54 9 11 5555 4444", etc.), así que normalizamos a lo
// que WhatsApp espera: código de país + número, sin 0 ni 15. Si el alumno
// ya cargó el numero con "+" o el código de país, lo respetamos tal cual.
export function normalizarTelefono(telefono) {
  if (!telefono) return null;
  const soloDigitos = telefono.replace(/\D/g, "");
  if (!soloDigitos) return null;

  // Si ya viene con el código de país argentino (54, con o sin "+"), nos
  // aseguramos de que tenga el "9" de celular después: a WhatsApp le hace
  // falta para reconocerlo como celular, y es muy común cargarlo sin él
  // (ej: "+54 11 4444-5555" en vez de "+54 9 11 4444-5555"). Sin este
  // agregado, ese número le llegaba a WhatsApp incompleto y el link no
  // abría el chat correcto.
  if (telefono.trim().startsWith("+") || soloDigitos.startsWith("54")) {
    if (soloDigitos.startsWith("549")) return soloDigitos;
    if (soloDigitos.startsWith("54")) return `549${soloDigitos.slice(2)}`;
    // Tiene "+" pero no es código de Argentina (otro país): lo respetamos tal cual.
    return soloDigitos;
  }

  // Asumimos Argentina: sacamos el 0 de larga distancia y el 15 de celular
  // si están, y anteponemos 549 (54 = país, 9 = celular).
  let numero = soloDigitos;
  if (numero.startsWith("0")) numero = numero.slice(1);
  numero = numero.replace(/^(\d{2,4})15/, "$1");
  return `549${numero}`;
}

export function linkWhatsapp(telefono, mensaje) {
  const numero = normalizarTelefono(telefono);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

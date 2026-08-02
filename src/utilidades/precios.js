export function formatearMoneda(valor) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(valor || 0);
}
export function precioPorTipo(tipo, precios) { return tipo === "Grupal" ? precios.grupal : precios.individual; }

// Suma lógica para clases de 90': se cobra 1.5 veces el valor de la hora.
// Las clases de 60' (el default) no cambian nada.
export function precioPorDuracion(tipo, precios, minutos = 60) {
  return Math.round(precioPorTipo(tipo, precios) * (minutos / 60));
}

export function precioAbono(tipo, precios, clases = 4, minutos = 60) {
  const base = precioPorTipo(tipo, precios) * clases * (minutos / 60);
  const descuento = tipo === "Grupal" ? precios.descuentoAbonoGrupal : precios.descuentoAbonoIndividual;
  return Math.round(base * (1 - descuento / 100));
}
export function calcularComision(total, cantidadAlumnos, comisiones) {
  const porcentaje = comisiones[cantidadAlumnos] ?? 0;
  const comision = Math.round(total * porcentaje / 100);
  return { porcentaje, comision, gananciaProfesor: total - comision };
}

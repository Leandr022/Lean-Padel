// Categorías de juego: las "C" son de Caballeros, las "D" son de Damas. La
// lista que se ofrece en cualquier selector de categoría tiene que
// depender de qué género eligió la persona (o el profesor, si la está
// editando), para no dejar combinar géneros y letras que no corresponden.
export const categoriasCaballero = ["C8", "C7", "C6", "C5", "C4", "C3", "C2", "C1"];
export const categoriasDama = ["D8", "D7", "D6", "D5", "D4", "D3", "D2", "D1"];

export function categoriasPorGenero(genero) {
  return genero === "Dama" ? categoriasDama : categoriasCaballero;
}

/** Si la categoría actual ya no corresponde al género (por ej. se cambió el
 * género y quedó una categoría "C" con género Dama), devuelve la primera
 * categoría válida para ese género; si ya es válida, la deja igual. */
export function categoriaValida(categoria, genero) {
  const opciones = categoriasPorGenero(genero);
  return opciones.includes(categoria) ? categoria : opciones[0];
}

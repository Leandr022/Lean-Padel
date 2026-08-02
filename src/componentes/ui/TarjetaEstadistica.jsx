export default function TarjetaEstadistica({ titulo, valor, detalle }) {
  return <article className="stat-card"><span>{titulo}</span><strong>{valor}</strong>{detalle && <small>{detalle}</small>}</article>;
}

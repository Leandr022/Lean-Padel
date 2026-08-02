// Set de íconos de línea, minimalista, dibujados a mano en SVG (sin
// depender de ninguna librería de íconos de terceros). currentColor para
// heredar el color del texto que lo rodea.
const trazos = {
  inicio: <path d="M4 11.5 12 4l8 7.5M6 9.5V20h5v-6h2v6h5V9.5" />,
  calendario: (
    <>
      <rect x="4" y="5.5" width="16" height="15" rx="3" />
      <path d="M4 10h16M8 3.5v3.5M16 3.5v3.5" />
    </>
  ),
  progreso: <path d="M4 19V5M4 19h16M8 16l3.5-4.5 2.5 2.5L19 8" />,
  perfil: (
    <>
      <circle cx="12" cy="8.3" r="3.3" />
      <path d="M5 20c1-3.6 4-5.5 7-5.5s6 1.9 7 5.5" />
    </>
  ),
  alumnos: (
    <>
      <circle cx="9" cy="8.3" r="3" />
      <path d="M3.3 19.5c.9-3.2 3.3-5 5.7-5s4.8 1.8 5.7 5" />
      <circle cx="17" cy="8.8" r="2.3" />
      <path d="M15.6 14.8c2 .2 3.7 1.8 4.4 4.4" />
    </>
  ),
  comisiones: (
    <>
      <rect x="3.5" y="6.5" width="17" height="12" rx="2.5" />
      <path d="M3.5 10.5h17" />
      <circle cx="16.5" cy="14.3" r="1.4" />
    </>
  ),
  rendiciones: (
    <>
      <path d="M6 3.5h9l3 3v14H6z" />
      <path d="M9 9.5h6M9 13h6M9 16.5h4" />
    </>
  ),
  estadisticas: <path d="M4 19V5M4 19h16M8 19v-6M12.5 19V8M17 19v-9" />,
  configuracion: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.3M12 18.2v2.3M4.9 6.5l1.6 1.6M17.5 15.9l1.6 1.6M3.5 12h2.3M18.2 12h2.3M4.9 17.5l1.6-1.6M17.5 8.1l1.6-1.6" />
    </>
  ),
  salir: (
    <>
      <path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H9" />
      <path d="M13 15.5 17.5 12 13 8.5M17 12H9" />
    </>
  ),
};

export default function Icono({ nombre, className }) {
  const trazo = trazos[nombre];
  if (!trazo) return null;
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {trazo}
    </svg>
  );
}

import { Link } from "react-router-dom";
export default function NoAutorizado(){return <main className="login-page"><section className="login-card"><h1>Acceso no autorizado</h1><p>No tenés permisos para ver esta sección.</p><Link className="boton-principal" to="/login">Volver al login</Link></section></main>}

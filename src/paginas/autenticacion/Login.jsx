import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import usarAutenticacion from "../../ganchos/usarAutenticacion.js";

const rutaPorRol = { ALUMNO: "/alumno", PROFESOR: "/profesor", ADMIN: "/admin" };
const ejemploPorRol = { ALUMNO: "alumno@tuclub.com", PROFESOR: "profesor@tuclub.com", ADMIN: "admin@tuclub.com" };

export default function Login() {
  const { iniciarSesion } = usarAutenticacion();
  const navigate = useNavigate();
  const [rol, setRol] = useState("ALUMNO");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  function cambiarRol(nuevoRol) {
    setRol(nuevoRol);
    setError("");
  }

  async function enviar(e) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    const resultado = await iniciarSesion(email, password, rol);
    setEnviando(false);
    if (!resultado.ok) {
      setError(resultado.mensaje);
      return;
    }
    navigate(rutaPorRol[rol]);
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-badge">LS</div>
        <h1>LS Padel Coach</h1>
        <p>Reservá clases, administrá entrenamientos y seguí el progreso real de cada jugador.</p>

        <div className="role-selector">
          <button type="button" className={rol === "ALUMNO" ? "role-btn active" : "role-btn"} onClick={() => cambiarRol("ALUMNO")}>Alumno</button>
          <button type="button" className={rol === "PROFESOR" ? "role-btn active" : "role-btn"} onClick={() => cambiarRol("PROFESOR")}>Profesor</button>
          <button type="button" className={rol === "ADMIN" ? "role-btn active" : "role-btn"} onClick={() => cambiarRol("ADMIN")}>Admin</button>
        </div>

        <form className="login-form" onSubmit={enviar}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={ejemploPorRol[rol]} required autoComplete="email" />
          <label>Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          {error && <div className="error-box">{error}</div>}
          <button className="boton-principal" type="submit" disabled={enviando}>{enviando ? "Ingresando…" : "Ingresar"}</button>
        </form>

        <div className="registro-link">
          <span>¿Todavía no tenés cuenta?</span>
          <Link to="/registro">Quiero registrarme</Link>
        </div>
      </section>
    </main>
  );
}

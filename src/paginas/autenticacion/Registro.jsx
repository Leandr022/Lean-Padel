import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import usarAutenticacion from "../../ganchos/usarAutenticacion.js";
import { categoriasPorGenero } from "../../datos/categorias.js";

const campos = [
  { clave: "nombre", etiqueta: "Nombre" },
  { clave: "apellido", etiqueta: "Apellido" },
  { clave: "email", etiqueta: "Email" },
  { clave: "password", etiqueta: "Contraseña" },
  { clave: "telefono", etiqueta: "Teléfono" },
  { clave: "instagram", etiqueta: "Instagram" },
];

export default function Registro() {
  const { registrarAlumno } = usarAutenticacion();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    telefono: "",
    instagram: "",
    genero: "Caballero",
    categoria: "C8",
    posicion: "Drive",
    mano: "Derecha",
    telefonoVisible: "visible",
  });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  function cambiar(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // Al cambiar el género hay que reacomodar la categoría: las "C" son de
  // Caballeros y las "D" de Damas, no tiene sentido mezclarlas.
  function cambiarGenero(e) {
    const genero = e.target.value;
    const opciones = categoriasPorGenero(genero);
    setForm({ ...form, genero, categoria: opciones[0] });
  }

  const opcionesCategoria = categoriasPorGenero(form.genero);

  async function enviar(e) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    const resultado = await registrarAlumno(form);
    setEnviando(false);
    if (!resultado.ok) {
      setError(resultado.mensaje);
      return;
    }
    if (resultado.requiereConfirmacion) {
      alert("¡Listo! Te enviamos un email para confirmar tu cuenta. Una vez confirmada, ya podés iniciar sesión.");
    } else {
      alert("Registro creado. Ya podés iniciar sesión como alumno.");
    }
    navigate("/login");
  }

  return (
    <main className="login-page">
      <section className="login-card registro-card">
        <div className="brand-badge">LS</div>
        <h1>Crear perfil de alumno</h1>
        <p>Estos datos se usan para reservar clases, compatibilidad de categorías y seguimiento técnico.</p>
        <form className="login-form grid-dos" onSubmit={enviar}>
          {campos.map(({ clave, etiqueta }) => (
            <label key={clave}>
              {etiqueta}
              <input
                name={clave}
                type={clave === "password" ? "password" : clave === "email" ? "email" : "text"}
                value={form[clave]}
                onChange={cambiar}
                required={!["telefono", "instagram"].includes(clave)}
                minLength={clave === "password" ? 6 : undefined}
              />
            </label>
          ))}
          <label>
            Género
            <select name="genero" value={form.genero} onChange={cambiarGenero}>
              <option>Caballero</option>
              <option>Dama</option>
            </select>
          </label>
          <label>
            Categoría
            <select name="categoria" value={form.categoria} onChange={cambiar}>
              {opcionesCategoria.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Posición
            <select name="posicion" value={form.posicion} onChange={cambiar}>
              <option>Drive</option>
              <option>Revés</option>
              <option>Indistinto</option>
            </select>
          </label>
          <label>
            Visibilidad del teléfono
            <select name="telefonoVisible" value={form.telefonoVisible} onChange={cambiar}>
              <option value="visible">Visible</option>
              <option value="oculto">Oculto</option>
            </select>
          </label>
          {error && <div className="error-box ancho-total">{error}</div>}
          <button className="boton-principal ancho-total" disabled={enviando}>
            {enviando ? "Creando cuenta…" : "Crear mi cuenta"}
          </button>
        </form>
        <div className="registro-link">
          <Link to="/login">Volver al login</Link>
        </div>
      </section>
    </main>
  );
}

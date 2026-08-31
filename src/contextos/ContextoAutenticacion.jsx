import { createContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { obtenerPerfil } from "../servicios/perfiles.js";

export const ContextoAutenticacion = createContext();

export default function ProveedorAutenticacion({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    async function cargarPerfil(id, email) {
      try {
        const perfil = await obtenerPerfil(id);
        if (activo) setUsuario({ ...perfil, email: perfil.email || email });
      } catch (error) {
        console.error("No se pudo cargar el perfil del usuario:", error);
        if (activo) setUsuario(null);
      }
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) await cargarPerfil(session.user.id, session.user.email);
      if (activo) setCargando(false);
    });

    const { data: suscripcion } = supabase.auth.onAuthStateChange(async (_evento, session) => {
      if (session?.user) {
        await cargarPerfil(session.user.id, session.user.email);
      } else {
        setUsuario(null);
      }
    });

    return () => {
      activo = false;
      suscripcion.subscription.unsubscribe();
    };
  }, []);

  async function iniciarSesion(email, password, rolEsperado) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      // Supabase distingue el motivo real en error.message. Antes acá se
      // mostraba siempre "Email o contraseña incorrectos" sin importar la
      // causa, lo que tapaba el caso más común al recién crear usuarios: que
      // el email todavía no está confirmado.
      if (error?.message?.toLowerCase().includes("email not confirmed")) {
        return {
          ok: false,
          mensaje: "Todavía no confirmaste el email de esta cuenta. Revisá la casilla de correo (y spam) y tocá el link de confirmación, o pedile a un admin que la confirme manualmente desde Supabase.",
        };
      }
      return { ok: false, mensaje: "Email o contraseña incorrectos." };
    }
    let perfil;
    try {
      perfil = await obtenerPerfil(data.user.id);
    } catch {
      await supabase.auth.signOut();
      return { ok: false, mensaje: "No encontramos un perfil para este usuario." };
    }
    if (rolEsperado && perfil.rol !== rolEsperado) {
      await supabase.auth.signOut();
      return { ok: false, mensaje: `Ese usuario no tiene el rol ${rolEsperado.toLowerCase()}.` };
    }
    setUsuario(perfil);
    return { ok: true, perfil };
  }

  // Login con Google: redirige a Google y vuelve a "redirectTo". Sirve tanto
  // para iniciar sesión (si la cuenta ya existe) como para crearla la
  // primera vez (el trigger manejar_nuevo_usuario arma el perfil solo, con
  // rol ALUMNO por defecto — igual que hoy con el registro por formulario).
  async function iniciarSesionConGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/login` },
    });
    if (error) return { ok: false, mensaje: error.message };
    return { ok: true };
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    setUsuario(null);
  }

  async function registrarAlumno(alumno) {
    const { data, error } = await supabase.auth.signUp({
      email: alumno.email,
      password: alumno.password,
      options: {
        data: {
          rol: "ALUMNO",
          nombre: `${alumno.nombre} ${alumno.apellido}`.trim(),
          apellido: alumno.apellido,
          telefono: alumno.telefono,
          instagram: alumno.instagram,
          categoria: alumno.categoria,
          genero: alumno.genero,
          posicion: alumno.posicion,
          mano: alumno.mano,
          telefono_visible: alumno.telefonoVisible === "visible",
        },
      },
    });
    if (error) return { ok: false, mensaje: error.message };
    return { ok: true, requiereConfirmacion: !data.session };
  }

  return (
    <ContextoAutenticacion.Provider value={{ usuario, cargando, iniciarSesion, iniciarSesionConGoogle, cerrarSesion, registrarAlumno }}>
      {children}
    </ContextoAutenticacion.Provider>
  );
}

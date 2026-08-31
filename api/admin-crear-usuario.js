import { crearClienteAdmin } from "./_supabaseAdmin.js";

// Le permite a un ADMIN crear directamente una cuenta de profesor (email +
// contraseña), sin que esa persona tenga que pasar por el registro público
// (que solo crea alumnos, a propósito). Usa la Service Role Key para crear
// el usuario en auth.users, pero ANTES de tocar nada verifica con la propia
// sesión de quien llama que efectivamente sea un ADMIN — si no, no se puede
// invocar esto llamando a la URL directamente con cualquier token.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const encabezado = req.headers.authorization || "";
    const token = encabezado.startsWith("Bearer ") ? encabezado.slice(7) : null;
    if (!token) {
      res.status(401).json({ error: "Falta el token de sesión." });
      return;
    }

    const admin = crearClienteAdmin();

    // Valida el token contra Supabase Auth y saca el id del usuario que llama.
    const { data: datosUsuario, error: errorUsuario } = await admin.auth.getUser(token);
    if (errorUsuario || !datosUsuario?.user) {
      res.status(401).json({ error: "Sesión inválida o vencida." });
      return;
    }

    // Confirma que ese usuario sea ADMIN en la base (no alcanza con estar
    // logueado: cualquier alumno o profesor también tiene un token válido).
    const { data: perfilLlamador, error: errorPerfil } = await admin
      .from("perfiles")
      .select("rol")
      .eq("id", datosUsuario.user.id)
      .single();
    if (errorPerfil || perfilLlamador?.rol !== "ADMIN") {
      res.status(403).json({ error: "Solo un admin puede crear cuentas de profesor." });
      return;
    }

    const { nombre, email, password } = req.body || {};
    if (!nombre || !email || !password) {
      res.status(400).json({ error: "Faltan nombre, email o contraseña." });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "La contraseña tiene que tener al menos 6 caracteres." });
      return;
    }

    // email_confirm: true evita el mail de confirmación (y el problema de
    // "Site URL" mal configurado que ya vimos antes) — el admin está
    // creando esta cuenta a mano, así que no hace falta ese paso extra.
    const { data: creado, error: errorCreacion } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { rol: "PROFESOR", nombre },
    });
    if (errorCreacion) {
      res.status(400).json({ error: errorCreacion.message });
      return;
    }

    res.status(200).json({ ok: true, id: creado.user.id });
  } catch (error) {
    console.error("Error creando cuenta de profesor:", error);
    res.status(500).json({ error: "Error interno creando la cuenta." });
  }
}

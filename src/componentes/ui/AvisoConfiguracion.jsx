export default function AvisoConfiguracion() {
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-badge">LS</div>
        <h1>Falta terminar la configuración</h1>
        <p>
          Esta copia de la app todavía no tiene conectado un proyecto de Supabase, así que no puede mostrar el login ni
          ningún dato.
        </p>
        <div className="panel-resumen">
          <p>Para verla funcionando:</p>
          <ol style={{ margin: "10px 0 0", paddingLeft: 20, color: "var(--muted)" }}>
            <li>Copiá <code>.env.example</code> a <code>.env.local</code> (en desarrollo) o cargá esas mismas variables en Vercel (en producción).</li>
            <li>Completá <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> con los datos de tu proyecto de Supabase.</li>
            <li>Reiniciá <code>npm run dev</code> (o volvé a desplegar en Vercel).</li>
          </ol>
        </div>
        <p className="texto-muted">El paso a paso completo está en el README del proyecto.</p>
      </section>
    </main>
  );
}

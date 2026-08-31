# LS Padel Coach

App para que los alumnos reserven clases de pádel, el profesor gestione su
calendario y cobros, y el club controle rendiciones y estadísticas.

Stack: React + Vite (frontend), Supabase (base de datos, login y storage de
archivos), Mercado Pago (cobros online) y Vercel (hosting + funciones
serverless).

## Qué incluye

- Login por rol (Alumno / Profesor / Admin) con Supabase Auth real, con
  opción de "Continuar con Google" además de email y contraseña (ver
  configuración más abajo).
- Registro público de alumnos (Profesor y Admin se crean a mano, ver abajo).
- Calendario semanal con fechas reales (no genérico): el profesor abre sus
  horarios semana a semana, los alumnos reservan lo que está abierto.
- Grilla de 30 en 30 minutos, de 08:00 a 16:30 (el último turno posible
  arranca a las 15:30). El alumno elige el horario de inicio y si dura 1
  hora o 1 hora y media (se cobra 1.5x el valor de la hora) — vale igual
  para clases Individuales y Grupales, los horarios son los mismos.
- Reserva de clase Individual o Grupal (cupo de 4), con pago por Mercado
  Pago, transferencia (con comprobante) o efectivo.
- Cancelación con tope de 12 horas: el alumno puede cancelar su reserva sin
  problema si falta más de 12hs para la clase; si falta menos, el botón de
  cancelar se oculta y queda bloqueado también del lado del servidor (el
  profesor/admin sí puede cancelar en cualquier momento, para excepciones).
- Panel del profesor: crear/bloquear horarios, anotar alumnos a mano, marcar
  pagos, cambiar estado de la clase.
- Herramientas de horarios del profesor: abrir la agenda semana por semana,
  por días de la semana recurrentes (elegís qué días y cuántas semanas
  adelante) o bloquear un día puntual completo con motivo (vacaciones,
  feriado, torneo) sin pisar clases ya reservadas.
- Categorías separadas por género: las categorías "C" son de Caballeros y
  las "D" de Damas; el desplegable de categoría se filtra solo según el
  género cargado en el perfil (Hombre → Caballero, Mujer → Dama).
- Gestión de alumnos: el profesor puede corregir los datos del perfil de un
  alumno (categoría, género, posición, mano, teléfono) directamente desde
  su ficha, además de completar la planilla técnica.
- Planilla técnica por alumno con seguimiento golpe a golpe (la completa el
  profesor; el alumno la ve en modo lectura).
- Aviso automático por WhatsApp al profesor cada vez que un alumno reserva
  una clase (vía CallMeBot, ver sección más abajo). Se puede prender o
  apagar desde "Configuración" en el panel del profesor.
- Botón "Recordarle por WhatsApp" en cada alumno anotado a una clase: le
  abre al profesor WhatsApp con un mensaje ya armado (fecha y hora de la
  clase) para que lo revise y lo mande él mismo con un clic — no es un envío
  automático, así que no hace falta ninguna configuración extra.
- Pantalla de "Configuración" del profesor: nombre de cuenta editable,
  on/off del aviso de WhatsApp, y accesos directos a Horarios y Comisiones.
- Comisiones y rendiciones al club, con aviso de pago y confirmación admin.
  El profesor puede cargar el % de comisión que le fija el club (según la
  cantidad de alumnos por clase) desde su propia pantalla de "Comisiones",
  y ve automáticamente cuánto factura, cuánto debe rendir y cuál es su
  ganancia real del mes — sin tener que calcularlo a mano.
- Estadísticas del club (alumnos activos, horarios más pedidos, etc.).
- Aumento de precios por IPC: el admin carga el % del mes y lo aplica con un
  botón aparte (sube individual y grupal ese %, no es automático).

## 1) Crear el proyecto de Supabase

1. Entrá a [supabase.com](https://supabase.com), creá una cuenta gratis y un
   proyecto nuevo.
2. Andá a **SQL Editor → New query**, pegá todo el contenido de
   [`supabase/schema.sql`](./supabase/schema.sql) y ejecutalo. Esto crea las
   tablas, los permisos de seguridad (RLS) y los buckets de archivos. Si ya
   habías ejecutado una versión anterior del schema, es seguro volver a
   correrlo entero: las partes nuevas (por ejemplo, la grilla de 30 minutos o
   la columna `duracion_minutos` de `reservas`) se agregan solas sin tocar lo
   que ya tenías cargado.

   > **Importante:** si en algún momento ves un error como *"Could not find
   > the 'duracion_minutos' column of 'reservas' in the schema cache"*,
   > significa que tu proyecto de Supabase todavía tiene una versión vieja
   > del schema (le falta esa columna) o que la caché de la API todavía no
   > se actualizó. Volvé a pegar y correr `schema.sql` entero en el SQL
   > Editor; si el error persiste, andá a **Project Settings → API** y
   > tocá **"Reload schema cache"** (o simplemente esperá uno o dos minutos:
   > se refresca solo).
3. En **Project Settings → API** copiá:
   - `Project URL` → va en `VITE_SUPABASE_URL`
   - `anon public key` → va en `VITE_SUPABASE_ANON_KEY`
   - `service_role key` → va en `SUPABASE_SERVICE_ROLE_KEY` (¡es secreta,
     nunca la pongas en variables `VITE_*` ni la compartas!)
4. (Opcional pero recomendado para probar rápido) En **Authentication →
   Providers → Email**, podés desactivar "Confirm email" mientras probás, así
   no hace falta click en un mail para poder loguearte. Para producción,
   dejalo activado.

### Crear tu usuario de Profesor y de Admin

Por seguridad, cualquiera que se registra en la app pública queda como
**Alumno**. Vos como profesor/dueño del club creás tus propios accesos a
mano:

1. Supabase → **Authentication → Users → Add user**, cargá tu email y una
   contraseña.
2. Volvé al **SQL Editor** y corré (reemplazando el email):
   ```sql
   update public.perfiles set rol = 'PROFESOR', nombre = 'Leandro Santagada'
   where email = 'tu-email@ejemplo.com';
   ```
3. Repetí el proceso con otro email si además querés un usuario Admin
   separado (podés usar el mismo email para ambos roles solo si te logueás
   eligiendo el rol correspondiente en el login... en la práctica, usá dos
   emails distintos, uno por rol).

## 2) Crear las credenciales de Mercado Pago

1. Entrá a [mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers/panel)
   con tu cuenta de Mercado Pago (o creá una).
2. Creá una aplicación y copiá, de **Credenciales de producción** (o de
   prueba mientras testeás):
   - `Access Token` → va en `MERCADOPAGO_ACCESS_TOKEN` (secreto, solo en el
     servidor)
   - `Public Key` → va en `VITE_MERCADOPAGO_PUBLIC_KEY`

## 3) Configurar el envío de mails (SMTP propio)

El servicio de mails que trae Supabase por defecto es solo para pruebas: no
manda mails a nadie fuera de tu organización de Supabase y tiene un límite
de 2 por hora. Para que los alumnos reciban de verdad el mail de
confirmación al registrarse, hace falta conectar un proveedor de mail
propio:

1. Creá una cuenta gratis en [Brevo](https://www.brevo.com) (u otro de la
   lista que ofrece Supabase: Resend, Postmark, SendGrid, AWS SES, ZeptoMail).
2. En Brevo, verificá como "remitente" el email desde el que van a salir los
   mails (por ejemplo el email del club) — te manda un mail de confirmación,
   lo confirmás con un click. No hace falta tener un dominio propio para
   esto.
3. Buscá tus credenciales SMTP (usualmente en **SMTP & API**): host, puerto,
   usuario y una contraseña/clave SMTP (distinta a tu contraseña de Brevo).
4. En Supabase, andá a **Authentication → Settings** (sección SMTP) y
   activá "Enable Custom SMTP", cargando esos datos más el email verificado
   como remitente y el nombre que querés que aparezca.
5. Probá registrando una cuenta nueva con un email real: el mail debería
   llegar en segundos.

## 4) Activar el aviso por WhatsApp de nuevas reservas

Cada vez que un alumno reserva una clase, la app le puede mandar un
WhatsApp al profesor con los datos (alumno, fecha, tipo de clase, si ya
está pagada). Usa [CallMeBot](https://www.callmebot.com), un servicio
gratuito pensado para avisos personales — no reemplaza una integración
oficial de WhatsApp Business si en algún momento se necesita mandarles
mensajes a los alumnos, pero alcanza de sobra para este aviso.

1. Agendá en tu WhatsApp el número **+34 623 78 95 80** y mandale el
   mensaje exacto: `I allow callmebot to send me messages`.
2. En un par de minutos te responde con una **clave (apikey)**. Guardala.
3. Cargá en las variables de entorno (`.env.local` y en Vercel):
   - `CALLMEBOT_PHONE`: tu número con código de país, sin `+` ni espacios
     (ej: `5492611234567`).
   - `CALLMEBOT_APIKEY`: la clave que te mandó el bot.
   - `NOTIFICACIONES_WEBHOOK_SECRET`: inventate cualquier texto largo y
     random — es para que nadie más pueda activar este aviso desde afuera.
4. En Supabase, andá a **Database → Webhooks → Create a new hook**:
   - Tabla: `reservas`.
   - Evento: `Insert`.
   - Tipo: `HTTP Request`, método `POST`.
   - URL: `https://tu-app.vercel.app/api/notificar-reserva` (con tu dominio
     real).
   - En **HTTP Headers**, agregá uno con key `x-webhook-secret` y como
     valor el mismo texto que pusiste en `NOTIFICACIONES_WEBHOOK_SECRET`.
5. Guardá, y probá reservando una clase de prueba: te debería llegar el
   WhatsApp al toque.

## 5) Activar el login con Google

Para que aparezca el botón "Continuar con Google" tanto en el login como en
el registro, hay que crear credenciales OAuth en Google y cargarlas en
Supabase. Esto lo tenés que hacer vos con tu cuenta de Google — es
configuración de cuenta externa, nadie puede hacerlo por vos.

1. Andá a [console.cloud.google.com](https://console.cloud.google.com/),
   creá un proyecto (o usá uno existente).
2. Andá a **APIs y servicios → Pantalla de consentimiento de OAuth**,
   elegí "Externo" y completá los datos mínimos (nombre de la app, tu
   email). No hace falta verificarla ante Google para que la usen vos y tus
   alumnos.
3. Andá a **APIs y servicios → Credenciales → Crear credenciales → ID de
   cliente de OAuth**, tipo "Aplicación web".
4. En **Orígenes autorizados de JavaScript** agregá tu URL de Vercel (por
   ejemplo `https://lean-padel.vercel.app`) y, si probás en local,
   `http://localhost:5173`.
5. En **URI de redireccionamiento autorizados** agregá la URL de callback
   que te muestra Supabase en el paso siguiente (con forma
   `https://<tu-proyecto>.supabase.co/auth/v1/callback`).
6. Copiá el **Client ID** y el **Client secret** que te da Google.
7. En Supabase, andá a **Authentication → Providers → Google**, activalo y
   pegá ahí el Client ID y el Client secret.
8. En **Authentication → URL Configuration**, revisá que el "Site URL" sea
   tu URL de Vercel, y que en "Redirect URLs" esté esa misma URL (con
   `/login` al final, por ejemplo `https://lean-padel.vercel.app/login`) y,
   si probás en local, `http://localhost:5173/login`.
9. Probá desde el login o el registro: "Continuar con Google" te tiene que
   llevar a elegir tu cuenta de Google y volver ya logueado.

Si un profesor o admin que ya tiene cuenta con email y contraseña quiere
loguearse con Google, tiene que usar exactamente el mismo email en su
cuenta de Google — Supabase enlaza automáticamente la cuenta existente
cuando el email coincide. Si usa un email de Google distinto, se le crea
una cuenta nueva de alumno (por eso, si eso pasa, avisale que use el email
correcto o pedile a un admin que le cambie el rol a esa cuenta nueva).

## 6) Configurar las variables de entorno

Copiá `.env.example` a `.env.local` y completá los valores de los pasos 1,
2, 3 y 4. `VITE_SITE_URL` en desarrollo queda como `http://localhost:5173`.

## 7) Correr en local

```bash
npm install
npm run dev
```

Mercado Pago no puede notificar pagos a `localhost` (necesita una URL
pública), así que el pago online solo se puede probar una vez desplegado en
Vercel. En local podés probar el resto del flujo (transferencia, efectivo,
calendario, planilla técnica, etc.) sin problema.

## 8) Publicar en Vercel

1. Subí este proyecto a un repositorio de GitHub.
2. Entrá a [vercel.com](https://vercel.com), creá una cuenta (podés usar tu
   cuenta de GitHub) e importá el repositorio.
3. En **Environment Variables** cargá las mismas variables de
   `.env.example` (con los valores reales). `VITE_SITE_URL` tiene que ser la
   URL que te da Vercel, por ejemplo `https://ls-padel-coach.vercel.app`.
4. Desplegá. Vercel detecta que es un proyecto Vite y arma también las
   funciones de `/api` automáticamente (no hace falta configurar nada
   extra).
5. Una vez publicado, en el panel de tu aplicación en Mercado Pago no hace
   falta configurar nada más: la URL de notificación se manda dinámicamente
   en cada pago usando `VITE_SITE_URL`.

## Estructura del proyecto

```
src/
  componentes/     Piezas de UI reutilizables (calendario, planilla técnica)
  contextos/       Contexto de autenticación (Supabase Auth)
  layouts/         Layout con sidebar + topbar por rol
  paginas/         Una carpeta por rol: alumno, profesor, admin, autenticacion
  servicios/       Toda la comunicación con Supabase (una función = una acción)
  utilidades/      Helpers puros: precios, fechas, formato
api/               Funciones serverless de Vercel (Mercado Pago)
supabase/
  schema.sql       Esquema completo de base de datos + seguridad (RLS)
```

## Decisiones de diseño a tener en cuenta

- **El profesor abre sus horarios.** El calendario no asume que todas las
  horas están libres para siempre: el profesor genera su semana con "Abrir
  horarios de esta semana" (o crea horarios puntuales). Esto refleja mejor
  la realidad (vacaciones, horarios que cambian) y es lo que permite que la
  seguridad de la base de datos funcione bien.
- **Solo hay un profesor por ahora.** El código está preparado para bases
  de datos con más de un profesor (cada clase tiene su `profesor_id`), pero
  el calendario no tiene todavía un selector de profesor. Si el club suma
  más profesores, es la próxima extensión natural.
- **La planilla técnica la completa el profesor.** El alumno la ve en modo
  lectura en "Mi progreso". Si más adelante querés que el alumno también
  pueda autoevaluarse, hay que sumar un permiso específico en `schema.sql`.
- **Límite de concurrencia:** hay una ventana muy chica (milisegundos) donde
  dos personas tocando el mismo horario a la vez podrían pisarse. Para un
  club de este tamaño el riesgo es prácticamente nulo, pero quedó anotado
  por si en algún momento se vuelve un problema real.
- **Clases de 1h30 y horarios "puntuales".** Cuando reservás una clase de 1
  hora (o 1h30), el sistema bloquea automáticamente el o los tramos de 30'
  siguientes para que nadie reserve encima — pero esos tramos tienen que
  existir de antemano como horario "disponible". Si abrís toda la semana
  con "Abrir horarios de esta semana" no hay que pensar en esto (abre todos
  los tramos de 30' de una). Si en cambio creás un horario puntual suelto,
  abrí también el/los tramos siguientes si querés que se pueda reservar una
  clase completa ahí.
- **El monto de una reserva se guarda cuando el alumno confirma**, calculado
  en el navegador a partir de los precios vigentes (no hay, todavía, una
  revalidación estricta del monto contra `configuracion` al insertar la
  fila). Para Mercado Pago esto es menos relevante porque `crear-preferencia`
  usa ese monto ya guardado para armar el cobro real; para transferencia o
  efectivo, el profesor ve el monto declarado al marcar el pago. Si en algún
  momento se vuelve un problema, la mejora natural es sumar un trigger que
  recalcule `monto` en el servidor a partir de `configuracion` en vez de
  confiar en lo que mandó el navegador.

## Seguridad

Todas las tablas tienen Row Level Security (RLS) activado: un alumno solo
puede ver y tocar sus propios datos, el profesor ve y gestiona sus propias
clases y alumnos, y el admin tiene visibilidad total. Los pagos con Mercado
Pago se calculan siempre del lado del servidor (nunca se confía en un monto
que mande el navegador), y las claves secretas (`SUPABASE_SERVICE_ROLE_KEY`,
`MERCADOPAGO_ACCESS_TOKEN`) solo se usan en las funciones de `/api`, nunca
llegan al navegador.

El profesor puede corregir el perfil de sus alumnos (política
`perfiles_update_staff`), pero un trigger (`proteger_columnas_perfil`) sigue
bloqueando que, aunque tenga ese permiso, cambie el `rol` o el `activo` de
alguien: eso sigue siendo exclusivo del admin. Esto se probó explícitamente
contra una base Postgres local antes de entregarlo.

El profesor puede editar `configuracion.comisiones` (política
`configuracion_update_profesor`), pero un trigger
(`proteger_columnas_configuracion`) restaura cualquier otro campo de esa
tabla a su valor anterior si quien edita no es admin, así que no puede usar
ese permiso para tocar precios, descuentos, IPC ni el período de rendición
por defecto — eso sigue siendo exclusivo del admin.

La cancelación con menos de 12 horas no depende solo de que el botón esté
oculto en la pantalla: un trigger (`impedir_cancelacion_tardia`) rechaza el
borrado de la reserva directamente en la base de datos si faltan menos de
12hs, salvo que quien cancele sea el profesor o el admin. Así, aunque
alguien intente cancelar llamando a la API directamente (saltándose la
pantalla), la regla se sigue cumpliendo. Ambas reglas se probaron
explícitamente contra una base Postgres local (permisos cruzados entre
Alumno/Profesor/Admin y los dos casos límite de la cancelación) antes de
entregarlas.

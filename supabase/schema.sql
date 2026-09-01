-- =========================================================
-- LS Padel Coach — esquema de base de datos (Supabase/Postgres)
-- Ejecutar completo en: Supabase → SQL Editor → New query → Run
-- Es seguro volver a ejecutarlo (usa "if not exists" / "on conflict")
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- PERFILES (uno por usuario de auth.users)
-- ---------------------------------------------------------
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol text not null check (rol in ('ALUMNO','PROFESOR','ADMIN')),
  nombre text not null default '',
  apellido text,
  email text,
  telefono text,
  telefono_visible boolean not null default true,
  instagram text,
  categoria text default 'C8',
  genero text default 'Caballero',
  posicion text default 'Drive',
  mano text default 'Derecha',
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  foto_url text,
  -- Le permite a cada profesor prender/apagar por su cuenta el aviso por
  -- WhatsApp que le llega cuando un alumno reserva (ver api/notificar-reserva.js).
  avisos_whatsapp_activo boolean not null default true
);
-- Migración para bases ya creadas antes de esta columna (evita reventar en
-- proyectos existentes al no tener "if not exists" en el create table).
alter table public.perfiles add column if not exists foto_url text;
alter table public.perfiles add column if not exists avisos_whatsapp_activo boolean not null default true;

-- Función auxiliar: rol del usuario logueado (security definer = evita
-- recursión infinita al usarla dentro de las políticas de "perfiles").
create or replace function public.rol_actual()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select rol from public.perfiles where id = auth.uid()
$$;

alter table public.perfiles enable row level security;

drop policy if exists "perfiles_select_propio" on public.perfiles;
create policy "perfiles_select_propio" on public.perfiles
  for select using (auth.uid() = id);

drop policy if exists "perfiles_select_staff" on public.perfiles;
create policy "perfiles_select_staff" on public.perfiles
  for select using (public.rol_actual() in ('PROFESOR','ADMIN'));

-- Cualquier usuario logueado puede ver los datos básicos de los profesores
-- (los necesita para reservar clases y ver quién da cada clase).
-- OJO: sin "to authenticated" esta política corría para CUALQUIERA,
-- incluso sin iniciar sesión (rol='PROFESOR' no depende de quién pregunta).
-- Eso dejaba el nombre/email/teléfono/instagram del profesor expuestos en
-- la API pública sin login. Se corrige acotándola a usuarios logueados.
drop policy if exists "perfiles_select_profesores" on public.perfiles;
create policy "perfiles_select_profesores" on public.perfiles
  for select to authenticated using (rol = 'PROFESOR');

drop policy if exists "perfiles_update_propio" on public.perfiles;
create policy "perfiles_update_propio" on public.perfiles
  for update using (auth.uid() = id);

drop policy if exists "perfiles_update_admin" on public.perfiles;
create policy "perfiles_update_admin" on public.perfiles
  for update using (public.rol_actual() = 'ADMIN');

-- El profesor tiene que poder corregir datos de sus alumnos (categoría,
-- género, posición, teléfono, etc.) desde "Gestión de alumnos". El trigger
-- de más abajo (proteger_columnas_perfil) sigue evitando que, aunque tenga
-- este permiso, pueda tocar "rol" o "activo" de nadie (eso sigue siendo
-- solo de ADMIN).
drop policy if exists "perfiles_update_staff" on public.perfiles;
create policy "perfiles_update_staff" on public.perfiles
  for update using (public.rol_actual() in ('PROFESOR','ADMIN'));

-- RLS es a nivel de fila, no de columna: sin esto, cualquier alumno podría
-- llamar a la API de Supabase directamente y ponerse rol='ADMIN' en su
-- propia fila (la política de arriba solo mira que sea SU fila, no qué
-- columnas cambia). Este trigger blindas "rol" y "activo": solo un ADMIN
-- puede modificarlas, sin importar qué mande el resto de los updates.
-- Usa "is distinct from" (no "<>") a propósito: en SQL, "x <> 'ADMIN'" da
-- NULL (no TRUE) cuando x es NULL, así que el "if" no se disparaba y la fila
-- pasaba sin revertir. Con "is distinct from" ese caso también queda
-- bloqueado por defecto.
create or replace function public.proteger_columnas_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.rol_actual() is distinct from 'ADMIN' then
    new.rol := old.rol;
    new.activo := old.activo;
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_proteger_columnas_perfil on public.perfiles;
create trigger trigger_proteger_columnas_perfil
  before update on public.perfiles
  for each row execute function public.proteger_columnas_perfil();

-- Alta automática de perfil cuando alguien se registra (auth.users).
-- Cubre tanto el registro con el formulario propio (manda "nombre", etc. en
-- las opciones del signUp) como el login con Google: ahí no hay formulario,
-- así que tomamos el nombre y la foto que Google ya nos da en el perfil de
-- la cuenta (viene como "full_name"/"name" y "avatar_url").
create or replace function public.manejar_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, rol, nombre, apellido, email, telefono, instagram, categoria, genero, posicion, mano, telefono_visible, foto_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'rol', 'ALUMNO'),
    coalesce(
      new.raw_user_meta_data->>'nombre',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    ),
    new.raw_user_meta_data->>'apellido',
    new.email,
    new.raw_user_meta_data->>'telefono',
    new.raw_user_meta_data->>'instagram',
    coalesce(new.raw_user_meta_data->>'categoria', 'C8'),
    coalesce(new.raw_user_meta_data->>'genero', 'Caballero'),
    coalesce(new.raw_user_meta_data->>'posicion', 'Drive'),
    coalesce(new.raw_user_meta_data->>'mano', 'Derecha'),
    coalesce((new.raw_user_meta_data->>'telefono_visible')::boolean, true),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trigger_manejar_nuevo_usuario on auth.users;
create trigger trigger_manejar_nuevo_usuario
  after insert on auth.users
  for each row execute function public.manejar_nuevo_usuario();

-- ---------------------------------------------------------
-- CONFIGURACIÓN (precios, comisiones, etc. — una sola fila)
-- ---------------------------------------------------------
create table if not exists public.configuracion (
  id int primary key default 1,
  precio_individual numeric not null default 29000,
  precio_grupal numeric not null default 22000,
  descuento_abono_individual numeric not null default 6.5,
  descuento_abono_grupal numeric not null default 5.5,
  ipc numeric not null default 0,
  rendicion_default text not null default 'semanal' check (rendicion_default in ('semanal','quincenal','mensual')),
  comisiones jsonb not null default '{"1":20,"2":15,"3":10,"4":8}'::jsonb,
  constraint configuracion_una_fila check (id = 1)
);
insert into public.configuracion (id) values (1) on conflict (id) do nothing;

alter table public.configuracion enable row level security;

drop policy if exists "configuracion_select_autenticados" on public.configuracion;
create policy "configuracion_select_autenticados" on public.configuracion
  for select using (auth.role() = 'authenticated');

drop policy if exists "configuracion_update_admin" on public.configuracion;
create policy "configuracion_update_admin" on public.configuracion
  for update using (public.rol_actual() = 'ADMIN');

-- El profesor tiene que poder ajustar el % de comisión del club sin
-- necesitar entrar como admin. El trigger de más abajo
-- (proteger_columnas_configuracion) se asegura de que, aunque tenga este
-- permiso, no pueda tocar precios, descuentos, IPC ni el período de
-- rendición por esta vía — eso sigue siendo solo de ADMIN.
drop policy if exists "configuracion_update_profesor" on public.configuracion;
create policy "configuracion_update_profesor" on public.configuracion
  for update using (public.rol_actual() in ('PROFESOR','ADMIN'));

-- Mismo patrón que proteger_columnas_perfil: RLS es a nivel de fila, no de
-- columna, así que sin esto un profesor podría mandar un update tocando
-- precio_individual, ipc, etc. aunque el formulario del frontend nunca se
-- lo ofrezca. Si no es ADMIN, este trigger devuelve todas las columnas
-- menos "comisiones" a su valor anterior.
create or replace function public.proteger_columnas_configuracion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.rol_actual() <> 'ADMIN' then
    new.precio_individual := old.precio_individual;
    new.precio_grupal := old.precio_grupal;
    new.descuento_abono_individual := old.descuento_abono_individual;
    new.descuento_abono_grupal := old.descuento_abono_grupal;
    new.ipc := old.ipc;
    new.rendicion_default := old.rendicion_default;
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_proteger_columnas_configuracion on public.configuracion;
create trigger trigger_proteger_columnas_configuracion
  before update on public.configuracion
  for each row execute function public.proteger_columnas_configuracion();

-- ---------------------------------------------------------
-- CLASES (turnos del calendario, con fecha real)
-- ---------------------------------------------------------
create table if not exists public.clases (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  hora text not null,
  profesor_id uuid not null references public.perfiles(id),
  estado text not null default 'disponible' check (estado in ('disponible','reservada','bloqueada')),
  tipo text check (tipo in ('Individual','Grupal')),
  estado_clase text not null default 'pendiente' check (estado_clase in ('pendiente','en proceso','finalizada')),
  motivo text,
  -- Contador de anotados, mantenido por los triggers de abajo. Existe para
  -- que un alumno pueda ver si una clase grupal tiene lugar sin necesitar
  -- permiso para leer las reservas de otros alumnos (eso lo bloquea RLS).
  cupo_ocupado int not null default 0,
  creado_en timestamptz not null default now(),
  unique (fecha, hora, profesor_id)
);

create index if not exists clases_fecha_idx on public.clases (fecha);
create index if not exists clases_profesor_id_idx on public.clases (profesor_id);
create index if not exists clases_continuacion_de_idx on public.clases (continuacion_de);

-- Migración: grilla de 30 minutos con clases de 60 o 90 minutos. La clase
-- "dueña" del turno (la que el alumno reservó primero) guarda en
-- `clases_extendidas` los ids de los tramos de 30' que también ocupa; esos
-- tramos quedan marcados con `es_continuacion = true` y no se pueden
-- reservar por separado. Ver trigger `antes_insertar_reserva` más abajo.
alter table public.clases add column if not exists duracion_minutos int not null default 60;
alter table public.clases add column if not exists es_continuacion boolean not null default false;
alter table public.clases add column if not exists continuacion_de uuid references public.clases(id);
alter table public.clases add column if not exists clases_extendidas uuid[] not null default '{}';

alter table public.clases enable row level security;

drop policy if exists "clases_select_autenticados" on public.clases;
create policy "clases_select_autenticados" on public.clases
  for select using (auth.role() = 'authenticated');

drop policy if exists "clases_all_profesor_propio" on public.clases;
create policy "clases_all_profesor_propio" on public.clases
  for all using (profesor_id = auth.uid()) with check (profesor_id = auth.uid());

drop policy if exists "clases_all_admin" on public.clases;
create policy "clases_all_admin" on public.clases
  for all using (public.rol_actual() = 'ADMIN') with check (public.rol_actual() = 'ADMIN');

-- ---------------------------------------------------------
-- RESERVAS (un alumno reserva una clase; varias reservas por
-- clase si es "Grupal")
-- ---------------------------------------------------------
create table if not exists public.reservas (
  id uuid primary key default gen_random_uuid(),
  clase_id uuid not null references public.clases(id) on delete cascade,
  alumno_id uuid not null references public.perfiles(id),
  tipo text not null check (tipo in ('Individual','Grupal')),
  forma_pago text not null check (forma_pago in ('clase','abono')),
  metodo_pago text check (metodo_pago in ('mercadopago','transferencia','efectivo')),
  monto numeric not null default 0,
  pagado boolean not null default false,
  comprobante_url text,
  mp_preference_id text,
  mp_payment_id text,
  creado_en timestamptz not null default now()
);

create index if not exists reservas_clase_idx on public.reservas (clase_id);
create index if not exists reservas_alumno_idx on public.reservas (alumno_id);

-- Migración: duración elegida por el alumno (60 o 90 minutos). Es
-- informativa/para mostrar y calcular el precio; la que manda para bloquear
-- horarios es la que queda guardada en `clases.duracion_minutos` una vez
-- que el trigger de abajo la confirma.
alter table public.reservas add column if not exists duracion_minutos int not null default 60;

alter table public.reservas enable row level security;

drop policy if exists "reservas_select_propias" on public.reservas;
create policy "reservas_select_propias" on public.reservas
  for select using (alumno_id = auth.uid());

drop policy if exists "reservas_select_staff" on public.reservas;
create policy "reservas_select_staff" on public.reservas
  for select using (public.rol_actual() in ('PROFESOR','ADMIN'));

drop policy if exists "reservas_insert_propias" on public.reservas;
create policy "reservas_insert_propias" on public.reservas
  for insert with check (alumno_id = auth.uid());

-- El profesor/admin puede anotar reservas "a mano" (alumnos que avisan por
-- WhatsApp o en persona) a nombre de cualquier alumno.
drop policy if exists "reservas_insert_staff" on public.reservas;
create policy "reservas_insert_staff" on public.reservas
  for insert with check (public.rol_actual() in ('PROFESOR','ADMIN'));

drop policy if exists "reservas_update_propias" on public.reservas;
create policy "reservas_update_propias" on public.reservas
  for update using (alumno_id = auth.uid());

drop policy if exists "reservas_update_staff" on public.reservas;
create policy "reservas_update_staff" on public.reservas
  for update using (public.rol_actual() in ('PROFESOR','ADMIN'));

drop policy if exists "reservas_delete_propias" on public.reservas;
create policy "reservas_delete_propias" on public.reservas
  for delete using (alumno_id = auth.uid());

drop policy if exists "reservas_delete_staff" on public.reservas;
create policy "reservas_delete_staff" on public.reservas
  for delete using (public.rol_actual() in ('PROFESOR','ADMIN'));

-- Política de cancelación tardía: un alumno no puede cancelar (borrar) su
-- propia reserva si faltan menos de 12 horas para el inicio de la clase —
-- a esa altura el profesor ya perdió la chance de ocupar ese horario con
-- otro alumno. El profesor/admin sigue pudiendo cancelar cuando quiera
-- (para excepciones, lesiones, etc. — la política reservas_delete_staff de
-- arriba no se toca). Corre con permisos de servidor así que un alumno no
-- puede saltearse esto llamando a la API directamente.
create or replace function public.impedir_cancelacion_tardia()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inicio timestamp;
begin
  if public.rol_actual() in ('PROFESOR','ADMIN') then
    return old;
  end if;
  select (fecha || ' ' || hora)::timestamp into v_inicio
  from public.clases where id = old.clase_id;
  if v_inicio is not null and v_inicio - now() < interval '12 hours' then
    raise exception 'No podés cancelar esta clase: faltan menos de 12 horas para el horario. Si no podés asistir, avisale directamente al profesor.';
  end if;
  return old;
end;
$$;

drop trigger if exists trigger_impedir_cancelacion_tardia on public.reservas;
create trigger trigger_impedir_cancelacion_tardia
  before delete on public.reservas
  for each row execute function public.impedir_cancelacion_tardia();

-- Reglas de integridad: al insertar una reserva, valida cupo/tipo y marca
-- la clase como "reservada". Como ahora la grilla es de 30 minutos y una
-- clase puede durar 60 o 90 minutos, además reserva los tramos de 30' que
-- la clase ocupa a continuación (para que nadie pueda reservar encima) y
-- deja anotado en `clases.clases_extendidas` cuáles son, así se pueden
-- liberar correctamente si se cancela. Corre ANTES del insert (así, si algo
-- no cierra, aborta con una excepción y la fila nunca llega a guardarse).
-- Corre con permisos de servidor así que un alumno no puede saltearse las
-- reglas aunque manipule el pedido.
--
-- CRÍTICO: también recalcula "monto" acá, ignorando lo que mande el
-- cliente. Antes el navegador calculaba el precio y lo mandaba tal cual en
-- el insert, y nada del lado del servidor lo validaba (el trigger de
-- columnas protegidas de "reservas" solo corre en UPDATE, no en INSERT) —
-- cualquiera con la app abierta podía llamar a la API de Supabase directo y
-- reservar una clase de $29000 mandando monto=1; Mercado Pago armaba un
-- cobro real por ese monto trucho y quedaba "pagado" de verdad. Las fórmulas
-- de acá tienen que reflejar exactamente las de src/utilidades/precios.js.
create or replace function public.antes_insertar_reserva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fecha date;
  v_hora text;
  v_profesor_id uuid;
  v_tipo_actual text;
  v_estado_actual text;
  v_duracion_actual int;
  v_cupo_grupal constant int := 4;
  v_pasos int;
  v_id_extra uuid;
  v_estado_extra text;
  v_ids_extra uuid[] := '{}';
  i int;
  v_precio_base numeric;
  v_descuento numeric;
begin
  if new.duracion_minutos not in (60, 90) then
    raise exception 'La duración de la clase tiene que ser 60 o 90 minutos.';
  end if;

  select case when new.tipo = 'Grupal' then precio_grupal else precio_individual end,
         case when new.tipo = 'Grupal' then descuento_abono_grupal else descuento_abono_individual end
    into v_precio_base, v_descuento
    from public.configuracion where id = 1;

  if new.forma_pago = 'abono' then
    new.monto := round(v_precio_base * 4 * (new.duracion_minutos / 60.0) * (1 - v_descuento / 100.0));
  else
    new.monto := round(v_precio_base * (new.duracion_minutos / 60.0));
  end if;

  select fecha, hora, profesor_id, tipo, estado, duracion_minutos
    into v_fecha, v_hora, v_profesor_id, v_tipo_actual, v_estado_actual, v_duracion_actual
    from public.clases where id = new.clase_id for update;

  if v_fecha is null then
    raise exception 'Ese horario no existe.';
  end if;

  if v_estado_actual = 'bloqueada' then
    raise exception 'Ese horario está bloqueado.';
  end if;

  if v_tipo_actual is not null and v_tipo_actual <> new.tipo then
    raise exception 'Ese horario ya fue reservado como clase %.', v_tipo_actual;
  end if;

  if new.tipo = 'Individual' then
    if v_estado_actual = 'reservada' then
      raise exception 'Ese horario ya está reservado.';
    end if;
  else
    if (select count(*) from public.reservas where clase_id = new.clase_id) >= v_cupo_grupal then
      raise exception 'Esa clase grupal ya alcanzó el cupo máximo (%).', v_cupo_grupal;
    end if;
    -- Si ya hay alumnos anotados, la duración la fija el primero: los que
    -- se suman después tienen que coincidir (la reserva ya está armada con
    -- los tramos de 30' que corresponden a esa duración, no a otra).
    if v_estado_actual = 'reservada' and new.duracion_minutos <> v_duracion_actual then
      raise exception 'Esta clase grupal ya quedó fijada en % minutos.', v_duracion_actual;
    end if;
  end if;

  if v_estado_actual = 'disponible' then
    -- Primer alumno de este horario: además de marcarlo reservado, hay que
    -- bloquear los tramos de 30' siguientes que la clase ocupa (1 tramo
    -- extra para 60', 2 tramos extra para 90').
    v_pasos := (new.duracion_minutos / 30) - 1;
    for i in 1..v_pasos loop
      select id, estado into v_id_extra, v_estado_extra
        from public.clases
        where fecha = v_fecha and profesor_id = v_profesor_id
          and hora = to_char((v_hora::time + (i * 30 || ' minutes')::interval), 'HH24:MI')
        for update;

      if v_id_extra is null or v_estado_extra <> 'disponible' then
        raise exception 'No hay horario libre a continuación para una clase de % minutos. Probá otro horario o una duración más corta.', new.duracion_minutos;
      end if;

      v_ids_extra := array_append(v_ids_extra, v_id_extra);
    end loop;

    update public.clases
      set estado = 'reservada', tipo = new.tipo, duracion_minutos = new.duracion_minutos,
          cupo_ocupado = cupo_ocupado + 1, clases_extendidas = v_ids_extra
      where id = new.clase_id;

    if array_length(v_ids_extra, 1) > 0 then
      update public.clases
        set estado = 'reservada', tipo = new.tipo, es_continuacion = true, continuacion_de = new.clase_id
        where id = any (v_ids_extra);
    end if;
  else
    -- Se suma a una clase grupal que ya estaba reservada: los tramos
    -- extendidos ya los reservó el primer alumno, acá solo suma cupo.
    update public.clases set cupo_ocupado = cupo_ocupado + 1 where id = new.clase_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_despues_insertar_reserva on public.reservas;
drop trigger if exists trigger_antes_insertar_reserva on public.reservas;
create trigger trigger_antes_insertar_reserva
  before insert on public.reservas
  for each row execute function public.antes_insertar_reserva();

drop function if exists public.despues_insertar_reserva();

-- Al cancelar la última reserva de una clase, la vuelve a dejar libre junto
-- con los tramos de 30' que hubiera ocupado de más (clases_extendidas).
create or replace function public.despues_borrar_reserva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_extendidas uuid[];
begin
  if not exists (select 1 from public.reservas where clase_id = old.clase_id) then
    select clases_extendidas into v_extendidas from public.clases where id = old.clase_id;

    update public.clases
      set estado = 'disponible', tipo = null, cupo_ocupado = 0, duracion_minutos = 60, clases_extendidas = '{}'
      where id = old.clase_id;

    if v_extendidas is not null and array_length(v_extendidas, 1) > 0 then
      update public.clases
        set estado = 'disponible', tipo = null, cupo_ocupado = 0, es_continuacion = false, continuacion_de = null
        where id = any (v_extendidas);
    end if;
  else
    update public.clases set cupo_ocupado = greatest(cupo_ocupado - 1, 0) where id = old.clase_id;
  end if;
  return old;
end;
$$;

drop trigger if exists trigger_despues_borrar_reserva on public.reservas;
create trigger trigger_despues_borrar_reserva
  after delete on public.reservas
  for each row execute function public.despues_borrar_reserva();

-- Un alumno puede actualizar su propia reserva (por ejemplo, para adjuntar
-- un comprobante), pero no debería poder marcarse el pago como hecho o
-- cambiarse el monto llamando directo a la API. Esto lo blinda: si quien
-- actualiza es un ALUMNO, esas columnas quedan como estaban.
create or replace function public.proteger_columnas_reserva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.rol_actual() = 'ALUMNO' then
    new.pagado := old.pagado;
    new.monto := old.monto;
    new.mp_payment_id := old.mp_payment_id;
    new.mp_preference_id := old.mp_preference_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_proteger_columnas_reserva on public.reservas;
create trigger trigger_proteger_columnas_reserva
  before update on public.reservas
  for each row execute function public.proteger_columnas_reserva();

-- ---------------------------------------------------------
-- PLANILLAS TÉCNICAS (progreso por alumno y golpe)
-- ---------------------------------------------------------
create table if not exists public.planillas_tecnicas (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.perfiles(id),
  categoria_id text not null,
  golpe text not null,
  trabajado boolean not null default false,
  puntaje_alumno int not null default 0,
  puntaje_profesor int not null default 0,
  observacion text,
  actualizado_en timestamptz not null default now(),
  unique (alumno_id, categoria_id, golpe)
);

alter table public.planillas_tecnicas enable row level security;

drop policy if exists "planillas_select_propia" on public.planillas_tecnicas;
create policy "planillas_select_propia" on public.planillas_tecnicas
  for select using (alumno_id = auth.uid());

drop policy if exists "planillas_select_staff" on public.planillas_tecnicas;
create policy "planillas_select_staff" on public.planillas_tecnicas
  for select using (public.rol_actual() in ('PROFESOR','ADMIN'));

drop policy if exists "planillas_all_staff" on public.planillas_tecnicas;
create policy "planillas_all_staff" on public.planillas_tecnicas
  for all using (public.rol_actual() in ('PROFESOR','ADMIN')) with check (public.rol_actual() in ('PROFESOR','ADMIN'));

-- ---------------------------------------------------------
-- RENDICIONES (pagos del profesor al club)
-- ---------------------------------------------------------
create table if not exists public.rendiciones (
  id uuid primary key default gen_random_uuid(),
  profesor_id uuid not null references public.perfiles(id),
  periodo text not null check (periodo in ('semanal','quincenal','mensual')),
  desde date not null,
  hasta date not null,
  monto numeric not null default 0,
  estado text not null default 'pendiente' check (estado in ('pendiente','transferencia','efectivo')),
  comprobante_url text,
  pagado_en timestamptz,
  creado_en timestamptz not null default now(),
  -- Lo que el profesor dice haber usado para pagar, informativo nada más:
  -- no confirma el pago (eso lo hace el admin cambiando "estado", ver
  -- trigger más abajo).
  metodo_informado text check (metodo_informado in ('transferencia','efectivo'))
);
alter table public.rendiciones add column if not exists metodo_informado text
  check (metodo_informado in ('transferencia','efectivo'));

create index if not exists rendiciones_profesor_id_idx on public.rendiciones (profesor_id);

alter table public.rendiciones enable row level security;

drop policy if exists "rendiciones_select_propias" on public.rendiciones;
create policy "rendiciones_select_propias" on public.rendiciones
  for select using (profesor_id = auth.uid());

drop policy if exists "rendiciones_select_admin" on public.rendiciones;
create policy "rendiciones_select_admin" on public.rendiciones
  for select using (public.rol_actual() = 'ADMIN');

drop policy if exists "rendiciones_insert_propias" on public.rendiciones;
create policy "rendiciones_insert_propias" on public.rendiciones
  for insert with check (profesor_id = auth.uid());

drop policy if exists "rendiciones_update_propias" on public.rendiciones;
create policy "rendiciones_update_propias" on public.rendiciones
  for update using (profesor_id = auth.uid());

drop policy if exists "rendiciones_all_admin" on public.rendiciones;
create policy "rendiciones_all_admin" on public.rendiciones
  for all using (public.rol_actual() = 'ADMIN') with check (public.rol_actual() = 'ADMIN');

-- El profesor "avisaba" un pago y el propio frontend lo marcaba enseguida
-- como confirmado (estado='transferencia'/'efectivo'), sin que el admin
-- hubiera hecho nada — y como la política de arriba no restringe columnas,
-- un profesor podía lograr lo mismo llamando directo a la API, tanto al
-- crear la rendición como al actualizarla después. Este trigger blinda
-- "estado" y "pagado_en": solo un ADMIN puede tocarlos (confirmar un pago
-- sigue siendo, siempre, una acción del admin desde su panel).
create or replace function public.proteger_columnas_rendicion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.rol_actual() is distinct from 'ADMIN' then
    if TG_OP = 'UPDATE' then
      new.estado := old.estado;
      new.pagado_en := old.pagado_en;
    else
      new.estado := 'pendiente';
      new.pagado_en := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_proteger_columnas_rendicion on public.rendiciones;
create trigger trigger_proteger_columnas_rendicion
  before insert or update on public.rendiciones
  for each row execute function public.proteger_columnas_rendicion();

-- ---------------------------------------------------------
-- STORAGE: comprobantes de pago (transferencia / efectivo / rendición)
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

-- Antes cualquier usuario autenticado podía leer o listar CUALQUIER
-- comprobante del club (el de cualquier alumno, de cualquier profesor):
-- la política solo miraba el bucket, no el dueño del archivo. Esto lo
-- corrige: cada archivo vive en "reservas/<id-reserva>/..." o
-- "rendiciones/<id-rendicion>/...", y solo puede leerlo/subirlo el dueño
-- de esa reserva o rendición, o el profesor/admin (que sí necesitan ver
-- los comprobantes de sus alumnos y del club).
drop policy if exists "comprobantes_insert_autenticados" on storage.objects;
drop policy if exists "comprobantes_select_autenticados" on storage.objects;
drop policy if exists "comprobantes_select_propio_o_staff" on storage.objects;
create policy "comprobantes_select_propio_o_staff" on storage.objects
  for select to authenticated using (
    bucket_id = 'comprobantes'
    and (
      public.rol_actual() in ('PROFESOR','ADMIN')
      or (
        (storage.foldername(name))[1] = 'reservas'
        and exists (
          select 1 from public.reservas
          where id::text = (storage.foldername(name))[2]
            and alumno_id = auth.uid()
        )
      )
      or (
        (storage.foldername(name))[1] = 'rendiciones'
        and exists (
          select 1 from public.rendiciones
          where id::text = (storage.foldername(name))[2]
            and profesor_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "comprobantes_insert_propio_o_staff" on storage.objects;
create policy "comprobantes_insert_propio_o_staff" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'comprobantes'
    and (
      public.rol_actual() in ('PROFESOR','ADMIN')
      or (
        (storage.foldername(name))[1] = 'reservas'
        and exists (
          select 1 from public.reservas
          where id::text = (storage.foldername(name))[2]
            and alumno_id = auth.uid()
        )
      )
      or (
        (storage.foldername(name))[1] = 'rendiciones'
        and exists (
          select 1 from public.rendiciones
          where id::text = (storage.foldername(name))[2]
            and profesor_id = auth.uid()
        )
      )
    )
  );

-- ---------------------------------------------------------
-- STORAGE: fotos de perfil (bucket público, son de baja sensibilidad y así
-- se pueden mostrar directo en <img> sin generar URLs firmadas)
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

-- Antes cualquier usuario autenticado podía subir o PISAR la foto de
-- perfil de cualquier otro (la política solo miraba el bucket, no la
-- carpeta). Cada foto vive en "<id-del-usuario>/foto-...", así que ahora
-- solo el dueño de esa carpeta (o el admin) puede escribir ahí.
drop policy if exists "fotos_insert_autenticados" on storage.objects;
drop policy if exists "fotos_insert_propio" on storage.objects;
create policy "fotos_insert_propio" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'fotos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.rol_actual() = 'ADMIN')
  );

drop policy if exists "fotos_update_autenticados" on storage.objects;
drop policy if exists "fotos_update_propio" on storage.objects;
create policy "fotos_update_propio" on storage.objects
  for update to authenticated using (
    bucket_id = 'fotos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.rol_actual() = 'ADMIN')
  );

drop policy if exists "fotos_select_publico" on storage.objects;
create policy "fotos_select_publico" on storage.objects
  for select using (bucket_id = 'fotos');

-- =========================================================
-- Fin del esquema.
-- Cuentas de PROFESOR y ADMIN no se registran desde la app pública (esa
-- pantalla solo crea alumnos, a propósito, por seguridad):
--   - Un ADMIN ya puede crear cuentas de profesor directamente desde la app
--     (Panel → Usuarios → "Crear cuenta de profesor").
--   - El primer ADMIN del club, en cambio, es manual:
--       1) Supabase → Authentication → Users → Add user (email + contraseña)
--       2) Corré esto reemplazando el email:
--          update public.perfiles set rol = 'ADMIN', nombre = 'Tu nombre'
--          where email = 'admin@tudominio.com';
-- =========================================================

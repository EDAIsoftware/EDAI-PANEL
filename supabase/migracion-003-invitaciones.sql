-- =====================================================================
--  Migración 003 · Invitaciones digitales (bodas, XV años, cumpleaños…)
--  Ejecútala en Supabase → SQL Editor. Se puede volver a ejecutar sin problema.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PLANES DE INVITACIONES (pago único por evento)
-- ---------------------------------------------------------------------
create table if not exists public.planes_evento (
  id            text primary key,
  nombre        text not null,
  precio        numeric(10,2) not null,
  max_invitados int,              -- familias/invitados en la lista; null = ilimitado
  pases         boolean not null, -- enlaces personales con pases por familia
  max_fotos     int not null,     -- fotos de galería
  musica        boolean not null,
  regalos       boolean not null, -- sección de regalos con QR
  dias_despues  int not null,     -- días que sigue activa después del evento
  orden         int not null default 0
);

insert into public.planes_evento (id, nombre, precio, max_invitados, pases, max_fotos, musica, regalos, dias_despues, orden) values
  ('esencial', 'Esencial', 149, 0,    false, 3,  false, false, 15, 1),
  ('completa', 'Completa', 249, 300,  true,  10, true,  true,  30, 2),
  ('premium',  'Premium',  449, null, true,  20, true,  true,  60, 3)
on conflict (id) do update set
  nombre = excluded.nombre, precio = excluded.precio, max_invitados = excluded.max_invitados,
  pases = excluded.pases, max_fotos = excluded.max_fotos, musica = excluded.musica,
  regalos = excluded.regalos, dias_despues = excluded.dias_despues, orden = excluded.orden;

-- ---------------------------------------------------------------------
-- EVENTOS (cada invitación)
-- ---------------------------------------------------------------------
create table if not exists public.eventos (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,                       -- ej: Boda de Ana y Luis
  slug           text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$'),
  tipo           text not null default 'boda'
                 check (tipo in ('boda','xv','cumpleanos','bautizo','baby_shower','graduacion','otro')),
  plan           text not null default 'completa' references public.planes_evento(id),
  cliente_nombre text,
  whatsapp       text,
  ciudad         text,
  fecha          timestamptz not null,
  estilo         text not null default 'clasico',
  datos          jsonb not null default '{}'::jsonb,  -- textos, lugares, fotos, regalos, música
  pagado         boolean not null default false,
  suspendido     boolean not null default false,
  creado_en      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- INVITADOS (familias con su enlace personal y sus pases)
-- ---------------------------------------------------------------------
create table if not exists public.invitados (
  id            uuid primary key default gen_random_uuid(),
  evento_id     uuid not null references public.eventos(id) on delete cascade,
  nombre        text not null check (length(nombre) between 1 and 120),
  pases         int not null default 1 check (pases between 1 and 50),
  codigo        text unique,                          -- enlace personal ?p=codigo
  telefono      text,
  mesa          text,
  estado        text not null default 'Pendiente' check (estado in ('Pendiente','Confirmado','No asiste')),
  confirmados   int not null default 0 check (confirmados >= 0),
  mensaje       text,
  origen        text not null default 'lista' check (origen in ('lista','publico')),
  respondido_en timestamptz,
  creado_en     timestamptz not null default now()
);
create index if not exists invitados_evento_idx on public.invitados(evento_id);

-- ---------------------------------------------------------------------
-- PERFILES: ahora un usuario también puede pertenecer a un evento
-- ---------------------------------------------------------------------
alter table public.perfiles add column if not exists evento_id uuid references public.eventos(id) on delete cascade;
alter table public.perfiles drop constraint if exists perfiles_rol_check;
alter table public.perfiles add constraint perfiles_rol_check check (rol in ('admin','dueno','empleado','evento'));
alter table public.perfiles drop constraint if exists perfiles_check;
alter table public.perfiles drop constraint if exists perfiles_destino_check;
alter table public.perfiles add constraint perfiles_destino_check
  check (rol = 'admin' or tienda_id is not null or evento_id is not null);

create or replace function public.mi_evento() returns uuid
language sql stable security definer set search_path = public as $$
  select p.evento_id from perfiles p join eventos e on e.id = p.evento_id
  where p.user_id = auth.uid() and p.activo and not e.suspendido;
$$;

-- ---------------------------------------------------------------------
-- REGLAS DE INVITADOS: código automático y límites del plan
-- ---------------------------------------------------------------------
create or replace function public.invitados_antes_de_guardar() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  pl planes_evento;
  n  int;
begin
  if tg_op = 'UPDATE' then
    new.evento_id := old.evento_id;
    new.codigo    := old.codigo;
    new.origen    := old.origen;
  end if;
  if new.confirmados > new.pases then new.confirmados := new.pases; end if;

  if tg_op = 'INSERT' and new.origen = 'lista' then
    select p.* into pl from planes_evento p join eventos e on e.plan = p.id where e.id = new.evento_id;
    if not pl.pases then
      raise exception 'El plan % no incluye lista de invitados con pases', pl.nombre;
    end if;
    if pl.max_invitados is not null then
      select count(*) into n from invitados where evento_id = new.evento_id and origen = 'lista';
      if n >= pl.max_invitados then
        raise exception 'Llegaste al límite de % invitados del plan %', pl.max_invitados, pl.nombre;
      end if;
    end if;
    new.codigo := left(replace(gen_random_uuid()::text, '-', ''), 10);
  end if;
  return new;
end $$;

drop trigger if exists invitados_antes_de_guardar on public.invitados;
create trigger invitados_antes_de_guardar before insert or update on public.invitados
  for each row execute function public.invitados_antes_de_guardar();

-- ---------------------------------------------------------------------
-- SEGURIDAD (RLS)
-- ---------------------------------------------------------------------
alter table public.planes_evento enable row level security;
alter table public.eventos       enable row level security;
alter table public.invitados     enable row level security;

drop policy if exists "planes_evento: lectura" on public.planes_evento;
create policy "planes_evento: lectura" on public.planes_evento for select using (true);

drop policy if exists "eventos: admin todo" on public.eventos;
create policy "eventos: admin todo" on public.eventos for all to authenticated
  using (es_admin()) with check (es_admin());
drop policy if exists "eventos: cliente ve el suyo" on public.eventos;
create policy "eventos: cliente ve el suyo" on public.eventos for select to authenticated
  using (id = mi_evento());

drop policy if exists "invitados: su evento" on public.invitados;
create policy "invitados: su evento" on public.invitados for all to authenticated
  using (evento_id = mi_evento() or es_admin())
  with check (evento_id = mi_evento() or es_admin());

-- ---------------------------------------------------------------------
-- EL CLIENTE EDITA SU INVITACIÓN (solo textos, fecha, estilo y fotos;
-- nunca su plan ni su vigencia)
-- ---------------------------------------------------------------------
create or replace function public.actualizar_evento(p_datos jsonb, p_fecha timestamptz, p_estilo text)
returns void language plpgsql security definer set search_path = public as $$
declare
  ev eventos;
  pl planes_evento;
  d  jsonb := coalesce(p_datos, '{}'::jsonb);
begin
  select * into ev from eventos where id = mi_evento();
  if not found then raise exception 'No tienes acceso a este evento'; end if;
  select * into pl from planes_evento where id = ev.plan;

  if length(d::text) > 60000 then raise exception 'La invitación tiene demasiado texto'; end if;
  if jsonb_typeof(d->'galeria') = 'array' and jsonb_array_length(d->'galeria') > pl.max_fotos then
    raise exception 'Tu plan % permite hasta % fotos en la galería', pl.nombre, pl.max_fotos;
  end if;
  if not pl.musica then d := d - 'musica_url'; end if;
  if not pl.regalos then d := d - 'regalos'; end if;

  update eventos set datos = d, fecha = coalesce(p_fecha, fecha), estilo = coalesce(nullif(p_estilo, ''), estilo)
  where id = ev.id;
end $$;

revoke all on function public.actualizar_evento(jsonb, timestamptz, text) from public;
grant execute on function public.actualizar_evento(jsonb, timestamptz, text) to authenticated;

-- ---------------------------------------------------------------------
-- PÁGINA PÚBLICA DE LA INVITACIÓN (la ven los invitados, sin login)
-- ---------------------------------------------------------------------
create or replace function public.evento_publico(p_slug text, p_codigo text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', e.id, 'nombre', e.nombre, 'slug', e.slug, 'tipo', e.tipo, 'fecha', e.fecha,
    'estilo', e.estilo, 'datos', e.datos, 'ciudad', e.ciudad,
    'plan', json_build_object('pases', pl.pases, 'musica', pl.musica, 'regalos', pl.regalos),
    'activa', now() <= e.fecha + make_interval(days => pl.dias_despues),
    'invitado', (
      select json_build_object('nombre', i.nombre, 'pases', i.pases, 'estado', i.estado,
                               'confirmados', i.confirmados, 'mensaje', i.mensaje)
      from invitados i
      where i.evento_id = e.id and p_codigo is not null and p_codigo <> '' and i.codigo = p_codigo
    )
  )
  from eventos e join planes_evento pl on pl.id = e.plan
  where e.slug = lower(p_slug) and not e.suspendido;
$$;

create or replace function public.confirmar_asistencia(
  p_slug text, p_codigo text, p_nombre text, p_asistentes int, p_telefono text, p_mensaje text
) returns json
language plpgsql security definer set search_path = public as $$
declare
  ev  eventos;
  pl  planes_evento;
  inv invitados;
begin
  select * into ev from eventos where slug = lower(p_slug) and not suspendido;
  if not found then raise exception 'Esta invitación no está disponible'; end if;
  select * into pl from planes_evento where id = ev.plan;
  if now() > ev.fecha + make_interval(days => pl.dias_despues) then
    raise exception 'Ya no se reciben confirmaciones para este evento';
  end if;

  if p_codigo is not null and p_codigo <> '' then
    select * into inv from invitados where evento_id = ev.id and codigo = p_codigo for update;
    if not found then raise exception 'Este enlace de invitación no es válido'; end if;
    if p_asistentes is null or p_asistentes < 0 or p_asistentes > inv.pases then
      raise exception 'Tienes % pase(s) disponibles', inv.pases;
    end if;
    update invitados set
      estado = case when p_asistentes > 0 then 'Confirmado' else 'No asiste' end,
      confirmados = p_asistentes,
      mensaje = nullif(left(coalesce(p_mensaje, ''), 500), ''),
      telefono = coalesce(nullif(left(p_telefono, 30), ''), telefono),
      respondido_en = now()
    where id = inv.id;
    return json_build_object('ok', true, 'nombre', inv.nombre);
  end if;

  -- Confirmación general (sin enlace personal)
  if coalesce((ev.datos->>'rsvp_abierto')::boolean, true) = false then
    raise exception 'Confirma tu asistencia desde el enlace personal que te enviaron';
  end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'Escribe tu nombre'; end if;
  if p_asistentes is null or p_asistentes < 0 or p_asistentes > 10 then raise exception 'Cantidad no válida'; end if;
  if (select count(*) from invitados where evento_id = ev.id and origen = 'publico') >= 1000 then
    raise exception 'No se pueden recibir más confirmaciones';
  end if;

  insert into invitados (evento_id, nombre, pases, origen, estado, confirmados, telefono, mensaje, respondido_en)
  values (ev.id, left(trim(p_nombre), 120), greatest(p_asistentes, 1), 'publico',
          case when p_asistentes > 0 then 'Confirmado' else 'No asiste' end,
          p_asistentes, nullif(left(p_telefono, 30), ''), nullif(left(coalesce(p_mensaje, ''), 500), ''), now());
  return json_build_object('ok', true, 'nombre', trim(p_nombre));
end $$;

revoke all on function public.evento_publico(text, text) from public;
revoke all on function public.confirmar_asistencia(text, text, text, int, text, text) from public;
grant execute on function public.evento_publico(text, text) to anon, authenticated;
grant execute on function public.confirmar_asistencia(text, text, text, int, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- RESUMEN PARA EL PANEL MAESTRO
-- ---------------------------------------------------------------------
drop view if exists public.admin_eventos;
create view public.admin_eventos with (security_invoker = true) as
select
  e.*,
  pl.nombre as plan_nombre, pl.precio as plan_precio, pl.max_invitados, pl.pases as plan_pases,
  pl.max_fotos, pl.musica as plan_musica, pl.regalos as plan_regalos,
  (e.fecha + make_interval(days => pl.dias_despues)) as activa_hasta,
  (select count(*) from invitados i where i.evento_id = e.id and i.origen = 'lista') as invitados_lista,
  (select coalesce(sum(i.pases), 0) from invitados i where i.evento_id = e.id and i.origen = 'lista') as pases_total,
  (select coalesce(sum(i.confirmados), 0) from invitados i where i.evento_id = e.id) as personas_confirmadas,
  (select count(*) from invitados i where i.evento_id = e.id and i.estado <> 'Pendiente') as respuestas
from eventos e join planes_evento pl on pl.id = e.plan;

-- ---------------------------------------------------------------------
-- FOTOS Y MÚSICA DE LAS INVITACIONES (máx. 10 MB por archivo)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('eventos', 'eventos', true, 10485760)
on conflict (id) do nothing;

drop policy if exists "eventos: subir a mi evento" on storage.objects;
create policy "eventos: subir a mi evento" on storage.objects for insert to authenticated
  with check (bucket_id = 'eventos' and (storage.foldername(name))[1] = public.mi_evento()::text);

drop policy if exists "eventos: borrar de mi evento" on storage.objects;
create policy "eventos: borrar de mi evento" on storage.objects for delete to authenticated
  using (bucket_id = 'eventos' and ((storage.foldername(name))[1] = public.mi_evento()::text or public.es_admin()));

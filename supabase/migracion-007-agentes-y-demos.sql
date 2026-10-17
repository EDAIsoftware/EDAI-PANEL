-- =====================================================================
--  Migración 007 · Agentes inmobiliarios + Demos (páginas modelo)
--  Ejecútala en Supabase → SQL Editor. Se puede volver a ejecutar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PLANES: tipo de negocio, costo de activación y dominio incluido
-- ---------------------------------------------------------------------
alter table public.planes add column if not exists tipo text not null default 'tienda';
alter table public.planes drop constraint if exists planes_tipo_check;
alter table public.planes add constraint planes_tipo_check check (tipo in ('tienda', 'agente'));
alter table public.planes add column if not exists activacion numeric(10,2) not null default 0;
alter table public.planes add column if not exists dominio_incluido boolean not null default false;

insert into public.planes (id, nombre, precio, precio_anual, max_productos, max_fotos, max_usuarios, tipo, activacion, dominio_incluido) values
  ('agente',     'Agente',     149, 1490, 6,  10, 1, 'agente', 250, true),
  ('agente_pro', 'Agente Pro', 249, 2490, 20, 15, 1, 'agente', 450, true)
on conflict (id) do update set
  nombre = excluded.nombre, precio = excluded.precio, precio_anual = excluded.precio_anual,
  max_productos = excluded.max_productos, max_fotos = excluded.max_fotos, max_usuarios = excluded.max_usuarios,
  tipo = excluded.tipo, activacion = excluded.activacion, dominio_incluido = excluded.dominio_incluido;

-- ---------------------------------------------------------------------
-- TIENDAS: ahora pueden ser una tienda o la página de un agente
-- ---------------------------------------------------------------------
alter table public.tiendas add column if not exists tipo text not null default 'tienda';
alter table public.tiendas drop constraint if exists tiendas_tipo_check;
alter table public.tiendas add constraint tiendas_tipo_check check (tipo in ('tienda', 'agente'));
-- Perfil del agente: foto, inmobiliaria, cargo, frase, bio, años de experiencia, zonas…
alter table public.tiendas add column if not exists perfil jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------
-- PRODUCTOS: datos de inmuebles (solo se usan en agentes)
-- ---------------------------------------------------------------------
alter table public.productos add column if not exists operacion   text;          -- Venta, Alquiler, Anticrético, Preventa
alter table public.productos add column if not exists zona        text;
alter table public.productos add column if not exists moneda      text not null default 'BOB';
alter table public.productos drop constraint if exists productos_moneda_check;
alter table public.productos add constraint productos_moneda_check check (moneda in ('BOB', 'USD'));
alter table public.productos add column if not exists terreno     numeric(10,2); -- m²
alter table public.productos add column if not exists construido  numeric(10,2); -- m²
alter table public.productos add column if not exists dormitorios int;
alter table public.productos add column if not exists banos       numeric(4,1);
alter table public.productos add column if not exists parqueos    int;
alter table public.productos add column if not exists estado_inmueble text not null default 'Disponible';
alter table public.productos drop constraint if exists productos_estado_inmueble_check;
alter table public.productos add constraint productos_estado_inmueble_check
  check (estado_inmueble in ('Disponible', 'Reservado', 'Vendido', 'Alquilado'));

-- ---------------------------------------------------------------------
-- CONTACTOS: dueños que quieren vender y consultas por propiedades
-- ---------------------------------------------------------------------
create table if not exists public.contactos (
  id          uuid primary key default gen_random_uuid(),
  tienda_id   uuid not null references public.tiendas(id) on delete cascade,
  tipo        text not null default 'captacion' check (tipo in ('captacion', 'consulta')),
  nombre      text not null,
  telefono    text,
  inmueble    text,      -- tipo de inmueble que ofrece el dueño
  zona        text,
  operacion   text,
  mensaje     text,
  producto_id uuid references public.productos(id) on delete set null,
  leido       boolean not null default false,
  creado_en   timestamptz not null default now()
);
create index if not exists contactos_tienda_idx on public.contactos(tienda_id, creado_en desc);

alter table public.contactos enable row level security;
drop policy if exists "contactos: su tienda" on public.contactos;
create policy "contactos: su tienda" on public.contactos for all to authenticated
  using (tienda_id = mi_tienda() or es_admin()) with check (tienda_id = mi_tienda() or es_admin());

-- Estadísticas por propiedad (vistas y clics a WhatsApp)
create table if not exists public.producto_vistas (
  id          bigint generated always as identity primary key,
  tienda_id   uuid not null references public.tiendas(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete cascade,
  tipo        text not null check (tipo in ('vista', 'whatsapp')),
  creado_en   timestamptz not null default now()
);
create index if not exists producto_vistas_idx on public.producto_vistas(tienda_id, creado_en desc);
alter table public.producto_vistas enable row level security;
drop policy if exists "producto_vistas: su tienda" on public.producto_vistas;
create policy "producto_vistas: su tienda" on public.producto_vistas for select to authenticated
  using (tienda_id = mi_tienda() or es_admin());

-- ---------------------------------------------------------------------
-- FUNCIONES PÚBLICAS
-- ---------------------------------------------------------------------
create or replace function public.crear_contacto(
  p_tienda text, p_tipo text, p_nombre text, p_telefono text, p_inmueble text,
  p_zona text, p_operacion text, p_mensaje text, p_producto uuid
) returns void language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  select id into t from tiendas where (slug = lower(p_tienda) or dominio = lower(p_tienda)) and not suspendida;
  if t is null then raise exception 'Página no disponible'; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'Escribe tu nombre'; end if;
  if (select count(*) from contactos where tienda_id = t and creado_en > now() - interval '1 hour') >= 30 then
    raise exception 'Demasiados mensajes. Intenta más tarde.';
  end if;
  insert into contactos (tienda_id, tipo, nombre, telefono, inmueble, zona, operacion, mensaje, producto_id)
  values (t, case when p_tipo = 'consulta' then 'consulta' else 'captacion' end, left(trim(p_nombre), 100),
          left(p_telefono, 30), left(p_inmueble, 60), left(p_zona, 100), left(p_operacion, 30), left(p_mensaje, 800),
          (select id from productos where id = p_producto and tienda_id = t));
end $$;

create or replace function public.registrar_vista_producto(p_tienda text, p_producto uuid, p_tipo text)
returns void language sql security definer set search_path = public as $$
  insert into producto_vistas (tienda_id, producto_id, tipo)
  select t.id, p.id, case when p_tipo = 'whatsapp' then 'whatsapp' else 'vista' end
  from tiendas t left join productos p on p.id = p_producto and p.tienda_id = t.id
  where (t.slug = lower(p_tienda) or t.dominio = lower(p_tienda)) and not t.suspendida;
$$;

-- El agente edita su perfil (no puede tocar su plan ni su vigencia)
create or replace function public.actualizar_perfil(p_perfil jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if mi_tienda() is null then raise exception 'Sin acceso'; end if;
  if length(coalesce(p_perfil, '{}'::jsonb)::text) > 20000 then raise exception 'Perfil demasiado largo'; end if;
  update tiendas set perfil = coalesce(p_perfil, '{}'::jsonb) where id = mi_tienda();
end $$;

revoke all on function public.crear_contacto(text, text, text, text, text, text, text, text, uuid) from public;
revoke all on function public.registrar_vista_producto(text, uuid, text) from public;
revoke all on function public.actualizar_perfil(jsonb) from public;
grant execute on function public.crear_contacto(text, text, text, text, text, text, text, text, uuid) to anon, authenticated;
grant execute on function public.registrar_vista_producto(text, uuid, text) to anon, authenticated;
grant execute on function public.actualizar_perfil(jsonb) to authenticated;

-- Datos públicos: ahora incluye tipo, perfil, prefijo y los datos de inmuebles
create or replace function public.tienda_publica(p_tienda text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', t.id, 'nombre', t.nombre, 'slug', t.slug, 'whatsapp', t.whatsapp, 'ciudad', t.ciudad,
    'logo_url', t.logo_url, 'tema', t.tema, 'rubro', t.rubro, 'tipo', t.tipo, 'perfil', t.perfil, 'prefijo', t.prefijo,
    'categorias', coalesce(t.config->'categorias', '[]'::jsonb),
    'productos', coalesce((
      select json_agg(json_build_object(
        'id', p.id, 'numero', p.numero, 'nombre', p.nombre, 'descripcion', p.descripcion,
        'precio', p.precio, 'precio_oferta', p.precio_oferta, 'categoria', p.categoria,
        'unidad', p.unidad, 'fotos', p.fotos, 'destacado', p.destacado,
        'etiquetas', p.etiquetas, 'variantes', p.variantes,
        'agotado', (p.stock is not null and p.stock <= 0),
        'operacion', p.operacion, 'zona', p.zona, 'moneda', p.moneda, 'terreno', p.terreno, 'construido', p.construido,
        'dormitorios', p.dormitorios, 'banos', p.banos, 'parqueos', p.parqueos, 'estado_inmueble', p.estado_inmueble
      ) order by p.destacado desc, p.numero desc)
      from productos p where p.tienda_id = t.id and p.disponible), '[]'::json)
  )
  from tiendas t
  where (t.slug = lower(p_tienda) or t.dominio = lower(p_tienda)) and not t.suspendida;
$$;

-- Resumen del panel maestro (se recrea para incluir las columnas nuevas)
drop view if exists public.admin_resumen;
create view public.admin_resumen with (security_invoker = true) as
select
  t.*,
  pl.nombre        as plan_nombre,
  pl.precio        as plan_precio,
  pl.max_productos, pl.max_fotos, pl.max_usuarios,
  (select count(*) from productos x where x.tienda_id = t.id) as productos,
  (select coalesce(sum(v.total), 0) from ventas v
     where v.tienda_id = t.id and v.estado <> 'Cancelado' and v.creado_en > now() - interval '30 days') as ventas_30d,
  (select coalesce(sum(v.total), 0) from ventas v
     where v.tienda_id = t.id and v.estado <> 'Cancelado'
       and v.creado_en between now() - interval '60 days' and now() - interval '30 days') as ventas_30d_previos,
  (select count(*) from ventas v
     where v.tienda_id = t.id and v.creado_en > now() - interval '30 days') as pedidos_30d,
  (select count(*) from visitas w
     where w.tienda_id = t.id and w.creado_en > now() - interval '30 days') as visitas_30d,
  (select count(*) from contactos c
     where c.tienda_id = t.id and c.creado_en > now() - interval '30 days') as contactos_30d,
  (select count(*) from producto_vistas pv
     where pv.tienda_id = t.id and pv.tipo = 'whatsapp' and pv.creado_en > now() - interval '30 days') as whatsapp_30d
from tiendas t join planes pl on pl.id = t.plan;

-- ---------------------------------------------------------------------
-- DEMOS: páginas modelo que subes desde tu panel (sin pasar por Vercel)
-- ---------------------------------------------------------------------
create table if not exists public.demos (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])$'),
  titulo         text not null,
  descripcion    text,
  archivo        text not null,          -- ruta en el bucket "demos"
  visitas        int not null default 0,
  activo         boolean not null default true,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
alter table public.demos enable row level security;
drop policy if exists "demos: solo admin" on public.demos;
create policy "demos: solo admin" on public.demos for all to authenticated using (es_admin()) with check (es_admin());

insert into storage.buckets (id, name, public, file_size_limit)
values ('demos', 'demos', false, 10485760)
on conflict (id) do nothing;

drop policy if exists "demos: admin sube" on storage.objects;
create policy "demos: admin sube" on storage.objects for insert to authenticated
  with check (bucket_id = 'demos' and public.es_admin());
drop policy if exists "demos: admin actualiza" on storage.objects;
create policy "demos: admin actualiza" on storage.objects for update to authenticated
  using (bucket_id = 'demos' and public.es_admin());
drop policy if exists "demos: admin lee" on storage.objects;
create policy "demos: admin lee" on storage.objects for select to authenticated
  using (bucket_id = 'demos' and public.es_admin());
drop policy if exists "demos: admin borra" on storage.objects;
create policy "demos: admin borra" on storage.objects for delete to authenticated
  using (bucket_id = 'demos' and public.es_admin());

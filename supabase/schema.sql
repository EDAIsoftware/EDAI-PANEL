-- =====================================================================
--  EDAI Tiendas · Esquema de base de datos
--  Pégalo completo en Supabase → SQL Editor → New query → Run.
--  Se puede volver a ejecutar sin romper nada (usa "if not exists").
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- PLANES
-- ---------------------------------------------------------------------
create table if not exists public.planes (
  id            text primary key,
  nombre        text not null,
  precio        numeric(10,2) not null,
  precio_anual  numeric(10,2) not null,
  max_productos int,            -- null = ilimitado
  max_fotos     int not null,
  max_usuarios  int not null
);

insert into public.planes (id, nombre, precio, precio_anual, max_productos, max_fotos, max_usuarios) values
  ('emprende', 'Emprende', 99,  990,  80,   1, 1),
  ('negocio',  'Negocio',  199, 1990, 400,  3, 2),
  ('empresa',  'Empresa',  349, 3490, null, 3, 5)
on conflict (id) do update set
  nombre = excluded.nombre, precio = excluded.precio, precio_anual = excluded.precio_anual,
  max_productos = excluded.max_productos, max_fotos = excluded.max_fotos, max_usuarios = excluded.max_usuarios;

-- ---------------------------------------------------------------------
-- TIENDAS (cada cliente de EDAI)
-- ---------------------------------------------------------------------
create table if not exists public.tiendas (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  slug             text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])$'),
  prefijo          text not null unique check (prefijo ~ '^[A-Z0-9]{2,6}$'), -- códigos de producto: PRE-0001
  dominio          text unique,                       -- dominio propio, ej: www.carniceriachavela.com
  dueno_nombre     text,
  whatsapp         text,
  ciudad           text,
  plan             text not null default 'emprende' references public.planes(id),
  rubro            text not null default 'general',
  config           jsonb not null default '{}'::jsonb, -- campos, categorias, unidades, variantes, etiquetas
  tema             jsonb not null default '{}'::jsonb, -- colores de la tienda / panel
  logo_url         text,
  vence_el         date not null default (current_date + 30),
  suspendida       boolean not null default false,
  siguiente_numero int not null default 1,            -- para numerar productos P-0001, P-0002…
  creado_en        timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PERFILES (usuarios: administrador EDAI, dueños y empleados)
-- ---------------------------------------------------------------------
create table if not exists public.perfiles (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  rol       text not null check (rol in ('admin', 'dueno', 'empleado')),
  tienda_id uuid references public.tiendas(id) on delete cascade,
  nombre    text,
  correo    text,
  activo    boolean not null default true,
  creado_en timestamptz not null default now(),
  check (rol = 'admin' or tienda_id is not null)
);
create index if not exists perfiles_tienda_idx on public.perfiles(tienda_id);

-- ---------------------------------------------------------------------
-- PRODUCTOS
-- ---------------------------------------------------------------------
create table if not exists public.productos (
  id             uuid primary key default gen_random_uuid(),
  tienda_id      uuid not null references public.tiendas(id) on delete cascade,
  numero         int not null default 0,              -- lo asigna el sistema, nunca cambia
  nombre         text not null check (length(nombre) between 1 and 120),
  descripcion    text,
  precio         numeric(10,2) not null check (precio >= 0),
  precio_oferta  numeric(10,2) check (precio_oferta is null or precio_oferta >= 0),
  categoria      text,
  subcategoria   text,
  unidad         text not null default 'Unidad',
  fotos          text[] not null default '{}',
  disponible     boolean not null default true,
  stock          numeric(12,2),                       -- null = no controla stock
  destacado      boolean not null default false,
  variantes      text[] not null default '{}',
  etiquetas      text[] not null default '{}',
  minimo         text,
  peso           text,
  codigo         text,
  marca          text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (tienda_id, numero)
);
create index if not exists productos_tienda_idx on public.productos(tienda_id);
create unique index if not exists productos_codigo_unico
  on public.productos (tienda_id, lower(codigo)) where codigo is not null and codigo <> '';

-- ---------------------------------------------------------------------
-- VENTAS y sus productos
-- ---------------------------------------------------------------------
create table if not exists public.ventas (
  id         bigint generated always as identity primary key,
  tienda_id  uuid not null references public.tiendas(id) on delete cascade,
  cliente    text,
  telefono   text,
  canal      text not null default 'Tienda física'
             check (canal in ('Tienda física','WhatsApp','Teléfono','Redes sociales','Tienda web')),
  pago       text not null default 'Efectivo'
             check (pago in ('Efectivo','QR','Transferencia','Tarjeta','Por definir')),
  estado     text not null default 'Pagado'
             check (estado in ('Nuevo','Pendiente','Pagado','Entregado','Cancelado')),
  entrega    text not null default 'Retira en tienda' check (entrega in ('Retira en tienda','Delivery')),
  zona       text,
  nota       text,
  descuento  numeric(10,2) not null default 0 check (descuento >= 0),
  total      numeric(12,2) not null default 0,
  creado_en  timestamptz not null default now()
);
create index if not exists ventas_tienda_fecha_idx on public.ventas(tienda_id, creado_en desc);

create table if not exists public.venta_items (
  id              bigint generated always as identity primary key,
  venta_id        bigint not null references public.ventas(id) on delete cascade,
  producto_id     uuid references public.productos(id) on delete set null,
  producto_numero int,
  nombre          text not null,
  unidad          text,
  cantidad        numeric(12,2) not null check (cantidad > 0),
  precio          numeric(10,2) not null check (precio >= 0)
);
create index if not exists venta_items_venta_idx on public.venta_items(venta_id);

-- ---------------------------------------------------------------------
-- VISITAS a las tiendas (para las métricas)
-- ---------------------------------------------------------------------
create table if not exists public.visitas (
  id        bigint generated always as identity primary key,
  tienda_id uuid not null references public.tiendas(id) on delete cascade,
  creado_en timestamptz not null default now()
);
create index if not exists visitas_tienda_fecha_idx on public.visitas(tienda_id, creado_en desc);

-- =====================================================================
--  FUNCIONES DE AYUDA PARA LA SEGURIDAD
-- =====================================================================
create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where user_id = auth.uid() and rol = 'admin' and activo);
$$;

create or replace function public.mi_tienda() returns uuid
language sql stable security definer set search_path = public as $$
  select p.tienda_id from perfiles p join tiendas t on t.id = p.tienda_id
  where p.user_id = auth.uid() and p.activo and not t.suspendida;
$$;

-- =====================================================================
--  TRIGGERS DE PRODUCTOS: número automático y límites del plan
-- =====================================================================
create or replace function public.productos_antes_de_guardar() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  pl planes;
  n  int;
begin
  if tg_op = 'UPDATE' then
    new.numero    := old.numero;      -- el número nunca cambia
    new.tienda_id := old.tienda_id;   -- un producto no se mueve de tienda
    new.actualizado_en := now();
  end if;

  select p.* into pl from planes p join tiendas t on t.plan = p.id where t.id = new.tienda_id;

  if coalesce(array_length(new.fotos, 1), 0) > pl.max_fotos then
    raise exception 'Tu plan % permite hasta % foto(s) por producto', pl.nombre, pl.max_fotos;
  end if;

  if tg_op = 'INSERT' then
    if pl.max_productos is not null then
      select count(*) into n from productos where tienda_id = new.tienda_id;
      if n >= pl.max_productos then
        raise exception 'Llegaste al límite de % productos de tu plan %', pl.max_productos, pl.nombre;
      end if;
    end if;
    update tiendas set siguiente_numero = siguiente_numero + 1
      where id = new.tienda_id returning siguiente_numero - 1 into new.numero;
  end if;
  return new;
end $$;

drop trigger if exists productos_antes_de_guardar on public.productos;
create trigger productos_antes_de_guardar before insert or update on public.productos
  for each row execute function public.productos_antes_de_guardar();

-- Descontar stock al vender
create or replace function public.descontar_stock() returns trigger
language plpgsql security definer set search_path = public as $$
declare s numeric;
begin
  if new.producto_id is null then return new; end if;
  select stock into s from productos where id = new.producto_id for update;
  if s is not null then
    if s < new.cantidad then
      raise exception 'No hay stock suficiente de %', new.nombre;
    end if;
    update productos set stock = s - new.cantidad where id = new.producto_id;
  end if;
  return new;
end $$;

drop trigger if exists descontar_stock on public.venta_items;
create trigger descontar_stock after insert on public.venta_items
  for each row execute function public.descontar_stock();

-- =====================================================================
--  SEGURIDAD POR FILAS (RLS): cada tienda solo ve lo suyo
-- =====================================================================
alter table public.planes      enable row level security;
alter table public.tiendas     enable row level security;
alter table public.perfiles    enable row level security;
alter table public.productos   enable row level security;
alter table public.ventas      enable row level security;
alter table public.venta_items enable row level security;
alter table public.visitas     enable row level security;

drop policy if exists "planes: lectura" on public.planes;
create policy "planes: lectura" on public.planes for select using (true);

drop policy if exists "tiendas: admin todo" on public.tiendas;
create policy "tiendas: admin todo" on public.tiendas for all to authenticated
  using (es_admin()) with check (es_admin());
drop policy if exists "tiendas: dueño ve la suya" on public.tiendas;
create policy "tiendas: dueño ve la suya" on public.tiendas for select to authenticated
  using (id = mi_tienda());

drop policy if exists "perfiles: ver el propio" on public.perfiles;
create policy "perfiles: ver el propio" on public.perfiles for select to authenticated
  using (user_id = auth.uid() or es_admin());
drop policy if exists "perfiles: admin todo" on public.perfiles;
create policy "perfiles: admin todo" on public.perfiles for all to authenticated
  using (es_admin()) with check (es_admin());

drop policy if exists "productos: su tienda" on public.productos;
create policy "productos: su tienda" on public.productos for all to authenticated
  using (tienda_id = mi_tienda() or es_admin())
  with check (tienda_id = mi_tienda() or es_admin());

drop policy if exists "ventas: su tienda" on public.ventas;
create policy "ventas: su tienda" on public.ventas for all to authenticated
  using (tienda_id = mi_tienda() or es_admin())
  with check (tienda_id = mi_tienda() or es_admin());

drop policy if exists "items: su tienda" on public.venta_items;
create policy "items: su tienda" on public.venta_items for all to authenticated
  using (exists (select 1 from ventas v where v.id = venta_id and (v.tienda_id = mi_tienda() or es_admin())))
  with check (exists (select 1 from ventas v where v.id = venta_id and (v.tienda_id = mi_tienda() or es_admin())));

drop policy if exists "visitas: su tienda" on public.visitas;
create policy "visitas: su tienda" on public.visitas for select to authenticated
  using (tienda_id = mi_tienda() or es_admin());

-- =====================================================================
--  FUNCIONES PÚBLICAS PARA LAS TIENDAS (las usan los compradores, sin login)
-- =====================================================================

-- Datos públicos de una tienda + productos disponibles (por subdominio o dominio propio)
create or replace function public.tienda_publica(p_tienda text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', t.id, 'nombre', t.nombre, 'slug', t.slug, 'whatsapp', t.whatsapp, 'ciudad', t.ciudad,
    'logo_url', t.logo_url, 'tema', t.tema, 'rubro', t.rubro,
    'categorias', coalesce(t.config->'categorias', '[]'::jsonb),
    'productos', coalesce((
      select json_agg(json_build_object(
        'id', p.id, 'numero', p.numero, 'nombre', p.nombre, 'descripcion', p.descripcion,
        'precio', p.precio, 'precio_oferta', p.precio_oferta, 'categoria', p.categoria,
        'unidad', p.unidad, 'fotos', p.fotos, 'destacado', p.destacado,
        'etiquetas', p.etiquetas, 'variantes', p.variantes,
        'agotado', (p.stock is not null and p.stock <= 0)
      ) order by p.destacado desc, p.numero desc)
      from productos p where p.tienda_id = t.id and p.disponible), '[]'::json)
  )
  from tiendas t
  where (t.slug = lower(p_tienda) or t.dominio = lower(p_tienda)) and not t.suspendida;
$$;

-- Pedido desde la tienda web: los precios se calculan aquí, nunca se confía en el navegador
create or replace function public.crear_pedido(
  p_tienda text, p_cliente text, p_telefono text,
  p_entrega text, p_zona text, p_nota text, p_items jsonb
) returns json
language plpgsql security definer set search_path = public as $$
declare
  t       tiendas;
  v_id    bigint;
  v_total numeric := 0;
  it      jsonb;
  pr      productos;
  cant    numeric;
  pu      numeric;
begin
  select * into t from tiendas
   where (slug = lower(p_tienda) or dominio = lower(p_tienda)) and not suspendida;
  if not found then raise exception 'Esta tienda no está disponible'; end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'El pedido no tiene productos válidos';
  end if;

  insert into ventas (tienda_id, cliente, telefono, canal, pago, estado, entrega, zona, nota, total)
  values (t.id, left(p_cliente, 80), left(p_telefono, 30), 'Tienda web', 'Por definir', 'Nuevo',
          case when p_entrega = 'Delivery' then 'Delivery' else 'Retira en tienda' end,
          left(p_zona, 120), left(p_nota, 300), 0)
  returning id into v_id;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into pr from productos
     where id = (it->>'producto_id')::uuid and tienda_id = t.id and disponible;
    if not found then raise exception 'Un producto ya no está disponible'; end if;
    cant := (it->>'cantidad')::numeric;
    if cant is null or cant <= 0 or cant > 1000 then raise exception 'Cantidad no válida'; end if;
    pu := coalesce(pr.precio_oferta, pr.precio);
    insert into venta_items (venta_id, producto_id, producto_numero, nombre, unidad, cantidad, precio)
    values (v_id, pr.id, pr.numero, pr.nombre, pr.unidad, cant, pu);
    v_total := v_total + cant * pu;
  end loop;

  update ventas set total = round(v_total, 2) where id = v_id;
  return json_build_object('id', v_id, 'total', round(v_total, 2));
end $$;

create or replace function public.registrar_visita(p_tienda text) returns void
language sql security definer set search_path = public as $$
  insert into visitas (tienda_id)
  select id from tiendas where (slug = lower(p_tienda) or dominio = lower(p_tienda)) and not suspendida;
$$;

revoke all on function public.tienda_publica(text) from public;
revoke all on function public.crear_pedido(text, text, text, text, text, text, jsonb) from public;
revoke all on function public.registrar_visita(text) from public;
grant execute on function public.tienda_publica(text) to anon, authenticated;
grant execute on function public.crear_pedido(text, text, text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.registrar_visita(text) to anon, authenticated;

-- =====================================================================
--  RESUMEN PARA EL PANEL MAESTRO (respeta RLS: solo el admin ve todas)
-- =====================================================================
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
     where w.tienda_id = t.id and w.creado_en > now() - interval '30 days') as visitas_30d
from tiendas t join planes pl on pl.id = t.plan;

-- =====================================================================
--  FOTOS: bucket público, cada tienda solo sube y borra en su carpeta
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;

drop policy if exists "fotos: subir a mi tienda" on storage.objects;
create policy "fotos: subir a mi tienda" on storage.objects for insert to authenticated
  with check (bucket_id = 'productos' and (storage.foldername(name))[1] = public.mi_tienda()::text);

drop policy if exists "fotos: borrar de mi tienda" on storage.objects;
create policy "fotos: borrar de mi tienda" on storage.objects for delete to authenticated
  using (bucket_id = 'productos' and ((storage.foldername(name))[1] = public.mi_tienda()::text or public.es_admin()));

-- =====================================================================
--  Migración 006 · CRM de EDAI (solo para el administrador)
--  Prospectos, clientes, ventas, pagos, servicios, gastos y actividades.
--  Se puede volver a ejecutar sin problema.
-- =====================================================================

-- Ajustes generales (una sola fila)
create table if not exists public.crm_config (
  id          int primary key default 1 check (id = 1),
  tipo_cambio numeric(10,2) not null default 10   -- bolivianos por dólar
);
insert into public.crm_config (id, tipo_cambio) values (1, 10) on conflict (id) do nothing;

create table if not exists public.crm_divisiones (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  orden  int not null default 0
);
insert into public.crm_divisiones (nombre, orden) values ('Div. 1: Desarrollo', 1) on conflict (nombre) do nothing;

-- Catálogo de paquetes y servicios
create table if not exists public.crm_servicios (
  id          uuid primary key default gen_random_uuid(),
  division_id uuid references public.crm_divisiones(id) on delete set null,
  nombre      text not null,
  tipo        text not null default 'unico' check (tipo in ('unico','mensual','anual')),
  moneda      text not null default 'USD' check (moneda in ('BOB','USD')),
  precio_min  numeric(12,2),
  precio_max  numeric(12,2),
  entrega     text,
  publico     text,
  incluye     text,
  asesoria    text,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

-- Clientes
create table if not exists public.crm_clientes (
  id          uuid primary key default gen_random_uuid(),
  numero      int generated always as identity unique,   -- CLI-001
  nombre      text not null,
  empresa     text,
  telefono    text,
  email       text,
  division_id uuid references public.crm_divisiones(id) on delete set null,
  origen      text,
  notas       text,
  tienda_id   uuid references public.tiendas(id) on delete set null,
  evento_id   uuid references public.eventos(id) on delete set null,
  creado_en   timestamptz not null default now()
);

-- Prospectos (interesados que todavía no compran)
create table if not exists public.crm_prospectos (
  id             uuid primary key default gen_random_uuid(),
  numero         int generated always as identity unique,
  nombre         text not null,
  empresa        text,
  telefono       text,
  email          text,
  origen         text,
  etapa          text not null default 'Nuevo'
                 check (etapa in ('Nuevo','Contactado','Demo','Propuesta','Ganado','Perdido')),
  servicio_id    uuid references public.crm_servicios(id) on delete set null,
  valor          numeric(12,2),
  moneda         text not null default 'BOB' check (moneda in ('BOB','USD')),
  proxima_accion text,
  proxima_fecha  date,
  notas          text,
  motivo_perdida text,
  cliente_id     uuid references public.crm_clientes(id) on delete set null,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Ventas y proyectos
create table if not exists public.crm_ventas (
  id          uuid primary key default gen_random_uuid(),
  numero      int generated always as identity unique,   -- VTA-001
  cliente_id  uuid not null references public.crm_clientes(id) on delete cascade,
  division_id uuid references public.crm_divisiones(id) on delete set null,
  servicio_id uuid references public.crm_servicios(id) on delete set null,
  descripcion text,
  tipo        text not null default 'unico' check (tipo in ('unico','mensual','anual')),
  moneda      text not null default 'USD' check (moneda in ('BOB','USD')),
  valor       numeric(12,2) not null default 0 check (valor >= 0),
  costo       numeric(12,2) not null default 0 check (costo >= 0),
  estado      text not null default 'En desarrollo'
              check (estado in ('Cotizado','En desarrollo','Entregado','Cancelado')),
  fecha       date not null default current_date,
  entrega     date,
  notas       text,
  creado_en   timestamptz not null default now()
);
create index if not exists crm_ventas_cliente_idx on public.crm_ventas(cliente_id);

-- Pagos de cada venta (en la misma moneda de la venta)
create table if not exists public.crm_pagos (
  id       uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.crm_ventas(id) on delete cascade,
  fecha    date not null default current_date,
  monto    numeric(12,2) not null check (monto > 0),
  metodo   text,
  nota     text
);
create index if not exists crm_pagos_venta_idx on public.crm_pagos(venta_id);

-- Historial: notas, llamadas, reuniones…
create table if not exists public.crm_actividades (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid references public.crm_clientes(id) on delete cascade,
  prospecto_id uuid references public.crm_prospectos(id) on delete cascade,
  tipo         text not null default 'Nota' check (tipo in ('Nota','Llamada','WhatsApp','Reunión','Correo')),
  texto        text not null,
  fecha        timestamptz not null default now()
);

-- Gastos de la empresa
create table if not exists public.crm_gastos (
  id           uuid primary key default gen_random_uuid(),
  concepto     text not null,
  categoria    text,
  moneda       text not null default 'USD' check (moneda in ('BOB','USD')),
  monto        numeric(12,2) not null default 0 check (monto >= 0),
  periodicidad text not null default 'mensual' check (periodicidad in ('mensual','anual','unico')),
  inicio       date,
  renovacion   date,
  activo       boolean not null default true,
  notas        text
);

-- Resumen de ventas con lo cobrado y lo que falta
drop view if exists public.crm_ventas_resumen;
create view public.crm_ventas_resumen with (security_invoker = true) as
select v.*,
  c.nombre as cliente_nombre, c.empresa as cliente_empresa, c.numero as cliente_numero, c.telefono as cliente_telefono,
  d.nombre as division_nombre, s.nombre as servicio_nombre,
  coalesce((select sum(p.monto) from crm_pagos p where p.venta_id = v.id), 0) as cobrado,
  greatest(v.valor - coalesce((select sum(p.monto) from crm_pagos p where p.venta_id = v.id), 0), 0) as saldo,
  (v.valor - v.costo) as ganancia
from crm_ventas v
join crm_clientes c on c.id = v.cliente_id
left join crm_divisiones d on d.id = v.division_id
left join crm_servicios s on s.id = v.servicio_id;

-- Seguridad: todo el CRM es solo para el administrador
do $$
declare t text;
begin
  foreach t in array array['crm_config','crm_divisiones','crm_servicios','crm_clientes','crm_prospectos','crm_ventas','crm_pagos','crm_actividades','crm_gastos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s: solo admin" on public.%I', t, t);
    execute format('create policy "%s: solo admin" on public.%I for all to authenticated using (es_admin()) with check (es_admin())', t, t);
  end loop;
end $$;

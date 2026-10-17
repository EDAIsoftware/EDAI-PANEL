-- =====================================================================
--  Migración 008 · Demos conectadas al CRM
--  Cada demo tiene categoría y cada envío a un prospecto o cliente
--  tiene su propio enlace, para saber si la abrió y cuántas veces.
-- =====================================================================

alter table public.demos add column if not exists categoria text not null default 'Otro';

create table if not exists public.demo_envios (
  id               uuid primary key default gen_random_uuid(),
  codigo           text not null unique default left(replace(gen_random_uuid()::text, '-', ''), 8),
  demo_id          uuid not null references public.demos(id) on delete cascade,
  prospecto_id     uuid references public.crm_prospectos(id) on delete cascade,
  cliente_id       uuid references public.crm_clientes(id) on delete cascade,
  nombre           text not null,
  telefono         text,
  aperturas        int not null default 0,
  primera_apertura timestamptz,
  ultima_apertura  timestamptz,
  creado_en        timestamptz not null default now()
);
create index if not exists demo_envios_demo_idx on public.demo_envios(demo_id);
create index if not exists demo_envios_prospecto_idx on public.demo_envios(prospecto_id);
create index if not exists demo_envios_cliente_idx on public.demo_envios(cliente_id);

alter table public.demo_envios enable row level security;
drop policy if exists "demo_envios: solo admin" on public.demo_envios;
create policy "demo_envios: solo admin" on public.demo_envios for all to authenticated using (es_admin()) with check (es_admin());

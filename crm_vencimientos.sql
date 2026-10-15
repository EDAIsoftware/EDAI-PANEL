-- ============================================================
-- CRM EDAI · Vencimientos de planes y dominios
-- Ejecutar en Supabase > SQL Editor
-- NO toca las tablas del e-commerce: es una tabla nueva del CRM.
-- Ajusta "crm_clientes" si tu tabla de clientes se llama distinto.
-- ============================================================

create table if not exists public.crm_vencimientos (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid not null references public.crm_clientes(id) on delete cascade,

  -- 'plan'    = suscripción (e-commerce, invitaciones, CRM, FuelOps, etc.)
  -- 'dominio' = dominio del cliente (se renueva cada año)
  -- 'hosting' / 'otro' por si cobras algo más
  tipo              text not null check (tipo in ('plan','dominio','hosting','otro')),

  servicio          text not null,            -- ej: 'E-commerce · Plan Negocio', 'Invitación boda'
  dominio           text,                     -- ej: 'chavela.com.bo' (solo si tipo = 'dominio')
  proveedor         text,                     -- ej: 'Namecheap', 'NIC Bolivia'

  fecha_inicio      date not null,            -- cuándo se contrató / cuándo se registró el dominio
  periodo           text not null default 'mensual'
                    check (periodo in ('mensual','trimestral','semestral','anual','unico')),
  fecha_vencimiento date not null,            -- próxima fecha a renovar

  monto_bs          numeric(10,2),
  dias_aviso        int not null default 7,   -- con cuántos días de anticipación avisar
  notas             text,
  activo            boolean not null default true,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists crm_venc_fecha_idx   on public.crm_vencimientos (fecha_vencimiento) where activo;
create index if not exists crm_venc_cliente_idx on public.crm_vencimientos (cliente_id);

-- Dominios avisan con 30 días por defecto (si no se indica otro valor)
create or replace function public.crm_venc_defaults()
returns trigger language plpgsql as $$
begin
  if new.tipo = 'dominio' and tg_op = 'INSERT' and new.dias_aviso = 7 then
    new.dias_aviso := 30;
    new.periodo := 'anual';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_crm_venc_defaults on public.crm_vencimientos;
create trigger trg_crm_venc_defaults
before insert or update on public.crm_vencimientos
for each row execute function public.crm_venc_defaults();

-- Renovar: corre la fecha de vencimiento un período hacia adelante
create or replace function public.crm_renovar_vencimiento(p_id uuid)
returns date language plpgsql as $$
declare v record; nueva date;
begin
  select * into v from public.crm_vencimientos where id = p_id;
  nueva := case v.periodo
    when 'mensual'    then v.fecha_vencimiento + interval '1 month'
    when 'trimestral' then v.fecha_vencimiento + interval '3 months'
    when 'semestral'  then v.fecha_vencimiento + interval '6 months'
    when 'anual'      then v.fecha_vencimiento + interval '1 year'
    else v.fecha_vencimiento
  end;
  update public.crm_vencimientos set fecha_vencimiento = nueva where id = p_id;
  return nueva;
end $$;

-- Vista lista para el panel: estado calculado y días restantes
create or replace view public.crm_vencimientos_estado
with (security_invoker = true) as
select
  v.*,
  c.nombre   as cliente_nombre,
  c.telefono as cliente_telefono,
  (v.fecha_vencimiento - current_date) as dias_restantes,
  case
    when v.fecha_vencimiento < current_date                       then 'vencido'
    when v.fecha_vencimiento - current_date <= v.dias_aviso       then 'por_vencer'
    else 'al_dia'
  end as estado
from public.crm_vencimientos v
join public.crm_clientes c on c.id = v.cliente_id
where v.activo;

-- Seguridad: solo tú (admin) puedes ver/editar
alter table public.crm_vencimientos enable row level security;

drop policy if exists "admin gestiona vencimientos" on public.crm_vencimientos;
create policy "admin gestiona vencimientos" on public.crm_vencimientos
  for all to authenticated
  using      ( (auth.jwt() ->> 'email') = 'TU_CORREO_ADMIN@edaisoftware.com' )
  with check ( (auth.jwt() ->> 'email') = 'TU_CORREO_ADMIN@edaisoftware.com' );

-- =====================================================================
--  Migración 002 · Prefijo de códigos por tienda y código propio único
--  Ejecútala UNA vez en Supabase → SQL Editor (si ya corriste schema.sql antes).
-- =====================================================================

-- 1) Prefijo de cada tienda (ej: CHV → CHV-0001)
alter table public.tiendas add column if not exists prefijo text;

-- Genera un prefijo para las tiendas que ya existen (3 primeras letras de su dirección)
with base as (
  select id,
         upper(left(regexp_replace(slug, '[^a-z0-9]', '', 'g'), 3)) as p,
         row_number() over (partition by upper(left(regexp_replace(slug, '[^a-z0-9]', '', 'g'), 3)) order by creado_en) as n
  from public.tiendas
  where prefijo is null
)
update public.tiendas t
set prefijo = case when b.n = 1 then b.p else b.p || b.n end
from base b
where t.id = b.id;

alter table public.tiendas alter column prefijo set not null;

alter table public.tiendas drop constraint if exists tiendas_prefijo_formato;
alter table public.tiendas add constraint tiendas_prefijo_formato check (prefijo ~ '^[A-Z0-9]{2,6}$');

alter table public.tiendas drop constraint if exists tiendas_prefijo_unico;
alter table public.tiendas add constraint tiendas_prefijo_unico unique (prefijo);

-- 2) El código propio del dueño no se repite dentro de su tienda (sí puede repetirse entre tiendas distintas)
create unique index if not exists productos_codigo_unico
  on public.productos (tienda_id, lower(codigo))
  where codigo is not null and codigo <> '';

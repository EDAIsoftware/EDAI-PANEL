-- =====================================================================
--  Migración 005 · Bóveda de contraseñas del administrador
--  Todo se cifra en el navegador con tu contraseña maestra (AES-256).
--  La base de datos solo guarda texto cifrado: ni Supabase ni nadie con
--  acceso a la base puede leer tus claves sin la contraseña maestra.
-- =====================================================================

create table if not exists public.boveda_config (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  sal            text not null,
  iteraciones    int  not null,
  prueba_iv      text not null,   -- texto de control cifrado, para saber si la clave maestra es correcta
  prueba         text not null,
  actualizado_en timestamptz not null default now()
);

create table if not exists public.boveda (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  iv             text not null,
  datos          text not null,   -- carpeta, título, usuario, clave, web y notas: todo cifrado
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists boveda_user_idx on public.boveda(user_id);

alter table public.boveda_config enable row level security;
alter table public.boveda        enable row level security;

drop policy if exists "boveda_config: solo el admin dueño" on public.boveda_config;
create policy "boveda_config: solo el admin dueño" on public.boveda_config for all to authenticated
  using (user_id = auth.uid() and es_admin()) with check (user_id = auth.uid() and es_admin());

drop policy if exists "boveda: solo el admin dueño" on public.boveda;
create policy "boveda: solo el admin dueño" on public.boveda for all to authenticated
  using (user_id = auth.uid() and es_admin()) with check (user_id = auth.uid() and es_admin());

-- Cambiar la contraseña maestra: vuelve a guardar todo cifrado con la nueva, de una sola vez
create or replace function public.boveda_cambiar_clave(p_config jsonb, p_items jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare it jsonb;
begin
  if not es_admin() then raise exception 'Sin acceso'; end if;
  update boveda_config set sal = p_config->>'sal', iteraciones = (p_config->>'iteraciones')::int,
    prueba_iv = p_config->>'prueba_iv', prueba = p_config->>'prueba', actualizado_en = now()
  where user_id = auth.uid();
  for it in select * from jsonb_array_elements(p_items) loop
    update boveda set iv = it->>'iv', datos = it->>'datos', actualizado_en = now()
    where id = (it->>'id')::uuid and user_id = auth.uid();
  end loop;
end $$;

revoke all on function public.boveda_cambiar_clave(jsonb, jsonb) from public;
grant execute on function public.boveda_cambiar_clave(jsonb, jsonb) to authenticated;

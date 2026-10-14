-- =====================================================================
--  Migración 004 · Apariencia del panel del dueño y nuevos precios de invitaciones
--  Ejecútala en Supabase → SQL Editor (después de la 002 y la 003).
-- =====================================================================

-- 1) El dueño cambia el logo y la paleta de su panel (no puede tocar nada más de su tienda)
create or replace function public.actualizar_apariencia(p_logo_url text, p_paleta text)
returns void language plpgsql security definer set search_path = public as $$
declare t uuid := mi_tienda();
begin
  if t is null then raise exception 'No tienes acceso a esta tienda'; end if;
  if p_paleta not in ('verde', 'negro', 'blanco', 'rosado') then raise exception 'Paleta no válida'; end if;
  if p_logo_url is not null and p_logo_url !~ '^https://' then raise exception 'Logo no válido'; end if;
  update tiendas
     set logo_url = nullif(p_logo_url, ''),
         tema = coalesce(tema, '{}'::jsonb) || jsonb_build_object('panel', p_paleta)
   where id = t;
end $$;

revoke all on function public.actualizar_apariencia(text, text) from public;
grant execute on function public.actualizar_apariencia(text, text) to authenticated;

-- 2) Planes de invitaciones: nuevo Express y precios más competitivos
insert into public.planes_evento (id, nombre, precio, max_invitados, pases, max_fotos, musica, regalos, dias_despues, orden) values
  ('express',  'Express',  49,  0,    false, 0,  false, false, 7,  0),
  ('esencial', 'Esencial', 99,  0,    false, 3,  true,  false, 15, 1),
  ('completa', 'Completa', 199, 300,  true,  10, true,  true,  30, 2),
  ('premium',  'Premium',  399, null, true,  20, true,  true,  60, 3)
on conflict (id) do update set
  nombre = excluded.nombre, precio = excluded.precio, max_invitados = excluded.max_invitados,
  pases = excluded.pases, max_fotos = excluded.max_fotos, musica = excluded.musica,
  regalos = excluded.regalos, dias_despues = excluded.dias_despues, orden = excluded.orden;

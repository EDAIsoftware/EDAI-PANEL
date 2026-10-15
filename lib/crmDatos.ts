import 'server-only'
import { requireAdmin } from '@/lib/auth'
import type { Cliente, Division, Servicio } from '@/lib/crm'

// Datos que usan casi todas las pantallas del CRM
export async function baseCrm() {
  const s = await requireAdmin()
  const [{ data: cfg }, { data: divs }, { data: servs }, { data: clis }] = await Promise.all([
    s.supabase.from('crm_config').select('tipo_cambio').eq('id', 1).maybeSingle(),
    s.supabase.from('crm_divisiones').select('*').order('orden'),
    s.supabase.from('crm_servicios').select('*').order('nombre'),
    s.supabase.from('crm_clientes').select('id, nombre, empresa').order('nombre'),
  ])
  return {
    ...s,
    tc: Number(cfg?.tipo_cambio ?? 10),
    divisiones: (divs ?? []) as Division[],
    servicios: (servs ?? []) as Servicio[],
    clientes: (clis ?? []) as Pick<Cliente, 'id' | 'nombre' | 'empresa'>[],
  }
}

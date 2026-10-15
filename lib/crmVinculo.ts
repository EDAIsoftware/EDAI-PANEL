import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/*
  Conecta el CRM con las tiendas e invitaciones:
  - si viene crmId, vincula ese cliente
  - si no, busca un cliente con el mismo correo o teléfono, y si no existe lo crea
  Nunca hace fallar la creación de la tienda o invitación: si algo sale mal, solo no vincula.
*/
export async function vincularCrm(sb: SupabaseClient, d: {
  tipo: 'tienda' | 'evento'; id: string; crmId?: string | null
  nombre: string; empresa?: string | null; telefono?: string | null; email?: string | null
}) {
  try {
    const campo = d.tipo === 'tienda' ? 'tienda_id' : 'evento_id'
    let clienteId = d.crmId || null
    if (!clienteId) {
      const filtros = [d.email ? `email.eq."${d.email}"` : null, d.telefono && d.telefono.length > 6 ? `telefono.ilike."%${d.telefono.slice(-8)}%"` : null].filter(Boolean)
      if (filtros.length) {
        const { data } = await sb.from('crm_clientes').select('id').or(filtros.join(',')).limit(1)
        clienteId = data?.[0]?.id ?? null
      }
    }
    if (clienteId) {
      await sb.from('crm_clientes').update({ [campo]: d.id }).eq('id', clienteId)
      return clienteId
    }
    const { data: div } = await sb.from('crm_divisiones').select('id').order('orden').limit(1)
    const { data: nuevo } = await sb.from('crm_clientes').insert({
      nombre: d.nombre, empresa: d.empresa || null, telefono: d.telefono || null, email: d.email || null,
      origen: d.tipo === 'tienda' ? 'Tienda EDAI' : 'Invitación EDAI', division_id: div?.[0]?.id ?? null, [campo]: d.id,
    }).select('id').single()
    return nuevo?.id ?? null
  } catch {
    return null
  }
}

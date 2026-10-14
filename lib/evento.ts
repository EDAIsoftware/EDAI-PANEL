import { requireEvento } from '@/lib/auth'
import { PLANES_EVENTO, esPlanEvento, leerDatos } from '@/lib/eventos'

// Carga el evento del cliente que entró al panel
export async function cargarEvento() {
  const s = await requireEvento()
  const { data: evento } = await s.supabase.from('eventos').select('*').eq('id', s.perfil.evento_id).maybeSingle()
  const planId: string = evento?.plan ?? ''
  const plan = esPlanEvento(planId) ? PLANES_EVENTO[planId] : PLANES_EVENTO.completa
  return { ...s, evento, plan, datos: leerDatos(evento?.datos) }
}

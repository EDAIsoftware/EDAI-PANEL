import { requireTienda } from '@/lib/auth'
import { leerConfig } from '@/lib/rubros'
import { PLANES, esPlan } from '@/lib/planes'

// Carga la tienda del usuario que entró al panel
export async function cargarTienda() {
  const s = await requireTienda()
  const { data: tienda } = await s.supabase.from('tiendas').select('*').eq('id', s.perfil.tienda_id).maybeSingle()
  const planId: string = tienda?.plan ?? ''
  const plan = esPlan(planId) ? PLANES[planId] : PLANES.emprende
  return {
    ...s,
    tienda,
    plan,
    config: tienda ? leerConfig(tienda.config, tienda.rubro) : null,
  }
}

import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { diasHasta } from '@/lib/utils'
import { PLANES, esPlan, type PlanId } from '@/lib/planes'

export type FilaTienda = {
  id: string; nombre: string; slug: string; rubro: string; ciudad: string | null; plan: string; plan_nombre: string
  plan_precio: number; max_productos: number | null; vence_el: string; suspendida: boolean; whatsapp: string | null
  dueno_nombre: string | null; productos: number; ventas_30d: number; ventas_30d_previos: number; pedidos_30d: number
  visitas_30d: number; creado_en: string
}
export type Estado = { k: 'activa' | 'por-vencer' | 'vencida' | 'suspendida'; txt: string; cls: string }
export type Analisis = FilaTienda & {
  estado: Estado; tendencia: number | null; uso: number; ultimoIngreso: string | null
  tipo: 'subir' | 'riesgo' | null; motivos: string[]; siguiente: PlanId | null
}

export function estadoDe(t: Pick<FilaTienda, 'suspendida' | 'vence_el'>): Estado {
  if (t.suspendida) return { k: 'suspendida', txt: 'Suspendida', cls: 'chip-malo' }
  const d = diasHasta(t.vence_el)
  if (d < 0) return { k: 'vencida', txt: `Vencida hace ${-d} d`, cls: 'chip-malo' }
  if (d <= 7) return { k: 'por-vencer', txt: d === 0 ? 'Vence hoy' : `Vence en ${d} d`, cls: 'chip-aviso' }
  return { k: 'activa', txt: 'Al día', cls: 'chip' }
}

// Analiza cada tienda: ¿conviene ofrecerle un plan mejor o está en riesgo de irse?
export async function analizarTiendas(filas: FilaTienda[]): Promise<Analisis[]> {
  const admin = createAdminClient()
  const { data: duenos } = await admin.from('perfiles').select('user_id, tienda_id').eq('rol', 'dueno')
  const { data: usuarios } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const ultimo = new Map<string, string | null>()
  for (const u of usuarios?.users ?? []) ultimo.set(u.id, u.last_sign_in_at ?? null)
  const ingresoDe = new Map<string, string | null>()
  for (const d of duenos ?? []) if (d.tienda_id) ingresoDe.set(d.tienda_id, ultimo.get(d.user_id) ?? null)

  return filas.map((t) => {
    const planId: string = t.plan
    const pl = esPlan(planId) ? PLANES[planId] : PLANES.emprende
    const previo = Number(t.ventas_30d_previos), actual = Number(t.ventas_30d)
    const tendencia = previo > 0 ? Math.round(((actual - previo) / previo) * 100) : null
    const uso = pl.productos ? t.productos / pl.productos : 0
    const ultimoIngreso = ingresoDe.get(t.id) ?? null
    const sinEntrar = ultimoIngreso ? -diasHasta(ultimoIngreso.slice(0, 10)) : null
    const antiguedad = -diasHasta(t.creado_en.slice(0, 10))
    const siguiente: PlanId | null = planId === 'emprende' ? 'negocio' : planId === 'negocio' ? 'empresa' : null

    const riesgo: string[] = []
    if (tendencia !== null && tendencia <= -25) riesgo.push(`Sus ventas cayeron ${-tendencia}% este mes`)
    if (sinEntrar !== null && sinEntrar >= 14) riesgo.push(`No entra a su panel hace ${sinEntrar} días`)
    if (ultimoIngreso === null && antiguedad >= 7) riesgo.push('Todavía no entró a su panel')
    if (antiguedad >= 30 && t.visitas_30d < 30) riesgo.push('Muy pocas visitas a su tienda')

    const subir: string[] = []
    if (siguiente) {
      if (uso >= 0.8) subir.push(`Usa ${t.productos} de ${pl.productos} productos de su plan`)
      if (tendencia !== null && tendencia >= 15 && actual >= 3000) subir.push(`Sus ventas crecieron ${tendencia}% este mes`)
    }
    const tipo = riesgo.length ? 'riesgo' : subir.length ? 'subir' : null
    return { ...t, estado: estadoDe(t), tendencia, uso, ultimoIngreso, tipo, motivos: riesgo.length ? riesgo : subir, siguiente }
  })
}

export function recordatorio(t: Pick<FilaTienda, 'dueno_nombre' | 'nombre'> & { estado: Estado }) {
  return `Hola ${t.dueno_nombre || ''}, te escribimos de EDAI. ${t.estado.k === 'vencida' ? `La suscripción de ${t.nombre} está vencida` : `La suscripción de ${t.nombre} vence pronto`}. ¿Te ayudamos a renovarla?`
}

export function mensajeOferta(t: Analisis) {
  const sig = t.siguiente ? PLANES[t.siguiente] : null
  return t.tipo === 'riesgo'
    ? `Hola ${t.dueno_nombre || ''}, te escribimos de EDAI. Queremos ayudarte a que ${t.nombre} venda más. ¿Tienes 10 minutos para conversar?`
    : `Hola ${t.dueno_nombre || ''}, ¡felicidades! ${t.nombre} va muy bien: ${(t.motivos[0] || '').toLowerCase()}. Con el plan ${sig?.nombre ?? ''} tendrías más capacidad y funciones. ¿Te cuento?`
}

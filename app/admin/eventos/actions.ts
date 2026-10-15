'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { generarEnlace } from '@/lib/accesos'
import { vincularCrm } from '@/lib/crmVinculo'
import { TIPOS_EVENTO, aIsoBolivia, esPlanEvento, esTipo, ESTILOS } from '@/lib/eventos'
import { slugify, soloDigitos, urlInvitacion } from '@/lib/utils'
import type { Resultado } from '../actions'

const correoValido = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)

export async function crearEvento(_prev: Resultado, form: FormData): Promise<Resultado> {
  const { supabase } = await requireAdmin()
  const nombre = String(form.get('nombre') || '').trim()
  const nombres = String(form.get('nombres') || '').trim()
  const tipo = String(form.get('tipo') || 'boda')
  const plan = String(form.get('plan') || 'completa')
  const cliente = String(form.get('cliente') || '').trim()
  const correo = String(form.get('correo') || '').trim().toLowerCase()
  const whatsapp = soloDigitos(String(form.get('whatsapp') || ''))
  const ciudad = String(form.get('ciudad') || '').trim()
  const fecha = aIsoBolivia(String(form.get('fecha') || ''))
  const slug = slugify(String(form.get('slug') || '') || nombres || nombre).slice(0, 40)
  const estilo = String(form.get('estilo') || '')

  if (!nombre) return { ok: false, error: 'Escribe el nombre del evento.' }
  if (!esTipo(tipo)) return { ok: false, error: 'Tipo de evento no válido.' }
  if (!esPlanEvento(plan)) return { ok: false, error: 'Plan no válido.' }
  if (!fecha) return { ok: false, error: 'Elige la fecha y hora del evento.' }
  if (!correoValido(correo)) return { ok: false, error: 'Escribe un correo válido para el cliente.' }
  if (slug.length < 3) return { ok: false, error: 'La dirección necesita al menos 3 letras.' }

  const t = TIPOS_EVENTO[tipo]
  const { data: ev, error } = await supabase.from('eventos').insert({
    nombre, slug, tipo, plan, cliente_nombre: cliente, whatsapp, ciudad, fecha,
    estilo: ESTILOS[estilo] ? estilo : t.estilo,
    datos: { nombres: nombres || null, frase: t.frase, rsvp_abierto: true },
  }).select('id').single()
  if (error || !ev) return { ok: false, error: error?.code === '23505' ? `La dirección ${slug} ya está en uso.` : `No se pudo crear el evento: ${error?.message || 'error desconocido'}` }

  try {
    const { userId, enlace } = await generarEnlace(correo, 'invite')
    const { error: e2 } = await createAdminClient().from('perfiles').insert({ user_id: userId, rol: 'evento', evento_id: ev.id, nombre: cliente, correo })
    if (e2) throw new Error(e2.message)
    await vincularCrm(supabase, { tipo: 'evento', id: ev.id, crmId: String(form.get('crm_cliente_id') || '') || null,
      nombre: cliente || nombre, telefono: whatsapp, email: correo })
    revalidatePath('/admin', 'layout')
    return { ok: true, tiendaId: ev.id, tienda: nombre, slug, nombre: cliente, correo, whatsapp, enlace, tipo: 'invitacion',
      urlPublica: urlInvitacion(slug), etiquetaPublica: 'Su invitación', esEvento: true }
  } catch (e) {
    await supabase.from('eventos').delete().eq('id', ev.id)
    const m = e instanceof Error ? e.message : ''
    return { ok: false, error: /registered|exists/i.test(m) ? 'Ese correo ya tiene un usuario. Usa otro.' : 'No se pudo crear el usuario del cliente.' }
  }
}

export async function enlaceAccesoEvento(eventoId: string, userId: string): Promise<Resultado> {
  const { supabase } = await requireAdmin()
  const { data: p } = await supabase.from('perfiles').select('correo, nombre, evento_id').eq('user_id', userId).maybeSingle()
  const { data: ev } = await supabase.from('eventos').select('nombre, slug, whatsapp').eq('id', eventoId).maybeSingle()
  if (!p || !ev || p.evento_id !== eventoId || !p.correo) return { ok: false, error: 'Usuario no encontrado.' }
  const { data: u } = await createAdminClient().auth.admin.getUserById(userId)
  try {
    const { enlace } = await generarEnlace(p.correo, 'recovery')
    return { ok: true, tiendaId: eventoId, tienda: ev.nombre, slug: ev.slug, nombre: p.nombre || '', correo: p.correo,
      whatsapp: ev.whatsapp || '', enlace, tipo: u.user?.last_sign_in_at ? 'clave' : 'invitacion',
      urlPublica: urlInvitacion(ev.slug), etiquetaPublica: 'Su invitación', esEvento: true }
  } catch {
    return { ok: false, error: 'No se pudo generar el enlace.' }
  }
}

export async function cambiarPlanEvento(eventoId: string, form: FormData) {
  const { supabase } = await requireAdmin()
  const plan = String(form.get('plan'))
  if (!esPlanEvento(plan)) return
  await supabase.from('eventos').update({ plan }).eq('id', eventoId)
  revalidatePath('/admin/eventos'); revalidatePath(`/admin/eventos/${eventoId}`)
}

export async function actualizarEventoAdmin(eventoId: string, form: FormData) {
  const { supabase } = await requireAdmin()
  const fecha = aIsoBolivia(String(form.get('fecha') || ''))
  await supabase.from('eventos').update({
    nombre: String(form.get('nombre') || '').trim() || undefined,
    cliente_nombre: String(form.get('cliente') || '').trim(),
    whatsapp: soloDigitos(String(form.get('whatsapp') || '')),
    ciudad: String(form.get('ciudad') || '').trim(),
    ...(fecha ? { fecha } : {}),
  }).eq('id', eventoId)
  revalidatePath(`/admin/eventos/${eventoId}`)
}

export async function marcarPagado(eventoId: string, valor: boolean) {
  const { supabase } = await requireAdmin()
  await supabase.from('eventos').update({ pagado: valor }).eq('id', eventoId)
  revalidatePath('/admin/eventos'); revalidatePath(`/admin/eventos/${eventoId}`)
}

export async function suspenderEvento(eventoId: string, valor: boolean) {
  const { supabase } = await requireAdmin()
  await supabase.from('eventos').update({ suspendido: valor }).eq('id', eventoId)
  revalidatePath('/admin/eventos'); revalidatePath(`/admin/eventos/${eventoId}`)
}

export async function eliminarEvento(eventoId: string, confirmacion: string) {
  const { supabase } = await requireAdmin()
  const { data: ev } = await supabase.from('eventos').select('nombre').eq('id', eventoId).single()
  if (!ev || confirmacion.trim().toLowerCase() !== ev.nombre.trim().toLowerCase()) return { ok: false, error: 'El nombre no coincide.' }
  const admin = createAdminClient()
  const { data: usuarios } = await admin.from('perfiles').select('user_id').eq('evento_id', eventoId)
  for (const u of usuarios ?? []) await admin.auth.admin.deleteUser(u.user_id)
  const { data: archivos } = await admin.storage.from('eventos').list(eventoId, { limit: 1000 })
  if (archivos?.length) await admin.storage.from('eventos').remove(archivos.map((a: { name: string }) => `${eventoId}/${a.name}`))
  await admin.from('eventos').delete().eq('id', eventoId)
  revalidatePath('/admin/eventos')
  redirect('/admin/eventos')
}

// Agrega al CRM una invitación que todavía no tiene cliente vinculado
export async function eventoAlCrm(eventoId: string) {
  const { supabase } = await requireAdmin()
  const { data: e } = await supabase.from('eventos').select('nombre, cliente_nombre, whatsapp').eq('id', eventoId).single()
  if (!e) return
  const { data: p } = await supabase.from('perfiles').select('correo').eq('evento_id', eventoId).maybeSingle()
  await vincularCrm(supabase, { tipo: 'evento', id: eventoId, nombre: e.cliente_nombre || e.nombre, telefono: e.whatsapp, email: p?.correo })
  revalidatePath(`/admin/eventos/${eventoId}`)
}

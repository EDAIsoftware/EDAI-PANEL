'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { configDeRubro, CAMPOS_EXTRA, RUBROS, type CampoExtra } from '@/lib/rubros'
import { esPlan, PLANES } from '@/lib/planes'
import { prefijoDe, prefijoValido, slugify, soloDigitos } from '@/lib/utils'
import { generarEnlace } from '@/lib/accesos'

export type Acceso = {
  ok: true
  tiendaId: string
  tienda: string
  slug: string
  nombre: string
  correo: string
  whatsapp: string
  enlace: string
  tipo: 'invitacion' | 'clave'
  urlPublica?: string     // invitación del evento (si no, se usa la tienda)
  etiquetaPublica?: string
  esEvento?: boolean
}
export type Resultado = Acceso | { ok: false; error: string } | null

const correoValido = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)

export async function crearTienda(_prev: Resultado, form: FormData): Promise<Resultado> {
  const { supabase } = await requireAdmin()
  const nombre = String(form.get('nombre') || '').trim()
  const dueno = String(form.get('dueno') || '').trim()
  const correo = String(form.get('correo') || '').trim().toLowerCase()
  const whatsapp = soloDigitos(String(form.get('whatsapp') || ''))
  const ciudad = String(form.get('ciudad') || '').trim()
  const plan = String(form.get('plan') || 'emprende')
  const rubro = String(form.get('rubro') || 'general')
  const slug = slugify(String(form.get('slug') || '') || nombre)

  if (!nombre) return { ok: false, error: 'Escribe el nombre de la tienda.' }
  if (!correoValido(correo)) return { ok: false, error: 'Escribe un correo válido para el dueño.' }
  if (slug.length < 3) return { ok: false, error: 'La dirección de la tienda necesita al menos 3 letras.' }
  if (!esPlan(plan)) return { ok: false, error: 'Plan no válido.' }
  if (!RUBROS[rubro]) return { ok: false, error: 'Rubro no válido.' }

  // Prefijo de los códigos de producto (único entre todas las tiendas)
  const pedido = String(form.get('prefijo') || '').trim().toUpperCase()
  if (pedido && !prefijoValido(pedido)) return { ok: false, error: 'El prefijo debe tener de 2 a 6 letras o números, sin espacios.' }
  let prefijo = pedido || prefijoDe(nombre)
  const { data: usados } = await supabase.from('tiendas').select('prefijo').like('prefijo', `${prefijo.slice(0, 4)}%`)
  const ocupados = new Set((usados ?? []).map((x: { prefijo: string }) => x.prefijo))
  if (ocupados.has(prefijo)) {
    if (pedido) return { ok: false, error: `El prefijo ${prefijo} ya lo usa otra tienda.` }
    let n = 2
    while (ocupados.has(prefijo.slice(0, 4) + n)) n++
    prefijo = prefijo.slice(0, 4) + n
  }

  const { data: tienda, error } = await supabase.from('tiendas').insert({
    nombre, slug, prefijo, dueno_nombre: dueno, whatsapp, ciudad, plan, rubro, config: configDeRubro(rubro),
  }).select('id').single()
  if (error || !tienda) {
    const msg = error?.message || ''
    return { ok: false, error: error?.code === '23505'
      ? (msg.includes('prefijo') ? `El prefijo ${prefijo} ya está en uso.` : `La dirección ${slug} ya está en uso.`)
      : `No se pudo crear la tienda: ${msg || 'error desconocido'}` }
  }

  try {
    const { userId, enlace } = await generarEnlace(correo, 'invite')
    const admin = createAdminClient()
    const { error: e2 } = await admin.from('perfiles').insert({ user_id: userId, rol: 'dueno', tienda_id: tienda.id, nombre: dueno, correo })
    if (e2) throw new Error(e2.message)
    revalidatePath('/admin')
    return { ok: true, tiendaId: tienda.id, tienda: nombre, slug, nombre: dueno, correo, whatsapp, enlace, tipo: 'invitacion' }
  } catch (e) {
    await supabase.from('tiendas').delete().eq('id', tienda.id)
    const m = e instanceof Error ? e.message : ''
    return { ok: false, error: /registered|exists/i.test(m) ? 'Ese correo ya tiene un usuario. Usa otro.' : `No se pudo crear el usuario del dueño: ${m}` }
  }
}

// Reenviar invitación o mandar enlace para nueva contraseña
export async function enlaceAcceso(tiendaId: string, userId: string): Promise<Resultado> {
  const { supabase } = await requireAdmin()
  const { data: p } = await supabase.from('perfiles').select('correo, nombre, tienda_id').eq('user_id', userId).maybeSingle()
  const { data: t } = await supabase.from('tiendas').select('nombre, slug, whatsapp').eq('id', tiendaId).maybeSingle()
  if (!p || !t || p.tienda_id !== tiendaId || !p.correo) return { ok: false, error: 'Usuario no encontrado.' }
  const admin = createAdminClient()
  const { data: u } = await admin.auth.admin.getUserById(userId)
  const yaEntro = !!u.user?.last_sign_in_at
  try {
    const { enlace } = await generarEnlace(p.correo, 'recovery')
    return { ok: true, tiendaId, tienda: t.nombre, slug: t.slug, nombre: p.nombre || '', correo: p.correo,
      whatsapp: t.whatsapp || '', enlace, tipo: yaEntro ? 'clave' : 'invitacion' }
  } catch {
    return { ok: false, error: 'No se pudo generar el enlace.' }
  }
}

export async function invitarUsuario(tiendaId: string, _prev: Resultado, form: FormData): Promise<Resultado> {
  const { supabase } = await requireAdmin()
  const nombre = String(form.get('nombre') || '').trim()
  const correo = String(form.get('correo') || '').trim().toLowerCase()
  if (!correoValido(correo)) return { ok: false, error: 'Escribe un correo válido.' }

  const { data: t } = await supabase.from('tiendas').select('nombre, slug, whatsapp, plan').eq('id', tiendaId).single()
  const planId: string = t?.plan ?? ''
  if (!t || !esPlan(planId)) return { ok: false, error: 'Tienda no encontrada.' }
  const pl = PLANES[planId]
  const { count } = await supabase.from('perfiles').select('*', { count: 'exact', head: true }).eq('tienda_id', tiendaId).eq('activo', true)
  if ((count ?? 0) >= pl.usuarios) return { ok: false, error: `El plan ${pl.nombre} permite ${pl.usuarios} usuario(s).` }

  try {
    const { userId, enlace } = await generarEnlace(correo, 'invite')
    const admin = createAdminClient()
    const { error } = await admin.from('perfiles').insert({ user_id: userId, rol: 'empleado', tienda_id: tiendaId, nombre, correo })
    if (error) throw new Error(error.message)
    revalidatePath(`/admin/tiendas/${tiendaId}`)
    return { ok: true, tiendaId, tienda: t.nombre, slug: t.slug, nombre, correo, whatsapp: t.whatsapp || '', enlace, tipo: 'invitacion' }
  } catch (e) {
    const m = e instanceof Error ? e.message : ''
    return { ok: false, error: /registered|exists/i.test(m) ? 'Ese correo ya tiene un usuario.' : 'No se pudo invitar al usuario.' }
  }
}

export async function cambiarActivo(tiendaId: string, userId: string, activo: boolean) {
  const { supabase } = await requireAdmin()
  const { data: p } = await supabase.from('perfiles').select('rol, tienda_id').eq('user_id', userId).single()
  if (!p || p.tienda_id !== tiendaId || p.rol === 'dueno') return
  await supabase.from('perfiles').update({ activo }).eq('user_id', userId)
  const admin = createAdminClient()
  await admin.auth.admin.updateUserById(userId, { ban_duration: activo ? 'none' : '876000h' })
  revalidatePath(`/admin/tiendas/${tiendaId}`)
}

export async function registrarPago(tiendaId: string) {
  const { supabase } = await requireAdmin()
  const { data: t } = await supabase.from('tiendas').select('vence_el').eq('id', tiendaId).single()
  if (!t) return
  const hoy = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' }))
  const base = new Date(Math.max(new Date(t.vence_el).getTime(), hoy.getTime()))
  base.setMonth(base.getMonth() + 1)
  await supabase.from('tiendas').update({ vence_el: base.toISOString().slice(0, 10) }).eq('id', tiendaId)
  revalidatePath('/admin', 'layout')
}

export async function cambiarPlan(tiendaId: string, form: FormData) {
  const { supabase } = await requireAdmin()
  const plan = String(form.get('plan'))
  if (!esPlan(plan)) return
  await supabase.from('tiendas').update({ plan }).eq('id', tiendaId)
  revalidatePath('/admin', 'layout')
}

export async function actualizarDatos(tiendaId: string, form: FormData) {
  const { supabase } = await requireAdmin()
  const dominio = String(form.get('dominio') || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  await supabase.from('tiendas').update({
    dueno_nombre: String(form.get('dueno') || '').trim(),
    whatsapp: soloDigitos(String(form.get('whatsapp') || '')),
    ciudad: String(form.get('ciudad') || '').trim(),
    dominio: dominio || null,
  }).eq('id', tiendaId)
  const prefijo = String(form.get('prefijo') || '').trim().toUpperCase()
  if (prefijoValido(prefijo)) {
    // Si otra tienda ya lo usa, la base de datos lo rechaza y se queda el anterior
    await supabase.from('tiendas').update({ prefijo }).eq('id', tiendaId)
  }
  revalidatePath(`/admin/tiendas/${tiendaId}`)
}

export async function cambiarRubro(tiendaId: string, form: FormData) {
  const { supabase } = await requireAdmin()
  const rubro = String(form.get('rubro'))
  if (!RUBROS[rubro]) return
  await supabase.from('tiendas').update({ rubro, config: configDeRubro(rubro) }).eq('id', tiendaId)
  revalidatePath(`/admin/tiendas/${tiendaId}`)
}

export async function guardarConfig(tiendaId: string, form: FormData) {
  const { supabase } = await requireAdmin()
  const lista = (k: string) => String(form.get(k) || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 60)
  const campos = (Object.keys(CAMPOS_EXTRA) as CampoExtra[]).filter((k) => form.get(`campo_${k}`) === 'on')
  const unidades = lista('unidades')
  await supabase.from('tiendas').update({
    config: { campos, categorias: lista('categorias'), unidades: unidades.length ? unidades : ['Unidad'], variantes: lista('variantes'), etiquetas: lista('etiquetas') },
  }).eq('id', tiendaId)
  revalidatePath(`/admin/tiendas/${tiendaId}`)
}

export async function suspender(tiendaId: string, valor: boolean) {
  const { supabase } = await requireAdmin()
  await supabase.from('tiendas').update({ suspendida: valor }).eq('id', tiendaId)
  revalidatePath('/admin', 'layout')
}

export async function eliminarTienda(tiendaId: string, confirmacion: string) {
  const { supabase } = await requireAdmin()
  const { data: t } = await supabase.from('tiendas').select('nombre').eq('id', tiendaId).single()
  if (!t || confirmacion.trim().toLowerCase() !== t.nombre.trim().toLowerCase()) {
    return { ok: false, error: 'El nombre no coincide.' }
  }
  const admin = createAdminClient()
  // 1) usuarios del panel
  const { data: usuarios } = await admin.from('perfiles').select('user_id').eq('tienda_id', tiendaId)
  for (const u of usuarios ?? []) await admin.auth.admin.deleteUser(u.user_id)
  // 2) fotos
  const { data: archivos } = await admin.storage.from('productos').list(tiendaId, { limit: 1000 })
  if (archivos?.length) await admin.storage.from('productos').remove(archivos.map((a: { name: string }) => `${tiendaId}/${a.name}`))
  // 3) la tienda (borra en cascada productos, ventas y visitas)
  await admin.from('tiendas').delete().eq('id', tiendaId)
  revalidatePath('/admin'); revalidatePath('/admin/tiendas')
  redirect('/admin/tiendas')
}

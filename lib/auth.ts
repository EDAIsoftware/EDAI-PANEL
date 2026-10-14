import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type Perfil = {
  user_id: string
  rol: 'admin' | 'dueno' | 'empleado' | 'evento'
  tienda_id: string | null
  evento_id: string | null
  nombre: string | null
  correo: string | null
  activo: boolean
}

export async function getSesion() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, perfil: null as Perfil | null }
  const { data: perfil } = await supabase.from('perfiles').select('*').eq('user_id', user.id).maybeSingle()
  return { supabase, user, perfil: (perfil as Perfil | null) }
}

export async function requireAdmin() {
  const s = await getSesion()
  if (!s.user || !s.perfil || s.perfil.rol !== 'admin' || !s.perfil.activo) redirect('/login')
  return s as typeof s & { user: NonNullable<typeof s.user>; perfil: Perfil }
}

export async function requireTienda() {
  const s = await getSesion()
  if (s.perfil?.evento_id && !s.perfil.tienda_id) redirect('/panel/evento')
  if (!s.user || !s.perfil || !s.perfil.tienda_id || !s.perfil.activo) redirect('/login')
  return s as typeof s & { user: NonNullable<typeof s.user>; perfil: Perfil & { tienda_id: string } }
}

export async function requireEvento() {
  const s = await getSesion()
  if (s.perfil?.tienda_id && !s.perfil.evento_id) redirect('/panel')
  if (!s.user || !s.perfil || !s.perfil.evento_id || !s.perfil.activo) redirect('/login')
  return s as typeof s & { user: NonNullable<typeof s.user>; perfil: Perfil & { evento_id: string } }
}

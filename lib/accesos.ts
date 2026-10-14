import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { PANEL_URL } from '@/lib/utils'

// Genera un enlace de un solo uso que lleva a /crear-clave.
// Vive fuera de los archivos 'use server' para que nunca se pueda llamar desde el navegador.
export async function generarEnlace(correo: string, tipo: 'invite' | 'recovery') {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({ type: tipo, email: correo })
  if (error || !data.properties) throw new Error(error?.message || 'No se pudo generar el enlace')
  const { hashed_token, verification_type } = data.properties
  return {
    userId: data.user.id as string,
    enlace: `${PANEL_URL}/auth/confirm?token_hash=${hashed_token}&type=${verification_type}&next=/crear-clave`,
  }
}

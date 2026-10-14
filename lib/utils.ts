export const bs = (n: number | string | null | undefined) =>
  'Bs. ' + Number(n ?? 0).toLocaleString('es-BO', { maximumFractionDigits: 2 })

// Código EDAI del producto: prefijo de la tienda + número. Ej: CHV-0001. Nunca se repite entre tiendas.
export const codigoEdai = (prefijo: string | null | undefined, numero: number) =>
  (prefijo || 'P') + '-' + String(numero).padStart(4, '0')

// Sugiere un prefijo a partir del nombre: iniciales si son varias palabras, o las 3 primeras letras
export const prefijoDe = (nombre: string) => {
  const palabras = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ').split(' ').filter((w) => w.length > 0 && !['DE', 'LA', 'EL', 'LOS', 'LAS', 'Y'].includes(w))
  if (palabras.length >= 2) return palabras.slice(0, 3).map((w) => w[0]).join('')
  return (palabras[0] || 'TDA').slice(0, 3)
}
export const prefijoValido = (p: string) => /^[A-Z0-9]{2,6}$/.test(p)

export const fechaCorta = (f: string | Date) =>
  new Date(f).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', timeZone: 'America/La_Paz' })

export const fechaHora = (f: string | Date) =>
  new Date(f).toLocaleString('es-BO', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz',
  })

export const diasHasta = (fecha: string) => {
  const hoy = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' }))
  return Math.round((new Date(fecha).getTime() - hoy.getTime()) / 86400000)
}

export const slugify = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30)

export const soloDigitos = (s: string) => (s || '').replace(/\D/g, '')

export const waLink = (tel: string, texto: string) =>
  'https://wa.me/' + soloDigitos(tel) + '?text=' + encodeURIComponent(texto)

export const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'edaisoftware.com'
export const PANEL_URL = process.env.NEXT_PUBLIC_PANEL_URL || 'https://panel.' + ROOT
export const INVITACIONES_URL = process.env.NEXT_PUBLIC_INVITACIONES_URL || 'https://invitaciones.' + ROOT
export const urlInvitacion = (slug: string, codigo?: string | null) =>
  `${INVITACIONES_URL}/${slug}${codigo ? `?p=${codigo}` : ''}`
export const urlTienda = (slug: string, dominio?: string | null) =>
  dominio ? 'https://' + dominio : 'https://' + slug + '.' + ROOT

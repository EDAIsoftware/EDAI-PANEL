export const bs = (n: number | string | null | undefined) =>
  'Bs. ' + Number(n ?? 0).toLocaleString('es-BO', { maximumFractionDigits: 2 })

export const pid = (numero: number) => 'P-' + String(numero).padStart(4, '0')

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
export const urlTienda = (slug: string, dominio?: string | null) =>
  dominio ? 'https://' + dominio : 'https://' + slug + '.' + ROOT

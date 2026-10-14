// Tipos de evento, estilos visuales y planes de las invitaciones digitales

export const TIPOS_EVENTO = {
  boda: { e: '💍', n: 'Boda', frase: 'Nos casamos', estilo: 'clasico', textoNombres: 'Ana & Luis' },
  xv: { e: '👑', n: 'XV años', frase: 'Mis XV años', estilo: 'rosa', textoNombres: 'Valentina' },
  cumpleanos: { e: '🎂', n: 'Cumpleaños', frase: '¡Vamos a celebrar!', estilo: 'fiesta', textoNombres: 'Mateo cumple 30' },
  bautizo: { e: '🕊️', n: 'Bautizo', frase: 'Mi bautizo', estilo: 'cielo', textoNombres: 'Santiago' },
  baby_shower: { e: '🍼', n: 'Baby shower', frase: '¡Viene en camino!', estilo: 'cielo', textoNombres: 'Bebé Rojas' },
  graduacion: { e: '🎓', n: 'Graduación', frase: '¡Me gradúo!', estilo: 'noche', textoNombres: 'Camila' },
  otro: { e: '🎉', n: 'Otro evento', frase: 'Te invitamos', estilo: 'clasico', textoNombres: 'Nuestro evento' },
} as const
export type TipoEvento = keyof typeof TIPOS_EVENTO
export const esTipo = (x: string): x is TipoEvento => x in TIPOS_EVENTO
export const tipoDe = (x: string) => (esTipo(x) ? TIPOS_EVENTO[x] : TIPOS_EVENTO.otro)

export type Estilo = { n: string; fondo: string; tarjeta: string; texto: string; suave: string; acento: string; sobreAcento: string; hoja: string; flor: string; oscuro?: boolean }
export const ESTILOS: Record<string, Estilo> = {
  clasico: { n: 'Clásico marfil', fondo: '#faf6ef', tarjeta: '#ffffff', texto: '#3a2f25', suave: '#86766a', acento: '#a8834c', sobreAcento: '#ffffff', hoja: '#9aa77f', flor: '#ead2c3' },
  noche: { n: 'Noche dorada', fondo: '#15120f', tarjeta: '#1f1b17', texto: '#f3ead9', suave: '#b4a58c', acento: '#d4af6a', sobreAcento: '#1a1209', hoja: '#8c7a4f', flor: '#d4af6a', oscuro: true },
  rosa: { n: 'Rosa suave', fondo: '#fff4f6', tarjeta: '#ffffff', texto: '#4a2632', suave: '#9a6c7a', acento: '#c95f83', sobreAcento: '#ffffff', hoja: '#a7b893', flor: '#f3b9cb' },
  lila: { n: 'Lila', fondo: '#f6f2fb', tarjeta: '#ffffff', texto: '#352a4c', suave: '#7d6f96', acento: '#8460c2', sobreAcento: '#ffffff', hoja: '#a3b08f', flor: '#d3c0f0' },
  cielo: { n: 'Celeste', fondo: '#f0f6fa', tarjeta: '#ffffff', texto: '#22394a', suave: '#6a8394', acento: '#4a8bb8', sobreAcento: '#ffffff', hoja: '#a6bda0', flor: '#bfd9ec' },
  fiesta: { n: 'Fiesta', fondo: '#fff8ec', tarjeta: '#ffffff', texto: '#2b2622', suave: '#7d7268', acento: '#e85d3a', sobreAcento: '#ffffff', hoja: '#f2b33d', flor: '#ff9a7a' },
  olivo: { n: 'Verde olivo', fondo: '#f3f4ec', tarjeta: '#ffffff', texto: '#2f3424', suave: '#737a61', acento: '#66783f', sobreAcento: '#ffffff', hoja: '#7d8c5a', flor: '#ebe5c9' },
}
export const estiloDe = (k: string) => ESTILOS[k] ?? ESTILOS.clasico

export const PLANES_EVENTO = {
  express: { nombre: 'Express', precio: 49, invitados: 0, pases: false, fotos: 0, musica: false, regalos: false, dias: 7 },
  esencial: { nombre: 'Esencial', precio: 99, invitados: 0, pases: false, fotos: 3, musica: true, regalos: false, dias: 15 },
  completa: { nombre: 'Completa', precio: 199, invitados: 300, pases: true, fotos: 10, musica: true, regalos: true, dias: 30 },
  premium: { nombre: 'Premium', precio: 399, invitados: null, pases: true, fotos: 20, musica: true, regalos: true, dias: 60 },
} as const
export type PlanEventoId = keyof typeof PLANES_EVENTO
export const PLAN_EVENTO_IDS = Object.keys(PLANES_EVENTO) as PlanEventoId[]
export const esPlanEvento = (x: string): x is PlanEventoId => x in PLANES_EVENTO

export type Lugar = { titulo: string; lugar: string; direccion: string; hora: string; maps: string }
export type DatosEvento = {
  nombres?: string
  frase?: string
  mensaje?: string
  portada_url?: string
  lugares?: Lugar[]
  vestimenta?: string
  padrinos?: string
  galeria?: string[]
  regalos?: { texto?: string; banco?: string; titular?: string; cuenta?: string; qr_url?: string }
  musica_url?: string
  rsvp_abierto?: boolean
  rsvp_limite?: string
}

export function leerDatos(raw: unknown): DatosEvento {
  const d = (raw && typeof raw === 'object' ? raw : {}) as DatosEvento
  return {
    ...d,
    lugares: Array.isArray(d.lugares) ? d.lugares.slice(0, 4) : [],
    galeria: Array.isArray(d.galeria) ? d.galeria : [],
    regalos: d.regalos && typeof d.regalos === 'object' ? d.regalos : {},
  }
}

// "2026-12-12T19:00" (hora de Bolivia) ⇄ fecha ISO
export const aIsoBolivia = (local: string) => (local ? new Date(`${local}:00-04:00`).toISOString() : null)
export const aLocalBolivia = (iso: string) => {
  const d = new Date(new Date(iso).getTime() - 4 * 3600000)
  return d.toISOString().slice(0, 16)
}

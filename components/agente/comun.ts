// Tipos, estilos y utilidades compartidas por la página del agente y la de cada propiedad

export type Propiedad = {
  id: string; numero: number; nombre: string; descripcion: string | null; precio: number; categoria: string | null
  fotos: string[]; destacado: boolean; etiquetas: string[]; operacion: string | null; zona: string | null
  moneda: 'BOB' | 'USD'; terreno: number | null; construido: number | null; dormitorios: number | null
  banos: number | null; parqueos: number | null; estado_inmueble: string
}
export type PerfilAgente = {
  foto?: string; inmobiliaria?: string; cargo?: string; frase?: string; bio?: string; experiencia?: string
  zonas?: string; instagram?: string; facebook?: string; tiktok?: string; estilo?: string; captacion?: string
}
export type DatosAgente = {
  id: string; nombre: string; slug: string; whatsapp: string | null; ciudad: string | null; logo_url: string | null
  tipo: 'agente'; perfil: PerfilAgente | null; prefijo: string; productos: Propiedad[]
}

export type EstiloAgente = { fondo: string; tarjeta: string; texto: string; suave: string; acento: string; sobreAcento: string; linea: string }
export const ESTILOS_AGENTE: Record<string, EstiloAgente> = {
  elegante: { fondo: '#111214', tarjeta: '#1a1b1f', texto: '#f3f1ec', suave: '#a3a19b', acento: '#c9a96e', sobreAcento: '#15120c', linea: '#2a2b30' },
  claro: { fondo: '#f7f7f5', tarjeta: '#ffffff', texto: '#1c1d20', suave: '#6b6d72', acento: '#1f6feb', sobreAcento: '#ffffff', linea: '#e4e4e0' },
  lujo: { fondo: '#0d0b08', tarjeta: '#17140f', texto: '#f6efe1', suave: '#b3a68c', acento: '#d4af37', sobreAcento: '#120e05', linea: '#2b251a' },
  moderno: { fondo: '#ffffff', tarjeta: '#f5f5f4', texto: '#151515', suave: '#6f6f6f', acento: '#e4572e', sobreAcento: '#ffffff', linea: '#e7e5e4' },
}
export const estiloAgente = (k?: string) => ESTILOS_AGENTE[k ?? ''] ?? ESTILOS_AGENTE.elegante

export const codigo = (prefijo: string, numero: number) => `${prefijo || 'P'}-${String(numero).padStart(4, '0')}`

export const precioTexto = (p: Pick<Propiedad, 'precio' | 'moneda' | 'operacion'>) =>
  `${p.moneda === 'USD' ? '$' : 'Bs.'} ${Number(p.precio).toLocaleString('es-BO')}${p.operacion === 'Alquiler' ? ' /mes' : ''}`

export const titularPropiedad = (p: Pick<Propiedad, 'categoria' | 'operacion' | 'zona'>) => {
  const cat = (p.categoria || 'Inmueble').replace(/s$/, '')
  return `${cat} en ${(p.operacion || 'venta').toLowerCase()}${p.zona ? ` · ${p.zona}` : ''}`
}

export const mensajeVisita = (prefijo: string, p: Pick<Propiedad, 'numero' | 'nombre'>) =>
  `Hola, me interesa agendar una visita para la propiedad ${codigo(prefijo, p.numero)} (${p.nombre}).`

export const soloDigitos = (s: string | null | undefined) => (s || '').replace(/\D/g, '')
export const wa = (tel: string | null, texto: string) => `https://wa.me/${soloDigitos(tel)}?text=${encodeURIComponent(texto)}`

export const especificaciones = (p: Propiedad) => [
  p.dormitorios != null ? { k: 'dorm', v: `${p.dormitorios}`, t: p.dormitorios === 1 ? 'dormitorio' : 'dormitorios' } : null,
  p.banos != null ? { k: 'bano', v: `${Number(p.banos)}`, t: Number(p.banos) === 1 ? 'baño' : 'baños' } : null,
  p.construido != null ? { k: 'cons', v: `${Number(p.construido)} m²`, t: 'construidos' } : null,
  p.terreno != null ? { k: 'terr', v: `${Number(p.terreno)} m²`, t: 'terreno' } : null,
  p.parqueos != null ? { k: 'parq', v: `${p.parqueos}`, t: p.parqueos === 1 ? 'parqueo' : 'parqueos' } : null,
].filter(Boolean) as { k: string; v: string; t: string }[]

// Tipos y utilidades del CRM de EDAI

export type Moneda = 'BOB' | 'USD'
export type TipoCobro = 'unico' | 'mensual' | 'anual'
export const ETAPAS = ['Nuevo', 'Contactado', 'Demo', 'Propuesta', 'Ganado', 'Perdido'] as const
export type Etapa = (typeof ETAPAS)[number]
export const ESTADOS_VENTA = ['Cotizado', 'En desarrollo', 'Entregado', 'Cancelado'] as const
export const ORIGENES = ['Facebook', 'Instagram', 'TikTok', 'LinkedIn', 'WhatsApp', 'Referido', 'Página web', 'Visita', 'Otro']
export const TIPOS_ACTIVIDAD = ['Nota', 'Llamada', 'WhatsApp', 'Reunión', 'Correo'] as const
export const METODOS_PAGO = ['QR', 'Transferencia', 'Efectivo', 'Tarjeta', 'PayPal', 'Otro']
export const CATEGORIAS_GASTO = ['Herramientas IA', 'Dominio y hosting', 'Software', 'Publicidad', 'Equipos', 'Servicios', 'Otros']

export const TIPO_COBRO: Record<TipoCobro, string> = { unico: 'Pago único', mensual: 'Mensual', anual: 'Anual' }

export type Division = { id: string; nombre: string; orden: number }
export type Servicio = {
  id: string; division_id: string | null; nombre: string; tipo: TipoCobro; moneda: Moneda; precio_min: number | null
  precio_max: number | null; entrega: string | null; publico: string | null; incluye: string | null; asesoria: string | null; activo: boolean
}
export type Cliente = {
  id: string; numero: number; nombre: string; empresa: string | null; telefono: string | null; email: string | null
  division_id: string | null; origen: string | null; notas: string | null; tienda_id: string | null; evento_id: string | null; creado_en: string
}
export type Prospecto = {
  id: string; numero: number; nombre: string; empresa: string | null; telefono: string | null; email: string | null; origen: string | null
  etapa: Etapa; servicio_id: string | null; valor: number | null; moneda: Moneda; proxima_accion: string | null; proxima_fecha: string | null
  notas: string | null; motivo_perdida: string | null; cliente_id: string | null; creado_en: string; actualizado_en: string
}
export type Venta = {
  id: string; numero: number; cliente_id: string; division_id: string | null; servicio_id: string | null; descripcion: string | null
  tipo: TipoCobro; moneda: Moneda; valor: number; costo: number; estado: string; fecha: string; entrega: string | null; notas: string | null
  cliente_nombre: string; cliente_empresa: string | null; cliente_numero: number; cliente_telefono: string | null
  division_nombre: string | null; servicio_nombre: string | null; cobrado: number; saldo: number; ganancia: number
}
export type Pago = { id: string; venta_id: string; fecha: string; monto: number; metodo: string | null; nota: string | null }
export type Actividad = { id: string; cliente_id: string | null; prospecto_id: string | null; tipo: string; texto: string; fecha: string }
export type Gasto = {
  id: string; concepto: string; categoria: string | null; moneda: Moneda; monto: number; periodicidad: TipoCobro
  inicio: string | null; renovacion: string | null; activo: boolean; notas: string | null
}

export const codCliente = (n: number) => 'CLI-' + String(n).padStart(3, '0')
export const codVenta = (n: number) => 'VTA-' + String(n).padStart(3, '0')
export const codProspecto = (n: number) => 'PRO-' + String(n).padStart(3, '0')

export const dinero = (monto: number | string | null | undefined, moneda: Moneda = 'BOB') => {
  const n = Number(monto ?? 0)
  const txt = n.toLocaleString('es-BO', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })
  return moneda === 'USD' ? `$ ${txt}` : `Bs. ${txt}`
}
export const aBs = (monto: number | string | null | undefined, moneda: Moneda, tc: number) =>
  Number(monto ?? 0) * (moneda === 'USD' ? tc : 1)

// Gasto llevado a su equivalente mensual
export const gastoMensual = (g: Pick<Gasto, 'monto' | 'periodicidad' | 'activo'>) =>
  !g.activo ? 0 : g.periodicidad === 'mensual' ? Number(g.monto) : g.periodicidad === 'anual' ? Number(g.monto) / 12 : 0

export const hoyBolivia = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' })
export const mesBolivia = (f: string) => f.slice(0, 7)
export const nombreMes = (yyyymm: string) =>
  new Date(yyyymm + '-15T12:00:00').toLocaleDateString('es-BO', { month: 'short', year: '2-digit' })

export const rangoPrecio = (s: Pick<Servicio, 'precio_min' | 'precio_max' | 'moneda' | 'tipo'>) => {
  const sufijo = s.tipo === 'mensual' ? ' /mes' : s.tipo === 'anual' ? ' /año' : ''
  if (s.precio_min == null) return 'A cotizar'
  if (s.precio_max == null) return `Desde ${dinero(s.precio_min, s.moneda)}${sufijo}`
  if (Number(s.precio_max) === Number(s.precio_min)) return dinero(s.precio_min, s.moneda) + sufijo
  return `${dinero(s.precio_min, s.moneda)} – ${dinero(s.precio_max, s.moneda)}${sufijo}`
}

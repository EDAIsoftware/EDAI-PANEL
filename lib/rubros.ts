// Configuración de productos por rubro. El admin la elige al crear la tienda
// y puede ajustarla después desde su panel.

export const CAMPOS_BASE = ['nombre', 'precio', 'categoria', 'unidad', 'fotos', 'disponible', 'código propio'] as const

export const CAMPOS_EXTRA = {
  descripcion: { t: 'Descripción', d: 'Comentario corto' },
  subcategoria: { t: 'Subcategoría', d: 'Ej: Bebidas → Gaseosas' },
  stock: { t: 'Stock', d: 'Se agota solo en cero' },
  oferta: { t: 'Precio de oferta', d: 'Precio normal tachado' },
  destacado: { t: 'Destacado', d: 'Sale primero' },
  variantes: { t: 'Variantes', d: 'Tallas, colores, tamaños' },
  etiquetas: { t: 'Etiquetas', d: 'Nuevo, picante…' },
  minimo: { t: 'Cantidad mínima', d: 'Ej: 0,5 Kg' },
  peso: { t: 'Peso aproximado', d: 'Piezas enteras' },
  marca: { t: 'Marca', d: 'Truper, Stanley…' },
} as const

export type CampoExtra = keyof typeof CAMPOS_EXTRA

export type ConfigTienda = {
  campos: CampoExtra[]
  categorias: string[]
  unidades: string[]
  variantes: string[]
  etiquetas: string[]
}

type Rubro = { e: string; n: string } & ConfigTienda

export const RUBROS: Record<string, Rubro> = {
  carniceria: { e: '🥩', n: 'Carnicería', campos: ['descripcion', 'oferta', 'destacado', 'minimo', 'peso'],
    unidades: ['Kg', 'Pieza entera', 'Pack'], categorias: ['Cortes vacunos', 'Cerdo y aves', 'Embutidos', 'Packs parrilleros'],
    variantes: [], etiquetas: ['Madurado', 'Para parrilla'] },
  ferreteria: { e: '🔧', n: 'Ferretería', campos: ['descripcion', 'subcategoria', 'stock', 'oferta', 'marca'],
    unidades: ['Unidad', 'Metro', 'Caja', 'Kg', 'Bolsa'], categorias: ['Herramientas', 'Electricidad', 'Plomería', 'Pinturas', 'Construcción'],
    variantes: [], etiquetas: [] },
  ropa: { e: '👗', n: 'Ropa y accesorios', campos: ['descripcion', 'stock', 'oferta', 'destacado', 'variantes', 'etiquetas'],
    unidades: ['Unidad'], categorias: ['Blusas', 'Vestidos', 'Chaquetas', 'Accesorios'],
    variantes: ['XS', 'S', 'M', 'L', 'XL'], etiquetas: ['Nuevo', 'Más vendido', 'Oferta'] },
  comida: { e: '🍔', n: 'Comida', campos: ['descripcion', 'oferta', 'destacado', 'variantes', 'etiquetas'],
    unidades: ['Plato', 'Porción', 'Combo'], categorias: ['Platos', 'Bebidas', 'Postres'],
    variantes: ['Personal', 'Mediana', 'Familiar'], etiquetas: ['Picante', 'Vegetariano', 'Nuevo'] },
  minimarket: { e: '🛒', n: 'Minimarket', campos: ['subcategoria', 'stock', 'oferta', 'variantes'],
    unidades: ['Unidad', 'Pack', 'Caja'], categorias: ['Bebidas', 'Abarrotes', 'Limpieza', 'Snacks'],
    variantes: ['500 ml', '1 L', '2 L', '3 L'], etiquetas: [] },
  general: { e: '🏪', n: 'General', campos: ['descripcion', 'oferta'],
    unidades: ['Unidad', 'Kg', 'Pack'], categorias: ['General'], variantes: [], etiquetas: [] },
}

export function configDeRubro(rubro: string): ConfigTienda {
  const r = RUBROS[rubro] ?? RUBROS.general
  return {
    campos: [...r.campos], categorias: [...r.categorias], unidades: [...r.unidades],
    variantes: [...r.variantes], etiquetas: [...r.etiquetas],
  }
}

export function leerConfig(raw: unknown, rubro: string): ConfigTienda {
  const base = configDeRubro(rubro)
  const c = (raw && typeof raw === 'object' ? raw : {}) as Partial<ConfigTienda>
  return {
    campos: Array.isArray(c.campos) ? c.campos.filter((k): k is CampoExtra => k in CAMPOS_EXTRA) : base.campos,
    categorias: Array.isArray(c.categorias) ? c.categorias : base.categorias,
    unidades: Array.isArray(c.unidades) && c.unidades.length ? c.unidades : base.unidades,
    variantes: Array.isArray(c.variantes) ? c.variantes : base.variantes,
    etiquetas: Array.isArray(c.etiquetas) ? c.etiquetas : base.etiquetas,
  }
}

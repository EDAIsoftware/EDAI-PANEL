'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ConfigTienda } from '@/lib/rubros'
import { codigoEdai } from '@/lib/utils'

type Producto = {
  id?: string; numero?: number; nombre: string; descripcion: string | null; precio: number | null
  precio_oferta: number | null; categoria: string | null; subcategoria: string | null; unidad: string
  fotos: string[]; disponible: boolean; stock: number | null; destacado: boolean; variantes: string[]
  etiquetas: string[]; minimo: string | null; peso: string | null; codigo: string | null; marca: string | null
  // Inmuebles (agentes)
  operacion?: string | null; zona?: string | null; moneda?: 'BOB' | 'USD'; terreno?: number | null; construido?: number | null
  dormitorios?: number | null; banos?: number | null; parqueos?: number | null; estado_inmueble?: string
}

const OPERACIONES = ['Venta', 'Alquiler', 'Anticrético', 'Preventa']
const ESTADOS_INMUEBLE = ['Disponible', 'Reservado', 'Vendido', 'Alquilado']

// Achica la foto en el navegador antes de subirla (máx. 1000 px, JPG)
function comprimir(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, 1000 / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('foto'))), 'image/jpeg', 0.82)
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => reject(new Error('foto'))
    img.src = URL.createObjectURL(file)
  })
}

export default function ProductoForm({ tiendaId, config, maxFotos, siguiente, prefijo, producto, inmueble = false }: {
  tiendaId: string; config: ConfigTienda; maxFotos: number; siguiente: number; prefijo: string; producto?: Producto; inmueble?: boolean
}) {
  const palabra = inmueble ? 'propiedad' : 'producto'
  const router = useRouter()
  const supabase = createClient()
  const on = (k: ConfigTienda['campos'][number]) => config.campos.includes(k)
  const [p, setP] = useState<Producto>(producto ?? {
    nombre: '', descripcion: null, precio: null, precio_oferta: null, categoria: config.categorias[0] ?? null,
    subcategoria: null, unidad: config.unidades[0] ?? 'Unidad', fotos: [], disponible: true, stock: null,
    destacado: false, variantes: [], etiquetas: [], minimo: null, peso: null, codigo: null, marca: null,
    ...(inmueble ? { operacion: 'Venta', moneda: 'USD' as const, estado_inmueble: 'Disponible' } : {}),
  })
  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [err, setErr] = useState('')
  const set = <K extends keyof Producto>(k: K, v: Producto[K]) => setP((x) => ({ ...x, [k]: v }))
  const num = (v: string) => (v === '' ? null : Number(v))
  const alternar = (k: 'variantes' | 'etiquetas', v: string) =>
    set(k, p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v])

  async function subirFotos(files: FileList | null) {
    if (!files) return
    const libres = maxFotos - p.fotos.length
    const lista = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, libres)
    if (files.length > libres) setErr(`Tu plan permite ${maxFotos} foto(s) por producto; se agregaron ${lista.length}.`)
    setSubiendo(true)
    const nuevas: string[] = []
    for (const f of lista) {
      try {
        const blob = await comprimir(f)
        const ruta = `${tiendaId}/${crypto.randomUUID()}.jpg`
        const { error } = await supabase.storage.from('productos').upload(ruta, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
        if (error) throw error
        nuevas.push(supabase.storage.from('productos').getPublicUrl(ruta).data.publicUrl)
      } catch { setErr('No se pudo subir una foto. Prueba de nuevo.') }
    }
    setP((x) => ({ ...x, fotos: [...x.fotos, ...nuevas].slice(0, maxFotos) }))
    setSubiendo(false)
  }

  async function quitarFoto(url: string) {
    set('fotos', p.fotos.filter((f) => f !== url))
    const ruta = url.split('/productos/')[1]
    if (ruta && !producto?.fotos.includes(url)) await supabase.storage.from('productos').remove([ruta]) // solo si aún no se guardó
  }

  async function guardar() {
    setErr('')
    if (!p.nombre.trim()) return setErr('Escribe el nombre del producto.')
    if (p.precio === null || p.precio < 0) return setErr('Escribe el precio.')
    setGuardando(true)
    const datos = { ...p, nombre: p.nombre.trim(), codigo: p.codigo?.trim() || null, tienda_id: tiendaId }
    delete (datos as Partial<Producto>).id; delete (datos as Partial<Producto>).numero
    const { error } = producto?.id
      ? await supabase.from('productos').update(datos).eq('id', producto.id)
      : await supabase.from('productos').insert(datos)
    setGuardando(false)
    if (error) {
      if (error.code === '23505') return setErr(`Ya tienes otro producto con el código “${p.codigo}”. Usa uno distinto.`)
      return setErr(error.message.includes('plan') ? error.message : 'No se pudo guardar. Revisa los datos.')
    }
    // Borra del almacenamiento las fotos que se quitaron al editar
    const quitadas = (producto?.fotos ?? []).filter((f) => !p.fotos.includes(f)).map((u) => u.split('/productos/')[1]).filter(Boolean)
    if (quitadas.length) await supabase.storage.from('productos').remove(quitadas)
    router.push('/panel/productos'); router.refresh()
  }

  async function eliminar() {
    if (!producto?.id || !confirm('¿Eliminar este producto? Las ventas pasadas se conservan.')) return
    const { error } = await supabase.from('productos').delete().eq('id', producto.id)
    if (error) return setErr('No se pudo eliminar.')
    const rutas = producto.fotos.map((u) => u.split('/productos/')[1]).filter(Boolean)
    if (rutas.length) await supabase.storage.from('productos').remove(rutas)
    router.push('/panel/productos'); router.refresh()
  }

  const pastilla = (activo: boolean) => `rounded-lg border px-3 py-1.5 text-sm ${activo ? 'border-primario bg-primario text-sobreprimario' : 'border-linea bg-sup2'}`

  return (
    <div className="max-w-3xl">
      <h1 className="titulo">{producto ? `Editar ${palabra}` : `Agregar ${palabra}`}</h1>
      <p className="subtitulo">Solo el nombre y el precio son obligatorios</p>
      <div className="caja grid gap-4 p-5 sm:grid-cols-2">
        <div><span className="etiqueta">Código EDAI</span>
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-linea bg-sup2 px-3 py-2.5">
            <b className="tabular-nums">{codigoEdai(prefijo, producto?.numero ?? siguiente)}</b><small className="text-suave">{producto ? 'No cambia nunca' : 'Se asigna al guardar'}</small></div></div>
        <div><label className="etiqueta" htmlFor="cod">Tu código <span className="font-normal">(opcional)</span></label>
          <input id="cod" className="campo" value={p.codigo ?? ''} placeholder="El que usas en tu negocio o de barras" maxLength={40}
            onChange={(e) => set('codigo', e.target.value.trim() ? e.target.value : null)} /></div>
        <div className="sm:col-span-2"><label className="etiqueta" htmlFor="nombre">Nombre</label><input id="nombre" className="campo" value={p.nombre} onChange={(e) => set('nombre', e.target.value)} /></div>
        {inmueble ? (
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <div><label className="etiqueta" htmlFor="moneda">Moneda</label>
              <select id="moneda" className="campo" value={p.moneda ?? 'USD'} onChange={(e) => set('moneda', e.target.value as 'BOB' | 'USD')}><option value="USD">$</option><option value="BOB">Bs.</option></select></div>
            <div><label className="etiqueta" htmlFor="precio">{p.operacion === 'Alquiler' ? 'Precio por mes' : 'Precio'}</label><input id="precio" type="number" min="0" step="1" className="campo" value={p.precio ?? ''} onChange={(e) => set('precio', num(e.target.value))} /></div>
          </div>
        ) : <div><label className="etiqueta" htmlFor="precio">Precio (Bs.)</label><input id="precio" type="number" min="0" step="0.5" className="campo" value={p.precio ?? ''} onChange={(e) => set('precio', num(e.target.value))} /></div>}
        <div><label className="etiqueta" htmlFor="cat">Categoría</label>
          <select id="cat" className="campo" value={p.categoria ?? ''} onChange={(e) => set('categoria', e.target.value)}>
            {config.categorias.map((c) => <option key={c}>{c}</option>)}
          </select></div>
        {inmueble && <>
          <div className="sm:col-span-2"><span className="etiqueta">Operación</span>
            <div className="flex flex-wrap gap-2">{OPERACIONES.map((o) => <button type="button" key={o} className={pastilla(p.operacion === o)} onClick={() => set('operacion', o)}>{o}</button>)}</div></div>
          <div><label className="etiqueta" htmlFor="zona">Zona / barrio</label><input id="zona" className="campo" value={p.zona ?? ''} placeholder="Ej: Equipetrol" onChange={(e) => set('zona', e.target.value || null)} /></div>
          <div><span className="etiqueta">Estado</span>
            <select className="campo" value={p.estado_inmueble ?? 'Disponible'} onChange={(e) => set('estado_inmueble', e.target.value)} aria-label="Estado">{ESTADOS_INMUEBLE.map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-2 sm:col-span-2 sm:grid-cols-5">
            {([['terreno', 'Terreno m²'], ['construido', 'Construido m²'], ['dormitorios', 'Dormitorios'], ['banos', 'Baños'], ['parqueos', 'Parqueos']] as const).map(([k, t]) => (
              <div key={k}><label className="etiqueta" htmlFor={k}>{t}</label><input id={k} type="number" min="0" step={k === 'banos' ? '0.5' : '1'} className="campo" value={p[k] ?? ''} onChange={(e) => set(k, num(e.target.value))} /></div>
            ))}
          </div>
        </>}
        {!inmueble && config.unidades.length > 1 && <div className="sm:col-span-2"><span className="etiqueta">Se vende por</span>
          <div className="flex flex-wrap gap-2">{config.unidades.map((u) => <button type="button" key={u} className={pastilla(p.unidad === u)} onClick={() => set('unidad', u)}>{u}</button>)}</div></div>}

        <div className="sm:col-span-2"><span className="etiqueta">Fotos ({p.fotos.length} de {maxFotos})</span>
          <div className="flex flex-wrap gap-3">
            {p.fotos.map((f, i) => (
              <div key={f} className="relative h-24 w-24 overflow-hidden rounded-lg border border-linea">
                <img src={f} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-acento px-1.5 text-[10.5px] font-bold text-sobreacento">Principal</span>}
                <div className="absolute right-1 top-1 flex gap-1">
                  {i > 0 && <button type="button" aria-label="Hacer principal" className="h-6 w-6 rounded bg-black/65 text-xs text-white" onClick={() => set('fotos', [f, ...p.fotos.filter((x) => x !== f)])}>★</button>}
                  <button type="button" aria-label="Quitar foto" className="h-6 w-6 rounded bg-black/65 text-xs text-white" onClick={() => quitarFoto(f)}>✕</button>
                </div>
              </div>
            ))}
            {p.fotos.length < maxFotos && (
              <label className="grid h-24 w-24 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-linea text-center text-xs text-suave">
                <span>{subiendo ? 'Subiendo…' : <>📷<br />Agregar foto</>}</span>
                <input type="file" accept="image/*" multiple={maxFotos - p.fotos.length > 1} hidden disabled={subiendo} onChange={(e) => { subirFotos(e.target.files); e.target.value = '' }} />
              </label>
            )}
          </div>
          <p className="mt-1.5 text-xs text-suave">Tu plan permite {maxFotos} foto(s) por producto. La primera es la que se ve en la tienda.</p></div>

        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-linea bg-sup2 px-3 py-2.5 sm:col-span-2">
          <span><b className="block">{inmueble ? 'Publicada' : 'Disponible'}</b><small className="text-suave">{inmueble ? 'Apágalo para ocultarla de tu página' : 'Apágalo para ocultarlo de la tienda'}</small></span>
          <input type="checkbox" className="h-5 w-5 accent-acento" checked={p.disponible} onChange={(e) => set('disponible', e.target.checked)} /></label>

        {on('descripcion') && <div className="sm:col-span-2"><label className="etiqueta" htmlFor="desc">Descripción</label><textarea id="desc" className="campo min-h-[70px]" value={p.descripcion ?? ''} onChange={(e) => set('descripcion', e.target.value || null)} /></div>}
        {on('subcategoria') && <div><label className="etiqueta" htmlFor="sub">Subcategoría</label><input id="sub" className="campo" value={p.subcategoria ?? ''} onChange={(e) => set('subcategoria', e.target.value || null)} /></div>}
        {on('stock') && <div><label className="etiqueta" htmlFor="stock">Stock (vacío = no controlar)</label><input id="stock" type="number" min="0" step="any" className="campo" value={p.stock ?? ''} onChange={(e) => set('stock', num(e.target.value))} /></div>}
        {on('oferta') && <div><label className="etiqueta" htmlFor="of">Precio de oferta (Bs.)</label><input id="of" type="number" min="0" step="0.5" className="campo" value={p.precio_oferta ?? ''} onChange={(e) => set('precio_oferta', num(e.target.value))} /></div>}
        {on('minimo') && <div><label className="etiqueta" htmlFor="min">Cantidad mínima</label><input id="min" className="campo" value={p.minimo ?? ''} placeholder="Ej: 0,5 Kg" onChange={(e) => set('minimo', e.target.value || null)} /></div>}
        {on('peso') && <div><label className="etiqueta" htmlFor="peso">Peso aproximado</label><input id="peso" className="campo" value={p.peso ?? ''} placeholder="Ej: 1,8 Kg" onChange={(e) => set('peso', e.target.value || null)} /></div>}
        {on('marca') && <div><label className="etiqueta" htmlFor="marca">Marca</label><input id="marca" className="campo" value={p.marca ?? ''} onChange={(e) => set('marca', e.target.value || null)} /></div>}
        {on('destacado') && <label className="flex cursor-pointer items-center justify-between rounded-lg border border-linea bg-sup2 px-3 py-2.5"><span><b className="block">Destacado</b><small className="text-suave">Sale primero en tu tienda</small></span>
          <input type="checkbox" className="h-5 w-5 accent-acento" checked={p.destacado} onChange={(e) => set('destacado', e.target.checked)} /></label>}
        {on('variantes') && config.variantes.length > 0 && <div className="sm:col-span-2"><span className="etiqueta">Variantes disponibles</span>
          <div className="flex flex-wrap gap-2">{config.variantes.map((v) => <button type="button" key={v} className={pastilla(p.variantes.includes(v))} onClick={() => alternar('variantes', v)}>{v}</button>)}</div></div>}
        {on('etiquetas') && config.etiquetas.length > 0 && <div className="sm:col-span-2"><span className="etiqueta">Etiquetas</span>
          <div className="flex flex-wrap gap-2">{config.etiquetas.map((v) => <button type="button" key={v} className={pastilla(p.etiquetas.includes(v))} onClick={() => alternar('etiquetas', v)}>{v}</button>)}</div></div>}
      </div>

      {err && <p role="alert" className="mt-3 text-malo">{err}</p>}
      <div className="mt-5 flex flex-wrap gap-2">
        {producto && <button type="button" className="btn-borde mr-auto text-malo" onClick={eliminar}>Eliminar</button>}
        <button type="button" className="btn-borde" onClick={() => router.back()}>Cancelar</button>
        <button type="button" className="btn-primario" disabled={guardando || subiendo} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar producto'}</button>
      </div>
    </div>
  )
}

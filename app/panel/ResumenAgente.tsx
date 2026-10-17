import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { codigoEdai, fechaHora, urlTienda, waLink } from '@/lib/utils'
import Copiar from '@/components/Copiar'

type T = { id: string; nombre: string; slug: string; dominio: string | null; prefijo: string }

export default async function ResumenAgente({ tienda }: { tienda: T }) {
  const supabase = await createClient()
  const hace30 = new Date(Date.now() - 30 * 864e5).toISOString()
  const [{ data: props }, { data: vistas }, { data: contactos }, { count: visitas }] = await Promise.all([
    supabase.from('productos').select('id, numero, nombre, estado_inmueble, disponible').eq('tienda_id', tienda.id),
    supabase.from('producto_vistas').select('producto_id, tipo').eq('tienda_id', tienda.id).gte('creado_en', hace30),
    supabase.from('contactos').select('*').eq('tienda_id', tienda.id).order('creado_en', { ascending: false }).limit(5),
    supabase.from('visitas').select('*', { count: 'exact', head: true }).eq('tienda_id', tienda.id).gte('creado_en', hace30),
  ])
  const pagina = urlTienda(tienda.slug, tienda.dominio)
  const activas = (props ?? []).filter((p) => p.disponible && p.estado_inmueble === 'Disponible').length
  const clicks = (vistas ?? []).filter((v) => v.tipo === 'whatsapp').length
  const nuevos = (contactos ?? []).filter((c) => !c.leido).length
  const ranking = (props ?? []).map((p) => ({
    p, vistas: (vistas ?? []).filter((v) => v.producto_id === p.id && v.tipo === 'vista').length,
    wa: (vistas ?? []).filter((v) => v.producto_id === p.id && v.tipo === 'whatsapp').length,
  })).sort((a, b) => b.vistas + b.wa * 3 - (a.vistas + a.wa * 3)).slice(0, 6)

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="titulo">Resumen</h1><p className="subtitulo">Cómo va tu página en los últimos 30 días</p></div>
        <Link href="/panel/productos/nuevo" className="btn-primario">Agregar propiedad</Link>
      </div>
      <div className="caja mb-6 flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1"><b className="block">Tu página</b><small className="break-all text-suave">{pagina}</small></div>
        <a className="btn-borde btn-sm" href={pagina} target="_blank" rel="noopener noreferrer">Ver</a>
        <Copiar texto={pagina} />
        <a className="btn-wa btn-sm" href={waLink('', `Te comparto mis propiedades disponibles: ${pagina}`)} target="_blank" rel="noopener noreferrer">Compartir</a>
      </div>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="caja border-transparent bg-chip p-4"><span className="text-sm text-suave">Visitas a tu página</span><strong className="block text-3xl font-extrabold">{visitas ?? 0}</strong></div>
        <div className="caja p-4"><span className="text-sm text-suave">Clics a WhatsApp</span><strong className="block text-3xl font-extrabold">{clicks}</strong></div>
        <div className="caja p-4"><span className="text-sm text-suave">Contactos sin leer</span><strong className="block text-3xl font-extrabold">{nuevos}</strong></div>
        <div className="caja p-4"><span className="text-sm text-suave">Propiedades disponibles</span><strong className="block text-3xl font-extrabold">{activas}</strong></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-bold">Propiedades más vistas</h2>
          <div className="caja">
            {ranking.length === 0 && <p className="p-4 text-suave">Carga tus propiedades para empezar a medir.</p>}
            {ranking.map(({ p, vistas: v, wa }) => (
              <div key={p.id} className="flex items-center gap-3 border-t border-linea px-4 py-3 first:border-t-0">
                <div className="min-w-0 flex-1"><b className="block truncate">{p.nombre}</b><small className="text-suave">{codigoEdai(tienda.prefijo, p.numero)} · {p.estado_inmueble}</small></div>
                <span className="text-sm text-suave">{v} vistas</span><span className="chip">{wa} WhatsApp</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-suave">Muéstrale estos números al dueño del inmueble: es la prueba de que lo estás promocionando.</p>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-bold">Últimos contactos</h2>
          <div className="caja">
            {(contactos ?? []).length === 0 && <p className="p-4 text-suave">Aquí aparecerán los dueños que quieran vender o alquilar con vos y las consultas por tus propiedades.</p>}
            {(contactos ?? []).map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 border-t border-linea px-4 py-3 first:border-t-0">
                <div className="min-w-0 flex-1"><b className="block">{c.nombre}{!c.leido && <span className="chip-aviso ml-2">Nuevo</span>}</b>
                  <small className="text-suave">{c.tipo === 'captacion' ? `Quiere ${String(c.operacion || 'vender').toLowerCase()} · ${c.inmueble || 'inmueble'}${c.zona ? ' en ' + c.zona : ''}` : 'Consulta por una propiedad'} · {fechaHora(c.creado_en)}</small></div>
                {c.telefono && <a className="btn-wa btn-sm" href={waLink(c.telefono, `Hola ${c.nombre}, soy ${tienda.nombre}. Recibí tu mensaje desde mi página.`)} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
              </div>
            ))}
          </div>
          <Link href="/panel/contactos" className="mt-2 inline-block text-sm text-suave underline">Ver todos los contactos</Link>
        </section>
      </div>
    </>
  )
}

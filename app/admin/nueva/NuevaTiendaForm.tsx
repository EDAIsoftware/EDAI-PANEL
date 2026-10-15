'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { crearTienda, type Resultado } from '../actions'
import AccesoCard from '@/components/AccesoCard'
import { RUBROS } from '@/lib/rubros'
import { PLANES, PLAN_IDS } from '@/lib/planes'
import { ROOT, bs, prefijoDe, slugify } from '@/lib/utils'

export type InicialTienda = { crmId: string; nombre: string; dueno: string; correo: string; whatsapp: string }

export default function NuevaTiendaForm({ inicial }: { inicial?: InicialTienda }) {
  const [res, accion, pend] = useActionState<Resultado, FormData>(crearTienda, null)
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [slug, setSlug] = useState('')
  const [prefijo, setPrefijo] = useState('')

  if (res?.ok) {
    return (
      <div className="max-w-xl">
        <h1 className="titulo">{res.tienda} está lista</h1>
        <p className="subtitulo">Mándale el acceso al dueño. Después puedes ajustar sus productos desde su ficha.</p>
        <AccesoCard a={res} />
        <Link href={`/admin/tiendas/${res.tiendaId}`} className="btn-borde mt-4">Ir a la ficha de la tienda</Link>
      </div>
    )
  }

  return (
    <form action={accion} className="max-w-2xl">
      <h1 className="titulo">Nueva tienda</h1>
      {inicial && <input type="hidden" name="crm_cliente_id" value={inicial.crmId} />}
      {inicial && <p className="mb-4 rounded-lg border border-acento bg-chip px-4 py-2.5 text-sm">Para tu cliente del CRM <b>{inicial.dueno || inicial.nombre}</b>. Al crearla quedará vinculada a su ficha.</p>}
      <p className="subtitulo">Datos del cliente y del rubro. Al crearla se genera su acceso para mandarlo por WhatsApp.</p>
      <div className="caja grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="etiqueta" htmlFor="nombre">Nombre de la tienda</label>
          <input id="nombre" name="nombre" className="campo" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Ferretería El Tornillo" /></div>
        <div><label className="etiqueta" htmlFor="dueno">Dueño</label><input id="dueno" name="dueno" className="campo" defaultValue={inicial?.dueno ?? ''} /></div>
        <div><label className="etiqueta" htmlFor="whatsapp">WhatsApp</label><input id="whatsapp" name="whatsapp" className="campo" inputMode="tel" defaultValue={inicial?.whatsapp || '591'} /></div>
        <div className="sm:col-span-2"><label className="etiqueta" htmlFor="correo">Correo del dueño (será su usuario)</label>
          <input id="correo" name="correo" type="email" className="campo" required placeholder="dueno@gmail.com" defaultValue={inicial?.correo ?? ''} /></div>
        <div className="sm:col-span-2"><label className="etiqueta" htmlFor="slug">Dirección de su tienda</label>
          <div className="flex items-center gap-2"><input id="slug" name="slug" className="campo" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder={slugify(nombre) || 'nombre-tienda'} />
          <span className="whitespace-nowrap text-suave">.{ROOT}</span></div></div>
        <div className="sm:col-span-2"><label className="etiqueta" htmlFor="prefijo">Prefijo de sus códigos de producto</label>
          <div className="flex items-center gap-3"><input id="prefijo" name="prefijo" className="campo max-w-[9rem] uppercase" maxLength={6}
            value={prefijo} onChange={(e) => setPrefijo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder={prefijoDe(nombre || 'Tienda')} />
          <span className="text-sm text-suave">Sus productos se verán como <b className="text-tinta">{(prefijo || prefijoDe(nombre || 'Tienda'))}-0001</b>. No se repite entre tiendas.</span></div></div>
        <div><label className="etiqueta" htmlFor="ciudad">Ciudad</label><input id="ciudad" name="ciudad" className="campo" defaultValue="Santa Cruz" /></div>
        <div><label className="etiqueta" htmlFor="plan">Plan</label>
          <select id="plan" name="plan" className="campo" defaultValue="emprende">
            {PLAN_IDS.map((p) => <option key={p} value={p}>{PLANES[p].nombre} · {bs(PLANES[p].precio)}/mes</option>)}
          </select></div>
        <fieldset className="sm:col-span-2"><legend className="etiqueta">Rubro (define qué campos verá al subir productos)</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(RUBROS).map(([k, r]) => (
              <label key={k} className="flex cursor-pointer items-center gap-2 rounded-lg border border-linea bg-sup2 p-3 has-[:checked]:border-acento">
                <input type="radio" name="rubro" value={k} defaultChecked={k === 'general'} className="accent-acento" />
                <span>{r.e} {r.n}</span>
              </label>
            ))}
          </div></fieldset>
      </div>
      {res && !res.ok && <p role="alert" className="mt-3 text-malo">{res.error}</p>}
      <button className="btn-primario mt-5" disabled={pend}>{pend ? 'Creando…' : 'Crear tienda'}</button>
    </form>
  )
}

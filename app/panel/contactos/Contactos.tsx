'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { codigoEdai, fechaHora, waLink } from '@/lib/utils'

type C = { id: string; tipo: string; nombre: string; telefono: string | null; inmueble: string | null; zona: string | null
  operacion: string | null; mensaje: string | null; producto_id: string | null; leido: boolean; creado_en: string }

export default function Contactos({ inicial, propiedades, agente, prefijo }: {
  inicial: C[]; propiedades: { id: string; numero: number; nombre: string }[]; agente: string; prefijo: string
}) {
  const [lista, setLista] = useState(inicial)
  const [filtro, setFiltro] = useState<'todos' | 'captacion' | 'consulta' | 'nuevos'>('todos')
  const sb = createClient()
  const visibles = lista.filter((c) => filtro === 'todos' || (filtro === 'nuevos' ? !c.leido : c.tipo === filtro))
  const prop = (id: string | null) => propiedades.find((p) => p.id === id)

  async function marcar(c: C, leido: boolean) {
    const { error } = await sb.from('contactos').update({ leido }).eq('id', c.id)
    if (!error) setLista((l) => l.map((x) => (x.id === c.id ? { ...x, leido } : x)))
  }
  async function borrar(c: C) {
    if (!confirm(`¿Eliminar el contacto de ${c.nombre}?`)) return
    const { error } = await sb.from('contactos').delete().eq('id', c.id)
    if (!error) setLista((l) => l.filter((x) => x.id !== c.id))
  }

  return (
    <>
      <h1 className="titulo">Contactos</h1>
      <p className="subtitulo">Dueños que quieren que vendas o alquiles su inmueble, y consultas por tus propiedades</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {([['todos', 'Todos'], ['nuevos', `Sin leer (${lista.filter((c) => !c.leido).length})`], ['captacion', 'Dueños'], ['consulta', 'Consultas']] as const).map(([k, t]) => (
          <button key={k} onClick={() => setFiltro(k)} className={`rounded-full border px-3 py-1 text-sm ${filtro === k ? 'border-primario bg-primario text-sobreprimario' : 'border-linea bg-sup2'}`}>{t}</button>
        ))}
      </div>
      <div className="caja">
        {visibles.length === 0 && <p className="p-5 text-suave">No hay contactos aquí todavía.</p>}
        {visibles.map((c) => {
          const p = prop(c.producto_id)
          return (
            <div key={c.id} className={`flex flex-wrap items-start gap-3 border-t border-linea px-4 py-3 first:border-t-0 ${c.leido ? 'opacity-70' : ''}`}>
              <div className="min-w-0 flex-1">
                <b className="block">{c.nombre} {!c.leido && <span className="chip-aviso ml-1">Nuevo</span>} <span className="chip ml-1">{c.tipo === 'captacion' ? 'Dueño' : 'Consulta'}</span></b>
                <small className="block text-suave">{fechaHora(c.creado_en)}{c.telefono ? ` · ${c.telefono}` : ''}</small>
                {c.tipo === 'captacion' && <small className="block">Quiere {String(c.operacion || 'vender').toLowerCase()} · {c.inmueble || 'inmueble'}{c.zona ? ` en ${c.zona}` : ''}</small>}
                {p && <small className="block">Por: {p.nombre} ({codigoEdai(prefijo, p.numero)})</small>}
                {c.mensaje && <p className="mt-1 whitespace-pre-line text-sm text-suave">“{c.mensaje}”</p>}
              </div>
              {c.telefono && <a className="btn-wa btn-sm" target="_blank" rel="noopener noreferrer"
                href={waLink(c.telefono, `Hola ${c.nombre}, soy ${agente}. Recibí tu mensaje desde mi página${c.tipo === 'captacion' ? ' sobre tu inmueble' : ''}. ¿Cuándo podemos conversar?`)}
                onClick={() => { if (!c.leido) marcar(c, true) }}>WhatsApp</a>}
              <button className="btn-borde btn-sm" onClick={() => marcar(c, !c.leido)}>{c.leido ? 'Marcar sin leer' : 'Marcar leído'}</button>
              <button className="btn-borde btn-sm text-malo" onClick={() => borrar(c)} aria-label="Eliminar">✕</button>
            </div>
          )
        })}
      </div>
    </>
  )
}

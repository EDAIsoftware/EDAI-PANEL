'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Division } from '@/lib/crm'

export default function Ajustes({ tc, divisiones }: { tc: number; divisiones: Division[] }) {
  const router = useRouter()
  const [cambio, setCambio] = useState(String(tc))
  const [nueva, setNueva] = useState('')
  const [msg, setMsg] = useState('')
  const sb = createClient()

  async function guardarCambio() {
    const n = Number(cambio)
    if (!(n > 0)) return setMsg('Escribe un tipo de cambio válido.')
    const { error } = await sb.from('crm_config').update({ tipo_cambio: n }).eq('id', 1)
    setMsg(error ? 'No se pudo guardar.' : 'Tipo de cambio guardado.'); router.refresh()
  }
  async function agregarDivision() {
    if (!nueva.trim()) return
    const { error } = await sb.from('crm_divisiones').insert({ nombre: nueva.trim(), orden: divisiones.length + 1 })
    if (error) return setMsg(error.code === '23505' ? 'Esa división ya existe.' : 'No se pudo agregar.')
    setNueva(''); router.refresh()
  }
  async function renombrar(d: Division) {
    const n = prompt('Nuevo nombre de la división', d.nombre)
    if (!n?.trim() || n === d.nombre) return
    await sb.from('crm_divisiones').update({ nombre: n.trim() }).eq('id', d.id); router.refresh()
  }
  async function borrar(d: Division) {
    if (!confirm(`¿Eliminar "${d.nombre}"? Sus clientes, ventas y servicios quedarán sin división.`)) return
    await sb.from('crm_divisiones').delete().eq('id', d.id); router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <h1 className="titulo">Ajustes del CRM</h1>
      <p className="subtitulo">Tipo de cambio y divisiones de EDAI</p>

      <section className="caja mb-6 p-5">
        <h2 className="font-bold">Tipo de cambio</h2>
        <p className="mb-3 mt-1 text-sm text-suave">Se usa para sumar en bolivianos lo que vendes o gastas en dólares.</p>
        <div className="flex flex-wrap items-center gap-2">
          <span>1 $ =</span><input className="campo w-28" type="number" min="0" step="0.01" value={cambio} onChange={(e) => setCambio(e.target.value)} aria-label="Bolivianos por dólar" /><span>Bs.</span>
          <button className="btn-primario" onClick={guardarCambio}>Guardar</button>
        </div>
      </section>

      <section className="caja p-5">
        <h2 className="font-bold">Divisiones</h2>
        <p className="mb-3 mt-1 text-sm text-suave">Las áreas de negocio de EDAI. Cada cliente, venta y servicio puede pertenecer a una.</p>
        <ul className="mb-4">
          {divisiones.map((d) => (
            <li key={d.id} className="flex items-center gap-2 border-t border-linea py-2.5 first:border-t-0">
              <span className="flex-1">{d.nombre}</span>
              <button className="btn-borde btn-sm" onClick={() => renombrar(d)}>Renombrar</button>
              <button className="btn-borde btn-sm text-malo" onClick={() => borrar(d)}>Eliminar</button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2"><input className="campo" placeholder="Ej: Div. 2: Marketing digital" value={nueva} onChange={(e) => setNueva(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') agregarDivision() }} />
          <button className="btn-primario" onClick={agregarDivision}>Agregar</button></div>
      </section>
      {msg && <p role="status" className="mt-4 text-sm text-chiptinta">{msg}</p>}
    </div>
  )
}

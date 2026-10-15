'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Modal, { Campo } from '@/components/crm/Modal'
import { CATEGORIAS_GASTO, TIPO_COBRO, aBs, dinero, gastoMensual, hoyBolivia, type Gasto, type Moneda, type TipoCobro } from '@/lib/crm'

export default function Gastos({ gastos, tc }: { gastos: Gasto[]; tc: number }) {
  const router = useRouter()
  const [form, setForm] = useState<Partial<Gasto> | null>(null)
  const [err, setErr] = useState('')
  const set = <K extends keyof Gasto>(k: K, v: Gasto[K] | null) => setForm((f) => ({ ...f, [k]: v }))
  const hoy = hoyBolivia()
  const en30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  const mensual = gastos.reduce((a, g) => a + aBs(gastoMensual(g), g.moneda, tc), 0)
  const categorias = Array.from(new Set(gastos.filter((g) => g.activo).map((g) => g.categoria || 'Otros')))

  async function guardar() {
    if (!form?.concepto?.trim()) return setErr('Escribe el concepto.')
    const datos = { concepto: form.concepto.trim(), categoria: form.categoria || null, moneda: form.moneda ?? 'USD', monto: Number(form.monto ?? 0),
      periodicidad: form.periodicidad ?? 'mensual', inicio: form.inicio || null, renovacion: form.renovacion || null, activo: form.activo ?? true, notas: form.notas || null }
    const sb = createClient()
    const { error } = form.id ? await sb.from('crm_gastos').update(datos).eq('id', form.id) : await sb.from('crm_gastos').insert(datos)
    if (error) return setErr('No se pudo guardar.')
    setForm(null); setErr(''); router.refresh()
  }
  async function eliminar() {
    if (!form?.id || !confirm('¿Eliminar este gasto?')) return
    await createClient().from('crm_gastos').delete().eq('id', form.id); setForm(null); router.refresh()
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="titulo">Gastos</h1><p className="subtitulo">Lo que le cuesta a EDAI funcionar cada mes</p></div>
        <button className="btn-primario" onClick={() => setForm({ moneda: 'USD', periodicidad: 'mensual', activo: true, inicio: hoy, categoria: CATEGORIAS_GASTO[0] })}>Nuevo gasto</button>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="caja border-transparent bg-chip p-4"><span className="text-sm text-suave">Gasto mensual</span><strong className="block text-2xl font-extrabold">{dinero(mensual)}</strong><small className="text-suave">anuales divididos en 12</small></div>
        <div className="caja p-4"><span className="text-sm text-suave">Gasto anual</span><strong className="block text-2xl font-extrabold">{dinero(mensual * 12)}</strong></div>
        {categorias.slice(0, 2).map((c) => (
          <div key={c} className="caja p-4"><span className="text-sm text-suave">{c}</span>
            <strong className="block text-2xl font-extrabold">{dinero(gastos.filter((g) => (g.categoria || 'Otros') === c).reduce((a, g) => a + aBs(gastoMensual(g), g.moneda, tc), 0))}</strong><small className="text-suave">por mes</small></div>
        ))}
      </div>
      <div className="caja overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead><tr className="text-[12.5px] text-suave">{['Concepto', 'Monto', 'Por mes (Bs.)', 'Renovación', ''].map((h, i) => <th key={i} className="border-b border-linea px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {gastos.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-suave">Registra tus gastos: herramientas, dominio, hosting, publicidad…</td></tr>}
            {gastos.map((g) => {
              const pronto = g.renovacion && g.renovacion >= hoy && g.renovacion <= en30
              const vencido = g.renovacion && g.renovacion < hoy
              return (
                <tr key={g.id} className={`border-t border-linea hover:bg-sup2 ${g.activo ? '' : 'opacity-50'}`}>
                  <td className="px-4 py-3"><b className="block">{g.concepto}</b><small className="text-suave">{g.categoria}{!g.activo ? ' · dado de baja' : ''}</small></td>
                  <td className="px-4 py-3 tabular-nums">{dinero(g.monto, g.moneda)} <small className="text-suave">{TIPO_COBRO[g.periodicidad].toLowerCase()}</small></td>
                  <td className="px-4 py-3 tabular-nums">{dinero(aBs(gastoMensual(g), g.moneda, tc))}</td>
                  <td className="px-4 py-3">{g.renovacion ? <span className={vencido ? 'chip-malo' : pronto ? 'chip-aviso' : 'chip'}>{g.renovacion}</span> : <span className="text-suave">—</span>}</td>
                  <td className="px-4 py-3 text-right"><button className="btn-borde btn-sm" onClick={() => setForm(g)}>Editar</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal titulo={form.id ? 'Editar gasto' : 'Nuevo gasto'} onCerrar={() => setForm(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etq="Concepto" full><input className="campo" value={form.concepto ?? ''} onChange={(e) => set('concepto', e.target.value)} placeholder="Ej: Vercel Pro" autoFocus /></Campo>
            <Campo etq="Categoría"><input className="campo" list="cats" value={form.categoria ?? ''} onChange={(e) => set('categoria', e.target.value)} /><datalist id="cats">{CATEGORIAS_GASTO.map((c) => <option key={c} value={c} />)}</datalist></Campo>
            <Campo etq="Se paga"><select className="campo" value={form.periodicidad ?? 'mensual'} onChange={(e) => set('periodicidad', e.target.value as TipoCobro)}><option value="mensual">Cada mes</option><option value="anual">Cada año</option><option value="unico">Una sola vez</option></select></Campo>
            <div className="grid grid-cols-[90px_1fr] gap-2">
              <Campo etq="Moneda"><select className="campo" value={form.moneda ?? 'USD'} onChange={(e) => set('moneda', e.target.value as Moneda)}><option value="USD">$</option><option value="BOB">Bs.</option></select></Campo>
              <Campo etq="Monto"><input className="campo" type="number" min="0" step="0.01" value={form.monto ?? ''} onChange={(e) => set('monto', e.target.value === '' ? 0 : Number(e.target.value))} /></Campo>
            </div>
            <Campo etq="Desde"><input className="campo" type="date" value={form.inicio ?? ''} onChange={(e) => set('inicio', e.target.value || null)} /></Campo>
            <Campo etq="Próxima renovación"><input className="campo" type="date" value={form.renovacion ?? ''} onChange={(e) => set('renovacion', e.target.value || null)} /></Campo>
            <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-acento" checked={form.activo ?? true} onChange={(e) => set('activo', e.target.checked)} /> Sigue activo</label>
            <Campo etq="Notas" full><input className="campo" value={form.notas ?? ''} onChange={(e) => set('notas', e.target.value)} /></Campo>
          </div>
          {err && <p role="alert" className="mt-3 text-sm text-malo">{err}</p>}
          <div className="mt-5 flex justify-end gap-2">
            {form.id && <button className="btn-borde mr-auto text-malo" onClick={eliminar}>Eliminar</button>}
            <button className="btn-borde" onClick={() => setForm(null)}>Cancelar</button><button className="btn-primario" onClick={guardar}>Guardar</button>
          </div>
        </Modal>
      )}
    </>
  )
}

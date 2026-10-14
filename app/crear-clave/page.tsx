'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CrearClave() {
  const router = useRouter()
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [err, setErr] = useState('')
  const [cargando, setCargando] = useState(false)
  const largo = a.length >= 8
  const numero = /\d/.test(a)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!largo || !numero) return setErr('La contraseña necesita al menos 8 caracteres y un número.')
    if (a !== b) return setErr('Las contraseñas no coinciden.')
    setCargando(true); setErr('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCargando(false); return setErr('El enlace venció. Pide uno nuevo a EDAI.') }
    const { error } = await supabase.auth.updateUser({ password: a })
    if (error) { setCargando(false); return setErr('No se pudo guardar. Prueba con otra contraseña.') }
    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('user_id', user.id).maybeSingle()
    router.replace(perfil?.rol === 'admin' ? '/admin' : '/panel')
    router.refresh()
  }

  return (
    <main className="grid min-h-screen place-items-center p-5">
      <form onSubmit={guardar} className="caja w-full max-w-sm p-7">
        <h1 className="text-2xl font-extrabold">Crea tu contraseña</h1>
        <p className="mt-1 text-sm text-suave">Con ella entrarás siempre a tu panel.</p>
        <label className="etiqueta mt-5" htmlFor="a">Nueva contraseña</label>
        <input id="a" type="password" autoComplete="new-password" className="campo" value={a} onChange={(e) => setA(e.target.value)} />
        <ul className="mt-2 list-disc pl-5 text-[12.5px] text-suave">
          <li className={largo ? 'text-chiptinta' : ''}>Al menos 8 caracteres</li>
          <li className={numero ? 'text-chiptinta' : ''}>Al menos un número</li>
        </ul>
        <label className="etiqueta mt-4" htmlFor="b">Repite la contraseña</label>
        <input id="b" type="password" autoComplete="new-password" className="campo" value={b} onChange={(e) => setB(e.target.value)} />
        <p role="alert" className="mt-3 min-h-[1.25rem] text-sm text-malo">{err}</p>
        <button className="btn-primario mt-2 w-full" disabled={cargando}>{cargando ? 'Guardando…' : 'Guardar y entrar'}</button>
      </form>
    </main>
  )
}

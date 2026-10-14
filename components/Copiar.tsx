'use client'

import { useState } from 'react'

export default function Copiar({ texto, etiqueta = 'Copiar' }: { texto: string; etiqueta?: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button type="button" className="btn-borde btn-sm" onClick={async () => {
      try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 1500) } catch {}
    }}>{ok ? 'Copiado' : etiqueta}</button>
  )
}

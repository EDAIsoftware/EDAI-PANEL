'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icono from './Icono'

export type ItemMenu = { href: string; texto: string; icono: string; contador?: number; grupo?: string }

export default function MenuLateral({ items }: { items: ItemMenu[] }) {
  const ruta = usePathname() || ''
  // El ítem activo es el que tiene la ruta más larga que coincide
  const activo = items
    .filter((i) => ruta === i.href || ruta.startsWith(i.href + '/') || ruta.endsWith(i.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href
  return (
    <nav className="flex w-full gap-1 overflow-x-auto md:min-h-0 md:flex-1 md:flex-col md:gap-0.5 md:overflow-y-auto md:overflow-x-hidden">
      {items.map((i, n) => {
        const on = i.href === activo
        const titulo = i.grupo && i.grupo !== items[n - 1]?.grupo ? i.grupo : null
        return (
          <div key={i.href} className="contents">
          {titulo && <span className="hidden px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-widest text-suave/70 md:block">{titulo}</span>}
          <Link key={i.href} href={i.href} aria-current={on ? 'page' : undefined}
            className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 transition ${on ? 'bg-sup2 font-bold text-tinta' : 'font-medium text-suave hover:text-tinta'}`}>
            <Icono n={i.icono} />{i.texto}
            {!!i.contador && <span className="ml-auto rounded-md bg-avisofondo px-1.5 text-xs font-bold text-aviso">{i.contador}</span>}
          </Link>
          </div>
        )
      })}
    </nav>
  )
}

import Link from 'next/link'

export type ItemMenu = { href: string; texto: string; icono: string }

export default function Lateral({ marca, sub, items, usuario, pie, logo }: {
  marca: string; sub: string; items: ItemMenu[]; usuario: string; pie?: string; logo?: string | null
}) {
  return (
    <aside className="flex flex-wrap md:flex-nowrap md:flex-col gap-4 md:gap-6 border-b border-linea bg-lateral p-4 md:sticky md:top-0 md:h-screen md:w-60 md:border-b-0 md:border-r md:p-5">
      <div className="flex items-center gap-3 px-1">
        <div className="grid h-10 w-10 flex-none place-items-center overflow-hidden rounded-xl bg-chip font-extrabold text-chiptinta">
          {logo ? <img src={logo} alt="" className="h-full w-full object-contain" /> : marca.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <b className="block truncate leading-tight">{marca}</b>
          <small className="text-xs text-suave">{sub}</small>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto md:flex-col">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 font-medium text-suave hover:bg-sup2 hover:text-tinta">
            <span aria-hidden>{i.icono}</span>{i.texto}
          </Link>
        ))}
      </nav>
      <div className="w-full border-t border-linea pt-3 text-[13px] text-suave md:mt-auto">
        <b className="block break-all font-semibold text-tinta">{usuario}</b>
        {pie && <span>{pie}</span>}
        <form action="/auth/salir" method="post"><button className="mt-1 underline">Cerrar sesión</button></form>
      </div>
    </aside>
  )
}

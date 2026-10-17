import { headers } from 'next/headers'

// En el subdominio o dominio propio la ruta es "/", en localhost o vercel.app es "/t/slug"
export async function baseTienda(slug: string) {
  const host = ((await headers()).get('host') || '').split(':')[0].toLowerCase()
  const local = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app')
  return local ? `/t/${slug}` : ''
}

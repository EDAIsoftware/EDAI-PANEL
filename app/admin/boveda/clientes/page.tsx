import Boveda from '../Boveda'
import { clientesSugeridos } from '@/lib/boveda'

export const dynamic = 'force-dynamic'

export default async function ClavesClientes() {
  return <Boveda seccion="cliente" sugeridas={await clientesSugeridos()} />
}

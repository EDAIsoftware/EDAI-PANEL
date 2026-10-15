import Boveda from '../Boveda'
import { datosBoveda } from '@/lib/boveda'

export const dynamic = 'force-dynamic'

export default async function ClavesClientes({ searchParams }: { searchParams: Promise<{ carpeta?: string }> }) {
  const { carpeta } = await searchParams
  const { sugeridas, crm } = await datosBoveda()
  return <Boveda seccion="cliente" sugeridas={sugeridas} crm={crm} carpetaInicial={carpeta} />
}

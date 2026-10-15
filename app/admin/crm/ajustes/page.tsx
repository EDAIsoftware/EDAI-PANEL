import { baseCrm } from '@/lib/crmDatos'
import Ajustes from './Ajustes'

export default async function PaginaAjustes() {
  const { tc, divisiones } = await baseCrm()
  return <Ajustes tc={tc} divisiones={divisiones} />
}

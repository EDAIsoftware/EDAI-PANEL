import { baseCrm } from '@/lib/crmDatos'
import Servicios from './Servicios'

export default async function PaginaServicios() {
  const { servicios, divisiones, tc } = await baseCrm()
  return <Servicios servicios={servicios} divisiones={divisiones} tc={tc} />
}

import { redirect } from 'next/navigation'

// La raíz del proyecto no tiene contenido propio: tu página de ventas vive en www.edaisoftware.com
export default function Inicio() {
  redirect('/login')
}

// Achica una foto en el navegador antes de subirla (lado mayor en px, JPG)
export function comprimir(file: File, max = 1400, calidad = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('foto'))), 'image/jpeg', calidad)
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => reject(new Error('foto'))
    img.src = URL.createObjectURL(file)
  })
}

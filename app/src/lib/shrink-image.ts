/**
 * Zmenšenie fotky v prehliadači pred odoslaním – Vercel prijme najviac 4,5 MB na požiadavku
 * (server ju aj tak prevedie do WebP). Galéria farností aj fotka na celebret. Len klient.
 */
const CLIENT_MAX_BYTES = 4 * 1024 * 1024

export async function shrinkForUpload(file: File, maxSide = 2400): Promise<File> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
    if (scale === 1 && file.size <= CLIENT_MAX_BYTES && file.type !== 'image/heic') {
      bmp.close()
      return file
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    bmp.close()
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.9))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file // prehliadač formát nevie dekódovať (napr. HEIC v Chrome) – skúsime poslať originál
  }
}

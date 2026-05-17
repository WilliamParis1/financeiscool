export async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Canvas is empty'))), 'image/jpeg', 0.92)
  })
}

// Fetch as local blob first to avoid canvas CORS taint issues
async function loadImage(url) {
  let src = url
  try {
    const res = await fetch(url, { mode: 'cors' })
    const blob = await res.blob()
    src = URL.createObjectURL(blob)
  } catch {
    // fall back to direct URL — works if same-origin or CORS headers present
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

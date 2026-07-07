const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE = 2 * 1024 * 1024 // 2MB

export async function processImageUpload(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed')
  }

  if (file.size > MAX_SIZE) {
    throw new Error('File size exceeds 2MB limit')
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const base64Image = `data:${file.type};base64,${buffer.toString('base64')}`

  const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <image href="${base64Image}" width="512" height="512" preserveAspectRatio="xMidYMid slice" />
</svg>`.trim()

  return `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`
}

import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

const uploadRoot = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads')
const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? ''

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function saveUploadedFile(folder: string, file: File, namePrefix: string) {
  const ext = sanitizeFileName(file.name.split('.').pop() ?? 'bin')
  const fileName = `${sanitizeFileName(namePrefix)}-${Date.now()}.${ext}`
  const relativePath = path.posix.join('uploads', sanitizeFileName(folder), fileName)
  const absolutePath = path.join(uploadRoot, sanitizeFileName(folder), fileName)

  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()))

  const publicPath = `/${relativePath}`
  return {
    absolutePath,
    publicUrl: publicBaseUrl ? new URL(publicPath, publicBaseUrl).toString() : publicPath,
  }
}

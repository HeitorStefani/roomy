import { jwtVerify } from 'jose'
import { NextResponse, type NextRequest } from 'next/server'

const COOKIE_NAME = 'roomy_session'
const PUBLIC_PATHS = ['/login', '/api/nfce', '/api/n8n']

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(path => pathname.startsWith(path))
}

export async function proxy(request: NextRequest) {
  if (isPublic(request.nextUrl.pathname)) return NextResponse.next()

  const token = request.cookies.get(COOKIE_NAME)?.value
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? 'change-me-roomy-session-secret')

  try {
    if (!token) throw new Error('missing session')
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|uploads).*)',
  ],
}

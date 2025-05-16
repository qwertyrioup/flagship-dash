import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { JWT_SEC } from './lib/consts'

// Add paths that don't require authentication
const publicPaths = ['/']

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  const { pathname } = request.nextUrl

  // Allow public paths
  if (publicPaths.includes(pathname)) {
    // If user is authenticated and tries to access root, redirect to dashboard
    if (pathname === '/' && token) {
      try {
        await jwtVerify(token, new TextEncoder().encode(JWT_SEC))
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } catch {
        // Invalid token, allow access to root
        return NextResponse.next()
      }
    }
    return NextResponse.next()
  }

  // Check authentication for protected routes
  if (!token) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  try {
    // Verify token
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SEC))
    
    // If we have the user info in the token payload, we don't need to query the database
    if (payload && payload.email) {
      return NextResponse.next()
    }

    // If token is valid but no email in payload, still allow access
    return NextResponse.next()
  } catch {
    // Invalid token, redirect to root
    const response = NextResponse.redirect(new URL('/', request.url))
    response.cookies.delete('auth_token')
    return response
  }
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 
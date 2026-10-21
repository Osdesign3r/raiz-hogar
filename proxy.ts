// proxy.ts — raíz del proyecto (mismo nivel que package.json).
// Antes middleware.ts: Next 16 renombró la convención a `proxy` (corre en Node).
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isLoginPage  = request.nextUrl.pathname === '/login'
  const isCallback   = request.nextUrl.pathname.startsWith('/auth/callback')

  // No autenticado → redirige a /login
  if (!user && !isLoginPage && !isCallback) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Ya autenticado intenta ir a /login → redirige al home
  if (user && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Excluye estáticos y el service worker. Los dos `*` importan: sin ellos el
    // patrón solo coincidía con rutas de UN carácter (p. ej. "/a") y el proxy
    // nunca corría en ninguna ruta real, o sea, la redirección a /login no existía.
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
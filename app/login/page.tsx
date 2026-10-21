"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Image from "next/image"

// Tiempo máximo antes de asumir que el redirect no va a llegar
// (popup bloqueado, red caída a mitad de OAuth, etc.)
const TIMEOUT_MS = 12_000

function LoginContent() {
  const [loading,  setLoading]  = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const hasError = searchParams.get("error") === "auth"

  const loginConGoogle = async () => {
    setLoading(true)
    setErrorMsg(null)

    // Si en TIMEOUT_MS no redirigió (popup bloqueado, red caída),
    // devolvemos el control al usuario en vez de dejarlo mirando un spinner
    // eterno sin salida.
    const timer = setTimeout(() => {
      setLoading(false)
      setErrorMsg("La ventana de Google no respondió. Inténtalo de nuevo.")
    }, TIMEOUT_MS)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        clearTimeout(timer)
        setLoading(false)
        setErrorMsg("No pudimos conectar con Google. Inténtalo de nuevo.")
      }
      // Si no hay error, la página redirige — el timer queda corriendo pero
      // el componente se desmonta antes de que dispare, sin efecto adverso.
    } catch {
      clearTimeout(timer)
      setLoading(false)
      setErrorMsg("Algo salió mal. Inténtalo de nuevo.")
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden p-6">

      {/* Halo de acento — decorativo */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-[-4rem] h-80 w-80 -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{ background: "var(--accent)" }}
        />
      </div>

      <div className="relative w-full max-w-sm">

        {/* Logo / Brand */}
        <div className="mb-10 text-center">
          <Image
            src="/icon-512.png"
            alt=""
            width={80}
            height={80}
            priority
            className="mx-auto mb-5 rounded-[26px] shadow-2xl shadow-black/50"
          />
          <h1 className="text-4xl font-semibold tracking-wide">LAZO</h1>
          <p className="mt-1.5 text-base text-secondary">Infinitamente conectados</p>
        </div>

        {/* Error OAuth (redirect de vuelta con ?error=auth) o local (timeout / catch) */}
        {(hasError || errorMsg) && (
          <div role="alert" className="card tone-danger mb-5 p-3.5 text-center text-sm text-danger">
            {errorMsg ?? "Algo salió mal al entrar. Inténtalo de nuevo."}
          </div>
        )}

        {/* Google button — blanco, según las guías de marca de Google */}
        <button
          onClick={loginConGoogle}
          disabled={loading}
          className="btn w-full min-h-[52px] bg-white text-[#1f1f28] hover:bg-[#f1f1f5]"
        >
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" aria-hidden="true" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? "Conectando..." : "Entrar con Google"}
        </button>

        <div className="mt-8 space-y-1.5 text-center">
          <p className="text-sm text-secondary">Este hogar es solo de ustedes dos</p>
          <p className="text-sm text-muted">Usamos tu cuenta de Google solo para confirmar quién eres.</p>
        </div>

      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}

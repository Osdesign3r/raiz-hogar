import type { Metadata, Viewport } from "next"
import { Outfit, Nunito_Sans } from "next/font/google"
import SWRegister from "@/components/SWRegister"
import SplashScreen from "@/components/SplashScreen"
import "./globals.css"
import BottomNav from "@/components/BottomNav"
import ThemeProvider from "@/components/ThemeProvider"
import PushNotificationProvider
from "@/components/PushNotificationProvider"
import { ACCENT_BOOT_SCRIPT } from "@/lib/colors"

// Títulos y cifras: Outfit (geométrica, cálida). Cuerpo y formularios: Nunito
// Sans (legible a 16px, redondeada sin ser infantil). Ambas son variables.
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], display: "swap" })
const nunito = Nunito_Sans({ variable: "--font-nunito", subsets: ["latin"], display: "swap" })

export const metadata: Metadata = {
  title: "LAZO",
  manifest: "/manifest.webmanifest",

  // Sin esto, "Agregar a inicio" en iOS no corre en standalone y usa una
  // captura de pantalla en vez de tu ícono — Next.js genera los meta tags
  // apple-mobile-web-app-* automáticamente a partir de este campo.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LAZO",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
}

// themeColor vivía dentro de `metadata` — deprecado desde Next 14, Next.js
// lo ignora silenciosamente ahí. Va en su propio export `viewport`.
// Ahora es el fondo de la app (no el acento) para que la barra de estado se
// funda con la pantalla en vez de pintar una franja violeta.
// viewportFit "cover" habilita env(safe-area-inset-*) en iPhones con notch.
export const viewport: Viewport = {
  themeColor: "#08080D",
  colorScheme: "dark",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Las variables de next/font van en <html>, no en <body>: los tokens de
    // globals.css (--font-display, --font-body) viven en :root y solo ven las
    // variables definidas en ese mismo elemento o en un ancestro.
    // suppressHydrationWarning: el script de arranque cambia el atributo style
    // de <html> (acento del usuario) antes de que React hidrate.
    <html lang="es" className={`${outfit.variable} ${nunito.variable}`} suppressHydrationWarning>
      <head>
        {/* Aplica el acento guardado antes del primer pintado: sin parpadeo */}
        <script dangerouslySetInnerHTML={{ __html: ACCENT_BOOT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <a href="#contenido" className="skip-link">Saltar al contenido</a>
        <ThemeProvider>
          <SWRegister />
          <SplashScreen />
          <PushNotificationProvider/>

          <div id="contenido">{children}</div>
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  )
}

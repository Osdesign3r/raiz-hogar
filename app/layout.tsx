import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import SWRegister from "@/components/SWRegister"
import SplashScreen from "@/components/SplashScreen"
import "./globals.css"
import BottomNav from "@/components/BottomNav"
import ThemeProvider from "@/components/ThemeProvider"
import PushNotificationProvider
from "@/components/PushNotificationProvider"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

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
export const viewport: Viewport = {
  themeColor: "#6C47FF",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <SWRegister />
          <SplashScreen />
          <PushNotificationProvider/>

          {children}
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  )
}

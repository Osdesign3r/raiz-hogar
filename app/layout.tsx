import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import SWRegister from "@/components/SWRegister"
import "./globals.css"
import BottomNav from "@/components/BottomNav"
import ThemeProvider from "@/components/ThemeProvider"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
 
  title: "Nuestro Hogar",

  manifest: "/manifest.webmanifest",

  themeColor: "#2563eb"
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <SWRegister />
          {children}
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  )
}

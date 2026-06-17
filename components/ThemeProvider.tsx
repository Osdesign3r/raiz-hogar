"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { getAccentByValue } from "@/lib/colors"

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const applyTheme = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data: perfil } = await supabase
        .from("perfiles")
        .select("accent_color")
        .eq("id", session.user.id)
        .single()

      const accent = getAccentByValue(perfil?.accent_color ?? "#6C47FF")
      const root = document.documentElement

      root.style.setProperty("--accent-from", accent.from)
      root.style.setProperty("--accent-to", accent.to)
      root.style.setProperty("--accent", accent.value)
    }

    applyTheme()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      applyTheme()
    })

    return () => subscription.unsubscribe()
  }, [])

  return <>{children}</>
}

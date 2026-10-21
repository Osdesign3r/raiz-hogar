import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {

  const m = {

    name: "LAZO",

    short_name: "LAZO",

    description: "Organizador familiar",

    start_url: "/",

    display: "standalone",

    background_color: "#08080D",

    theme_color: "#08080D",

    orientation: "portrait",

    // Esto es lo que hace que LAZO aparezca en la lista de "Compartir" del
    // teléfono cuando mantienes presionado un SMS (o cualquier texto). El
    // sistema operativo manda el texto compartido como querystring a la
    // ruta de `action` — de ahí lo recoge app/finanzas/page.tsx y prellena
    // el formulario de gasto. `method: "GET"` porque solo recibimos texto,
    // no archivos — no hace falta multipart/form-data para esto.
    share_target: {
      action: "/finanzas",
      method: "GET",
      params: {
        title: "titulo",
        text: "text",
        url: "url",
      },
    },

    icons: [

      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },

      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },

  {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },

    ]

  }

  return m as MetadataRoute.Manifest

}
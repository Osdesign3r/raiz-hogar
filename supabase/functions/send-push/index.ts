// supabase/functions/send-push/index.ts
//
// Recibe el webhook de INSERT en `notifications` (vía trigger + pg_net) y
// manda el push real a Firebase Cloud Messaging (HTTP v1). Las credenciales
// de Firebase viven SOLO acá, como secrets de esta función — nunca tocan el
// navegador ni el bundle de Next.js.
//
// No usa verify_jwt de Supabase (el trigger no manda un JWT de usuario) —
// en cambio valida un secreto compartido guardado en vault, mandado como
// header x-webhook-secret. Sin ese header correcto, devuelve 401 y no hace
// nada. Esto es lo que evita que cualquiera con la URL pueda spamear pushes.
//
// Secrets que necesita esta función:
//   FIREBASE_PROJECT_ID
//   FIREBASE_CLIENT_EMAIL
//   FIREBASE_PRIVATE_KEY
//   WEBHOOK_SECRET        (el mismo valor guardado en vault como 'webhook_push_secret')
//
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya vienen inyectados automáticamente
// por el runtime de Edge Functions, no hace falta configurarlos a mano.

import { createClient } from "jsr:@supabase/supabase-js@2"

const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") ?? ""
const FIREBASE_CLIENT_EMAIL = Deno.env.get("FIREBASE_CLIENT_EMAIL") ?? ""
const FIREBASE_PRIVATE_KEY = (Deno.env.get("FIREBASE_PRIVATE_KEY") ?? "").replace(/\\n/g, "\n")
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? ""

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input)
  let str = ""
  bytes.forEach(b => { str += String.fromCharCode(b) })
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemBody = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "")
  const binary = atob(pemBody)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return crypto.subtle.importKey(
    "pkcs8",
    bytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  )
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: "RS256", typ: "JWT" }
  const claims = {
    iss: FIREBASE_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`
  const key = await importPrivateKey(FIREBASE_PRIVATE_KEY)
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  )
  const jwt = `${unsigned}.${base64url(signature)}`

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  })

  if (!res.ok) throw new Error(`No se pudo obtener access token de Google: ${await res.text()}`)
  const data = await res.json()
  return data.access_token
}

async function enviarPush(token: string, titulo: string, mensaje: string, accessToken: string) {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: titulo, body: mensaje },
          webpush: { fcm_options: { link: "/" } },
        },
      }),
    }
  )

  if (!res.ok) {
    const errText = await res.text()
    // Token inválido / app desinstalada — lo borramos para no seguir
    // gastando cuota intentando contra un dispositivo que ya no existe.
    if (res.status === 404 || errText.includes("UNREGISTERED") || errText.includes("NOT_FOUND")) {
      await supabase.from("push_tokens").delete().eq("token", token)
    }
    console.error(`FCM error para token ${token}:`, errText)
    return false
  }
  return true
}

Deno.serve(async (req: Request) => {
  const secretRecibido = req.headers.get("x-webhook-secret")
  if (!WEBHOOK_SECRET || secretRecibido !== WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })
  }

  try {
    const payload = await req.json()
    const record = payload.record

    if (!record?.user_id || !record?.titulo || !record?.mensaje) {
      return new Response(JSON.stringify({ skip: "payload incompleto" }), { status: 200 })
    }

    const { data: tokens, error } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", record.user_id)

    if (error) throw error
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ skip: "sin tokens registrados" }), { status: 200 })
    }

    const accessToken = await getAccessToken()

    const resultados = await Promise.all(
      tokens.map((t: { token: string }) => enviarPush(t.token, record.titulo, record.mensaje, accessToken))
    )

    return new Response(
      JSON.stringify({ enviados: resultados.filter(Boolean).length, total: tokens.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("send-push error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})

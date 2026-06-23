import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Reglas nuevas en esta versión de eslint-config-next, orientadas al
      // futuro compilador de React. Marcan como ERROR el patrón "cargar datos
      // al montar el componente" (useEffect + setState), que es estándar y
      // seguro — no vale la pena bloquear el build por esto hoy. Quedan como
      // warning para no perder la señal, pero sin tumbar el deploy.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Edge Functions son Deno, no Next.js — ESLint con reglas de Next.js
    // no las entiende (ni debería intentarlo).
    "supabase/functions/**",
  ]),
]);

export default eslintConfig;

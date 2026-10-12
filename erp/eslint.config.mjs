import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Camadas puras: sem React, Next, Supabase nem camadas de cima.
  {
    files: [
      "src/dominio/**/*.ts",
      "src/lib/auth/papeis.ts",
      "src/lib/forms.ts",
      "src/lib/formatos/**/*.ts",
      "src/componentes/painel/navegacao.ts",
      "src/componentes/painel/busca-agrupar.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "react",
            "react/*",
            "next",
            "next/*",
            "@supabase/*",
            "@/dados/*",
            "@/acoes/*",
            "@/componentes/ui/*",
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "testes/relatorios/**"]),
]);

export default eslintConfig;

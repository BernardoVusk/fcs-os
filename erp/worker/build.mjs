// Empacota o worker com o código compartilhado do ERP (src/dominio, src/integracoes, src/lib).
// baileys, pg e qrcode ficam externos (instalados na imagem com npm ci --ignore-scripts); o que o
// código do ERP usa (date-fns, zod) entra no pacote a partir de erp/node_modules.
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const raiz = (p) => fileURLToPath(new URL(p, import.meta.url));

await build({
  entryPoints: [raiz("./src/index.ts")],
  outfile: raiz("./dist/index.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  alias: { "@": raiz("../src"), "server-only": raiz("./src/server-only.ts") },
  external: ["baileys", "pg", "qrcode"],
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: "info",
});

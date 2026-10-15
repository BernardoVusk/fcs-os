import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, extname, resolve } from "node:path";

/*
 * Fotos do carrossel da página pública /sorteio.
 * uso: node ferramentas/otimizar-fotos-sorteio.mjs <pasta-com-fotos>
 * Lê jpg, png e webp da pasta, corta em quadrado 640x640 webp em public/sorteio/ e
 * reescreve src/componentes/sorteio/fotos.ts com a lista (a página não lê public/ em runtime).
 */
const origem = process.argv[2];
if (!origem) {
  console.error("uso: node ferramentas/otimizar-fotos-sorteio.mjs <pasta-com-fotos>");
  process.exit(1);
}
let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error("sharp não encontrado em erp/node_modules: rode npm i -D sharp e tente de novo");
  process.exit(1);
}

const destino = resolve("public/sorteio");
mkdirSync(destino, { recursive: true });
for (const f of readdirSync(destino)) if (f.endsWith(".webp")) rmSync(resolve(destino, f));

const arquivos = readdirSync(origem)
  .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
  .sort();
const saidas = [];
for (const [i, f] of arquivos.entries()) {
  const slug =
    basename(f, extname(f))
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "foto";
  const nome = `${String(i + 1).padStart(2, "0")}-${slug}.webp`;
  await sharp(resolve(origem, f))
    .rotate()
    .resize(640, 640, { fit: "cover" })
    .webp({ quality: 78 })
    .toFile(resolve(destino, nome));
  saidas.push(`/sorteio/${nome}`);
}

writeFileSync(
  resolve("src/componentes/sorteio/fotos.ts"),
  `// Gerado por node ferramentas/otimizar-fotos-sorteio.mjs <pasta-com-fotos>. Nao editar a mao.\nexport const FOTOS_SORTEIO: readonly string[] = ${JSON.stringify(saidas, null, 2)};\n`,
);
console.log(
  `${saidas.length} foto(s) em public/sorteio e lista em src/componentes/sorteio/fotos.ts`,
);

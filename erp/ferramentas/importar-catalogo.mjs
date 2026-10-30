import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { carregarEnv, exigirEnv } from "./env.mjs";
import { urlCapa } from "./catalogo.mjs";

/*
 * Importa o catálogo público (/portfolio) a partir do catalogo.json gerado por montar-catalogo.mjs
 * (nomes já limpos e categorias já decididas).
 * uso: node ferramentas/importar-catalogo.mjs <catalogo.json> [--alvo dev|teste] [--limite N] [--refazer-imagens]
 * JSON: { categorias: [{ slug, nome, ordem }], itens: [{ makerworld_id, nome, categoria, capa, url, autor, licenca, colecoes }] }
 * Cada capa é baixada da CDN já em webp, recortada em 600x600 e comprimida ao máximo (bucket do
 * plano gratuito) antes de subir em catalogo/<makerworld_id>.webp. Itens entram por upsert em
 * makerworld_id, então rodar de novo atualiza nome, categoria e licença sem duplicar.
 */
carregarEnv();
const arquivo = process.argv[2];
const opcao = (nome) => {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const alvo = opcao("alvo") ?? "dev";
const limite = Number(opcao("limite") ?? Infinity);
const refazerImagens = process.argv.includes("--refazer-imagens");
if (!arquivo || !["dev", "teste"].includes(alvo)) {
  console.error(
    "uso: node ferramentas/importar-catalogo.mjs <catalogo.json> [--alvo dev|teste] [--limite N] [--refazer-imagens]",
  );
  process.exit(1);
}

const prefixo = alvo === "teste" ? "SUPABASE_TESTE_" : "SUPABASE_";
const admin = createClient(exigirEnv(`${prefixo}URL`), exigirEnv(`${prefixo}SERVICE_ROLE_KEY`), {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-origem": "importacao" } },
});

const dados = JSON.parse(readFileSync(arquivo, "utf8"));
const itens = dados.itens.slice(0, limite);

const { data: categorias, error: erroCategorias } = await admin
  .from("catalogo_categorias")
  .upsert(
    dados.categorias.map(({ slug, nome, ordem }) => ({ slug, nome, ordem })),
    { onConflict: "slug" },
  )
  .select("id, slug");
if (erroCategorias) throw erroCategorias;
const idCategoria = new Map(categorias.map((c) => [c.slug, c.id]));

// Fotos que já estão no bucket, para não baixar e subir de novo.
const existentes = new Map();
for (let offset = 0; ; offset += 1000) {
  const { data, error } = await admin.storage.from("catalogo").list("", { limit: 1000, offset });
  if (error) throw error;
  for (const o of data) existentes.set(o.name, o.metadata?.size ?? 0);
  if (data.length < 1000) break;
}

async function comprimir(capa) {
  const resposta = await fetch(urlCapa(capa), { signal: AbortSignal.timeout(20000) });
  if (!resposta.ok) throw new Error(`capa ${resposta.status}`);
  const original = Buffer.from(await resposta.arrayBuffer());
  return sharp(original)
    .resize(600, 600, { fit: "cover", position: "centre" })
    .webp({ quality: 55, effort: 6, smartSubsample: true })
    .toBuffer();
}

let bytes = 0;
let novas = 0;
const falhas = [];
const prontos = [];

async function processar(item) {
  const caminho = `${item.makerworld_id}.webp`;
  const categoriaId = idCategoria.get(item.categoria);
  if (!categoriaId) throw new Error(`categoria desconhecida: ${item.categoria}`);
  if (refazerImagens || !existentes.has(caminho)) {
    let foto;
    for (let tentativa = 1; ; tentativa++) {
      try {
        foto = await comprimir(item.capa);
        break;
      } catch (e) {
        if (tentativa >= 2) throw e;
      }
    }
    const { error } = await admin.storage
      .from("catalogo")
      .upload(caminho, foto, { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
    if (error) throw error;
    bytes += foto.length;
    novas++;
  } else {
    bytes += existentes.get(caminho);
  }
  prontos.push({
    categoria_id: categoriaId,
    nome: item.nome,
    imagem: caminho,
    makerworld_id: item.makerworld_id,
    fonte_url: item.url ?? null,
    autor: item.autor ?? null,
    licenca: item.licenca ?? null,
    colecoes: item.colecoes ?? [],
  });
}

const fila = [...itens];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let item = fila.shift(); item; item = fila.shift()) {
      try {
        await processar(item);
      } catch (e) {
        falhas.push(`${item.makerworld_id} ${item.nome}: ${e.message}`);
      }
      const feitos = itens.length - fila.length;
      if (feitos % 50 === 0) console.log(`[${alvo}] ${feitos}/${itens.length}`);
    }
  }),
);

for (let i = 0; i < prontos.length; i += 200) {
  const { error } = await admin
    .from("catalogo_itens")
    .upsert(prontos.slice(i, i + 200), { onConflict: "makerworld_id" });
  if (error) throw error;
}

console.log(`[${alvo}] ${prontos.length} itens gravados, ${novas} fotos novas`);
console.log(
  `[${alvo}] fotos: ${(bytes / 1024 / 1024).toFixed(1)} MB no total, média ${prontos.length ? Math.round(bytes / prontos.length / 1024) : 0} KB`,
);
if (falhas.length) {
  console.log(`[${alvo}] ${falhas.length} falha(s):`);
  for (const f of falhas) console.log(`  ${f}`);
}

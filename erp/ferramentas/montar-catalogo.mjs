import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { CATEGORIAS, classificar, limparNome } from "./catalogo.mjs";

/*
 * Monta o catalogo.json que o importar-catalogo.mjs grava no banco.
 * uso: node ferramentas/montar-catalogo.mjs <colecoes.json> [--relatorio]
 * Entrada: a coleta bruta do MakerWorld (Chrome logado). Ao lado dela, nomes-corrigidos.json
 * ({ "<makerworld_id>": "Nome" }) sobrepõe nomes que a limpeza automática não resolve, e
 * categorias-corrigidas.json ({ "<makerworld_id>": "<slug>" }) sobrepõe a classificação, e
 * licencas.json ({ "<makerworld_id>": "Licença" ou null }) traz a licença lida modelo a modelo.
 * Saída: catalogo.json na mesma pasta.
 */
const entrada = process.argv[2];
if (!entrada) {
  console.error("uso: node ferramentas/montar-catalogo.mjs <colecoes.json> [--relatorio]");
  process.exit(1);
}
const pasta = dirname(resolve(entrada));
const lerOpcional = (nome) => {
  const caminho = resolve(pasta, nome);
  return existsSync(caminho) ? JSON.parse(readFileSync(caminho, "utf8")) : {};
};
const nomesCorrigidos = lerOpcional("nomes-corrigidos.json");
const categoriasCorrigidas = lerOpcional("categorias-corrigidas.json");
const licencas = lerOpcional("licencas.json");
const slugs = new Set(CATEGORIAS.map((c) => c.slug));
for (const [id, slug] of Object.entries(categoriasCorrigidas)) {
  if (!slugs.has(slug))
    throw new Error(`categorias-corrigidas.json: categoria desconhecida ${slug} em ${id}`);
}

const bruto = JSON.parse(readFileSync(entrada, "utf8"));
const itens = bruto.itens.map((i) => {
  const nome = nomesCorrigidos[i.makerworld_id] ?? limparNome(i.nome);
  return {
    makerworld_id: i.makerworld_id,
    nome,
    categoria: categoriasCorrigidas[i.makerworld_id] ?? classificar(nome, i.categoria),
    capa: i.capa,
    url: i.url,
    autor: i.autor ?? null,
    licenca: licencas[i.makerworld_id] ?? i.licenca ?? null,
    colecoes: i.colecoes ?? [],
  };
});

const vazios = itens.filter((i) => !i.nome);
if (vazios.length)
  throw new Error(`nome vazio depois da limpeza: ${vazios.map((i) => i.makerworld_id).join(", ")}`);

writeFileSync(
  resolve(pasta, "catalogo.json"),
  JSON.stringify({ categorias: CATEGORIAS, itens }, null, 1),
);

const contagem = Object.fromEntries(CATEGORIAS.map((c) => [c.slug, 0]));
for (const i of itens) contagem[i.categoria]++;
console.log(`${itens.length} itens`);
for (const c of CATEGORIAS) console.log(`  ${c.nome}: ${contagem[c.slug]}`);
if (process.argv.includes("--relatorio")) {
  for (const c of CATEGORIAS) {
    console.log(`\n## ${c.nome}`);
    console.log(
      itens
        .filter((i) => i.categoria === c.slug)
        .map((i) => `${i.makerworld_id} ${i.nome}`)
        .join("\n"),
    );
  }
}

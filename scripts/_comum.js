/**
 * Peças compartilhadas pelos scripts de publicação do VuskVS.
 * Sem dependência externa — só Node 20+ (fetch nativo).
 */

const { readFile, readdir } = require("node:fs/promises");
const path = require("node:path");

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v21.0"}`;

function morrer(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function exigir(nome) {
  const valor = process.env[nome];
  if (!valor) morrer(`${nome} não encontrada. Confere o .env na raiz do projeto.`);
  return valor;
}

/** Deriva o slug do nome da pasta: "conservar-carne-2026-05-12" → "conservar-carne" */
function slugDaPasta(pastaConteudo) {
  const base = path.basename(pastaConteudo.replace(/[\\/]+$/, ""));
  return base.replace(/-\d{4}-\d{2}-\d{2}$/, "");
}

/** Lê a legenda e a lista de slides de uma pasta de conteúdo. */
async function lerConteudo(pastaConteudo) {
  if (!pastaConteudo) {
    morrer("Falta o caminho da pasta. Ex: marketing/conteudo/meu-tema-2026-05-12");
  }

  const legenda = await readFile(path.join(pastaConteudo, "legenda.md"), "utf8").catch(() =>
    morrer(`Não achei legenda.md em ${pastaConteudo}`)
  );

  const pastaSlides = path.join(pastaConteudo, "instagram");
  const arquivos = await readdir(pastaSlides).catch(() =>
    morrer(`Não achei ${pastaSlides}. Renderiza os PNGs antes: node render.js`)
  );

  // Ordem numérica, não lexical: sem isso "slide-10" viria antes de "slide-2".
  const numero = (f) => parseInt(f.match(/\d+/)[0], 10);
  const slides = arquivos
    .filter((f) => /^slide-\d+\.png$/i.test(f))
    .sort((a, b) => numero(a) - numero(b));

  if (slides.length < 2 || slides.length > 10) {
    morrer(`Carrossel aceita de 2 a 10 slides. Achei ${slides.length} em ${pastaSlides}.`);
  }

  return { slug: slugDaPasta(pastaConteudo), legenda: legenda.trim(), slides };
}

/** URL pública do slide — a Meta busca a imagem por URL, não aceita upload de arquivo. */
function urlDoSlide(slug, arquivo) {
  const site = exigir("SITE_URL").replace(/\/$/, "");
  return `${site}/img/posts/${slug}/${arquivo}`;
}

/** Chamada à Graph API com erro legível em vez de stack trace. */
async function graph(caminho, params = {}, metodo = "POST") {
  const qs = new URLSearchParams(params);
  const url = metodo === "GET" ? `${GRAPH}/${caminho}?${qs}` : `${GRAPH}/${caminho}`;
  const opcoes = metodo === "GET" ? { method: "GET" } : { method: "POST", body: qs };

  const resposta = await fetch(url, opcoes).catch((e) =>
    morrer(`Falha de rede ao chamar a Graph API: ${e.message}`)
  );
  const json = await resposta.json().catch(() => ({}));

  if (!resposta.ok || json.error) {
    const detalhe = json.error ? json.error.message : JSON.stringify(json);
    morrer(`Graph API (${caminho}) respondeu ${resposta.status}:\n${detalhe}`);
  }
  return json;
}

module.exports = { morrer, exigir, graph, lerConteudo, urlDoSlide, slugDaPasta };

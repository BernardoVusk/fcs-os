#!/usr/bin/env node
/**
 * Publica o carrossel como post multi-foto numa Página do Facebook.
 * Usado pela skill /aprovar-post (passo 8).
 *
 * Uso:
 *   node --env-file=.env scripts/postar-facebook.js marketing/conteudo/<slug>-<data>
 *
 * Precisa no .env: META_PAGE_ID, META_PAGE_ACCESS_TOKEN, SITE_URL
 *
 * O Facebook não tem "carrossel" orgânico como o Instagram: o equivalente é
 * subir cada foto sem publicar e amarrar todas num único post do feed.
 */

const { morrer, exigir, graph, lerConteudo, urlDoSlide } = require("./_comum.js");

async function main() {
  const token = exigir("META_PAGE_ACCESS_TOKEN");
  const pageId = exigir("META_PAGE_ID");

  const { slug, legenda, slides } = await lerConteudo(process.argv[2]);
  console.log(`→ Facebook: ${slides.length} slides do tema "${slug}"`);

  // 1. Sobe cada foto sem publicar
  const anexos = [];
  for (const arquivo of slides) {
    const { id } = await graph(`${pageId}/photos`, {
      url: urlDoSlide(slug, arquivo),
      published: "false",
      access_token: token,
    });
    console.log(`  ✓ ${arquivo}`);
    anexos.push({ media_fbid: id });
  }

  // 2. Publica um post único com todas as fotos anexadas
  const { id: postId } = await graph(`${pageId}/feed`, {
    message: legenda,
    attached_media: JSON.stringify(anexos),
    access_token: token,
  });

  console.log(`\n✓ Publicado no Facebook: https://facebook.com/${postId}`);
  console.log(`POST_ID=${postId}`);
}

main().catch((e) => morrer(e.message));

#!/usr/bin/env node
/**
 * Publica um carrossel no Instagram via Meta Graph API.
 * Usado pela skill /aprovar-post (passo 7).
 *
 * Uso:
 *   node --env-file=.env scripts/postar-instagram.js marketing/conteudo/<slug>-<data>
 *
 * Precisa no .env: META_IG_USER_ID, META_PAGE_ACCESS_TOKEN, SITE_URL
 *
 * Atenção: a Meta busca as imagens por URL pública. Os PNGs precisam estar
 * no ar em <SITE_URL>/img/posts/<slug>/ ANTES de rodar isso.
 */

const { morrer, exigir, graph, lerConteudo, urlDoSlide } = require("./_comum.js");

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/** A Meta processa o carrossel de forma assíncrona — publicar antes da hora falha. */
async function esperarProcessar(containerId, token) {
  process.stdout.write("→ Aguardando a Meta processar");

  for (let tentativa = 0; tentativa < 30; tentativa++) {
    const { status_code } = await graph(
      containerId,
      { fields: "status_code", access_token: token },
      "GET"
    );

    if (status_code === "FINISHED") {
      console.log(" pronto.");
      return;
    }
    if (status_code === "ERROR") {
      morrer("A Meta rejeitou o carrossel. Confere se os PNGs estão acessíveis publicamente.");
    }

    process.stdout.write(".");
    await espera(3000);
  }

  morrer("Timeout: o carrossel não ficou pronto em 90s.");
}

async function main() {
  const token = exigir("META_PAGE_ACCESS_TOKEN");
  const igUser = exigir("META_IG_USER_ID");

  const { slug, legenda, slides } = await lerConteudo(process.argv[2]);
  console.log(`→ Instagram: ${slides.length} slides do tema "${slug}"`);

  // 1. Um container por slide
  const filhos = [];
  for (const arquivo of slides) {
    const { id } = await graph(`${igUser}/media`, {
      image_url: urlDoSlide(slug, arquivo),
      is_carousel_item: "true",
      access_token: token,
    });
    console.log(`  ✓ ${arquivo}`);
    filhos.push(id);
  }

  // 2. Container do carrossel, com a legenda
  const { id: carrossel } = await graph(`${igUser}/media`, {
    media_type: "CAROUSEL",
    children: filhos.join(","),
    caption: legenda,
    access_token: token,
  });

  // 3. Esperar o processamento
  await esperarProcessar(carrossel, token);

  // 4. Publicar
  const { id: postId } = await graph(`${igUser}/media_publish`, {
    creation_id: carrossel,
    access_token: token,
  });

  // 5. Pegar o link do post
  const { permalink } = await graph(
    postId,
    { fields: "permalink", access_token: token },
    "GET"
  );

  console.log(`\n✓ Publicado no Instagram: ${permalink || postId}`);
  console.log(`POST_ID=${postId}`);
}

main().catch((e) => morrer(e.message));

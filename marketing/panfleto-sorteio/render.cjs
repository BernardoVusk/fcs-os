// Renderiza panfleto.html em PDF (106 x 156 mm, 2 paginas) e em PNG a 300 dpi (frente.png, verso.png).
// Uso: NODE_PATH="<caminho>/erp/node_modules" node render.cjs
"use strict";
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const DIR = __dirname;
const MM_CSS = 96 / 25.4;            // px CSS por mm
const SCALE = 300 / 96;              // 3.125: 96 dpi -> 300 dpi
const SAFE_MM = 8;                   // area segura: 5 mm + 3 mm de sangria

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 520, height: 720 },
    deviceScaleFactor: SCALE,
  });
  const page = await ctx.newPage();
  page.on("console", (m) => console.log("[pagina]", m.text()));
  page.on("requestfailed", (r) => console.log("[falhou]", r.url(), r.failure() && r.failure().errorText));

  const url = "file:///" + path.join(DIR, "panfleto.html").replace(/\\/g, "/");
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  // Tira a moldura de pre-visualizacao de tela: as faces ficam coladas em (0,0) sobre preto,
  // assim o recorte do screenshot nunca pega pixel cinza na borda.
  await page.addStyleTag({ content: "body{padding:0;background:#0A0A0A}.face{margin:0}" });

  const fontes = await page.evaluate(() => ({
    chakra600: document.fonts.check('600 16px "Chakra Petch"'),
    chakra700: document.fonts.check('700 16px "Chakra Petch"'),
    poppins400: document.fonts.check('400 16px "Poppins"'),
    poppins500: document.fonts.check('500 16px "Poppins"'),
    carregadas: [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.weight}`),
  }));
  console.log("Fontes:", JSON.stringify(fontes));

  // Checagem de layout: tamanho da face, transbordo e area segura.
  const checagem = await page.evaluate(({ MM, SAFE }) => {
    const saida = [];
    document.querySelectorAll(".face").forEach((face) => {
      const fr = face.getBoundingClientRect();
      const rel = {
        face: face.classList[1],
        largura_mm: +(fr.width / MM).toFixed(2),
        altura_mm: +(fr.height / MM).toFixed(2),
        transbordo_px: Math.max(0, face.scrollHeight - face.clientHeight, face.scrollWidth - face.clientWidth),
        fora_da_area_segura: [],
        texto_cortado: [],
      };
      face.querySelectorAll("*").forEach((el) => {
        if (el.closest(".deco")) return;
        const temTexto = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        const ehCaixa = el.tagName === "IMG" || ["card", "qr-moldura", "regua"].some((c) => el.classList.contains(c));
        if (!temTexto && !ehCaixa) return;
        const r = el.getBoundingClientRect();
        const m = {
          esq: +((r.left - fr.left) / MM).toFixed(2),
          topo: +((r.top - fr.top) / MM).toFixed(2),
          dir: +((fr.right - r.right) / MM).toFixed(2),
          base: +((fr.bottom - r.bottom) / MM).toFixed(2),
        };
        const nome = el.tagName.toLowerCase() + (el.className ? "." + String(el.className).split(" ")[0] : "");
        if (Math.min(m.esq, m.topo, m.dir, m.base) < SAFE - 0.05) rel.fora_da_area_segura.push({ el: nome, ...m });
        if (el.scrollWidth > el.clientWidth + 1) rel.texto_cortado.push({ el: nome, sobra_px: el.scrollWidth - el.clientWidth });
      });
      saida.push(rel);
    });
    const crop = document.querySelector(".qr-crop").getBoundingClientRect();
    const tile = document.querySelector(".qr-tile").getBoundingClientRect();
    const moldura = document.querySelector(".qr-moldura").getBoundingClientRect();
    saida.push({
      qr_modulos_mm: +(crop.width / MM).toFixed(2),
      tile_branco_mm: +(tile.width / MM).toFixed(2),
      moldura_mm: +(moldura.width / MM).toFixed(2),
      qr_modulos_px_300dpi: Math.round((crop.width / MM) * (300 / 25.4)),
    });
    return saida;
  }, { MM: MM_CSS, SAFE: SAFE_MM });
  console.log("Layout:", JSON.stringify(checagem, null, 2));

  // PNGs a 300 dpi
  await page.locator(".face.frente").screenshot({ path: path.join(DIR, "frente.png") });
  await page.locator(".face.verso").screenshot({ path: path.join(DIR, "verso.png") });

  // PDF com tamanho de pagina do CSS (106 x 156 mm)
  const pdfPath = path.join(DIR, "panfleto.pdf");
  await page.pdf({
    path: pdfPath,
    width: "106mm",
    height: "156mm",
    printBackground: true,
    preferCSSPageSize: true,
  });
  const pdf = fs.readFileSync(pdfPath).toString("latin1");
  const paginas = (pdf.match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
  console.log("PDF:", pdfPath, "paginas:", paginas);

  await browser.close();
})().catch((e) => {
  console.error("Falhou:", e);
  process.exit(1);
});

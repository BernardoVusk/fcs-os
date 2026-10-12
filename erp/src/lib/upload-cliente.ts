/** Lado do navegador do upload direto: PUT na URL assinada do Storage e SHA-256 do arquivo. */

export async function enviarParaUrlAssinada(
  url: string,
  arquivo: File,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  try {
    const r = await fetch(url, {
      method: "PUT",
      body: arquivo,
      headers: {
        "content-type": arquivo.type || "application/octet-stream",
        "x-upsert": "false",
      },
    });
    if (r.ok) return { ok: true };
    const texto = await r.text().catch(() => "");
    return { ok: false, erro: /mime|type/i.test(texto) ? "arquivo_tipo" : "erro_inesperado" };
  } catch {
    return { ok: false, erro: "erro_inesperado" };
  }
}

/** SHA-256 em hexadecimal, calculado no navegador (até 100 MB cabe em memória). */
export async function sha256DoArquivo(arquivo: File): Promise<string | null> {
  try {
    const digest = await crypto.subtle.digest("SHA-256", await arquivo.arrayBuffer());
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

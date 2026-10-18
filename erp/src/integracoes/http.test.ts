import { describe, expect, it } from "vitest";
import {
  baixarArquivo,
  hostPermitido,
  ipPrivado,
  requisitarJson,
  resolverLinkCurto,
  validarUrl,
} from "./http";

const HOSTS = ["shopee.com.br", "s.shopee.com.br", "shope.ee"];
const publico = async () => ["8.8.8.8"];

function resposta(status: number, headers: Record<string, string> = {}, corpo = "") {
  return new Response(status === 204 || (status >= 300 && status < 400) ? null : corpo, {
    status,
    headers,
  });
}

describe("validarUrl", () => {
  it("aceita https de host da lista e subdomínio", () => {
    expect(validarUrl("https://shopee.com.br/produto-i.1.2", HOSTS).ok).toBe(true);
    expect(validarUrl("https://www.shopee.com.br/x", HOSTS).ok).toBe(true);
  });
  it("recusa http, domínio parecido, IP literal, porta e credencial na URL", () => {
    expect(validarUrl("http://shopee.com.br/x", HOSTS)).toEqual({
      ok: false,
      erro: "url_nao_https",
    });
    expect(validarUrl("https://shopee.com.br.evil.com/x", HOSTS)).toEqual({
      ok: false,
      erro: "dominio_nao_permitido",
    });
    expect(validarUrl("https://evilshopee.com.br/x", HOSTS).ok).toBe(false);
    expect(validarUrl("https://127.0.0.1/x", HOSTS).ok).toBe(false);
    expect(validarUrl("https://[::1]/x", HOSTS).ok).toBe(false);
    expect(validarUrl("https://shopee.com.br:8443/x", HOSTS).ok).toBe(false);
    expect(validarUrl("https://user:senha@shopee.com.br/x", HOSTS).ok).toBe(false);
    expect(validarUrl("não é url", HOSTS)).toEqual({ ok: false, erro: "url_invalida" });
  });
  it("hostPermitido respeita a fronteira do ponto", () => {
    expect(hostPermitido("SHOPEE.COM.BR.", HOSTS)).toBe(true);
    expect(hostPermitido("xshopee.com.br", HOSTS)).toBe(false);
  });
});

describe("ipPrivado", () => {
  it("marca faixas internas, loopback e link-local", () => {
    for (const ip of [
      "10.0.0.1",
      "127.0.0.1",
      "169.254.169.254",
      "172.16.0.1",
      "192.168.1.1",
      "100.64.0.1",
      "0.0.0.0",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:10.0.0.1",
    ])
      expect(ipPrivado(ip), ip).toBe(true);
    expect(ipPrivado("8.8.8.8")).toBe(false);
    expect(ipPrivado("2001:4860:4860::8888")).toBe(false);
  });
});

describe("resolverLinkCurto", () => {
  it("segue saltos permitidos até a URL final", async () => {
    const buscar = (async (u: URL | string) => {
      const s = String(u);
      if (s.startsWith("https://s.shopee.com.br/"))
        return resposta(302, { location: "https://shopee.com.br/produto-i.10.20?x=1" });
      return resposta(200);
    }) as typeof fetch;
    const r = await resolverLinkCurto("https://s.shopee.com.br/abc", {
      hosts: HOSTS,
      buscar,
      resolver: publico,
    });
    expect(r).toEqual({
      ok: true,
      final: "https://shopee.com.br/produto-i.10.20?x=1",
      saltos: ["https://s.shopee.com.br/abc"],
    });
  });
  it("recusa salto para fora da lista e loop de redirecionamento", async () => {
    const fora = (async () =>
      resposta(301, { location: "https://evil.com/roubo" })) as typeof fetch;
    expect(
      await resolverLinkCurto("https://shope.ee/a", {
        hosts: HOSTS,
        buscar: fora,
        resolver: publico,
      }),
    ).toEqual({ ok: false, erro: "dominio_nao_permitido" });
    const loop = (async () => resposta(302, { location: "https://shope.ee/a" })) as typeof fetch;
    expect(
      await resolverLinkCurto("https://shope.ee/a", {
        hosts: HOSTS,
        buscar: loop,
        resolver: publico,
      }),
    ).toEqual({ ok: false, erro: "muitos_redirecionamentos" });
  });
  it("recusa host que resolve para IP privado", async () => {
    const r = await resolverLinkCurto("https://shope.ee/a", {
      hosts: HOSTS,
      buscar: (async () => resposta(200)) as typeof fetch,
      resolver: async () => ["10.0.0.5"],
    });
    expect(r).toEqual({ ok: false, erro: "endereco_privado" });
  });
});

describe("requisitarJson e baixarArquivo", () => {
  it("lê JSON e recusa corpo acima do limite", async () => {
    const buscar = (async () => resposta(200, {}, JSON.stringify({ a: 1 }))) as typeof fetch;
    expect(
      await requisitarJson(
        "https://shopee.com.br/api",
        {},
        { hosts: HOSTS, buscar, resolver: publico },
      ),
    ).toEqual({ ok: true, status: 200, dados: { a: 1 } });
    const grande = (async () => resposta(200, {}, "x".repeat(2000))) as typeof fetch;
    expect(
      await requisitarJson(
        "https://shopee.com.br/api",
        {},
        { hosts: HOSTS, buscar: grande, resolver: publico, maxBytes: 100 },
      ),
    ).toMatchObject({ ok: false, erro: "resposta_grande" });
  });
  it("tempo esgotado vira erro próprio", async () => {
    const lento = (async () => {
      throw Object.assign(new Error("t"), { name: "TimeoutError" });
    }) as typeof fetch;
    expect(
      await requisitarJson(
        "https://shopee.com.br/api",
        {},
        { hosts: HOSTS, buscar: lento, resolver: publico },
      ),
    ).toEqual({ ok: false, erro: "tempo_esgotado" });
  });
  it("baixa imagem só com tipo permitido", async () => {
    const png = (async () => resposta(200, { "content-type": "image/png" }, "PNG")) as typeof fetch;
    const r = await baixarArquivo("https://shopee.com.br/i.png", {
      hosts: HOSTS,
      buscar: png,
      resolver: publico,
      tipos: ["image/png"],
    });
    expect(r.ok && r.dados.toString()).toBe("PNG");
    const html = (async () =>
      resposta(200, { "content-type": "text/html" }, "<html>")) as typeof fetch;
    expect(
      await baixarArquivo("https://shopee.com.br/i.png", {
        hosts: HOSTS,
        buscar: html,
        resolver: publico,
        tipos: ["image/png"],
      }),
    ).toEqual({ ok: false, erro: "tipo_nao_permitido" });
  });
});

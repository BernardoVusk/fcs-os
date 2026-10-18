import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { hostNaLista } from "@/dominio/ofertas/plataformas";

/**
 * Saída HTTP do módulo de ofertas (ERP e worker). Toda URL vinda de usuário ou de mensagem
 * passa por aqui: só https, só hosts da lista da plataforma, nenhum IP privado depois do DNS,
 * redirecionamento seguido à mão (cada salto revalidado), tempo limite e corpo limitado.
 * Resta a janela entre o DNS daqui e o do fetch (rebinding); como só hosts de marketplaces
 * conhecidos passam pela lista, o risco fica aceito e documentado em docs/arquitetura.md.
 */

export type ErroHttp =
  | "url_invalida"
  | "url_nao_https"
  | "dominio_nao_permitido"
  | "endereco_privado"
  | "muitos_redirecionamentos"
  | "tempo_esgotado"
  | "falha_rede"
  | "resposta_grande"
  | "resposta_invalida"
  | "tipo_nao_permitido";

export type Resolvedor = (host: string) => Promise<string[]>;
export type Opcoes = {
  hosts: readonly string[];
  tempoMs?: number;
  maxBytes?: number;
  buscar?: typeof fetch;
  resolver?: Resolvedor;
};

const resolverPadrao: Resolvedor = async (host) =>
  (await lookup(host, { all: true, verbatim: true })).map((r) => r.address);

export const hostPermitido = hostNaLista;

export function validarUrl(
  entrada: string,
  lista: readonly string[],
): { ok: true; url: URL } | { ok: false; erro: ErroHttp } {
  let url: URL;
  try {
    url = new URL(entrada.trim());
  } catch {
    return { ok: false, erro: "url_invalida" };
  }
  if (url.protocol !== "https:") return { ok: false, erro: "url_nao_https" };
  if (url.username || url.password) return { ok: false, erro: "url_invalida" };
  if (url.port && url.port !== "443") return { ok: false, erro: "url_invalida" };
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return { ok: false, erro: "dominio_nao_permitido" };
  if (!hostPermitido(host, lista)) return { ok: false, erro: "dominio_nao_permitido" };
  return { ok: true, url };
}

function v4Privado(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

export function ipPrivado(ip: string): boolean {
  const tipo = isIP(ip);
  if (tipo === 4) return v4Privado(ip);
  if (tipo !== 6) return true;
  const v = ip.toLowerCase();
  const mapeado = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapeado) return v4Privado(mapeado[1]);
  return v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith("ff");
}

async function destinoPublico(host: string, resolver: Resolvedor): Promise<boolean> {
  try {
    const ips = await resolver(host);
    return ips.length > 0 && ips.every((ip) => !ipPrivado(ip));
  } catch {
    return false;
  }
}

async function preparar(
  entrada: string,
  o: Opcoes,
): Promise<{ ok: true; url: URL } | { ok: false; erro: ErroHttp }> {
  const v = validarUrl(entrada, o.hosts);
  if (!v.ok) return v;
  if (!(await destinoPublico(v.url.hostname, o.resolver ?? resolverPadrao)))
    return { ok: false, erro: "endereco_privado" };
  return v;
}

function erroDeRede(e: unknown): ErroHttp {
  const nome = (e as { name?: string })?.name;
  return nome === "TimeoutError" || nome === "AbortError" ? "tempo_esgotado" : "falha_rede";
}

async function lerCorpo(r: Response, maxBytes: number): Promise<Buffer | null> {
  if (!r.body) return Buffer.alloc(0);
  const leitor = r.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await leitor.cancel();
      return null;
    }
    partes.push(value);
  }
  return Buffer.concat(partes);
}

/**
 * Resolve link curto (s.shopee.com.br, amzn.to...) até a URL final, sem ler o corpo.
 * Cada salto precisa estar na lista; mais de `maxSaltos` é recusado.
 */
export async function resolverLinkCurto(
  entrada: string,
  o: Opcoes & { maxSaltos?: number },
): Promise<{ ok: true; final: string; saltos: string[] } | { ok: false; erro: ErroHttp }> {
  const buscar = o.buscar ?? fetch;
  const saltos: string[] = [];
  let atual = entrada;
  for (let i = 0; i <= (o.maxSaltos ?? 3); i++) {
    const p = await preparar(atual, o);
    if (!p.ok) return p;
    let r: Response;
    try {
      r = await buscar(p.url, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(o.tempoMs ?? 8000),
        headers: { "user-agent": "FCS-ERP/1.0", accept: "text/html" },
      });
    } catch (e) {
      return { ok: false, erro: erroDeRede(e) };
    }
    await r.body?.cancel().catch(() => {});
    const destino = r.headers.get("location");
    if (r.status >= 300 && r.status < 400 && destino) {
      saltos.push(p.url.toString());
      atual = new URL(destino, p.url).toString();
      continue;
    }
    return { ok: true, final: p.url.toString(), saltos };
  }
  return { ok: false, erro: "muitos_redirecionamentos" };
}

/** Chamada de API que devolve JSON. Redirecionamento é erro (API não redireciona). */
export async function requisitarJson(
  entrada: string,
  init: { method?: "GET" | "POST"; headers?: Record<string, string>; body?: string },
  o: Opcoes,
): Promise<
  { ok: true; status: number; dados: unknown } | { ok: false; erro: ErroHttp; status?: number }
> {
  const p = await preparar(entrada, o);
  if (!p.ok) return p;
  let r: Response;
  try {
    r = await (o.buscar ?? fetch)(p.url, {
      method: init.method ?? "GET",
      headers: { accept: "application/json", ...init.headers },
      body: init.body,
      redirect: "error",
      signal: AbortSignal.timeout(o.tempoMs ?? 8000),
    });
  } catch (e) {
    return { ok: false, erro: erroDeRede(e) };
  }
  const corpo = await lerCorpo(r, o.maxBytes ?? 1_000_000);
  if (!corpo) return { ok: false, erro: "resposta_grande", status: r.status };
  try {
    return { ok: true, status: r.status, dados: JSON.parse(corpo.toString("utf8") || "null") };
  } catch {
    return { ok: false, erro: "resposta_invalida", status: r.status };
  }
}

/** Baixa um arquivo (imagem de produto) com limite de tamanho e lista de tipos. */
export async function baixarArquivo(
  entrada: string,
  o: Opcoes & { tipos: readonly string[] },
): Promise<{ ok: true; dados: Buffer; tipo: string } | { ok: false; erro: ErroHttp }> {
  const p = await preparar(entrada, o);
  if (!p.ok) return p;
  let r: Response;
  try {
    r = await (o.buscar ?? fetch)(p.url, {
      redirect: "error",
      signal: AbortSignal.timeout(o.tempoMs ?? 15_000),
    });
  } catch (e) {
    return { ok: false, erro: erroDeRede(e) };
  }
  if (!r.ok) {
    await r.body?.cancel().catch(() => {});
    return { ok: false, erro: "falha_rede" };
  }
  const tipo = (r.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!o.tipos.includes(tipo)) {
    await r.body?.cancel().catch(() => {});
    return { ok: false, erro: "tipo_nao_permitido" };
  }
  const dados = await lerCorpo(r, o.maxBytes ?? 5_000_000);
  if (!dados) return { ok: false, erro: "resposta_grande" };
  return { ok: true, dados, tipo };
}

import { createHash } from "node:crypto";
import type { ChaveCripto } from "@/lib/cripto";
import { idMensagemDoEnvio } from "@/dominio/ofertas/conector";
import { HOSTS_IMAGEM, TIPOS_IMAGEM } from "@/dominio/ofertas/plataformas";
import { idadeHoras } from "@/dominio/ofertas/produto";
import { baixarArquivo } from "@/integracoes/http";
import { prepararEnvio } from "@/integracoes/preparo";
import { credenciaisDasLinhas, type CredenciaisCarregadas } from "@/integracoes/segredo";
import { buscarProdutoShopee } from "@/integracoes/shopee";
import { lerUrlOferta } from "@/dominio/ofertas/urls";
import type { Banco } from "./banco";
import type { BancoEnvios, Reservado } from "./banco-envios";
import type { GerenciadorSessoes } from "./sessoes";
import { log, mensagemDeErro, registrarSegredo } from "./log";

/**
 * Envio automático: avança as filas, prepara (link de afiliado por grupo e texto), reserva um envio
 * por número e manda. O início do despacho é gravado antes do socket; erro depois disso vira
 * "incerto" e não é reenviado sozinho.
 */

type Deps = {
  banco: Banco;
  envios: BancoEnvios;
  sessoes: GerenciadorSessoes;
  worker: string;
  chaves: { atual: ChaveCripto; todas: ChaveCripto[] };
  storageUrl: string | null;
  parando: () => boolean;
  baixar?: typeof baixarArquivo;
};

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

/** Erros que provam que o WhatsApp recusou de vez (não adianta tentar de novo). */
function definitivo(msg: string): boolean {
  return /not-authorized|forbidden|item-not-found|not-acceptable|403|404/i.test(msg);
}

export class Despachante {
  private cred: CredenciaisCarregadas | null = null;
  private credEm = 0;

  constructor(private readonly d: Deps) {}

  private async credenciais(): Promise<CredenciaisCarregadas> {
    if (!this.cred || Date.now() - this.credEm > 5 * 60_000) {
      this.cred = credenciaisDasLinhas(await this.d.envios.integracoes());
      registrarSegredo(...this.cred.segredos);
      this.credEm = Date.now();
    }
    return this.cred;
  }

  /** Atualiza preço e dados da Shopee antes do envio quando a fonte é a Open API e passou de 6 h. */
  private async atualizarShopee(
    ctx: NonNullable<Awaited<ReturnType<BancoEnvios["contexto"]>>>,
    cred: CredenciaisCarregadas,
  ) {
    const o = ctx.oferta;
    if (!o || o.plataforma !== "shopee" || !cred.shopee || !ctx.ofertaId) return;
    if (ctx.fontesOferta.preco_atual !== "api_shopee") return;
    const idade = idadeHoras(o.dados_atualizados_em);
    if (idade !== null && idade < 6) return;
    const lida = lerUrlOferta(o.url_produto ?? o.url_original);
    if (!lida.ok || !lida.lida.ids.itemId || !lida.lida.ids.shopId) return;
    const r = await buscarProdutoShopee(cred.shopee, {
      shopId: lida.lida.ids.shopId,
      itemId: lida.lida.ids.itemId,
    });
    if (!r.ok) return;
    const p = r.dados;
    await this.d.envios.atualizarOferta(ctx.ofertaId, {
      titulo: p.titulo,
      imagem: p.imagem_url,
      preco: p.preco_atual,
      desconto: p.desconto,
      avaliacao: p.avaliacao,
      variavel: p.preco_variavel,
      fontes: p.fontes as Record<string, string>,
    });
    o.preco_atual = p.preco_atual ? Number(p.preco_atual) : null;
    o.desconto = p.desconto ? Number(p.desconto) : null;
    o.avaliacao = p.avaliacao ? Number(p.avaliacao) : o.avaliacao;
    o.preco_variavel = p.preco_variavel;
    o.dados_atualizados_em = p.atualizado_em;
  }

  async preparar(): Promise<number> {
    const ids = await this.d.envios.paraPreparar(this.d.worker, 5);
    if (!ids.length) return 0;
    const [cred, modelos, anunciantes] = await Promise.all([
      this.credenciais(),
      this.d.envios.modelos(),
      this.d.envios.anunciantes(),
    ]);
    for (const id of ids) {
      const ctx = await this.d.envios.contexto(id);
      if (!ctx) continue;
      try {
        await this.atualizarShopee(ctx, cred);
      } catch (e) {
        log("aviso", "atualizar_shopee", { envio: id, erro: mensagemDeErro(e) });
      }
      const r = await prepararEnvio({ ...ctx, modelos, anunciantes }, cred);
      if (r.ok) {
        if (r.linkNovo && r.link && ctx.ofertaId)
          await this.d.envios.gravarLink(ctx.ofertaId, ctx.grupo.id, r.link);
        await this.d.envios.gravarPreparo(id, { texto: r.texto, link: r.link });
      } else {
        await this.d.envios.gravarPreparo(id, { motivo: r.motivo, detalhe: r.detalhe });
        log("aviso", "preparo_falhou", { envio: id, motivo: r.motivo });
      }
    }
    return ids.length;
  }

  private async imagem(r: Reservado): Promise<{ dados: Buffer; tipo: string } | null> {
    const baixar = this.d.baixar ?? baixarArquivo;
    let url: string | null = null;
    const hosts = [...HOSTS_IMAGEM];
    if (r.imagem_caminho && this.d.storageUrl) {
      url = `${this.d.storageUrl.replace(/\/$/, "")}/storage/v1/object/public/ofertas-imagens/${r.imagem_caminho.split("/").map(encodeURIComponent).join("/")}`;
      hosts.push(new URL(this.d.storageUrl).hostname);
    } else if (r.imagem_url && r.plataforma !== "amazon") url = r.imagem_url;
    if (!url) return null;
    const b = await baixar(url, { hosts, tipos: TIPOS_IMAGEM, maxBytes: 5_000_000 });
    if (!b.ok) {
      log("aviso", "imagem_nao_baixada", { envio: r.envio_id, erro: b.erro });
      return null;
    }
    return { dados: b.dados, tipo: b.tipo };
  }

  /** Um envio por número por vez, até não haver mais reservável. */
  async despachar(): Promise<number> {
    let n = 0;
    while (!this.d.parando()) {
      const r = await this.d.envios.reservar(this.d.worker);
      if (!r) break;
      n += 1;
      const conector = this.d.sessoes.conector(r.numero_id);
      if (!conector) {
        await this.d.envios.concluir(
          r.envio_id,
          this.d.worker,
          "erro_antes",
          null,
          "sessao_desconectada",
        );
        continue;
      }
      let imagem: { dados: Buffer; tipo: string } | null = null;
      try {
        imagem = await this.imagem(r);
      } catch (e) {
        log("aviso", "imagem", { envio: r.envio_id, erro: mensagemDeErro(e) });
      }
      const idMsg = await idMensagemDoEnvio(r.envio_id, hash);
      if (!(await this.d.envios.marcarDespacho(r.envio_id, this.d.worker))) continue;
      try {
        const waId = await conector.enviar(r.grupo_jid, { texto: r.texto, imagem }, idMsg);
        await this.d.envios.concluir(r.envio_id, this.d.worker, "enviado", waId);
        log("info", "enviado", { envio: r.envio_id, numero: r.numero_id });
      } catch (e) {
        const msg = mensagemDeErro(e);
        await this.d.envios.concluir(
          r.envio_id,
          this.d.worker,
          definitivo(msg) ? "falha_definitiva" : "incerto",
          null,
          msg,
        );
        log("aviso", "envio_falhou", { envio: r.envio_id, erro: msg });
      }
    }
    return n;
  }
}

export function iniciarDespacho(d: Deps): ReturnType<typeof setInterval>[] {
  const despachante = new Despachante(d);
  const laco = (nome: string, ms: number, f: () => Promise<unknown>) => {
    let ocupado = false;
    return setInterval(async () => {
      if (ocupado || d.parando()) return;
      ocupado = true;
      try {
        await f();
      } catch (e) {
        log("erro", nome, { erro: mensagemDeErro(e) });
      } finally {
        ocupado = false;
      }
    }, ms);
  };
  return [
    laco("filas", 30_000, () => d.envios.avancarFilas()),
    laco("preparo", 5_000, () => despachante.preparar()),
    laco("despacho", 3_000, () => despachante.despachar()),
  ];
}

import type { Credenciais } from "./conversor";
import type { Opcoes } from "./http";
import {
  montarEnviosCupom,
  montarEnviosOferta,
  type GrupoEnvio,
  type LinkPronto,
  type OfertaEnvio,
} from "./montar-envios";
import type { AnuncianteAwin } from "@/dominio/ofertas/urls";
import { escolherModelo, type ModeloEscolha } from "@/dominio/ofertas/modelos";
import { cupomPodeSair } from "@/dominio/ofertas/cupons";
import { dadoDesatualizado } from "@/dominio/ofertas/produto";
import type { CupomMensagem } from "@/dominio/ofertas/mensagem";

/**
 * Preparação de um envio (um grupo): confere trava de conformidade, cupom e frescor do preço,
 * escolhe o modelo, gera o link de afiliado do grupo e renderiza o texto. Usada pelo worker
 * (envios automáticos) e pelo ERP (envios manuais de fila). Nunca devolve texto sem link quando
 * a oferta tem produto: sem afiliação o envio falha com motivo.
 */

export type CupomPreparo = CupomMensagem & {
  status: string;
  inicio_em: string | null;
  url_referencia: string | null;
  fonte: string;
};

export type EntradaPreparo = {
  grupo: GrupoEnvio;
  oferta: (OfertaEnvio & { modelo_id?: string | null }) | null;
  cupom: CupomPreparo | null;
  textoEditado: string | null;
  modeloFila: string | null;
  modelos: (ModeloEscolha & { corpo: string })[];
  liberada: boolean;
  linkExistente: LinkPronto | null;
  anunciantes: AnuncianteAwin[];
};

export type ResultadoPreparo =
  | { ok: true; texto: string; link: LinkPronto | null; linkNovo: boolean }
  | { ok: false; motivo: string; detalhe?: string };

const MOTIVO_DE_ERRO: Record<string, string> = {
  variaveis_ausentes: "variaveis_ausentes",
  mensagem_longa: "variaveis_ausentes",
  titulo_produto_obrigatorio: "variaveis_ausentes",
};

export async function prepararEnvio(
  e: EntradaPreparo,
  cred: Credenciais,
  extras: { buscar?: typeof fetch; resolver?: Opcoes["resolver"]; agora?: Date } = {},
): Promise<ResultadoPreparo> {
  if (!e.liberada) return { ok: false, motivo: "plataforma_bloqueada" };
  if (e.cupom && !cupomPodeSair(e.cupom, extras.agora))
    return { ok: false, motivo: "cupom_fora_da_vigencia" };

  if (e.oferta) {
    const o = e.oferta;
    if (
      o.plataforma === "amazon" &&
      o.preco_atual !== null &&
      dadoDesatualizado(o.dados_atualizados_em, 24, extras.agora)
    )
      return {
        ok: false,
        motivo: "dados_desatualizados",
        detalhe: "Amazon: preço com mais de 24 horas. Confira e salve a oferta de novo.",
      };
    const modelo = escolherModelo(
      e.modelos,
      "oferta",
      o.plataforma,
      e.modeloFila ?? o.modelo_id ?? null,
    );
    const corpo = e.textoEditado?.trim() || modelo?.corpo;
    if (!corpo) return { ok: false, motivo: "modelo_obrigatorio" };
    const existentes = new Map<string, LinkPronto>();
    if (e.linkExistente) existentes.set(e.grupo.id, e.linkExistente);
    const m = await montarEnviosOferta(
      {
        oferta: o,
        cupom: e.cupom && e.cupom.plataforma === o.plataforma ? e.cupom : null,
        corpo,
        grupos: [e.grupo],
        cred,
        anunciantes: e.anunciantes,
        linksExistentes: existentes,
      },
      extras,
    );
    if (!m.ok)
      return {
        ok: false,
        motivo: MOTIVO_DE_ERRO[m.erro] ?? "sem_link_afiliado",
        detalhe: [m.erro, m.detalhe].filter(Boolean).join(": "),
      };
    const env = m.envios[0];
    return {
      ok: true,
      texto: env.texto,
      link: env.link_url && env.link_origem ? { url: env.link_url, origem: env.link_origem } : null,
      linkNovo: m.links.length > 0,
    };
  }

  if (e.cupom) {
    const modelo = escolherModelo(e.modelos, "cupom", e.cupom.plataforma, e.modeloFila);
    const corpo = e.textoEditado?.trim() || modelo?.corpo;
    if (!corpo) return { ok: false, motivo: "modelo_obrigatorio" };
    const link =
      e.linkExistente ??
      (e.cupom.fonte === "awin" && e.cupom.url_referencia
        ? { url: e.cupom.url_referencia, origem: "api" as const }
        : null);
    const m = montarEnviosCupom({ cupom: e.cupom, corpo, grupos: [e.grupo], link });
    if (!m.ok)
      return {
        ok: false,
        motivo: MOTIVO_DE_ERRO[m.erro] ?? "variaveis_ausentes",
        detalhe: [m.erro, m.detalhe].filter(Boolean).join(": "),
      };
    return { ok: true, texto: m.envios[0].texto, link, linkNovo: false };
  }
  return { ok: false, motivo: "oferta_obrigatoria" };
}

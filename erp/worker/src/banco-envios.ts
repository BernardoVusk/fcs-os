import type pg from "pg";
import type { EntradaPreparo, CupomPreparo } from "@/integracoes/preparo";
import type { LinhaIntegracao } from "@/integracoes/segredo";
import type { AnuncianteAwin } from "@/dominio/ofertas/urls";
import type { LinkPronto } from "@/integracoes/montar-envios";
import { lerPlataforma } from "@/dominio/ofertas/plataformas";

/** Consultas do worker para preparar e despachar envios (papel ofe_worker). */

export type Reservado = {
  envio_id: string;
  publicacao_id: string;
  numero_id: string;
  grupo_jid: string;
  texto: string;
  link_url: string | null;
  imagem_caminho: string | null;
  imagem_url: string | null;
  plataforma: string | null;
};

export type ContextoEnvio = Omit<EntradaPreparo, "modelos" | "anunciantes"> & {
  envioId: string;
  ofertaId: string | null;
  fontesOferta: Record<string, string>;
  chaveProduto: string | null;
};

export interface BancoEnvios {
  integracoes(): Promise<LinhaIntegracao[]>;
  anunciantes(): Promise<AnuncianteAwin[]>;
  modelos(): Promise<EntradaPreparo["modelos"]>;
  avancarFilas(): Promise<number>;
  paraPreparar(worker: string, limite: number): Promise<string[]>;
  contexto(envio: string): Promise<ContextoEnvio | null>;
  gravarPreparo(
    envio: string,
    r: { texto: string; link: LinkPronto | null } | { motivo: string; detalhe?: string },
  ): Promise<void>;
  gravarLink(ofertaId: string, grupoId: string, link: LinkPronto): Promise<void>;
  atualizarOferta(
    id: string,
    d: {
      titulo: string | null;
      imagem: string | null;
      preco: string | null;
      desconto: string | null;
      avaliacao: string | null;
      variavel: boolean;
      fontes: Record<string, string>;
    },
  ): Promise<void>;
  registrarCuponsAwin(cupons: Record<string, unknown>[]): Promise<number>;
  reservar(worker: string): Promise<Reservado | null>;
  marcarDespacho(envio: string, worker: string): Promise<boolean>;
  concluir(
    envio: string,
    worker: string,
    resultado: "enviado" | "erro_antes" | "incerto" | "falha_definitiva",
    waId?: string | null,
    erro?: string | null,
  ): Promise<void>;
}

export class BancoEnviosPg implements BancoEnvios {
  constructor(private readonly pool: pg.Pool) {}

  private async q<T extends pg.QueryResultRow = pg.QueryResultRow>(
    sql: string,
    args: unknown[] = [],
  ) {
    return (await this.pool.query<T>(sql, args)).rows;
  }

  async integracoes() {
    return this.q<LinhaIntegracao>(
      `select i.plataforma, i.identificadores, s.segredo
         from public.ofe_integracoes i left join public.ofe_integracoes_segredos s on s.integracao_id = i.id`,
    );
  }

  async anunciantes() {
    const r = await this.q<{ advertiser_id: number; dominios: string[] }>(
      "select advertiser_id, dominios from public.ofe_awin_anunciantes",
    );
    return r.map((a) => ({ advertiserId: a.advertiser_id, dominios: a.dominios }));
  }

  async modelos() {
    return this.q<EntradaPreparo["modelos"][number]>(
      "select id, tipo, plataforma, padrao, ativo, corpo from public.ofe_modelos",
    );
  }

  async avancarFilas() {
    const [r] = await this.q<{ n: number }>("select public.ofe_avancar_filas() as n");
    return r?.n ?? 0;
  }

  async paraPreparar(worker: string, limite: number) {
    const r = await this.q<{ id: string }>(
      "select id from public.ofe_w_para_preparar($1, $2) as id",
      [worker, limite],
    );
    return r.map((x) => x.id);
  }

  async contexto(envio: string): Promise<ContextoEnvio | null> {
    const [l] = await this.q<{
      envio_id: string;
      grupo_id: string;
      grupo_nome: string;
      grupo_campanha: string | null;
      tag_amazon: string | null;
      texto_editado: string | null;
      modelo_fila: string | null;
      oferta: Record<string, unknown> | null;
      cupom: Record<string, unknown> | null;
      liberada: boolean;
      link: { url: string; origem: LinkPronto["origem"] } | null;
    }>(
      `select e.id as envio_id, e.grupo_id, g.nome as grupo_nome, g.campanha as grupo_campanha, g.tag_amazon,
              p.texto_editado, f.modelo_id as modelo_fila,
              case when o.id is null then null else to_jsonb(o) end as oferta,
              case when c.id is null then null else to_jsonb(c) end as cupom,
              exists (select 1 from public.ofe_integracoes i
                       where i.plataforma = coalesce(o.plataforma, c.plataforma) and i.conformidade_em is not null) as liberada,
              (select jsonb_build_object('url', l.url, 'origem', l.origem) from public.ofe_links l
                where o.id is not null and l.oferta_id = o.id and l.grupo_id = e.grupo_id) as link
         from public.ofe_envios e
         join public.ofe_publicacoes p on p.id = e.publicacao_id
         join public.ofe_grupos g on g.id = e.grupo_id
         left join public.ofe_filas f on f.id = p.fila_id
         left join public.ofe_ofertas o on o.id = p.oferta_id
         left join public.ofe_cupons c on c.id = p.cupom_id
        where e.id = $1`,
      [envio],
    );
    if (!l) return null;
    const o = l.oferta;
    const plataformaOferta = o ? lerPlataforma(o.plataforma) : null;
    const plataformaCupom = l.cupom ? lerPlataforma(l.cupom.plataforma) : null;
    return {
      envioId: l.envio_id,
      ofertaId: o ? String(o.id) : null,
      fontesOferta: (o?.fontes as Record<string, string>) ?? {},
      chaveProduto: (o?.chave_produto as string | null) ?? null,
      grupo: {
        id: l.grupo_id,
        nome: l.grupo_nome,
        campanha: l.grupo_campanha,
        tag_amazon: l.tag_amazon,
      },
      oferta:
        o && plataformaOferta
          ? {
              id: String(o.id),
              plataforma: plataformaOferta,
              url_original: String(o.url_original),
              url_produto: (o.url_produto as string | null) ?? null,
              link_colado: (o.link_colado as string | null) ?? null,
              campanha: (o.campanha as string | null) ?? null,
              titulo: (o.titulo as string | null) ?? null,
              preco_atual: (o.preco_atual as number | null) ?? null,
              preco_anterior: (o.preco_anterior as number | null) ?? null,
              desconto: (o.desconto as number | null) ?? null,
              preco_pix: (o.preco_pix as number | null) ?? null,
              parcelamento: (o.parcelamento as string | null) ?? null,
              avaliacao: (o.avaliacao as number | null) ?? null,
              avaliacoes_qtd: (o.avaliacoes_qtd as number | null) ?? null,
              loja: (o.loja as string | null) ?? null,
              preco_variavel: !!o.preco_variavel,
              cta: (o.cta as string | null) ?? null,
              dados_atualizados_em: (o.dados_atualizados_em as string | null) ?? null,
              modelo_id: (o.modelo_id as string | null) ?? null,
            }
          : null,
      cupom:
        l.cupom && plataformaCupom
          ? ({
              ...(l.cupom as unknown as CupomPreparo),
              plataforma: plataformaCupom,
            } as CupomPreparo)
          : null,
      textoEditado: l.texto_editado,
      modeloFila: l.modelo_fila,
      liberada: l.liberada,
      linkExistente: l.link,
    };
  }

  async gravarPreparo(
    envio: string,
    r: { texto: string; link: LinkPronto | null } | { motivo: string; detalhe?: string },
  ) {
    if ("motivo" in r)
      await this.q("select public.ofe_preparar_envio($1, null, null, null, $2, $3)", [
        envio,
        r.motivo,
        r.detalhe ?? null,
      ]);
    else
      await this.q("select public.ofe_preparar_envio($1, $2, $3, $4)", [
        envio,
        r.texto,
        r.link?.url ?? null,
        r.link?.origem ?? null,
      ]);
  }

  async gravarLink(ofertaId: string, grupoId: string, link: LinkPronto) {
    await this.q(
      `insert into public.ofe_links (oferta_id, grupo_id, url, origem) values ($1, $2, $3, $4)
       on conflict (oferta_id, grupo_id) do update set url = excluded.url, origem = excluded.origem, gerado_em = now()`,
      [ofertaId, grupoId, link.url, link.origem],
    );
  }

  async atualizarOferta(
    id: string,
    d: {
      titulo: string | null;
      imagem: string | null;
      preco: string | null;
      desconto: string | null;
      avaliacao: string | null;
      variavel: boolean;
      fontes: Record<string, string>;
    },
  ) {
    await this.q("select public.ofe_w_atualizar_oferta($1, $2, $3, $4, $5, $6, $7, $8::jsonb)", [
      id,
      d.titulo,
      d.imagem,
      d.preco,
      d.desconto,
      d.avaliacao,
      d.variavel,
      JSON.stringify(d.fontes),
    ]);
  }

  async registrarCuponsAwin(cupons: Record<string, unknown>[]) {
    const [r] = await this.q<{ n: number }>(
      "select public.ofe_registrar_cupons_awin($1::jsonb) as n",
      [JSON.stringify(cupons)],
    );
    return r?.n ?? 0;
  }

  async reservar(worker: string) {
    const [r] = await this.q<Reservado>("select * from public.ofe_reservar_envio($1)", [worker]);
    return r ?? null;
  }

  async marcarDespacho(envio: string, worker: string) {
    const [r] = await this.q<{ ok: boolean }>("select public.ofe_marcar_despacho($1, $2) as ok", [
      envio,
      worker,
    ]);
    return r?.ok === true;
  }

  async concluir(
    envio: string,
    worker: string,
    resultado: "enviado" | "erro_antes" | "incerto" | "falha_definitiva",
    waId?: string | null,
    erro?: string | null,
  ) {
    await this.q("select public.ofe_concluir_envio($1, $2, $3, $4, $5)", [
      envio,
      worker,
      resultado,
      waId ?? null,
      erro ?? null,
    ]);
  }
}

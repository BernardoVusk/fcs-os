import type pg from "pg";
import type { ChaveCripto } from "@/lib/cripto";
import type { MensagemGrupo } from "@/dominio/ofertas/conector";
import { decidirMensagem, FILTROS_PADRAO, type FiltrosCopiador } from "@/dominio/ofertas/copiador";
import { REGRAS_PADRAO, type RegrasLimpeza } from "@/dominio/ofertas/limpeza";
import { lerPlataforma, type Plataforma } from "@/dominio/ofertas/plataformas";
import type { Banco } from "./banco";
import type { BancoEnvios } from "./banco-envios";
import type { GerenciadorSessoes } from "./sessoes";
import { log, mensagemDeErro } from "./log";

/**
 * Copiador: mensagem de grupo de origem autorizado chega pelo número coletor do grupo (um só número
 * processa, sem duplicar), é registrada, decidida e publicada ou mandada para revisão. Automação em
 * rascunho só registra (prévia), nada sai.
 */

export type AutomacaoAtiva = {
  id: string;
  status: "ativa" | "rascunho";
  origem_jid: string;
  coletor: string | null;
  plataformas: Plataforma[];
  filtros: FiltrosCopiador;
  limpeza: RegrasLimpeza;
  revisao_manual: boolean;
  grupo_origem_id: string;
};

export interface BancoCopiador {
  automacoes(): Promise<AutomacaoAtiva[]>;
  registrar(a: AutomacaoAtiva, m: MensagemGrupo): Promise<string | null>;
  atualizar(id: string, campos: Record<string, unknown>): Promise<void>;
  enfileirar(id: string): Promise<string>;
}

export class BancoCopiadorPg implements BancoCopiador {
  constructor(private readonly pool: pg.Pool) {}

  async automacoes() {
    const r = await this.pool.query<{
      id: string;
      status: "ativa" | "rascunho";
      origem_jid: string;
      coletor: string | null;
      plataformas: string[];
      filtros: Partial<FiltrosCopiador>;
      limpeza: Partial<RegrasLimpeza>;
      revisao_manual: boolean;
      grupo_origem_id: string;
    }>(
      `select a.id, a.status, g.jid as origem_jid, g.numero_coletor_id as coletor, a.plataformas, a.filtros, a.limpeza,
              a.revisao_manual, a.grupo_origem_id
         from public.ofe_automacoes a join public.ofe_grupos g on g.id = a.grupo_origem_id
        where a.status in ('ativa', 'rascunho') and g.funcao = 'origem' and g.autorizado_em is not null and g.jid is not null`,
    );
    return r.rows.map((a) => ({
      ...a,
      plataformas: a.plataformas.map(lerPlataforma).filter((p): p is Plataforma => !!p),
      filtros: { ...FILTROS_PADRAO, ...a.filtros },
      limpeza: { ...REGRAS_PADRAO, ...a.limpeza },
    }));
  }

  async registrar(a: AutomacaoAtiva, m: MensagemGrupo) {
    const r = await this.pool.query<{ id: string }>(
      `insert into public.ofe_mensagens_origem (automacao_id, grupo_id, wa_mensagem_id, recebida_em, texto, status)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (automacao_id, grupo_id, wa_mensagem_id) do nothing returning id`,
      [a.id, a.grupo_origem_id, m.id, m.em, m.texto, a.status === "ativa" ? "recebida" : "previa"],
    );
    return r.rows[0]?.id ?? null;
  }

  async atualizar(id: string, campos: Record<string, unknown>) {
    const chaves = Object.keys(campos);
    if (!chaves.length) return;
    const sets = chaves.map((k, i) => `${k} = $${i + 2}`).join(", ");
    await this.pool.query(`update public.ofe_mensagens_origem set ${sets} where id = $1`, [
      id,
      ...chaves.map((k) => campos[k]),
    ]);
  }

  async enfileirar(id: string) {
    const r = await this.pool.query<{ s: string }>(
      "select public.ofe_enfileirar_mensagem($1) as s",
      [id],
    );
    return r.rows[0]?.s ?? "falhou";
  }
}

const CAMPOS_ATUALIZAVEIS = new Set([
  "texto_processado",
  "hash_conteudo",
  "chave_produto",
  "plataforma",
  "link_original",
  "titulo_sugerido",
  "removidos",
  "status",
  "motivo",
]);

export class Copiador {
  private cache: AutomacaoAtiva[] = [];
  private cacheEm = 0;

  constructor(
    private readonly banco: BancoCopiador,
    private readonly envios: Pick<BancoEnvios, "anunciantes">,
  ) {}

  private async lista(): Promise<AutomacaoAtiva[]> {
    if (Date.now() - this.cacheEm > 60_000) {
      this.cache = await this.banco.automacoes();
      this.cacheEm = Date.now();
    }
    return this.cache;
  }

  async receber(numero: string, m: MensagemGrupo): Promise<void> {
    const alvo = (await this.lista()).filter((a) => a.origem_jid === m.jid && a.coletor === numero);
    if (!alvo.length) return;
    const anunciantes = await this.envios.anunciantes();
    for (const a of alvo) {
      const id = await this.banco.registrar(a, m);
      if (!id) continue;
      const d = decidirMensagem(
        m.texto,
        {
          plataformas: a.plataformas,
          filtros: a.filtros,
          limpeza: a.limpeza,
          revisaoManual: a.revisao_manual,
        },
        anunciantes,
      );
      const campos: Record<string, unknown> =
        d.acao === "ignorar"
          ? { status: a.status === "ativa" ? "ignorada" : "previa", motivo: d.motivo }
          : {
              texto_processado: d.texto,
              hash_conteudo: d.hash,
              chave_produto: d.chave,
              plataforma: d.lida.plataforma,
              link_original: d.linkOriginal,
              titulo_sugerido: d.titulo,
              removidos: d.removidos.slice(0, 50).map((r) => r.slice(0, 200)),
              status:
                a.status !== "ativa"
                  ? "previa"
                  : d.acao === "revisar"
                    ? "aguardando_revisao"
                    : "recebida",
              motivo: d.motivo,
            };
      for (const k of Object.keys(campos)) if (!CAMPOS_ATUALIZAVEIS.has(k)) delete campos[k];
      await this.banco.atualizar(id, campos);
      if (a.status === "ativa" && d.acao === "publicar") {
        const s = await this.banco.enfileirar(id);
        log("info", "copiador", { automacao: a.id, mensagem: id, resultado: s });
      }
    }
  }
}

export function iniciarCopiador(d: {
  banco: Banco;
  envios: BancoEnvios;
  sessoes: GerenciadorSessoes;
  chaves: { atual: ChaveCripto; todas: ChaveCripto[] };
  copiador?: BancoCopiador;
}): void {
  if (!d.copiador) return;
  const c = new Copiador(d.copiador, d.envios);
  d.sessoes.aoMensagemGrupo = async (numero, m) => {
    try {
      await c.receber(numero, m);
    } catch (e) {
      log("erro", "copiador", { numero, erro: mensagemDeErro(e) });
    }
  };
}

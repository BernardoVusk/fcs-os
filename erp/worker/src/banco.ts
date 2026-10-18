import pg from "pg";
import type { GrupoRemoto } from "@/dominio/ofertas/conector";

/**
 * Acesso do worker ao banco, com o papel ofe_worker (só tabelas ofe_* e funções ofe_w_*).
 * A interface existe para os testes trocarem o Postgres por memória.
 */

export type NumeroCfg = {
  id: string;
  rotulo: string;
  telefone: string | null;
  aceito: boolean;
  ativo: boolean;
  status: string | null;
  worker_id: string | null;
  trava_ate: Date | null;
  ultima_atividade_em: Date | null;
  tem_sessao: boolean;
};

export type Comando = {
  id: string;
  numero_id: string;
  tipo: "conectar" | "parear" | "desconectar" | "remover" | "sincronizar_grupos" | "enviar_teste";
  payload: Record<string, unknown>;
};

export interface Banco {
  batimento(worker: string, versao: string): Promise<void>;
  numeros(): Promise<NumeroCfg[]>;
  assumir(numero: string, worker: string, segundos: number): Promise<boolean>;
  liberar(numero: string, worker: string): Promise<void>;
  proximoComando(worker: string): Promise<Comando | null>;
  concluirComando(id: string, ok: boolean, resultado?: string): Promise<void>;
  estado(
    numero: string,
    status: string,
    o?: {
      jid?: string | null;
      nome?: string | null;
      erro?: string | null;
      detalhe?: string | null;
    },
  ): Promise<void>;
  eventoNumero(numero: string, tipo: string, detalhe?: string): Promise<void>;
  qr(
    numero: string,
    tipo: "qr" | "pareamento",
    conteudo: string | null,
    segundos?: number,
  ): Promise<void>;
  lacunaDesde(numero: string, inicio: Date, motivo: string): Promise<void>;
  sincronizarGrupos(numero: string, grupos: GrupoRemoto[]): Promise<number>;
  eventoGrupo(
    numero: string,
    jid: string,
    tipo: "entrada" | "saida",
    quantidade: number,
  ): Promise<void>;
  grupoTeste(id: string): Promise<{ jid: string; nome: string } | null>;
  lerSessao(numero: string, chaves: string[]): Promise<Map<string, string>>;
  gravarSessao(numero: string, pares: { chave: string; valor: string | null }[]): Promise<void>;
  apagarSessao(numero: string): Promise<void>;
  gerarAlertas(): Promise<void>;
  fechar(): Promise<void>;
}

export function criarPool(url: string) {
  return new pg.Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30_000,
    application_name: "fcs-ofertas-worker",
  });
}

export class BancoPg implements Banco {
  constructor(private readonly pool: pg.Pool) {}

  private async q<T extends pg.QueryResultRow = pg.QueryResultRow>(
    sql: string,
    args: unknown[] = [],
  ) {
    return (await this.pool.query<T>(sql, args)).rows;
  }

  async batimento(worker: string, versao: string) {
    await this.q("select public.ofe_w_batimento($1, $2)", [worker, versao]);
  }

  async numeros() {
    return this.q<NumeroCfg>(
      `select n.id, n.rotulo, n.telefone, n.aceite_risco_em is not null as aceito, n.ativo,
              e.status, e.worker_id, e.trava_ate, e.ultima_atividade_em,
              exists (select 1 from public.ofe_sessoes s where s.numero_id = n.id and s.chave = 'creds') as tem_sessao
         from public.ofe_numeros n left join public.ofe_numeros_estado e on e.numero_id = n.id`,
    );
  }

  async assumir(numero: string, worker: string, segundos: number) {
    const [r] = await this.q<{ ok: boolean }>(
      "select public.ofe_w_assumir_numero($1, $2, $3) as ok",
      [numero, worker, segundos],
    );
    return r?.ok === true;
  }

  async liberar(numero: string, worker: string) {
    await this.q("select public.ofe_w_liberar_numero($1, $2)", [numero, worker]);
  }

  async proximoComando(worker: string) {
    const [c] = await this.q<Comando>(
      "select id, numero_id, tipo, payload from public.ofe_w_proximo_comando($1)",
      [worker],
    );
    return c ?? null;
  }

  async concluirComando(id: string, ok: boolean, resultado?: string) {
    await this.q("select public.ofe_w_concluir_comando($1, $2, $3)", [id, ok, resultado ?? null]);
  }

  async estado(
    numero: string,
    status: string,
    o: {
      jid?: string | null;
      nome?: string | null;
      erro?: string | null;
      detalhe?: string | null;
    } = {},
  ) {
    await this.q("select public.ofe_w_estado($1, $2, $3, $4, $5, $6)", [
      numero,
      status,
      o.jid ?? null,
      o.nome ?? null,
      o.erro ?? null,
      o.detalhe ?? null,
    ]);
  }

  async eventoNumero(numero: string, tipo: string, detalhe?: string) {
    await this.q("select public.ofe_w_evento_numero($1, $2, $3)", [numero, tipo, detalhe ?? null]);
  }

  async qr(numero: string, tipo: "qr" | "pareamento", conteudo: string | null, segundos = 60) {
    await this.q("select public.ofe_w_qr($1, $2, $3, $4)", [numero, tipo, conteudo, segundos]);
  }

  async lacunaDesde(numero: string, inicio: Date, motivo: string) {
    await this.q("select public.ofe_w_lacuna_desde($1, $2, $3)", [numero, inicio, motivo]);
  }

  async sincronizarGrupos(numero: string, grupos: GrupoRemoto[]) {
    const [r] = await this.q<{ n: number }>(
      "select public.ofe_w_sincronizar_grupos($1, $2::jsonb) as n",
      [numero, JSON.stringify(grupos)],
    );
    return r?.n ?? 0;
  }

  async eventoGrupo(numero: string, jid: string, tipo: "entrada" | "saida", quantidade: number) {
    await this.q("select public.ofe_w_evento_grupo($1, $2, $3, $4)", [
      numero,
      jid,
      tipo,
      quantidade,
    ]);
  }

  async grupoTeste(id: string) {
    const [g] = await this.q<{ jid: string; nome: string }>(
      "select jid, nome from public.ofe_grupos where id = $1 and funcao = 'teste' and jid is not null",
      [id],
    );
    return g ?? null;
  }

  async lerSessao(numero: string, chaves: string[]) {
    const linhas = await this.q<{ chave: string; valor: string }>(
      "select chave, valor from public.ofe_sessoes where numero_id = $1 and chave = any($2::text[])",
      [numero, chaves],
    );
    return new Map(linhas.map((l) => [l.chave, l.valor]));
  }

  async gravarSessao(numero: string, pares: { chave: string; valor: string | null }[]) {
    const gravar = pares.filter((p) => p.valor !== null);
    const apagar = pares.filter((p) => p.valor === null).map((p) => p.chave);
    if (gravar.length)
      await this.q(
        `insert into public.ofe_sessoes (numero_id, chave, valor, atualizado_em)
         select $1, x.chave, x.valor, now() from unnest($2::text[], $3::text[]) as x(chave, valor)
         on conflict (numero_id, chave) do update set valor = excluded.valor, atualizado_em = now()`,
        [numero, gravar.map((p) => p.chave), gravar.map((p) => p.valor)],
      );
    if (apagar.length)
      await this.q(
        "delete from public.ofe_sessoes where numero_id = $1 and chave = any($2::text[])",
        [numero, apagar],
      );
  }

  async apagarSessao(numero: string) {
    await this.q("select public.ofe_w_apagar_sessao($1)", [numero]);
  }

  async gerarAlertas() {
    await this.q("select public.ofe_gerar_alertas()");
  }

  async fechar() {
    await this.pool.end();
  }
}

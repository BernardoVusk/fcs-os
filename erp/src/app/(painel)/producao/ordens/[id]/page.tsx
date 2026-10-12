import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { obterOrdem } from "@/dados/producao/ordens";
import { contextoProduto } from "@/dados/produtos/calculo";
import { listarLotes } from "@/dados/estoque/insumos";
import { clienteServidor } from "@/lib/supabase/servidor";
import { formatarMoeda } from "@/lib/formatos/moeda";
import { formatarData, formatarDataHora } from "@/lib/formatos/data";
import { formatarNumero, formatarQuantidade } from "@/lib/formatos/numero";
import { AcoesOrdem, BadgeEstado } from "@/componentes/producao/Ordens";
import { FormConcluir, type InsumoConsumo } from "@/componentes/producao/FormConcluir";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";
import { Banner } from "@/componentes/painel/Banner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";

type Detalhe = {
  material: number;
  maquina: number;
  energia: number;
  mao_de_obra: number;
  complementares: number;
  total: number;
  por_peca_boa: number | null;
  perda_producao: number;
  avisos: string[];
};

export default async function PaginaOrdem({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirLeitura("producao");
  const { id } = await params;
  const ordem = await obterOrdem(id);
  if (!ordem) notFound();
  const editar = podeEscrever(usuario.papel, "producao");
  const aberta = ["fila", "imprimindo", "acabamento"].includes(ordem.status);
  const ctx = await contextoProduto(ordem.produto_id, ordem.variacao_id);
  const supabase = await clienteServidor();
  // Insumos que a ordem pode consumir: filamento da ficha e itens da BOM por peça, com os lotes com saldo.
  const insumosConsumo: InsumoConsumo[] = [];
  const iniciais: { insumo_id: string; lote_id: string | null; quantidade: number | null }[] = [];
  if (aberta && ctx) {
    const ids = [
      ctx.ficha.insumo_impressao_id,
      ...ctx.bom.linhas.filter((l) => l.por === "peca").map((l) => l.insumo_id),
    ].filter((x): x is string => Boolean(x));
    const { data: insumos } = ids.length
      ? await supabase.from("insumos").select("id, nome, unidade_base").in("id", ids)
      : { data: [] };
    for (const i of insumos ?? []) {
      const lotes = await listarLotes(i.id, true);
      insumosConsumo.push({
        id: i.id,
        nome: i.nome,
        unidade: i.unidade_base,
        lotes: lotes.map((l) => ({
          id: l.id,
          codigo: l.codigo,
          quantidade_atual: Number(l.quantidade_atual),
        })),
      });
    }
    if (ctx.ficha.insumo_impressao_id) {
      iniciais.push({
        insumo_id: ctx.ficha.insumo_impressao_id,
        lote_id: ordem.lote_id,
        quantidade:
          ctx.ficha.peso_g == null
            ? null
            : Math.round(Number(ctx.ficha.peso_g) * ordem.quantidade_planejada * 1000) / 1000,
      });
    }
    for (const l of ctx.bom.linhas.filter((x) => x.por === "peca"))
      iniciais.push({
        insumo_id: l.insumo_id,
        lote_id: null,
        quantidade: Math.round(l.quantidade * ordem.quantidade_planejada * 1000) / 1000,
      });
  }
  const detalhe = ordem.custo_realizado_detalhe as Detalhe | null;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-[28px] leading-tight font-semibold tracking-tight">
              {ordem.codigo}
            </h1>
            <BadgeEstado status={ordem.status} />
          </div>
          <p className="mt-1 text-sm text-texto-2">
            <Link
              href={`/catalogo/produtos/${ordem.produto_id}`}
              className="text-acao hover:underline"
            >
              {ordem.produto?.nome ?? "Produto"}
            </Link>
            {ordem.variacao && ` · ${ordem.variacao.nome}`} · {ordem.quantidade_planejada} peça(s) ·{" "}
            {ordem.impressora?.nome ?? "sem impressora"}
            {ordem.lote && ` · rolo ${ordem.lote.codigo}`}
          </p>
        </div>
        {editar && (
          <div className="flex flex-wrap items-center gap-2">
            <AcoesOrdem ordem={{ id: ordem.id, status: ordem.status }} />
            {aberta && (
              <DialogoNovo rotulo="Concluir ordem" titulo={`Concluir ${ordem.codigo}`}>
                <FormConcluir
                  ordemId={ordem.id}
                  planejadas={ordem.quantidade_planejada}
                  insumos={insumosConsumo}
                  iniciais={iniciais}
                />
              </DialogoNovo>
            )}
          </div>
        )}
      </div>
      {detalhe?.avisos && detalhe.avisos.length > 0 && (
        <Banner tipo="alerta" titulo="Avisos da conclusão">
          {detalhe.avisos.join(", ")}
        </Banner>
      )}
      <div className="numeros grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <div className="rounded-2xl bg-card p-4 shadow-painel">
          <p className="text-[13px] text-texto-2">Prazo</p>
          <p className="mt-1 text-lg font-semibold">{formatarData(ordem.prazo) || "Sem prazo"}</p>
          <p className="text-xs text-texto-3">prioridade {ordem.prioridade}</p>
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-painel">
          <p className="text-[13px] text-texto-2">Tempo previsto / real</p>
          <p className="mt-1 text-lg font-semibold">
            {ordem.tempo_previsto_min == null
              ? "Sem dados"
              : `${formatarNumero(ordem.tempo_previsto_min, 0)} min`}
            {ordem.tempo_real_min != null && (
              <span className="text-texto-2"> / {formatarNumero(ordem.tempo_real_min, 0)} min</span>
            )}
          </p>
          <p className="text-xs text-texto-3">
            {ordem.inicio_real ? `início ${formatarDataHora(ordem.inicio_real)}` : "não iniciada"}
          </p>
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-painel">
          <p className="text-[13px] text-texto-2">Custo estimado</p>
          <p className="mt-1 text-lg font-semibold">
            {ordem.custo_estimado == null ? "Sem cálculo" : formatarMoeda(ordem.custo_estimado)}
          </p>
          <p className="text-xs text-texto-3">só variável, do último cálculo</p>
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-painel">
          <p className="text-[13px] text-texto-2">Custo realizado</p>
          <p className="mt-1 text-lg font-semibold">
            {ordem.custo_realizado == null ? "Ao concluir" : formatarMoeda(ordem.custo_realizado)}
          </p>
          {detalhe && (
            <p className="text-xs text-texto-3">
              {detalhe.por_peca_boa == null
                ? "nenhuma peça boa: perda de produção"
                : `${formatarMoeda(detalhe.por_peca_boa, 4)} por peça boa`}
            </p>
          )}
        </div>
        {ordem.status === "concluida" && (
          <div className="rounded-2xl bg-card p-4 shadow-painel">
            <p className="text-[13px] text-texto-2">Peças</p>
            <p className="mt-1 text-lg font-semibold">
              {ordem.quantidade_aprovada} boas{" "}
              <span className="text-sm font-normal text-texto-2">
                / {ordem.quantidade_perdida} perdidas
              </span>
            </p>
            {ordem.motivo_falha && <p className="text-xs text-texto-3">{ordem.motivo_falha}</p>}
          </div>
        )}
      </div>
      {detalhe && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Custo realizado por componente</h2>
          <div className="numeros grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 rounded-2xl bg-card p-5 shadow-painel">
            {(["material", "maquina", "energia", "mao_de_obra", "complementares"] as const).map(
              (k) => (
                <div key={k}>
                  <p className="text-[13px] text-texto-2">
                    {
                      {
                        material: "Material",
                        maquina: "Máquina",
                        energia: "Energia",
                        mao_de_obra: "Mão de obra",
                        complementares: "Complementares",
                      }[k]
                    }
                  </p>
                  <p className="font-semibold">{formatarMoeda(detalhe[k], 4)}</p>
                </div>
              ),
            )}
          </div>
        </section>
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Consumo de material</h2>
        {ordem.consumos.length === 0 ? (
          <p className="text-sm text-texto-2">
            {aberta ? "Registrado ao concluir." : "Nenhum consumo registrado."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
            <Table>
              <TableHeader>
                <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
                  <TableHead className="pl-5">Insumo</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead className="text-right">Previsto</TableHead>
                  <TableHead className="text-right">Real</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="numeros">
                {ordem.consumos.map((c) => (
                  <TableRow key={c.id} className="h-11">
                    <TableCell className="pl-5">{c.insumo?.nome ?? "Insumo"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {c.lote?.codigo ?? "mais antigo"}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.quantidade_prevista == null
                        ? "Sem dados"
                        : formatarQuantidade(c.quantidade_prevista, c.insumo?.unidade_base)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatarQuantidade(c.quantidade_real, c.insumo?.unidade_base)}
                    </TableCell>
                    <TableCell className="text-right">{formatarMoeda(c.valor, 4)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
      {ordem.instrucoes && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">Instruções</h2>
          <p className="text-sm whitespace-pre-line text-texto-2">{ordem.instrucoes}</p>
        </section>
      )}
    </div>
  );
}

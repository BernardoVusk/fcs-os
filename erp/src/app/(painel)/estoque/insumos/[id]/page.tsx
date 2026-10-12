import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import {
  categoriasDeInsumo,
  listarLotes,
  listarUnidades,
  obterEstoqueDoInsumo,
  obterInsumo,
} from "@/dados/estoque/insumos";
import { listarMovimentacoes } from "@/dados/estoque/movimentacoes";
import { TIPO_INSUMO_ROTULO, type TipoInsumo } from "@/dominio/estoque/conversao";
import { custoDeReposicao, type OrigemCusto } from "@/dominio/estoque/custo-medio";
import { formatarQuantidade } from "@/lib/formatos/numero";
import { formatarCustoUnitario, formatarMoeda } from "@/lib/formatos/moeda";
import { CartaoIndicador } from "@/componentes/painel/CartaoIndicador";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";
import { Banner } from "@/componentes/painel/Banner";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/ui/tabs";
import { FormInsumo } from "@/componentes/estoque/FormInsumo";
import { FormMovimentacao } from "@/componentes/estoque/FormMovimentacao";
import { TabelaLotes } from "@/componentes/estoque/TabelaLotes";
import { TabelaMovimentacoes } from "@/componentes/estoque/TabelaMovimentacoes";

export default async function PaginaInsumo({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lote?: string }>;
}) {
  const usuario = await exigirLeitura("estoque");
  const { id } = await params;
  const { lote } = await searchParams;
  const insumo = await obterInsumo(id);
  if (!insumo) notFound();
  const [estoque, lotes, movimentacoes, unidades, categorias] = await Promise.all([
    obterEstoqueDoInsumo(id),
    listarLotes(id),
    listarMovimentacoes({ insumoId: id, limite: 100 }),
    listarUnidades(),
    categoriasDeInsumo(),
  ]);
  const editar = podeEscrever(usuario.papel, "estoque");
  const unidade = insumo.unidade_base;
  const saldo = estoque?.saldo ?? 0;
  const medio = formatarCustoUnitario(estoque?.custo_medio, unidade);
  const ultimo = formatarCustoUnitario(estoque?.ultimo_custo, unidade);
  const reposicao = custoDeReposicao({
    origem_custo: insumo.origem_custo as OrigemCusto,
    custo_medio: estoque?.custo_medio ?? null,
    ultimo_custo: estoque?.ultimo_custo ?? null,
    custo_manual: insumo.custo_manual,
  });
  const comSaldo = lotes
    .filter((l) => Number(l.quantidade_atual) > 0)
    .map((l) => ({ id: l.id, codigo: l.codigo, quantidade_atual: Number(l.quantidade_atual) }));
  const atributos = (insumo.atributos ?? {}) as {
    material?: string | null;
    cor?: string | null;
    cor_hex?: string | null;
    fabricante?: string | null;
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
              {insumo.nome}
            </h1>
            {atributos.cor_hex && (
              <span
                className="inline-block size-5 rounded-full border border-borda"
                style={{ background: atributos.cor_hex }}
                aria-label={`Cor ${atributos.cor ?? ""}`}
              />
            )}
            <Badge variant="outline">
              {TIPO_INSUMO_ROTULO[insumo.tipo as TipoInsumo] ?? insumo.tipo}
            </Badge>
            {!insumo.ativo && <Badge variant="secondary">Inativo</Badge>}
          </div>
          <p className="mt-1 text-sm text-texto-2">
            {[atributos.fabricante, atributos.material, atributos.cor]
              .filter(Boolean)
              .join(" · ") || "Sem dados técnicos"}
            {insumo.codigo_interno && (
              <span className="ml-2 font-mono text-xs text-texto-3">{insumo.codigo_interno}</span>
            )}
            {insumo.localizacao && (
              <span className="ml-2 text-texto-3">Local: {insumo.localizacao}</span>
            )}
          </p>
        </div>
        {editar && (
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/estoque/compras/nova">Registrar compra</Link>
            </Button>
            {insumo.ativo && (
              <DialogoNovo rotulo="Registrar movimentação" titulo={`Movimentar ${insumo.nome}`}>
                <FormMovimentacao
                  insumo={{ id: insumo.id, nome: insumo.nome, unidade_base: unidade }}
                  lotes={comSaldo}
                />
              </DialogoNovo>
            )}
          </div>
        )}
      </div>
      {estoque?.abaixo_minimo && (
        <Banner tipo="alerta" titulo="Abaixo do estoque mínimo">
          Saldo {formatarQuantidade(saldo, unidade)}, mínimo{" "}
          {formatarQuantidade(insumo.estoque_minimo, unidade)}.
        </Banner>
      )}
      {Number(estoque?.saldo_negativo ?? 0) < 0 && (
        <Banner tipo="erro" titulo="Há lote negativo">
          Um consumo passou do saldo com justificativa. Pese o rolo e registre um ajuste para fechar
          a diferença.
        </Banner>
      )}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        <CartaoIndicador
          rotulo="Saldo em estoque"
          valor={formatarQuantidade(saldo, unidade)}
          rodape={
            <span className="text-xs text-texto-3">
              {estoque?.lotes_com_saldo ?? 0} lote(s) com saldo
            </span>
          }
        />
        <CartaoIndicador
          rotulo="Valor em estoque"
          valor={estoque?.valor == null ? "R$ 0,00" : formatarMoeda(estoque.valor)}
        />
        <CartaoIndicador
          rotulo="Custo médio"
          valor={estoque?.custo_medio == null ? null : (medio.kg ?? medio.base)}
          dica="Sem compra confirmada"
          rodape={
            medio.kg && estoque?.custo_medio != null ? (
              <span className="text-xs text-texto-3">{medio.base}</span>
            ) : undefined
          }
        />
        <CartaoIndicador
          rotulo="Última compra"
          valor={estoque?.ultimo_custo == null ? null : (ultimo.kg ?? ultimo.base)}
          dica="Sem compra confirmada"
          rodape={
            ultimo.kg && estoque?.ultimo_custo != null ? (
              <span className="text-xs text-texto-3">{ultimo.base}</span>
            ) : undefined
          }
        />
        <CartaoIndicador
          rotulo="Custo para precificar"
          valor={
            reposicao.valor == null
              ? null
              : (formatarCustoUnitario(reposicao.valor, unidade).kg ??
                formatarCustoUnitario(reposicao.valor, unidade).base)
          }
          dica="Sem custo disponível"
          rodape={
            <span className="text-xs text-texto-3">
              Origem:{" "}
              {reposicao.origem === "media"
                ? "média ponderada"
                : reposicao.origem === "ultima_entrada"
                  ? "última compra"
                  : "manual"}
            </span>
          }
        />
      </div>
      <Tabs defaultValue="estoque">
        <TabsList>
          <TabsTrigger value="estoque">Lotes e movimentações</TabsTrigger>
          <TabsTrigger value="ficha">Ficha</TabsTrigger>
        </TabsList>
        <TabsContent value="estoque" className="space-y-6 pt-3">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Lotes</h2>
            <TabelaLotes lotes={lotes} unidade={unidade} destaque={lote} />
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Movimentações</h2>
            <TabelaMovimentacoes itens={movimentacoes} editar={editar} mostrarInsumo={false} />
          </section>
        </TabsContent>
        <TabsContent value="ficha" className="pt-3">
          <section className="rounded-2xl bg-card p-5 shadow-painel">
            {editar ? (
              <FormInsumo insumo={insumo} unidades={unidades} categorias={categorias} />
            ) : (
              <p className="text-sm text-texto-2">Somente leitura.</p>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

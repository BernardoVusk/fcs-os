import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { clienteServidor } from "@/lib/supabase/servidor";
import { obterProduto } from "@/dados/produtos/produtos";
import { contextoProduto } from "@/dados/produtos/calculo";
import { estoqueDoProduto, movimentacoesDoProduto } from "@/dados/produtos/estoque-produtos";
import { obterCalculo, lerSnapshot } from "@/dados/custos/calculos";
import { listarEstoque, listarInsumosAtivos, listarUnidades } from "@/dados/estoque/insumos";
import { listarImpressoras } from "@/dados/custos/impressoras";
import { listarCanais } from "@/dados/configuracoes/canais";
import { alterarStatusProduto } from "@/acoes/produtos/produtos";
import { formatarMoeda } from "@/lib/formatos/moeda";
import { formatarDataHora, hojeSaoPaulo } from "@/lib/formatos/data";
import { FormProduto, STATUS_PRODUTO } from "@/componentes/produtos/FormProduto";
import { FormVariacao, TabelaVariacoes } from "@/componentes/produtos/Variacoes";
import { FormMaterial, TabelaMateriais } from "@/componentes/produtos/Materiais";
import { FormPreco, TabelaPrecos } from "@/componentes/produtos/Precos";
import { FormArquivo, TabelaArquivos } from "@/componentes/produtos/Arquivos";
import { CustoProduto } from "@/componentes/produtos/CustoProduto";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";

export default async function PaginaProduto({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const usuario = await exigirLeitura("catalogo");
  const { id } = await params;
  const { aba } = await searchParams;
  const dados = await obterProduto(id);
  if (!dados) notFound();
  const { produto, variacoes, materiais, precos, anuncios, arquivos } = dados;
  const supabase = await clienteServidor();
  const [
    ctx,
    calculo,
    estoque,
    movimentacoes,
    filamentos,
    insumos,
    unidades,
    impressoras,
    canais,
    categorias,
    precosVigentes,
  ] = await Promise.all([
    contextoProduto(id, null),
    produto.calculo_atual_id ? obterCalculo(produto.calculo_atual_id) : Promise.resolve(null),
    estoqueDoProduto(id),
    movimentacoesDoProduto(id),
    listarEstoque({ tipo: "filamento", situacao: "ativos" }),
    listarInsumosAtivos(),
    listarUnidades(),
    listarImpressoras(false),
    listarCanais(),
    supabase
      .from("categorias")
      .select("id, nome")
      .eq("escopo", "produto")
      .eq("ativo", true)
      .order("ordem")
      .order("nome"),
    supabase.from("produtos_precos_vigentes").select("*").eq("produto_id", id),
  ]);
  const editar = podeEscrever(usuario.papel, "catalogo");
  const s = STATUS_PRODUTO[produto.status] ?? {
    rotulo: produto.status,
    variante: "outline" as const,
  };
  const opInsumos = filamentos.map((f) => ({ id: f.insumo_id!, nome: f.nome! }));
  const opImpressoras = impressoras.map((i) => ({ id: i.id, nome: i.nome }));
  const opCanais = canais.filter((c) => c.ativo).map((c) => ({ id: c.id!, nome: c.nome! }));
  const saldo = estoque.reduce((acc, e) => acc + Number(e.saldo ?? 0), 0);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
              {produto.nome}
            </h1>
            <Badge variant={s.variante}>{s.rotulo}</Badge>
            {produto.sku && <span className="font-mono text-sm text-texto-3">{produto.sku}</span>}
          </div>
          <p className="numeros mt-1 text-sm text-texto-2">
            {produto.custo_atual == null
              ? "Sem custo calculado"
              : `Custo ${formatarMoeda(produto.custo_atual, 4)} por peça`}{" "}
            · {saldo} peça(s) pronta(s)
            {produto.origem === "importacao" && " · veio da importação do catálogo"}
          </p>
        </div>
        {editar && (
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/producao/ordens/nova?produto=${produto.id}`}>
                Nova ordem de produção
              </Link>
            </Button>
            {produto.status !== "ativo" && (
              <BotaoAcao
                variant="outline"
                acao={alterarStatusProduto.bind(null, produto.id, "ativo")}
              >
                Ativar
              </BotaoAcao>
            )}
            {produto.status === "ativo" && (
              <BotaoAcao
                variant="outline"
                acao={alterarStatusProduto.bind(null, produto.id, "pausado")}
              >
                Pausar
              </BotaoAcao>
            )}
          </div>
        )}
      </div>
      <Tabs defaultValue={aba ?? "custo"}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="custo">Custo e margem</TabsTrigger>
          <TabsTrigger value="ficha">Ficha</TabsTrigger>
          <TabsTrigger value="variacoes">Variações ({variacoes.length})</TabsTrigger>
          <TabsTrigger value="materiais">Materiais ({materiais.length})</TabsTrigger>
          <TabsTrigger value="precos">Preços ({precos.length})</TabsTrigger>
          <TabsTrigger value="arquivos">Arquivos ({arquivos.length})</TabsTrigger>
          <TabsTrigger value="anuncios">Anúncios ({anuncios.length})</TabsTrigger>
          <TabsTrigger value="estoque">Peças prontas</TabsTrigger>
        </TabsList>
        <TabsContent value="custo" className="pt-3">
          {ctx ? (
            <CustoProduto
              ctx={ctx}
              calculoAtual={calculo ? lerSnapshot(calculo).resultado : null}
              precos={precosVigentes.data ?? []}
              editar={editar}
            />
          ) : (
            <p className="text-sm text-texto-2">Sem dados.</p>
          )}
        </TabsContent>
        <TabsContent value="ficha" className="pt-3">
          {editar ? (
            <FormProduto
              produto={produto}
              categorias={categorias.data ?? []}
              insumos={opInsumos}
              impressoras={opImpressoras}
            />
          ) : (
            <p className="text-sm text-texto-2">Somente leitura.</p>
          )}
        </TabsContent>
        <TabsContent value="variacoes" className="space-y-3 pt-3">
          {editar && (
            <div className="flex justify-end">
              <DialogoNovo rotulo="Nova variação" titulo="Nova variação">
                <FormVariacao
                  produtoId={produto.id}
                  insumos={opInsumos}
                  impressoras={opImpressoras}
                />
              </DialogoNovo>
            </div>
          )}
          <TabelaVariacoes
            produtoId={produto.id}
            variacoes={variacoes}
            editar={editar}
            insumos={opInsumos}
            impressoras={opImpressoras}
          />
        </TabsContent>
        <TabsContent value="materiais" className="space-y-3 pt-3">
          {editar && (
            <div className="flex justify-end">
              <DialogoNovo rotulo="Novo material" titulo="Material da lista">
                <FormMaterial
                  produtoId={produto.id}
                  variacoes={variacoes}
                  insumos={insumos}
                  unidades={unidades}
                />
              </DialogoNovo>
            </div>
          )}
          <TabelaMateriais
            produtoId={produto.id}
            materiais={materiais}
            variacoes={variacoes}
            editar={editar}
            insumos={insumos}
            unidades={unidades}
          />
        </TabsContent>
        <TabsContent value="precos" className="space-y-3 pt-3">
          {editar && (
            <div className="flex justify-end">
              <DialogoNovo rotulo="Novo preço" titulo="Preço por canal">
                <FormPreco produtoId={produto.id} variacoes={variacoes} canais={opCanais} />
              </DialogoNovo>
            </div>
          )}
          <TabelaPrecos
            produtoId={produto.id}
            precos={precos}
            variacoes={variacoes}
            editar={editar}
            hoje={hojeSaoPaulo()}
            margemAlvo={produto.margem_alvo ?? ctx?.parametros?.dados.margem_alvo_padrao ?? null}
          />
        </TabsContent>
        <TabsContent value="arquivos" className="space-y-3 pt-3">
          {editar && (
            <div className="flex justify-end">
              <DialogoNovo rotulo="Novo arquivo" titulo="Arquivo do produto">
                <FormArquivo produtoId={produto.id} variacoes={variacoes} />
              </DialogoNovo>
            </div>
          )}
          <TabelaArquivos produtoId={produto.id} arquivos={arquivos} editar={editar} />
        </TabsContent>
        <TabsContent value="anuncios" className="pt-3">
          {anuncios.length === 0 ? (
            <p className="text-sm text-texto-2">
              Nenhum anúncio ligado. A importação do catálogo liga anúncios dos marketplaces a este
              produto.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
              <Table>
                <TableHeader>
                  <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
                    <TableHead className="pl-5">Canal</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead>Coletado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anuncios.map((a) => (
                    <TableRow key={a.id} className="h-11">
                      <TableCell className="pl-5">{a.canal?.nome ?? "Canal"}</TableCell>
                      <TableCell className="font-mono text-xs">{a.codigo_externo}</TableCell>
                      <TableCell className="max-w-md truncate" title={a.titulo ?? ""}>
                        {a.titulo}
                      </TableCell>
                      <TableCell className="numeros text-right">{formatarMoeda(a.preco)}</TableCell>
                      <TableCell className="numeros text-right">
                        {a.estoque ?? "Sem dados"}
                      </TableCell>
                      <TableCell className="numeros text-right">
                        {a.vendas_total ?? "Sem dados"}
                      </TableCell>
                      <TableCell className="numeros">{a.coletado_em ?? "Sem dados"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
        <TabsContent value="estoque" className="space-y-3 pt-3">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
            {estoque.map((e) => (
              <div
                key={`${e.produto_id}-${e.variacao_id ?? "base"}`}
                className="rounded-2xl bg-card p-4 shadow-painel"
              >
                <p className="text-[13px] text-texto-2">
                  {e.variacao_id
                    ? (variacoes.find((v) => v.id === e.variacao_id)?.nome ?? "Variação")
                    : "Produto base"}
                </p>
                <p className="numeros mt-1 text-lg font-semibold">{e.saldo ?? 0} peça(s)</p>
                <p className="numeros text-xs text-texto-3">
                  {e.custo_medio == null
                    ? "sem custo"
                    : `média ${formatarMoeda(e.custo_medio, 4)} por peça · ${formatarMoeda(e.valor)}`}
                </p>
              </div>
            ))}
          </div>
          {movimentacoes.length === 0 ? (
            <p className="text-sm text-texto-2">
              Nenhuma movimentação. Peças prontas entram ao concluir uma ordem de produção.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
              <Table>
                <TableHeader>
                  <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
                    <TableHead className="pl-5">Quando</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Peças</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentacoes.map((m) => (
                    <TableRow key={m.id} className="h-11">
                      <TableCell className="numeros pl-5">{formatarDataHora(m.em)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{m.tipo}</Badge>
                      </TableCell>
                      <TableCell className="numeros text-right">
                        {m.quantidade > 0 ? `+${m.quantidade}` : m.quantidade}
                      </TableCell>
                      <TableCell className="numeros text-right">
                        {formatarMoeda(m.valor, 4)}
                      </TableCell>
                      <TableCell className="text-texto-2">{m.motivo ?? ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { categoriasDeInsumo, listarEstoque, listarUnidades } from "@/dados/estoque/insumos";
import { TabelaInsumos } from "@/componentes/estoque/TabelaInsumos";
import { FiltrosEstoque, type FiltrosEstoqueUrl } from "@/componentes/estoque/FiltrosEstoque";
import { FormInsumo } from "@/componentes/estoque/FormInsumo";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";

export const metadata = { title: "Insumos" };

export default async function PaginaInsumos({
  searchParams,
}: {
  searchParams: Promise<FiltrosEstoqueUrl & { novo?: string }>;
}) {
  const usuario = await exigirLeitura("estoque");
  const f = await searchParams;
  const situacao = f.situacao === "inativos" ? "inativos" : "ativos";
  const [itens, todos, unidades, categorias] = await Promise.all([
    listarEstoque({ tipo: f.tipo, situacao, abaixoMinimo: Boolean(f.minimo) }),
    listarEstoque({ situacao: "todos" }),
    listarUnidades(),
    categoriasDeInsumo(),
  ]);
  const editar = podeEscrever(usuario.papel, "estoque");
  const botaoNovo = editar ? (
    <DialogoNovo rotulo="Novo insumo" titulo="Novo insumo" abrirInicial={f.novo === "1"}>
      <FormInsumo unidades={unidades} categorias={categorias} />
    </DialogoNovo>
  ) : null;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Insumos</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Filamentos, embalagens e componentes com saldo por lote e custo médio. O saldo nasce das
            compras confirmadas e das movimentações.
          </p>
        </div>
        {botaoNovo}
      </div>
      <FiltrosEstoque filtros={f} tiposPresentes={[...new Set(todos.map((i) => i.tipo ?? ""))]} />
      <TabelaInsumos
        itens={itens}
        vazio={{
          titulo:
            f.tipo || f.minimo || f.situacao
              ? "Nada com esses filtros"
              : "Nenhum insumo cadastrado",
          descricao:
            "Comece pelo filamento que está na impressora: nome, peso útil do rolo e estoque mínimo.",
          acao: botaoNovo,
        }}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarEstoque } from "@/dados/estoque/insumos";
import { listarImpressoras } from "@/dados/custos/impressoras";
import { clienteServidor } from "@/lib/supabase/servidor";
import { FormProduto } from "@/componentes/produtos/FormProduto";

export const metadata = { title: "Novo produto" };

export default async function PaginaNovoProduto() {
  const usuario = await exigirLeitura("catalogo");
  if (!podeEscrever(usuario.papel, "catalogo")) redirect("/catalogo/produtos");
  const supabase = await clienteServidor();
  const [filamentos, impressoras, categorias] = await Promise.all([
    listarEstoque({ tipo: "filamento", situacao: "ativos" }),
    listarImpressoras(false),
    supabase
      .from("categorias")
      .select("id, nome")
      .eq("escopo", "produto")
      .eq("ativo", true)
      .order("ordem")
      .order("nome"),
  ]);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Novo produto</h1>
        <p className="mt-1 text-sm text-texto-2">
          Depois de criar, você adiciona variações, materiais, preços e arquivos na ficha.
        </p>
      </div>
      <FormProduto
        categorias={categorias.data ?? []}
        insumos={filamentos.map((f) => ({ id: f.insumo_id!, nome: f.nome! }))}
        impressoras={impressoras.map((i) => ({ id: i.id, nome: i.nome }))}
      />
    </div>
  );
}

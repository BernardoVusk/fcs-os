import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarFornecedores } from "@/dados/estoque/fornecedores";
import { listarInsumosAtivos, listarUnidades } from "@/dados/estoque/insumos";
import { FormCompra } from "@/componentes/estoque/FormCompra";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { Button } from "@/componentes/ui/button";

export const metadata = { title: "Nova compra" };

export default async function PaginaNovaCompra() {
  const usuario = await exigirLeitura("estoque");
  const editar = podeEscrever(usuario.papel, "estoque");
  const [fornecedores, insumos, unidades] = await Promise.all([
    listarFornecedores(false),
    listarInsumosAtivos(),
    listarUnidades(),
  ]);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Nova compra</h1>
        <p className="mt-1 max-w-2xl text-sm text-texto-2">
          Preço por rolo ou por unidade, frete e desconto do pedido. O custo por grama aparece antes
          de salvar.
        </p>
      </div>
      {!editar ? (
        <p className="text-sm text-texto-2">Sua conta só lê.</p>
      ) : insumos.length === 0 ? (
        <EstadoVazio
          titulo="Cadastre um insumo antes"
          descricao="A compra precisa de pelo menos um insumo ativo."
          acao={
            <Button asChild size="sm">
              <Link href="/estoque/insumos?novo=1">Novo insumo</Link>
            </Button>
          }
        />
      ) : (
        <FormCompra fornecedores={fornecedores} insumos={insumos} unidades={unidades} />
      )}
    </div>
  );
}

import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarContas, listarContasCompletas } from "@/dados/financeiro/financeiro";
import { listarCanais } from "@/dados/configuracoes/canais";
import { FormConta, TabelaContas } from "@/componentes/financeiro/Cadastros";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";

export const metadata = { title: "Contas financeiras" };

export default async function PaginaContas({
  searchParams,
}: {
  searchParams: Promise<{ novo?: string }>;
}) {
  const usuario = await exigirLeitura("financeiro");
  const { novo } = await searchParams;
  const [contas, completas, canais] = await Promise.all([
    listarContas(),
    listarContasCompletas(),
    listarCanais(),
  ]);
  const editar = podeEscrever(usuario.papel, "financeiro");
  const opCanais = canais.map((c) => ({ id: c.id!, nome: c.nome! }));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Contas</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Banco, carteira, cartão e o saldo em cada marketplace. O saldo atual é o inicial mais
            tudo que foi realizado.
          </p>
        </div>
        {editar && (
          <DialogoNovo rotulo="Nova conta" titulo="Nova conta" abrirInicial={novo === "1"}>
            <FormConta canais={opCanais} />
          </DialogoNovo>
        )}
      </div>
      <TabelaContas contas={contas} completas={completas} canais={opCanais} editar={editar} />
    </div>
  );
}

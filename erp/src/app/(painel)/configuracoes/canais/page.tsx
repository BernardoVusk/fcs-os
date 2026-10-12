import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarCanais } from "@/dados/configuracoes/canais";
import { TabelaCanais } from "@/componentes/configuracoes/TabelaCanais";
import { FormCanal } from "@/componentes/configuracoes/FormCanal";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";

export const metadata = { title: "Canais de venda" };

export default async function PaginaCanais({ searchParams }: { searchParams: Promise<{ novo?: string }> }) {
  const usuario = await exigirLeitura("configuracoes");
  const { novo } = await searchParams;
  const canais = await listarCanais();
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Canais de venda</h1>
          <p className="text-sm text-texto-2">
            Taxa em branco significa não configurado. Confira os valores na central de cada canal.
          </p>
        </div>
        {podeEscrever(usuario.papel, "configuracoes") && (
          <DialogoNovo rotulo="Novo canal" titulo="Novo canal" abrirInicial={novo === "1"}>
            <FormCanal />
          </DialogoNovo>
        )}
      </div>
      <TabelaCanais canais={canais} />
    </div>
  );
}

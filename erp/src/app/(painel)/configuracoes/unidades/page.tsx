import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarUnidades } from "@/dados/configuracoes/unidades";
import { TabelaUnidades } from "@/componentes/configuracoes/TabelaUnidades";
import { FormUnidade } from "@/componentes/configuracoes/FormUnidade";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";

export const metadata = { title: "Unidades" };

export default async function PaginaUnidades({
  searchParams,
}: {
  searchParams: Promise<{ destaque?: string }>;
}) {
  const usuario = await exigirLeitura("configuracoes");
  const { destaque } = await searchParams;
  const unidades = await listarUnidades();
  const editar = podeEscrever(usuario.papel, "configuracoes");
  const bases = unidades.map((u) => u.codigo);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Unidades</h1>
          <p className="text-sm text-texto-2">
            Toda quantidade no sistema carrega uma unidade; o fator converte para a base (kg para g,
            h para min).
          </p>
        </div>
        {editar && (
          <DialogoNovo rotulo="Nova unidade" titulo="Nova unidade">
            <FormUnidade bases={bases} />
          </DialogoNovo>
        )}
      </div>
      <TabelaUnidades unidades={unidades} editar={editar} destaque={destaque} />
    </div>
  );
}

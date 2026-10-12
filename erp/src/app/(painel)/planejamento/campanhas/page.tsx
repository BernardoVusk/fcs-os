import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarCampanhas } from "@/dados/planejamento/planejamento";
import { FormCampanha, TabelaCampanhas } from "@/componentes/planejamento/Cadastros";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";

export const metadata = { title: "Campanhas" };

export default async function PaginaCampanhas() {
  const usuario = await exigirLeitura("planejamento");
  const campanhas = await listarCampanhas();
  const editar = podeEscrever(usuario.papel, "planejamento");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Campanhas</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Um lançamento, uma data comercial ou um tema do mês. Os itens ligados aparecem na lista
            filtrada pela campanha.
          </p>
        </div>
        {editar && (
          <DialogoNovo rotulo="Nova campanha" titulo="Nova campanha">
            <FormCampanha />
          </DialogoNovo>
        )}
      </div>
      <TabelaCampanhas campanhas={campanhas} editar={editar} />
    </div>
  );
}

import { exigirEscrita } from "@/lib/auth/sessao";
import { hojeSaoPaulo } from "@/lib/formatos/data";
import { opcoesPlanejamento } from "@/dados/planejamento/planejamento";
import { tipoValido } from "@/dominio/planejamento/tipos";
import { FormItem } from "@/componentes/planejamento/FormItem";

export const metadata = { title: "Novo item" };

export default async function PaginaNovoItem({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; prazo?: string }>;
}) {
  await exigirEscrita("planejamento");
  const sp = await searchParams;
  const opcoes = await opcoesPlanejamento();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Novo item</h1>
        <p className="mt-1 max-w-2xl text-sm text-texto-2">
          Tarefa, conteúdo ou projeto. Para criar rápido, use o botão Novo item no calendário.
        </p>
      </div>
      <div className="rounded-2xl bg-card p-5 shadow-painel">
        <FormItem
          opcoes={opcoes}
          tipoInicial={tipoValido(sp.tipo) ? sp.tipo : "tarefa"}
          prazoInicial={/^\d{4}-\d{2}-\d{2}$/.test(sp.prazo ?? "") ? sp.prazo : hojeSaoPaulo()}
        />
      </div>
    </div>
  );
}

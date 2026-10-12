import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { hojeSaoPaulo } from "@/lib/formatos/data";
import { listarItens, opcoesPlanejamento } from "@/dados/planejamento/planejamento";
import { somarDias } from "@/dominio/planejamento/calendario";
import { CabecalhoPlanejamento } from "@/componentes/planejamento/Cabecalho";
import { TabelaConteudos } from "@/componentes/planejamento/TabelaItens";
import { cn } from "@/lib/utils";

export const metadata = { title: "Conteúdos" };

const SITUACOES = [
  { chave: "", rotulo: "Abertos" },
  { chave: "publicados", rotulo: "Publicados" },
  { chave: "todos", rotulo: "Todos" },
];

export default async function PaginaConteudos({
  searchParams,
}: {
  searchParams: Promise<{ situacao?: string; destaque?: string }>;
}) {
  const usuario = await exigirLeitura("planejamento");
  const sp = await searchParams;
  const hoje = hojeSaoPaulo();
  const editar = podeEscrever(usuario.papel, "planejamento");
  const situacao = SITUACOES.some((s) => s.chave === sp.situacao) ? (sp.situacao ?? "") : "";
  const [todos, opcoes] = await Promise.all([
    listarItens({
      tipo: "conteudo",
      inicio: somarDias(hoje, -365),
      fim: somarDias(hoje, 365),
      incluirSemData: true,
      limite: 2000,
    }),
    opcoesPlanejamento(),
  ]);
  const itens =
    situacao === "todos"
      ? todos
      : situacao === "publicados"
        ? todos.filter((i) => i.publicado_em)
        : todos.filter((i) => !i.fechado);
  const pilula = (ativo: boolean) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-150",
      ativo ? "bg-card font-medium text-texto shadow-painel" : "text-texto-2 hover:text-texto",
    );
  return (
    <div className="space-y-5">
      <CabecalhoPlanejamento
        visao="conteudos"
        titulo="Conteúdos"
        descricao="Peças por formato e canal, com publicação e métricas registradas depois de postar."
        base="/planejamento/conteudos"
        editar={editar}
        opcoes={opcoes}
        tipoInicial="conteudo"
        prazoInicial={hoje}
      />
      <nav aria-label="Situação" className="inline-flex gap-0.5 rounded-full bg-superficie-2 p-1">
        {SITUACOES.map((s) => (
          <Link
            key={s.chave}
            href={
              s.chave ? `/planejamento/conteudos?situacao=${s.chave}` : "/planejamento/conteudos"
            }
            className={pilula(situacao === s.chave)}
            aria-current={situacao === s.chave ? "page" : undefined}
          >
            {s.rotulo}
          </Link>
        ))}
      </nav>
      <TabelaConteudos itens={itens} hoje={hoje} destaque={sp.destaque} />
    </div>
  );
}

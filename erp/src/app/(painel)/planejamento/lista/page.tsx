import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { hojeSaoPaulo } from "@/lib/formatos/data";
import { listarItens, opcoesPlanejamento } from "@/dados/planejamento/planejamento";
import { somarDias } from "@/dominio/planejamento/calendario";
import {
  aplicarFiltros,
  FILTRO_RAPIDO_ROTULO,
  FILTROS_RAPIDOS,
  lerFiltros,
} from "@/dominio/planejamento/filtros";
import {
  CANAIS_PUBLICACAO,
  CANAL_PUBLICACAO_ROTULO,
  TIPO_ITEM_ROTULO,
  TIPOS_ITEM,
} from "@/dominio/planejamento/tipos";
import { CabecalhoPlanejamento } from "@/componentes/planejamento/Cabecalho";
import { TabelaItens } from "@/componentes/planejamento/TabelaItens";
import { Button } from "@/componentes/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Lista" };

export default async function PaginaLista({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const usuario = await exigirLeitura("planejamento");
  const sp = await searchParams;
  const hoje = hojeSaoPaulo();
  const editar = podeEscrever(usuario.papel, "planejamento");
  const f = lerFiltros(sp);
  const [todos, opcoes] = await Promise.all([
    listarItens({
      inicio: somarDias(hoje, -180),
      fim: somarDias(hoje, 365),
      incluirSemData: true,
      limite: 2000,
    }),
    opcoesPlanejamento(),
  ]);
  const itens = aplicarFiltros(todos, f, hoje);
  const link = (mudanca: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const junto = {
      rapido: f.rapido === "todos" ? "" : f.rapido,
      tipo: f.tipo,
      status: f.status,
      canal: f.canal,
      campanha: f.campanha,
      q: f.q,
      ...mudanca,
    };
    for (const [k, v] of Object.entries(junto)) if (v) p.set(k, v);
    const q = p.toString();
    return q ? `/planejamento/lista?${q}` : "/planejamento/lista";
  };
  const pilula = (ativo: boolean) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-150",
      ativo ? "bg-card font-medium text-texto shadow-painel" : "text-texto-2 hover:text-texto",
    );
  return (
    <div className="space-y-5">
      <CabecalhoPlanejamento
        visao="lista"
        titulo="Lista"
        descricao={`${itens.length} item(ns). Últimos 6 meses, próximos 12 e os sem data.`}
        base="/planejamento/lista"
        editar={editar}
        opcoes={opcoes}
        prazoInicial={hoje}
      />
      <div className="flex flex-wrap items-center gap-2">
        <nav
          aria-label="Filtro rápido"
          className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-superficie-2 p-1"
        >
          {FILTROS_RAPIDOS.map((r) => (
            <Link
              key={r}
              href={link({ rapido: r === "todos" ? "" : r })}
              className={pilula(f.rapido === r)}
              aria-current={f.rapido === r ? "page" : undefined}
            >
              {FILTRO_RAPIDO_ROTULO[r]}
            </Link>
          ))}
        </nav>
        <form
          className="flex flex-wrap items-center gap-2"
          method="get"
          action="/planejamento/lista"
        >
          {f.rapido !== "todos" && <input type="hidden" name="rapido" value={f.rapido} />}
          <select
            name="tipo"
            defaultValue={f.tipo}
            aria-label="Tipo"
            className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Todos os tipos</option>
            {TIPOS_ITEM.map((t) => (
              <option key={t} value={t}>
                {TIPO_ITEM_ROTULO[t]}
              </option>
            ))}
          </select>
          <select
            name="canal"
            defaultValue={f.canal}
            aria-label="Canal"
            className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Todos os canais</option>
            {CANAIS_PUBLICACAO.map((c) => (
              <option key={c} value={c}>
                {CANAL_PUBLICACAO_ROTULO[c]}
              </option>
            ))}
          </select>
          <select
            name="campanha"
            defaultValue={f.campanha}
            aria-label="Campanha"
            className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Todas as campanhas</option>
            {opcoes.campanhas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <input
            name="q"
            defaultValue={f.q}
            placeholder="Buscar no título ou tags"
            aria-label="Busca"
            className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
          />
          <Button type="submit" variant="outline" size="sm">
            Filtrar
          </Button>
        </form>
      </div>
      <TabelaItens itens={itens} hoje={hoje} destaque={sp.destaque} />
    </div>
  );
}

import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { hojeSaoPaulo } from "@/lib/formatos/data";
import { fluxoDe, listarItens, opcoesPlanejamento } from "@/dados/planejamento/planejamento";
import { intervaloDoMes, lerMes } from "@/dominio/planejamento/calendario";
import { montarQuadro } from "@/dominio/planejamento/filtros";
import {
  TIPO_ITEM_ROTULO,
  TIPOS_ITEM,
  tipoValido,
  type TipoItem,
} from "@/dominio/planejamento/tipos";
import { CabecalhoPlanejamento } from "@/componentes/planejamento/Cabecalho";
import { Quadro } from "@/componentes/planejamento/Quadro";
import { cn } from "@/lib/utils";

export const metadata = { title: "Quadro" };

export default async function PaginaQuadro({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; mes?: string }>;
}) {
  const usuario = await exigirLeitura("planejamento");
  const sp = await searchParams;
  const hoje = hojeSaoPaulo();
  const editar = podeEscrever(usuario.papel, "planejamento");
  const tipo: TipoItem = tipoValido(sp.tipo) ? sp.tipo : "conteudo";
  const mes = lerMes(sp.mes, hoje);
  const { inicio, fim } = intervaloDoMes(mes);
  // Abertos de qualquer data (inclusive sem data) mais os fechados do mês, para a última coluna não crescer sem fim.
  const [abertos, doMes, opcoes] = await Promise.all([
    listarItens({
      tipo,
      abertos: true,
      inicio: "2000-01-01",
      fim: "2100-12-31",
      incluirSemData: true,
      limite: 500,
    }),
    listarItens({ tipo, inicio, fim, limite: 500 }),
    opcoesPlanejamento(),
  ]);
  const vistos = new Set(abertos.map((i) => i.id));
  const itens = [...abertos, ...doMes.filter((i) => i.fechado && !vistos.has(i.id))];
  const quadro = montarQuadro(itens, fluxoDe(opcoes.fluxos, tipo));
  const pilula = (ativo: boolean) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-150",
      ativo ? "bg-card font-medium text-texto shadow-painel" : "text-texto-2 hover:text-texto",
    );
  return (
    <div className="space-y-5">
      <CabecalhoPlanejamento
        visao="quadro"
        titulo={`Quadro de ${TIPO_ITEM_ROTULO[tipo].toLowerCase()}s`}
        descricao="Arraste o cartão entre colunas ou use o seletor dele. Abertos de qualquer mês; fechados só do mês escolhido."
        mes={mes}
        base={`/planejamento/quadro?tipo=${tipo}`}
        editar={editar}
        opcoes={opcoes}
        tipoInicial={tipo}
        extras={
          <nav aria-label="Tipo" className="inline-flex gap-0.5 rounded-full bg-superficie-2 p-1">
            {TIPOS_ITEM.map((t) => (
              <Link
                key={t}
                href={`/planejamento/quadro?tipo=${t}&mes=${mes}`}
                className={pilula(tipo === t)}
                aria-current={tipo === t ? "page" : undefined}
              >
                {TIPO_ITEM_ROTULO[t]}s
              </Link>
            ))}
          </nav>
        }
      />
      <Quadro key={`${tipo}-${mes}-${itens.length}`} quadro={quadro} hoje={hoje} editar={editar} />
    </div>
  );
}

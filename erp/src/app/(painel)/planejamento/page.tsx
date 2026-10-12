import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { hojeSaoPaulo } from "@/lib/formatos/data";
import {
  fluxoDe,
  listarItens,
  listarItensDoMes,
  obterItem,
  opcoesPlanejamento,
} from "@/dados/planejamento/planejamento";
import {
  dataValida,
  inicioDaSemana,
  lerMes,
  semanaDe,
  somarDias,
} from "@/dominio/planejamento/calendario";
import { resumir } from "@/dominio/planejamento/filtros";
import { CabecalhoPlanejamento } from "@/componentes/planejamento/Cabecalho";
import { CalendarioMes, SemanaVista } from "@/componentes/planejamento/Calendario";
import { DrawerItem } from "@/componentes/planejamento/DrawerItem";

export const metadata = { title: "Planejamento" };

export default async function PaginaCalendario({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; semana?: string; item?: string }>;
}) {
  const usuario = await exigirLeitura("planejamento");
  const sp = await searchParams;
  const hoje = hojeSaoPaulo();
  const editar = podeEscrever(usuario.papel, "planejamento");
  const semana = dataValida(sp.semana) ? inicioDaSemana(sp.semana) : null;
  const mes = lerMes(sp.mes, hoje);
  const [itens, opcoes, aberto] = await Promise.all([
    semana ? listarItens({ inicio: semana, fim: somarDias(semana, 6) }) : listarItensDoMes(mes),
    opcoesPlanejamento(),
    sp.item && /^[0-9a-f-]{36}$/i.test(sp.item) ? obterItem(sp.item) : Promise.resolve(null),
  ]);
  const base = "/planejamento";
  const query = semana ? `semana=${semana}` : `mes=${mes}`;
  const hrefDe = (id: string) => `${base}?${query}&item=${id}`;
  const r = resumir(itens, hoje);
  const descricao = semana
    ? `${r.total} item(ns) na semana${r.atrasados ? `, ${r.atrasados} atrasado(s)` : ""}`
    : `${r.total - r.semData} com data no mês${r.semData ? `, ${r.semData} sem data` : ""}${r.atrasados ? `, ${r.atrasados} atrasado(s)` : ""}`;
  return (
    <div className="space-y-5">
      <CabecalhoPlanejamento
        visao="calendario"
        titulo={semana ? "Semana" : "Calendário"}
        descricao={descricao}
        mes={semana ? undefined : mes}
        semana={semana ?? undefined}
        base={base}
        editar={editar}
        opcoes={opcoes}
        prazoInicial={semana ?? (mes === hoje.slice(0, 7) ? hoje : `${mes}-01`)}
      />
      {semana ? (
        <SemanaVista semana={semanaDe(semana)} itens={itens} hoje={hoje} hrefDe={hrefDe} />
      ) : (
        <CalendarioMes
          mes={mes}
          itens={itens}
          hoje={hoje}
          hrefDe={hrefDe}
          hrefSemana={(dia) => `${base}?semana=${dia}`}
        />
      )}
      <DrawerItem
        item={aberto}
        fluxo={aberto ? fluxoDe(opcoes.fluxos, aberto.tipo) : []}
        editar={editar}
        voltar={`${base}?${query}`}
      />
    </div>
  );
}

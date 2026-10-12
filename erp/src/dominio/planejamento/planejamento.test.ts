import { describe, expect, it } from "vitest";
import {
  agruparPorDia,
  dataComDia,
  deslocarMes,
  diaDaSemana,
  gradeCalendario,
  inicioDaSemana,
  intervaloDoMes,
  lerMes,
  mesDoItem,
  nomeMes,
  semanaDe,
} from "./calendario";
import {
  aplicarFiltros,
  atrasado,
  ehHoje,
  lerFiltros,
  montarQuadro,
  moverNoQuadro,
  nestaSemana,
  nosProximosDias,
  ordenarItens,
  resumir,
  type ItemBase,
} from "./filtros";
import {
  alternarChecklist,
  camposParaDuplicar,
  checklistDeTexto,
  checklistInicial,
  lerCamposModelo,
  lerChecklist,
  lerLigacoes,
  lerMetricas,
  lerTags,
  ligacoesDeTexto,
  progressoChecklist,
} from "./tipos";

const hoje = "2026-10-14"; // quarta-feira

function item(p: Partial<ItemBase> & { id: string }): ItemBase {
  return {
    tipo: "tarefa",
    titulo: p.id,
    status: "a_fazer",
    prioridade: "media",
    inicio: null,
    prazo: null,
    fechado: false,
    ...p,
  };
}

describe("calendário", () => {
  it("grade de outubro de 2026 começa na quinta e tem 5 semanas de 7 células", () => {
    const g = gradeCalendario("2026-10");
    expect(g.length).toBe(5);
    expect(g.every((s) => s.length === 7)).toBe(true);
    expect(g[0]).toEqual([
      null,
      null,
      null,
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(g[4][6]).toBe(null);
    expect(g[4][5]).toBe("2026-10-31");
  });
  it("fevereiro de 2027 (28 dias, começa na segunda) tem 4 semanas cheias", () => {
    const g = gradeCalendario("2027-02");
    expect(g.length).toBe(4);
    expect(g[0][0]).toBe("2027-02-01");
    expect(g[3][6]).toBe("2027-02-28");
  });
  it("semana, dia da semana e nomes", () => {
    expect(diaDaSemana("2026-10-12")).toBe(0);
    expect(diaDaSemana("2026-10-18")).toBe(6);
    expect(inicioDaSemana(hoje)).toBe("2026-10-12");
    expect(semanaDe(hoje)).toEqual([
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
    ]);
    expect(dataComDia(hoje)).toBe("Qua 14/10");
    expect(nomeMes("2026-03")).toBe("março de 2026");
    expect(deslocarMes("2026-12", 1)).toBe("2027-01");
    expect(deslocarMes("2026-01", -1)).toBe("2025-12");
  });
  it("lê o mês da URL com fallback e calcula o intervalo com as pontas das semanas", () => {
    expect(lerMes("2027-02", hoje)).toBe("2027-02");
    expect(lerMes("2026-13", hoje)).toBe("2026-10");
    expect(lerMes(undefined, hoje)).toBe("2026-10");
    expect(intervaloDoMes("2026-10")).toEqual({ inicio: "2026-09-28", fim: "2026-11-01" });
  });
  it("mês do item vem do prazo, senão do início; agrupa por dia com sem data em vazio", () => {
    expect(mesDoItem({ prazo: "2026-11-02", inicio: "2026-10-30" })).toBe("2026-11");
    expect(mesDoItem({ prazo: null, inicio: "2026-10-30" })).toBe("2026-10");
    expect(mesDoItem({ prazo: null, inicio: null })).toBe(null);
    const m = agruparPorDia([
      { id: "a", prazo: hoje, inicio: null },
      { id: "b", prazo: null, inicio: null },
      { id: "c", prazo: hoje, inicio: null },
    ]);
    expect(m.get(hoje)!.map((i) => i.id)).toEqual(["a", "c"]);
    expect(m.get("")!.map((i) => i.id)).toEqual(["b"]);
  });
});

describe("filtros e ordenação", () => {
  const itens: ItemBase[] = [
    item({ id: "atrasado", prazo: "2026-10-10" }),
    item({ id: "fechado-antigo", prazo: "2026-10-10", fechado: true, status: "concluida" }),
    item({ id: "hoje-tarde", prazo: hoje, horario: "15:00:00", prioridade: "baixa" }),
    item({ id: "hoje-manha", prazo: hoje, horario: "09:00:00" }),
    item({ id: "hoje-alta", prazo: hoje, prioridade: "alta" }),
    item({
      id: "semana",
      prazo: "2026-10-17",
      tipo: "conteudo",
      canal_publicacao: "instagram",
      titulo: "Reel do Porsche",
    }),
    item({ id: "sem-data", titulo: "Pesquisar tendências" }),
    item({
      id: "futuro",
      prazo: "2026-11-05",
      titulo: "Fotos de produto",
      tags: ["foto", "shopee"],
    }),
  ];
  it("atrasado, hoje, semana e próximos dias ignoram fechados", () => {
    expect(atrasado(itens[0], hoje)).toBe(true);
    expect(atrasado(itens[1], hoje)).toBe(false);
    expect(ehHoje(itens[3], hoje)).toBe(true);
    expect(nestaSemana(itens[5], hoje)).toBe(true);
    expect(nestaSemana(itens[7], hoje)).toBe(false);
    expect(nosProximosDias(itens[5], hoje, 7)).toBe(true);
    expect(nosProximosDias(itens[0], hoje, 7)).toBe(false);
  });
  it("ordena por data, horário, prioridade e título; sem data por último", () => {
    expect(ordenarItens(itens).map((i) => i.id)).toEqual([
      "atrasado",
      "fechado-antigo",
      "hoje-manha",
      "hoje-tarde",
      "hoje-alta",
      "semana",
      "futuro",
      "sem-data",
    ]);
  });
  it("filtros rápidos, tipo, canal e busca sem acento", () => {
    const f = lerFiltros({ rapido: "hoje" });
    expect(aplicarFiltros(itens, f, hoje).map((i) => i.id)).toEqual([
      "hoje-tarde",
      "hoje-manha",
      "hoje-alta",
    ]);
    expect(
      aplicarFiltros(itens, lerFiltros({ rapido: "atrasados" }), hoje).map((i) => i.id),
    ).toEqual(["atrasado"]);
    expect(
      aplicarFiltros(itens, lerFiltros({ rapido: "sem_data" }), hoje).map((i) => i.id),
    ).toEqual(["sem-data"]);
    expect(aplicarFiltros(itens, lerFiltros({ tipo: "conteudo" }), hoje).map((i) => i.id)).toEqual([
      "semana",
    ]);
    expect(
      aplicarFiltros(itens, lerFiltros({ canal: "instagram" }), hoje).map((i) => i.id),
    ).toEqual(["semana"]);
    expect(aplicarFiltros(itens, lerFiltros({ q: "TENDENCIAS" }), hoje).map((i) => i.id)).toEqual([
      "sem-data",
    ]);
    expect(aplicarFiltros(itens, lerFiltros({ q: "shopee foto" }), hoje).map((i) => i.id)).toEqual([
      "futuro",
    ]);
    expect(lerFiltros({ rapido: "x", tipo: "y", status: "A-B", campanha: "nao" })).toEqual({
      rapido: "todos",
      tipo: "",
      status: "",
      canal: "",
      campanha: "",
      q: "",
    });
  });
  it("resumo conta abertos, atrasados, hoje e sem data", () => {
    expect(resumir(itens, hoje)).toEqual({
      total: 8,
      abertos: 7,
      fechados: 1,
      atrasados: 1,
      hoje: 3,
      semData: 1,
    });
  });
});

describe("quadro", () => {
  const fluxo = [
    { codigo: "a_fazer", nome: "A fazer", fechado: false },
    { codigo: "em_andamento", nome: "Em andamento", fechado: false },
    { codigo: "concluida", nome: "Concluída", fechado: true },
  ];
  const itens = [
    item({ id: "1", status: "a_fazer", prazo: "2026-10-20" }),
    item({ id: "2", status: "a_fazer", prazo: "2026-10-15" }),
    item({ id: "3", status: "em_andamento" }),
    item({ id: "fora", status: "inexistente" }),
  ];
  it("monta colunas na ordem do fluxo, ordenadas, ignorando status fora do fluxo", () => {
    const q = montarQuadro(itens, fluxo);
    expect(q.colunas.map((c) => c.codigo)).toEqual(["a_fazer", "em_andamento", "concluida"]);
    expect(q.colunas[0].itens.map((i) => i.id)).toEqual(["2", "1"]);
    expect(q.colunas[2].itens).toEqual([]);
  });
  it("mover põe no topo do destino com o status e fechado da coluna; destino inválido não muda", () => {
    const q = montarQuadro(itens, fluxo);
    const m = moverNoQuadro(q, "1", "concluida");
    expect(m.colunas[0].itens.map((i) => i.id)).toEqual(["2"]);
    expect(m.colunas[2].itens[0]).toMatchObject({ id: "1", status: "concluida", fechado: true });
    expect(moverNoQuadro(q, "1", "nao_existe")).toBe(q);
    expect(moverNoQuadro(q, "1", "a_fazer")).toBe(q);
  });
});

describe("checklist, ligações, métricas, tags e modelo", () => {
  it("lê checklist tolerante e calcula progresso", () => {
    const c = lerChecklist([
      { nome: " Pauta ", feito: true },
      { nome: "", feito: true },
      "x",
      { nome: "Visual" },
    ]);
    expect(c).toEqual([
      { nome: "Pauta", feito: true },
      { nome: "Visual", feito: false },
    ]);
    expect(progressoChecklist(c)).toBe(50);
    expect(progressoChecklist([])).toBe(0);
    expect(alternarChecklist(c, 1)[1].feito).toBe(true);
    expect(checklistInicial("carrossel").length).toBe(7);
    expect(checklistInicial("carrossel", ["Só uma"])).toEqual([{ nome: "Só uma", feito: false }]);
    expect(checklistInicial(null)).toEqual([]);
    expect(checklistDeTexto("A\n\n B \nC")).toEqual([
      { nome: "A", feito: false },
      { nome: "B", feito: false },
      { nome: "C", feito: false },
    ]);
  });
  it("ligações só com http(s); texto com rótulo | url", () => {
    expect(
      lerLigacoes([{ url: "javascript:alert(1)" }, { rotulo: "Drive", url: "https://x.y/z" }]),
    ).toEqual([{ rotulo: "Drive", url: "https://x.y/z" }]);
    expect(ligacoesDeTexto("Ref | https://a.b\nhttps://c.d")).toEqual([
      { rotulo: "Ref", url: "https://a.b" },
      { rotulo: "https://c.d", url: "https://c.d" },
    ]);
  });
  it("métricas só conhecidas e não negativas; tags únicas em minúsculas", () => {
    expect(lerMetricas({ alcance: 100, cliques: -1, outra: 5, curtidas: "7" })).toEqual({
      alcance: 100,
    });
    expect(lerTags("Foto, shopee ,FOTO, ")).toEqual(["foto", "shopee"]);
    expect(lerTags(["a", 1, "b"])).toEqual(["a", "b"]);
  });
  it("campos do modelo só válidos; duplicar zera datas, status e checklist", () => {
    expect(
      lerCamposModelo({
        titulo: " Reel ",
        prioridade: "urgente",
        formato: "reel",
        tags: "a,b",
        x: 1,
      }),
    ).toEqual({ titulo: "Reel", formato: "reel", tags: ["a", "b"] });
    const d = camposParaDuplicar({
      id: "1",
      titulo: "Original",
      status: "publicado",
      inicio: "2026-10-01",
      prazo: "2026-10-05",
      checklist: [{ nome: "A", feito: true }],
      metricas: { alcance: 3 },
      concluido_em: "x",
      publicado_em: "y",
      criado_em: "z",
      atualizado_em: "z",
      criado_por: "u",
      recorrencia_id: "r",
      briefing: "mantém",
    });
    expect(d).toEqual({
      titulo: "Original (cópia)",
      checklist: [{ nome: "A", feito: false }],
      origem: "duplicado",
      briefing: "mantém",
    });
  });
});

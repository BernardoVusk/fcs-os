import { podeLer, type Area, type Papel } from "@/lib/auth/papeis";
import type { NomeIcone } from "./Icone";

/** Fase mais recente entregue. Itens de fases futuras ficam ocultos. */
export const FASE_ATUAL = 5;

export type ItemNav = {
  rota: string;
  rotulo: string;
  icone: NomeIcone;
  area: Area;
  fase: number;
  contador?: "alertas";
};
export type GrupoNav = { rotulo: string; itens: ItemNav[] };

export const GRUPOS: GrupoNav[] = [
  {
    rotulo: "Geral",
    itens: [
      { rota: "/", rotulo: "Início", icone: "inicio", area: "inicio", fase: 1 },
      {
        rota: "/alertas",
        rotulo: "Alertas",
        icone: "alertas",
        area: "alertas",
        fase: 9,
        contador: "alertas",
      },
    ],
  },
  {
    rotulo: "Conhecimento",
    itens: [
      {
        rota: "/conhecimento",
        rotulo: "Base de conhecimento",
        icone: "conhecimento",
        area: "conhecimento",
        fase: 2,
      },
    ],
  },
  {
    rotulo: "Estoque",
    itens: [
      { rota: "/estoque/insumos", rotulo: "Insumos", icone: "estoque", area: "estoque", fase: 3 },
      {
        rota: "/estoque/movimentacoes",
        rotulo: "Movimentações",
        icone: "movimentacoes",
        area: "estoque",
        fase: 3,
      },
      { rota: "/estoque/compras", rotulo: "Compras", icone: "compras", area: "estoque", fase: 3 },
      {
        rota: "/estoque/fornecedores",
        rotulo: "Fornecedores",
        icone: "fornecedores",
        area: "estoque",
        fase: 3,
      },
    ],
  },
  {
    rotulo: "Catálogo",
    itens: [
      {
        rota: "/catalogo/produtos",
        rotulo: "Produtos",
        icone: "produtos",
        area: "catalogo",
        fase: 5,
      },
      {
        rota: "/catalogo/precificacao",
        rotulo: "Precificação",
        icone: "calculadora",
        area: "catalogo",
        fase: 4,
      },
    ],
  },
  {
    rotulo: "Produção",
    itens: [
      {
        rota: "/producao/fila",
        rotulo: "Fila de produção",
        icone: "producao",
        area: "producao",
        fase: 5,
      },
      {
        rota: "/producao/impressoras",
        rotulo: "Impressoras",
        icone: "impressoras",
        area: "producao",
        fase: 4,
      },
    ],
  },
  {
    rotulo: "Vendas",
    itens: [
      { rota: "/vendas/pedidos", rotulo: "Pedidos", icone: "pedidos", area: "vendas", fase: 6 },
      { rota: "/vendas/clientes", rotulo: "Clientes", icone: "clientes", area: "vendas", fase: 6 },
    ],
  },
  {
    rotulo: "Financeiro",
    itens: [
      {
        rota: "/financeiro",
        rotulo: "Visão geral",
        icone: "financeiro",
        area: "financeiro",
        fase: 7,
      },
      {
        rota: "/financeiro/lancamentos",
        rotulo: "Lançamentos",
        icone: "lancamentos",
        area: "financeiro",
        fase: 7,
      },
    ],
  },
  {
    rotulo: "Planejamento",
    itens: [
      {
        rota: "/planejamento",
        rotulo: "Calendário",
        icone: "planejamento",
        area: "planejamento",
        fase: 8,
      },
      {
        rota: "/planejamento/quadro",
        rotulo: "Quadro",
        icone: "quadro",
        area: "planejamento",
        fase: 8,
      },
    ],
  },
  {
    rotulo: "Relatórios",
    itens: [
      {
        rota: "/relatorios",
        rotulo: "Relatórios",
        icone: "relatorios",
        area: "relatorios",
        fase: 9,
      },
    ],
  },
  {
    rotulo: "Configurações",
    itens: [
      {
        rota: "/configuracoes/canais",
        rotulo: "Canais de venda",
        icone: "canais",
        area: "configuracoes",
        fase: 1,
      },
      {
        rota: "/configuracoes/categorias",
        rotulo: "Categorias",
        icone: "categorias",
        area: "configuracoes",
        fase: 1,
      },
      {
        rota: "/configuracoes/unidades",
        rotulo: "Unidades",
        icone: "unidades",
        area: "configuracoes",
        fase: 1,
      },
      {
        rota: "/configuracoes/parametros-custo",
        rotulo: "Parâmetros de custo",
        icone: "calculadora",
        area: "configuracoes",
        fase: 4,
      },
      {
        rota: "/configuracoes/usuarios",
        rotulo: "Usuários",
        icone: "usuarios",
        area: "usuarios",
        fase: 1,
      },
      {
        rota: "/configuracoes/integracoes",
        rotulo: "Integrações",
        icone: "integracoes",
        area: "usuarios",
        fase: 2,
      },
      {
        rota: "/configuracoes/auditoria",
        rotulo: "Auditoria",
        icone: "auditoria",
        area: "usuarios",
        fase: 9,
      },
    ],
  },
];

const TODAS_ROTAS = GRUPOS.flatMap((g) => g.itens.map((i) => i.rota));

export function gruposVisiveis(papel: Papel | null, fase = FASE_ATUAL): GrupoNav[] {
  return GRUPOS.map((g) => ({
    ...g,
    itens: g.itens.filter((i) => i.fase <= fase && podeLer(papel, i.area)),
  })).filter((g) => g.itens.length > 0);
}

/** Ativo quando a rota bate ou é prefixo, exceto se outro item for mais específico. */
export function itemAtivo(pathname: string, rota: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (rota === "/") return p === "/";
  if (p === rota) return true;
  const temFilho = TODAS_ROTAS.some((r) => r !== rota && r.startsWith(`${rota}/`));
  return !temFilho && p.startsWith(`${rota}/`);
}

const ROTULOS_SEGMENTO: Record<string, string> = {
  configuracoes: "Configurações",
  estoque: "Estoque",
  catalogo: "Catálogo",
  producao: "Produção",
  vendas: "Vendas",
  financeiro: "Financeiro",
  planejamento: "Planejamento",
  relatorios: "Relatórios",
  conhecimento: "Conhecimento",
  perfil: "Perfil",
  novo: "Novo",
  nova: "Nova",
  historico: "Histórico",
  precificacao: "Precificação",
  "parametros-custo": "Parâmetros de custo",
  produtos: "Produtos",
  importar: "Importar",
  fila: "Fila de produção",
  ordens: "Ordens de produção",
  impressoras: "Impressoras",
};

/** Trilha para o breadcrumb: rótulos conhecidos da navegação, resto vira o segmento. */
export function trilha(pathname: string): { rotulo: string; rota: string }[] {
  const partes = (pathname.replace(/\/+$/, "") || "/").split("/").filter(Boolean);
  const itens = GRUPOS.flatMap((g) => g.itens);
  const saida: { rotulo: string; rota: string }[] = [];
  let acumulado = "";
  for (const parte of partes) {
    acumulado += `/${parte}`;
    const item = itens.find((i) => i.rota === acumulado);
    saida.push({ rotulo: item?.rotulo ?? ROTULOS_SEGMENTO[parte] ?? parte, rota: acumulado });
  }
  return saida;
}

import "server-only";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { clienteAdmin } from "@/lib/supabase/admin";
import { podeEscrever, podeLer } from "@/lib/auth/papeis";
import { escopoPara, temEscopo, type FerramentaMcp } from "@/dominio/conhecimento/escopos";
import { contemSegredo } from "@/dominio/conhecimento/segredos";
import { CONFIDENCIALIDADES, lerTags, TIPOS_CONHECIMENTO } from "@/dominio/conhecimento/tipos";
import {
  listarConhecimentosCom,
  listarDecisoesCom,
  obterConhecimentoCom,
} from "@/dados/conhecimento";
import {
  atualizarConhecimento,
  criarConhecimento,
  type DadosAtualizacao,
  type DadosConhecimento,
} from "@/dados/conhecimento-escrita";
import {
  listarEstoqueCom,
  listarLotesCom,
  obterEstoqueDoInsumoCom,
  type EstoqueAtual,
} from "@/dados/estoque/insumos";
import { listarComponentesCom, obterParametrosVigentesCom } from "@/dados/custos/parametros";
import { parametrosFaltantes } from "@/dominio/custos/parametros";
import { VERSAO_MOTOR } from "@/dominio/custos/motor";
import { Limitador } from "./limite";
import { verificarToken, type SessaoMcp } from "./autenticacao";

const limitador = new Limitador(60, 60_000);

/** O que precisamos do contexto do handler: só o token já validado pelo withMcpAuth. */
type Ctx = { http?: { authInfo?: { token: string } } };

type Resposta = { content: { type: "text"; text: string }[]; isError?: boolean };

function texto(dados: unknown): Resposta {
  return {
    content: [
      { type: "text", text: typeof dados === "string" ? dados : JSON.stringify(dados, null, 2) },
    ],
  };
}
function erro(mensagem: string): Resposta {
  return { content: [{ type: "text", text: mensagem }], isError: true };
}

async function preparar(
  ctx: Ctx,
  ferramenta: FerramentaMcp,
): Promise<{ sessao: SessaoMcp } | { falha: Resposta }> {
  const token = ctx.http?.authInfo?.token;
  const sessao = token ? await verificarToken(token) : null;
  if (!sessao) return { falha: erro("Token inválido, revogado ou expirado.") };
  const escopo = escopoPara(ferramenta);
  if (!temEscopo(sessao.escopos, escopo)) {
    return {
      falha: erro(
        `Token sem o escopo ${escopo}. Crie outro em Configurações > Integrações do ERP.`,
      ),
    };
  }
  if (!limitador.permitir(sessao.tokenId).permitido) {
    return { falha: erro("Limite de 60 chamadas por minuto atingido. Aguarde um instante.") };
  }
  return { sessao };
}

function clienteDe(sessao: SessaoMcp) {
  return clienteAdmin("mcp", sessao.usuarioId);
}

function visivel(sessao: SessaoMcp, confidencialidade: string) {
  return sessao.papel === "dono" || confidencialidade === "interno";
}

function rota(id: string) {
  return `/conhecimento/${id}`;
}

export function registrarFerramentas(server: McpServer) {
  server.registerTool(
    "kb_buscar",
    {
      description:
        "Pesquisa a base de conhecimento da FCS 3D STUDIO (procedimentos, soluções, decisões, perfis de impressão). Busca em título, resumo, tags e conteúdo, sem acento.",
      inputSchema: z.object({
        termo: z.string().min(1).max(120).describe("Palavras a procurar, em português"),
        tipo: z.enum(TIPOS_CONHECIMENTO).optional(),
        tag: z.string().max(40).optional(),
        modulo: z.string().max(60).optional(),
        limite: z.number().int().min(1).max(20).optional(),
      }),
    },
    async (args, ctx) => {
      const p = await preparar(ctx, "kb_buscar");
      if ("falha" in p) return p.falha;
      if (!podeLer(p.sessao.papel, "conhecimento"))
        return erro("Seu papel não lê a base de conhecimento.");
      const lista = await listarConhecimentosCom(clienteDe(p.sessao), {
        termo: args.termo,
        tipo: args.tipo,
        tag: args.tag,
        modulo: args.modulo,
        limite: args.limite ?? 8,
      });
      const resultados = lista
        .filter((r) => visivel(p.sessao, r.confidencialidade))
        .map((r) => ({
          id: r.id,
          titulo: r.titulo,
          tipo: r.tipo,
          resumo: r.resumo,
          tags: r.tags,
          modulo: r.modulo,
          validado: r.validado,
          atualizado_em: r.atualizado_em,
          rota: rota(r.id),
        }));
      return texto({ total: resultados.length, resultados });
    },
  );

  server.registerTool(
    "kb_obter",
    {
      description: "Devolve um conhecimento completo (markdown e metadados) pelo id ou slug.",
      inputSchema: z.object({ id: z.string().min(3).max(120).describe("id (uuid) ou slug") }),
    },
    async (args, ctx) => {
      const p = await preparar(ctx, "kb_obter");
      if ("falha" in p) return p.falha;
      const r = await obterConhecimentoCom(clienteDe(p.sessao), args.id);
      if (!r || !visivel(p.sessao, r.confidencialidade))
        return erro("Conhecimento não encontrado.");
      return texto({
        id: r.id,
        slug: r.slug,
        titulo: r.titulo,
        tipo: r.tipo,
        resumo: r.resumo,
        tags: r.tags,
        modulo: r.modulo,
        projeto: r.projeto,
        referencia: r.referencia,
        validado: r.validado,
        status: r.status,
        versao: r.versao,
        atualizado_em: r.atualizado_em,
        estrutura: r.estrutura,
        conteudo: r.conteudo,
        rota: rota(r.id),
      });
    },
  );

  server.registerTool(
    "kb_salvar",
    {
      description:
        "Grava um conhecimento novo. Use só depois de o usuário confirmar a prévia. Recusa texto com chave, token ou senha.",
      inputSchema: z.object({
        titulo: z.string().min(3).max(160),
        resumo: z.string().max(400).optional(),
        conteudo: z.string().min(1).max(60000).describe("Markdown"),
        tipo: z.enum(TIPOS_CONHECIMENTO),
        categoria: z
          .string()
          .max(80)
          .optional()
          .describe("Nome de uma categoria do escopo conhecimento"),
        tags: z.array(z.string().max(40)).max(20).optional(),
        modulo: z.string().max(60).optional(),
        projeto: z.string().max(80).optional(),
        referencia: z
          .string()
          .max(500)
          .optional()
          .describe("Arquivos, commit ou contexto de origem"),
        confidencialidade: z.enum(CONFIDENCIALIDADES).optional(),
        estrutura: z
          .object({
            contexto: z.string().max(4000),
            alternativas: z.array(z.string().max(500)).max(20),
            decisao: z.string().max(4000),
            consequencias: z.string().max(4000),
          })
          .optional()
          .describe("Só para tipo decisao"),
      }),
    },
    async (args, ctx) => {
      const p = await preparar(ctx, "kb_salvar");
      if ("falha" in p) return p.falha;
      if (!podeEscrever(p.sessao.papel, "conhecimento"))
        return erro("Seu papel não grava na base de conhecimento.");
      for (const campo of [args.titulo, args.resumo, args.conteudo]) {
        const s = contemSegredo(campo);
        if (s.achou)
          return erro(
            `Recusado: o texto parece conter um segredo (${s.padrao}). Remova e tente de novo.`,
          );
      }
      const cliente = clienteDe(p.sessao);
      let categoriaId: string | null = null;
      if (args.categoria) {
        const { data } = await cliente
          .from("categorias")
          .select("id")
          .eq("escopo", "conhecimento")
          .ilike("nome", args.categoria.trim())
          .maybeSingle();
        categoriaId = data?.id ?? null;
      }
      const dados: DadosConhecimento = {
        titulo: args.titulo.trim(),
        resumo: args.resumo?.trim() || null,
        conteudo: args.conteudo,
        tipo: args.tipo,
        categoria_id: categoriaId,
        tags: lerTags((args.tags ?? []).join(",")),
        modulo: args.modulo?.trim() || null,
        projeto: args.projeto?.trim() || null,
        referencia: args.referencia?.trim() || null,
        confidencialidade: args.confidencialidade ?? "interno",
        estrutura: args.tipo === "decisao" && args.estrutura ? args.estrutura : null,
        status: "ativo",
      };
      const r = await criarConhecimento(cliente, dados, "claude_code");
      if (!r.ok) return erro(`Não foi possível salvar (${r.erro}).`);
      return texto({
        id: r.id,
        slug: r.slug,
        rota: rota(r.id),
        categoria_encontrada: args.categoria ? categoriaId !== null : undefined,
        mensagem: "Salvo. Peça ao usuário para validar na tela quando tiver certeza do conteúdo.",
      });
    },
  );

  server.registerTool(
    "kb_atualizar",
    {
      description:
        "Atualiza um conhecimento existente e guarda a versão anterior com o motivo. Só depois de o usuário confirmar.",
      inputSchema: z.object({
        id: z.uuid(),
        motivo: z.string().min(3).max(300),
        titulo: z.string().min(3).max(160).optional(),
        resumo: z.string().max(400).optional(),
        conteudo: z.string().min(1).max(60000).optional(),
        tags: z.array(z.string().max(40)).max(20).optional(),
        modulo: z.string().max(60).optional(),
        referencia: z.string().max(500).optional(),
        status: z.enum(["rascunho", "ativo", "arquivado"]).optional(),
      }),
    },
    async (args, ctx) => {
      const p = await preparar(ctx, "kb_atualizar");
      if ("falha" in p) return p.falha;
      if (!podeEscrever(p.sessao.papel, "conhecimento"))
        return erro("Seu papel não grava na base de conhecimento.");
      for (const campo of [args.titulo, args.resumo, args.conteudo]) {
        const s = contemSegredo(campo);
        if (s.achou) return erro(`Recusado: o texto parece conter um segredo (${s.padrao}).`);
      }
      const cliente = clienteDe(p.sessao);
      const atual = await obterConhecimentoCom(cliente, args.id);
      if (!atual || !visivel(p.sessao, atual.confidencialidade))
        return erro("Conhecimento não encontrado.");
      const dados: DadosAtualizacao = {};
      if (args.titulo) dados.titulo = args.titulo.trim();
      if (args.resumo !== undefined) dados.resumo = args.resumo.trim() || null;
      if (args.conteudo) dados.conteudo = args.conteudo;
      if (args.tags) dados.tags = lerTags(args.tags.join(","));
      if (args.modulo !== undefined) dados.modulo = args.modulo.trim() || null;
      if (args.referencia !== undefined) dados.referencia = args.referencia.trim() || null;
      if (args.status) dados.status = args.status;
      const r = await atualizarConhecimento(cliente, args.id, dados, args.motivo);
      if (!r.ok) return erro(`Não foi possível atualizar (${r.erro}).`);
      return texto({
        id: r.id,
        rota: rota(r.id),
        versao_anterior: atual.versao,
        mensagem: "Atualizado; a versão anterior ficou no histórico.",
      });
    },
  );

  server.registerTool(
    "kb_decisoes",
    {
      description:
        "Lista as decisões ativas (contexto, alternativas, decisão, consequências). Consulte antes de propor mudança de arquitetura ou de processo.",
      inputSchema: z.object({
        modulo: z.string().max(60).optional(),
        desde: z.iso.date().optional(),
      }),
    },
    async (args, ctx) => {
      const p = await preparar(ctx, "kb_decisoes");
      if ("falha" in p) return p.falha;
      const lista = await listarDecisoesCom(clienteDe(p.sessao), args.modulo, args.desde);
      return texto({
        total: lista.length,
        decisoes: lista.map((d) => ({
          id: d.id,
          titulo: d.titulo,
          modulo: d.modulo,
          validada: d.validado,
          atualizado_em: d.atualizado_em,
          estrutura: d.estrutura,
          resumo: d.resumo,
          rota: rota(d.id),
        })),
      });
    },
  );

  server.registerTool(
    "custos_regras",
    {
      description:
        "Fórmulas do motor de custos, parâmetros vigentes (versão, valores e o que falta) e componentes ligados. Consulte antes de explicar um custo ou propor mudança de precificação.",
      inputSchema: z.object({
        componente: z.string().max(60).optional().describe("Código de um componente para detalhar"),
      }),
    },
    async (args, ctx) => {
      const p = await preparar(ctx, "custos_regras");
      if ("falha" in p) return p.falha;
      const cliente = clienteDe(p.sessao);
      const [vigente, componentes] = await Promise.all([
        obterParametrosVigentesCom(cliente),
        listarComponentesCom(cliente),
      ]);
      const lista = args.componente
        ? componentes.filter((c) => c.codigo === args.componente)
        : componentes;
      return texto({
        versao_motor: VERSAO_MOTOR,
        documentacao: "erp/docs/formulas-de-custo.md",
        formulas: {
          fator_falha: "1 / (1 - f); incide em material, maquina, energia, preparo e fixo por hora",
          material: "peso_g * (1 + w) * fator_falha * custo_g (custo de reposicao do insumo)",
          maquina:
            "horas_por_peca_boa * (depreciacao + manutencao + consumiveis) por hora; energia = horas * potencia/1000 * tarifa",
          mao_de_obra:
            "preparo por ciclo / pecas por ciclo * fator_falha; acabamento e embalagem por peca boa sem falha",
          fixo: "hora: horas_por_peca_boa * custo_fixo_mensal / horas_produtivas_mes; peca: custo_fixo_mensal / volume_mensal",
          preco:
            "P0 = (C+F)/(1-t); Pm = (C+F)/(1-t-m); Pk = (C(1+k)+F)/(1-t); t = comissao+pagamento+imposto+ads; F = taxa fixa + frete subsidiado + complementares por pedido",
          arredondamento:
            "componentes 4 casas, custo por grama 6, preco sugerido para cima a 2 casas",
        },
        parametros_vigentes: vigente
          ? {
              versao: vigente.versao,
              vigente_desde: vigente.vigente_desde,
              valores: vigente.dados,
              faltam: parametrosFaltantes(vigente.dados),
            }
          : null,
        componentes: lista.map((c) => ({
          codigo: c.codigo,
          nome: c.nome,
          grupo: c.grupo,
          metodo: c.metodo,
          ativo: c.ativo,
          descricao: c.descricao,
        })),
      });
    },
  );

  server.registerTool(
    "produto_custo",
    {
      description: "Custo atual, quebra por componente e preço por canal de um produto.",
      inputSchema: z.object({ sku: z.string().min(1).max(60) }),
    },
    async (_args, ctx) => {
      const p = await preparar(ctx, "produto_custo");
      if ("falha" in p) return p.falha;
      return texto(
        "Disponível na Fase 5 do ERP, quando existirem produtos com ficha e BOM. Até lá, use custos_regras e a calculadora em /catalogo/precificacao.",
      );
    },
  );

  server.registerTool(
    "alertas_abertos",
    {
      description: "Alertas em aberto do ERP (estoque baixo, vencimentos, margem reduzida).",
      inputSchema: z.object({ tipo: z.string().max(60).optional() }),
    },
    async (args, ctx) => {
      const p = await preparar(ctx, "alertas_abertos");
      if ("falha" in p) return p.falha;
      let q = clienteDe(p.sessao)
        .from("alertas")
        .select("id, tipo, severidade, titulo, descricao, entidade_tipo, entidade_id, criado_em")
        .is("resolvido_em", null)
        .order("criado_em", { ascending: false })
        .limit(50);
      if (args.tipo) q = q.eq("tipo", args.tipo);
      const { data, error } = await q;
      if (error) return erro("Não foi possível ler os alertas.");
      return texto({ total: data.length, alertas: data });
    },
  );

  server.registerTool(
    "estoque_insumo",
    {
      description:
        "Situação de estoque dos insumos (filamento, embalagem, componentes): saldo na unidade base, valor, custo médio e última compra, lotes com saldo. Filtre por termo, id ou só abaixo do mínimo.",
      inputSchema: z.object({
        termo: z.string().max(80).optional().describe("Parte do nome do insumo"),
        id: z.uuid().optional().describe("Devolve um insumo com os lotes"),
        abaixo_minimo: z.boolean().optional(),
        incluir_inativos: z.boolean().optional(),
      }),
    },
    async (args, ctx) => {
      const p = await preparar(ctx, "estoque_insumo");
      if ("falha" in p) return p.falha;
      if (!podeLer(p.sessao.papel, "estoque")) return erro("Seu papel não lê o estoque.");
      const cliente = clienteDe(p.sessao);
      const resumir = (e: EstoqueAtual) => ({
        id: e.insumo_id,
        nome: e.nome,
        tipo: e.tipo,
        unidade: e.unidade_base,
        saldo: e.saldo,
        saldo_negativo: Number(e.saldo_negativo ?? 0) < 0 ? e.saldo_negativo : undefined,
        valor_em_estoque: e.valor,
        custo_medio_por_unidade: e.custo_medio,
        ultimo_custo_por_unidade: e.ultimo_custo,
        origem_custo_para_precificar: e.origem_custo,
        estoque_minimo: e.estoque_minimo,
        abaixo_minimo: e.abaixo_minimo,
        lotes_com_saldo: e.lotes_com_saldo,
        ativo: e.ativo,
        rota: `/estoque/insumos/${e.insumo_id}`,
      });
      if (args.id) {
        const [e, lotes] = await Promise.all([
          obterEstoqueDoInsumoCom(cliente, args.id),
          listarLotesCom(cliente, args.id),
        ]);
        if (!e) return erro("Insumo não encontrado.");
        return texto({
          ...resumir(e),
          lotes: lotes.map((l) => ({
            id: l.id,
            codigo: l.codigo,
            saldo: l.quantidade_atual,
            valor: l.valor_atual,
            custo_unitario: l.custo_unitario,
            aberto_em: l.aberto_em,
            divergente: l.divergente,
          })),
        });
      }
      const lista = await listarEstoqueCom(cliente, {
        termo: args.termo,
        abaixoMinimo: args.abaixo_minimo,
        situacao: args.incluir_inativos ? "todos" : "ativos",
      });
      return texto({ total: lista.length, insumos: lista.map(resumir) });
    },
  );
}

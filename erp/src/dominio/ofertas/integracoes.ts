import type { Plataforma } from "./plataformas";

/**
 * O que cada integração de afiliado aceita e exige, verificado nas documentações oficiais em
 * 18/10/2026 (fontes na spec do módulo). A tela de Integrações e o guia de configuração usam
 * estes dados; nada aqui é promessa de recurso que a plataforma não oferece.
 */

export type CampoIntegracao = {
  nome: string;
  rotulo: string;
  dica: string;
  obrigatorio: boolean;
  padrao?: RegExp;
};

export type Metodo = {
  recurso: string;
  como: string;
  disponivel: "sim" | "manual" | "depende" | "nao";
};

export type MetaIntegracao = {
  publicos: CampoIntegracao[];
  secretos: CampoIntegracao[];
  metodos: Metodo[];
  aprovacoes: string[];
  documentacao: { rotulo: string; url: string }[];
  /** Plataformas sem API de link: o status fica "API indisponível" e o link vem do portal. */
  semApiDeLink: boolean;
  /** Texto exibido junto da trava de conformidade (canal WhatsApp no programa). */
  conformidade: string;
};

export const META_INTEGRACAO: Record<Plataforma, MetaIntegracao> = {
  shopee: {
    publicos: [
      {
        nome: "app_id",
        rotulo: "AppID da Open API",
        dica: "Portal de afiliados Shopee > Open API. Número de identificação do aplicativo.",
        obrigatorio: true,
        padrao: /^\d{5,20}$/,
      },
    ],
    secretos: [
      {
        nome: "secret",
        rotulo: "Secret da Open API",
        dica: "Mostrado na mesma página do AppID. Nunca compartilhe em chat.",
        obrigatorio: true,
        padrao: /^\S{16,200}$/,
      },
    ],
    metodos: [
      {
        recurso: "Gerar link de afiliado com sub IDs",
        como: "Open API, generateShortLink (até 5 sub IDs)",
        disponivel: "depende",
      },
      {
        recurso: "Nome, imagem, preço e nota do produto",
        como: "Open API, productOfferV2",
        disponivel: "depende",
      },
      {
        recurso: "Conversões por sub ID",
        como: "Open API, conversionReport",
        disponivel: "depende",
      },
      {
        recurso: "Cupons",
        como: "Sem API de cupons para afiliados: cadastro manual",
        disponivel: "manual",
      },
      {
        recurso: "Links em massa",
        como: "Portal: Oferta de Produto > Obter Link (CSV)",
        disponivel: "manual",
      },
    ],
    aprovacoes: [
      "Conta de afiliado Shopee aprovada.",
      "Acesso à Open API liberado no portal (pedido por formulário, resposta por e-mail).",
      "Grupos de WhatsApp cadastrados como Mídia de Afiliado (Termos, cláusula 1.3).",
    ],
    documentacao: [
      { rotulo: "Open API (exige login)", url: "https://affiliate.shopee.com.br/open_api" },
      {
        rotulo: "Como gerar links",
        url: "https://help.shopee.com.br/portal/10/article/128461-Como-gerar-links-de-produtos-ou-lojas",
      },
      {
        rotulo: "Termos do programa",
        url: "https://help.shopee.com.br/portal/10/article/124094-Programa-de-Afiliados-Shopee-Termos-e-Condi%C3%A7%C3%B5es",
      },
    ],
    semApiDeLink: false,
    conformidade:
      "Os Termos exigem que o canal seja uma Mídia de Afiliado registrada e proíbem redirecionamento automático. Cadastre os grupos no portal antes de liberar.",
  },
  mercado_livre: {
    publicos: [
      {
        nome: "etiqueta",
        rotulo: "Etiqueta padrão",
        dica: "Nome da etiqueta criada no portal de afiliados para este canal (só referência).",
        obrigatorio: false,
        padrao: /^[\w .-]{1,60}$/,
      },
    ],
    secretos: [],
    metodos: [
      {
        recurso: "Gerar link de afiliado",
        como: "Só no portal (gerador de links ou Compartilhe e ganhe); cole o link no sistema",
        disponivel: "manual",
      },
      {
        recurso: "Dados do produto",
        como: "Sem API autorizada para afiliados: cadastro manual",
        disponivel: "manual",
      },
      {
        recurso: "Relatórios",
        como: "Métricas no portal, sem API: importação de arquivo",
        disponivel: "manual",
      },
      {
        recurso: "Encurtador ou redirecionador próprio",
        como: "Proibido pelos termos (1.8 e 1.10)",
        disponivel: "nao",
      },
    ],
    aprovacoes: [
      "Cadastro aprovado no Programa de Afiliados.",
      "Canais (grupos públicos de WhatsApp) informados no cadastro antes de divulgar (termos 1.3).",
    ],
    documentacao: [
      { rotulo: "Termos do programa", url: "https://www.mercadolivre.com.br/ajuda/30228" },
      { rotulo: "Gerar links", url: "https://www.mercadolivre.com.br/ajuda/30084" },
      { rotulo: "Etiquetas", url: "https://www.mercadolivre.com.br/ajuda/27916" },
    ],
    semApiDeLink: true,
    conformidade:
      "Grupo de WhatsApp é permitido quando é público e foi informado no cadastro. Disparo massivo e base de contatos comprada são proibidos (7.3).",
  },
  amazon: {
    publicos: [
      {
        nome: "tag",
        rotulo: "ID de associado (tag)",
        dica: "Associates Central, canto superior direito. No Brasil termina em -20.",
        obrigatorio: true,
        padrao: /^[a-z0-9][a-z0-9-]{1,40}-2\d$/,
      },
    ],
    secretos: [],
    metodos: [
      {
        recurso: "Gerar link de afiliado",
        como: "URL do produto com o parâmetro tag (ID de associado ou de rastreamento)",
        disponivel: "sim",
      },
      {
        recurso: "Preço, imagem e disponibilidade",
        como: "Creators API (exige 10 vendas em 30 dias); até lá, cadastro manual",
        disponivel: "depende",
      },
      { recurso: "Cupons", como: "Sem API de cupons: cadastro manual", disponivel: "manual" },
      {
        recurso: "Redirecionador próprio",
        como: "Proibido (Contrato, cláusulas 6v e 6w)",
        disponivel: "nao",
      },
    ],
    aprovacoes: [
      "Conta de Associado aprovada.",
      "Confirmação do suporte de Associados de que grupos de WhatsApp são um canal válido: a política só aceita links em mensagens solicitadas pelo destinatário.",
    ],
    documentacao: [
      {
        rotulo: "Políticas do programa",
        url: "https://associados.amazon.com.br/help/operating/policies",
      },
      {
        rotulo: "Creators API",
        url: "https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction",
      },
    ],
    semApiDeLink: true,
    conformidade:
      "A política da Amazon não autoriza grupos de WhatsApp de forma explícita e exige preço com data, hora e aviso. Registre aqui a confirmação do suporte antes de publicar.",
  },
  awin: {
    publicos: [
      {
        nome: "publisher_id",
        rotulo: "Publisher ID",
        dica: "Número da sua conta de publisher, no topo do painel da Awin.",
        obrigatorio: true,
        padrao: /^\d{3,12}$/,
      },
    ],
    secretos: [
      {
        nome: "api_token",
        rotulo: "Token da API",
        dica: "ui.awin.com/awin-api > digite a senha > Show my API token. Exige usuário Admin.",
        obrigatorio: true,
        padrao: /^\S{20,200}$/,
      },
    ],
    metodos: [
      {
        recurso: "Gerar link com clickref",
        como: "Link Builder API (curto tidd.ly oficial)",
        disponivel: "depende",
      },
      { recurso: "Cupons", como: "Promotions API, type=voucher, região BR", disponivel: "depende" },
      {
        recurso: "Comissões",
        como: "Transactions API (até 31 dias por chamada)",
        disponivel: "depende",
      },
      {
        recurso: "Dados de produto",
        como: "Feeds variam por anunciante: cadastro manual nesta versão",
        disponivel: "manual",
      },
    ],
    aprovacoes: [
      "Conta de publisher aprovada e parceria aceita por cada anunciante.",
      "Termos de cada anunciante lidos: alguns proíbem cupom, mensageria ou palavra-chave da marca.",
    ],
    documentacao: [
      { rotulo: "Autenticação da API", url: "https://help.awin.com/apidocs/api-authentication.md" },
      { rotulo: "Link Builder", url: "https://help.awin.com/apidocs/generatelink.md" },
      { rotulo: "Promoções e cupons", url: "https://help.awin.com/apidocs/promotions.md" },
    ],
    semApiDeLink: false,
    conformidade:
      "As regras são por anunciante (aba de termos do perfil na Awin). Confirme que os anunciantes usados aceitam grupos de mensagem.",
  },
};

export type ErroCampos = Record<string, string>;

/** Confere os campos digitados contra a definição da plataforma (sem falar com a rede). */
export function validarCampos(
  campos: CampoIntegracao[],
  valores: Record<string, string>,
  exigirTodos: boolean,
): ErroCampos {
  const erros: ErroCampos = {};
  for (const c of campos) {
    const v = (valores[c.nome] ?? "").trim();
    if (!v) {
      if (c.obrigatorio && exigirTodos) erros[c.nome] = "campo_obrigatorio";
      continue;
    }
    if (c.padrao && !c.padrao.test(v)) erros[c.nome] = "formato_invalido";
  }
  return erros;
}

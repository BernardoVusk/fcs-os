const ERROS: Record<string, string> = {
  nome_obrigatorio: "Informe o nome.",
  nome_longo: "Nome longo demais.",
  email_invalido: "E-mail inválido.",
  senha_curta: "A senha precisa de pelo menos 10 caracteres.",
  senha_obrigatoria: "Digite a senha.",
  credenciais_invalidas: "E-mail ou senha incorretos.",
  tipo_invalido: "Tipo inválido.",
  escopo_invalido: "Escopo inválido.",
  papel_invalido: "Papel inválido.",
  codigo_invalido: "Código: só letras minúsculas, até 6.",
  numero_invalido: "Número inválido.",
  percentual_invalido: "Percentual entre 0 e 99,9.",
  inteiro_invalido: "Use um número inteiro.",
  data_invalida: "Data inválida.",
  cor_invalida: "Cor em hexadecimal, como #00D8FF.",
  sem_permissao: "Sua conta não pode fazer isso.",
  duplicado: "Já existe um registro com esse valor.",
  nao_encontrado: "Registro não encontrado.",
  em_uso: "Registro em uso, não pode ser removido.",
  erro_inesperado: "Algo deu errado. Tente de novo.",
  contem_segredo: "O texto parece conter uma chave, token ou senha. Remova antes de salvar.",
  titulo_curto: "Título com pelo menos 3 caracteres.",
  conteudo_obrigatorio: "Escreva o conteúdo.",
  conteudo_longo: "Conteúdo acima de 60 mil caracteres.",
  arquivo_obrigatorio: "Escolha um arquivo.",
  arquivo_grande: "Arquivo acima de 10 MB.",
  arquivo_tipo: "Tipo de arquivo não aceito (imagem, PDF, texto ou markdown).",
  relacao_repetida: "Essa relação já existe.",
  mesmo_registro: "Um registro não pode se relacionar com ele mesmo.",
  codigo_interno_invalido: "Código interno: letras, números, ponto, traço ou sublinhado, até 30.",
  quantidade_invalida: "Quantidade inválida. Use um número maior que zero.",
  preco_invalido: "Preço inválido.",
  unidade_invalida: "Unidade inválida.",
  unidade_incompativel: "A unidade da linha não converte para a unidade base do insumo.",
  insumo_obrigatorio: "Escolha o insumo.",
  insumo_inativo: "Insumo inativo. Reative antes de movimentar.",
  filamento_sem_peso_util: "Filamento comprado em rolos precisa do peso útil por rolo (g).",
  rolos_fracionados: "Rolos de filamento são contados em número inteiro.",
  compra_sem_itens: "Adicione pelo menos um item antes de confirmar.",
  compra_sem_valor: "A compra não tem valor para ratear.",
  compra_ja_confirmada: "Esta compra já foi confirmada ou cancelada.",
  compra_nao_rascunho: "Só compras em rascunho podem ser editadas.",
  lote_duplicado: "Já existe um lote com esse código para este insumo.",
  lote_obrigatorio: "Escolha o lote em uso.",
  lote_nao_encontrado: "Lote não encontrado.",
  justificativa_obrigatoria: "Escreva a justificativa para deixar o lote negativo.",
  estoque_insuficiente:
    "Saldo insuficiente no estoque. Confira os lotes ou registre a compra antes.",
  origem_invalida: "Origem inválida.",
  ja_estornada: "Esta movimentação já foi estornada.",
  estorno_de_estorno: "Um estorno não pode ser estornado. Registre a movimentação de novo.",
  movimentacao_nao_encontrada: "Movimentação não encontrada.",
  motivo_obrigatorio: "Informe o motivo.",
};

export function erroPt(chave: string | undefined): string | undefined {
  if (!chave) return undefined;
  return ERROS[chave] ?? chave;
}

/** Traduz um erro do PostgREST ou do Postgres em chave de erroPt(): exceções nomeadas das funções SQL, duplicidade e permissão. */
export function chaveDoErro(
  error: { code?: string; message?: string; details?: string | null } | null | undefined,
): string {
  if (!error) return "erro_inesperado";
  const mensagem = (error.message ?? "").trim();
  if (mensagem in ERROS) return mensagem;
  if (error.code === "23505") return /lotes_insumo/.test(mensagem) ? "lote_duplicado" : "duplicado";
  if (error.code === "42501") return "sem_permissao";
  if (error.code === "23503") return "em_uso";
  if (error.code === "23514") return "numero_invalido";
  return "erro_inesperado";
}

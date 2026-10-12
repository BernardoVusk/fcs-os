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
};

export function erroPt(chave: string | undefined): string | undefined {
  if (!chave) return undefined;
  return ERROS[chave] ?? chave;
}

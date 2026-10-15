import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { LinhaInscricao } from "@/dominio/sorteio/planilha";

export type Inscricao = Omit<LinhaInscricao, "cliente"> & {
  id: string;
  cliente_id: string;
  produto_id: string | null;
  cliente: {
    nome: string;
    email: string | null;
    telefone: string | null;
    anonimizado: boolean;
  } | null;
};

const COLUNAS =
  "id, cliente_id, produto_id, produto_outro, aceita_contato, origem, referencia, criado_em, cliente:clientes(nome, email, telefone, anonimizado), produto:produtos(nome), canal:canais_venda(nome)";

/** Inscrições de um mês (AAAA-MM), da mais recente para a mais antiga. */
export async function listarInscricoes(referencia: string): Promise<Inscricao[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("inscricoes_sorteio")
    .select(COLUNAS)
    .eq("referencia", referencia)
    .order("criado_em", { ascending: false })
    .limit(2000);
  return (data ?? []) as Inscricao[];
}

/** Meses que têm inscrição, do mais recente para o mais antigo. */
export async function listarMesesSorteio(): Promise<{ referencia: string; total: number }[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("inscricoes_sorteio_meses")
    .select("referencia, total")
    .order("referencia", { ascending: false });
  return (data ?? []).map((m) => ({ referencia: m.referencia!, total: m.total ?? 0 }));
}

export type Sorteio = {
  id: string;
  referencia: string;
  sorteado_em: string;
  inscricao: {
    produto_outro: string | null;
    cliente: { nome: string; email: string | null; telefone: string | null } | null;
    produto: { nome: string } | null;
  } | null;
};

/** Resultado do sorteio do mês, se já aconteceu. */
export async function obterSorteio(referencia: string): Promise<Sorteio | null> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("sorteios")
    .select(
      "id, referencia, sorteado_em, inscricao:inscricoes_sorteio(produto_outro, cliente:clientes(nome, email, telefone), produto:produtos(nome))",
    )
    .eq("referencia", referencia)
    .maybeSingle();
  return (data as Sorteio | null) ?? null;
}

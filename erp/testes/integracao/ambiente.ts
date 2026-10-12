import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/tipos/banco";

const URL = () => process.env.SUPABASE_TESTE_URL!;
const ANON = () => process.env.SUPABASE_TESTE_ANON_KEY!;
const SERVICO = () => process.env.SUPABASE_TESTE_SERVICE_ROLE_KEY!;

export type Cliente = SupabaseClient<Database>;

export function admin(): Cliente {
  return createClient<Database>(URL(), SERVICO(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-origem": "script" } },
  });
}

export function anonimo(): Cliente {
  return createClient<Database>(URL(), ANON(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type UsuarioTeste = {
  id: string;
  email: string;
  cliente: Cliente;
  remover: () => Promise<void>;
};

/** Cria usuário no Auth e em usuarios_app (ou só no Auth, se papel = null) e devolve um cliente logado. */
export async function criarUsuarioTeste(
  papel: "dono" | "operador" | "leitura" | null,
): Promise<UsuarioTeste> {
  const a = admin();
  const sufixo = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `teste-${papel ?? "sem-papel"}-${sufixo}@exemplo.com`;
  const senha = `Senha-${sufixo}-forte`;
  const { data, error } = await a.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (error) throw error;
  if (papel) {
    const { error: e } = await a
      .from("usuarios_app")
      .insert({ id: data.user.id, nome: `Teste ${papel}`, papel });
    if (e) throw e;
  }
  const login = anonimo();
  const { data: sessao, error: erroLogin } = await login.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (erroLogin || !sessao.session) throw erroLogin ?? new Error("sem sessao");
  const cliente = createClient<Database>(URL(), ANON(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${sessao.session.access_token}`, "x-origem": "web" },
    },
  });
  return {
    id: data.user.id,
    email,
    cliente,
    remover: async () => {
      await a.auth.admin.deleteUser(data.user.id);
    },
  };
}

export async function garantirMigracoes() {
  const { data, error } = await admin().from("migracoes_aplicadas").select("nome");
  if (error)
    throw new Error(
      `banco de teste sem migracoes: rode npm run migrar -- --alvo teste (${error.message})`,
    );
  if (!data.some((m) => m.nome.startsWith("0004_")))
    throw new Error("rode npm run migrar -- --alvo teste");
}

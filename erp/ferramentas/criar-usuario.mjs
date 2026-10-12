import { createClient } from "@supabase/supabase-js";
import { carregarEnv, exigirEnv } from "./env.mjs";

carregarEnv();
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.join("=")];
  }),
);
const { email, nome, senha, papel = "dono", alvo = "dev" } = args;
if (!email || !nome || !senha) {
  throw new Error(
    "uso: node ferramentas/criar-usuario.mjs --email=... --nome=... --senha=... [--papel=dono|operador|leitura] [--alvo=dev|teste]",
  );
}
if (senha.length < 10) throw new Error("senha com pelo menos 10 caracteres");
const prefixo = alvo === "teste" ? "SUPABASE_TESTE_" : "SUPABASE_";
const admin = createClient(exigirEnv(`${prefixo}URL`), exigirEnv(`${prefixo}SERVICE_ROLE_KEY`), {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-origem": "script" } },
});
const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
if (error) throw error;
const { error: erroLinha } = await admin.from("usuarios_app").insert({ id: data.user.id, nome, papel });
if (erroLinha) throw erroLinha;
console.log(`usuario ${email} criado como ${papel} em ${alvo}`);

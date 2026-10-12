import { exigirLeitura } from "@/lib/auth/sessao";
import { listarTokens } from "@/dados/integracoes";
import { NovoToken, TabelaTokens } from "@/componentes/configuracoes/Tokens";

export const metadata = { title: "Integrações" };

export default async function PaginaIntegracoes() {
  await exigirLeitura("usuarios");
  const tokens = await listarTokens();
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Integrações</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Tokens que o Claude Code usa para falar com o ERP pelo servidor MCP. Cada token tem
            escopos e validade e pode ser revogado a qualquer momento.
          </p>
        </div>
        <NovoToken />
      </div>
      <TabelaTokens tokens={tokens} />
      <section className="rounded-2xl bg-card p-5 text-sm shadow-painel">
        <h2 className="mb-2 text-base font-semibold">Como ligar o Claude Code</h2>
        <ol className="list-decimal space-y-1 pl-5 text-texto-2">
          <li>Crie um token com os escopos de conhecimento.</li>
          <li>
            Defina as variáveis de ambiente FCS_ERP_MCP_TOKEN (o token) e FCS_ERP_URL
            (http://localhost:3000 em desenvolvimento).
          </li>
          <li>
            Abra o Claude Code na pasta do Fcs OS: o arquivo .mcp.json da raiz registra o servidor
            fcs-erp; aprove na primeira vez.
          </li>
          <li>Use as skills /kb-buscar, /kb-salvar, /kb-decisao e /kb-procedimento.</li>
        </ol>
        <p className="mt-3 text-xs text-texto-3">
          O servidor só lê e grava na base de conhecimento, nunca executa SQL livre. Conteúdo com
          chave ou senha é recusado.
        </p>
      </section>
    </div>
  );
}

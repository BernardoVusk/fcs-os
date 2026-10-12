import "server-only";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registrarFerramentas } from "./ferramentas";
import { verificarToken } from "./autenticacao";

/*
 * Servidor MCP do ERP (Streamable HTTP, sem sessão). O Bearer é um token de
 * tokens_integracao; withMcpAuth responde 401 sem token válido. Cada ferramenta
 * confere escopo, limite e papel (src/mcp/ferramentas.ts).
 */
const base = createMcpHandler(
  (server) => {
    registrarFerramentas(server);
  },
  { serverInfo: { name: "fcs-erp", version: "0.2.0" } },
);

export const handler = withMcpAuth(
  base,
  async (_req, bearer) => {
    if (!bearer) return undefined;
    const sessao = await verificarToken(bearer);
    if (!sessao) return undefined;
    return {
      token: bearer,
      clientId: sessao.tokenId,
      scopes: sessao.escopos,
      expiresAt: sessao.expiraEm ? Math.floor(new Date(sessao.expiraEm).getTime() / 1000) : undefined,
    };
  },
  { required: true },
);

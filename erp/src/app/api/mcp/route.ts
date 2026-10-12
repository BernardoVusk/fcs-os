import { handler } from "@/mcp/servidor";

// Vercel: ferramentas MCP podem passar dos 10 s padrão.
export const maxDuration = 60;

export { handler as GET, handler as POST, handler as DELETE };

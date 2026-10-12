import type { NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/proxy";

export default async function proxy(request: NextRequest) {
  return atualizarSessao(request);
}

export const config = {
  // /api/* autentica por token próprio (Fase 2); internals e arquivos ficam fora.
  matcher: ["/((?!api|_next|_vercel|.*\..*).*)"],
};

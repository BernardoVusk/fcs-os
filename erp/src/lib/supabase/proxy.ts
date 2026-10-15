import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const LOGIN = "/login";
// /sorteio é a página pública do panfleto (docs/arquitetura.md, seção Sessão).
const LIVRES = ["/login", "/sem-acesso", "/sorteio"];

/** Renova o cookie de sessão e manda deslogado para /login. Permissão por área fica nas páginas. */
export async function atualizarSessao(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        for (const { name, value } of lista) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of lista) response.cookies.set(name, value, options);
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const caminho = request.nextUrl.pathname;
  const livre = LIVRES.some((p) => caminho === p || caminho.startsWith(`${p}/`));

  if (!user && !livre) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN;
    url.search = caminho === "/" ? "" : `?voltar=${encodeURIComponent(caminho)}`;
    return NextResponse.redirect(url);
  }
  // Com verificação em duas etapas ativa, a sessão precisa estar em AAL2 fora das rotas livres.
  if (user && !livre && (user.factors ?? []).some((f) => f.status === "verified")) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (nivelDoToken(session?.access_token) !== "aal2") {
      const url = request.nextUrl.clone();
      url.pathname = "/login/verificar";
      url.search = caminho === "/" ? "" : `?voltar=${encodeURIComponent(caminho)}`;
      return NextResponse.redirect(url);
    }
  }
  if (user && caminho === LOGIN) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

/** Claim `aal` do JWT da sessão, sem chamada de rede. */
function nivelDoToken(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const corpo = token.split(".")[1];
    const json = JSON.parse(
      Buffer.from(corpo.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    );
    return typeof json.aal === "string" ? json.aal : null;
  } catch {
    return null;
  }
}

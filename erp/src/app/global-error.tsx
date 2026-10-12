"use client";

/** Último recurso: erro no layout raiz. Sem dependências do tema para garantir que renderiza. */
export default function ErroGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          background: "#0a0a0a",
          color: "#f2f3f4",
          padding: "48px 16px",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>O ERP não conseguiu abrir</h1>
        <p style={{ color: "#a4a8ad", maxWidth: 480, margin: "12px auto" }}>
          Recarregue a página. Se continuar, confira se o Supabase está no ar e se as variáveis de
          ambiente estão corretas.
          {error.digest ? ` Código ${error.digest}.` : ""}
        </p>
        <button
          onClick={reset}
          style={{
            background: "#00d8ff",
            color: "#0a0a0a",
            border: 0,
            borderRadius: 8,
            padding: "8px 16px",
            fontWeight: 600,
          }}
        >
          Tentar de novo
        </button>
      </body>
    </html>
  );
}

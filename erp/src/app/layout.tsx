import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { chakra, inter, mono } from "@/lib/fontes";
import { COOKIE_TEMA, lerTema } from "@/lib/tema";
import { Toaster } from "@/componentes/ui/sonner";
import { TooltipProvider } from "@/componentes/ui/tooltip";

export const metadata: Metadata = {
  title: { default: "FCS ERP", template: "%s | FCS ERP" },
  robots: { index: false, follow: false },
};

export default async function LayoutRaiz({ children }: { children: React.ReactNode }) {
  const tema = lerTema((await cookies()).get(COOKIE_TEMA)?.value);
  return (
    <html
      lang="pt-BR"
      data-tema={tema}
      className={`${inter.variable} ${chakra.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-fundo text-texto">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster position="bottom-right" richColors={false} />
      </body>
    </html>
  );
}

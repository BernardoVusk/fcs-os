"use server";

import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";

export async function sair(): Promise<void> {
  const supabase = await clienteServidor();
  // Só esta sessão: sair num dispositivo não derruba os outros.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

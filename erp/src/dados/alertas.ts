import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";

export async function contarAlertasAbertos(): Promise<number> {
  const supabase = await clienteServidor();
  const { count } = await supabase
    .from("alertas")
    .select("id", { count: "exact", head: true })
    .is("resolvido_em", null);
  return count ?? 0;
}

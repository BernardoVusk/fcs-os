import { redirect } from "next/navigation";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { ImportarCatalogo } from "@/componentes/produtos/ImportarCatalogo";

export const metadata = { title: "Importar catálogo" };

export default async function PaginaImportar() {
  const usuario = await exigirLeitura("catalogo");
  if (!podeEscrever(usuario.papel, "catalogo")) redirect("/catalogo/produtos");
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
          Importar catálogo
        </h1>
        <p className="mt-1 text-sm text-texto-2">
          Lê o CSV de dados/catalogo. Anúncio novo vira produto em rascunho com o título e o preço
          do canal; anúncio conhecido só atualiza estoque, vendas e preço. Peso, tempo e material
          ficam em branco para você preencher. Importar o mesmo arquivo duas vezes não duplica nada.
        </p>
      </div>
      <ImportarCatalogo />
    </div>
  );
}

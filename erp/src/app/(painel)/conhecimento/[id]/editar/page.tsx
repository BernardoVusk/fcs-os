import { notFound, redirect } from "next/navigation";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { categoriasDeConhecimento, modulosExistentes, obterConhecimento } from "@/dados/conhecimento";
import { FormConhecimento } from "@/componentes/conhecimento/FormConhecimento";

export const metadata = { title: "Editar conhecimento" };

export default async function PaginaEditarConhecimento({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirLeitura("conhecimento");
  if (!podeEscrever(usuario.papel, "conhecimento")) redirect("/sem-acesso?area=conhecimento");
  const { id } = await params;
  const [registro, categorias, modulos] = await Promise.all([
    obterConhecimento(id),
    categoriasDeConhecimento(),
    modulosExistentes(),
  ]);
  if (!registro) notFound();
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-texto-2">Editando a versão {registro.versao}</p>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{registro.titulo}</h1>
      </div>
      <FormConhecimento registro={registro} categorias={categorias} modulos={modulos} />
    </div>
  );
}

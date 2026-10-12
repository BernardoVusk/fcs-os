import { redirect } from "next/navigation";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { categoriasDeConhecimento, modulosExistentes } from "@/dados/conhecimento";
import { FormConhecimento } from "@/componentes/conhecimento/FormConhecimento";

export const metadata = { title: "Novo conhecimento" };

export default async function PaginaNovoConhecimento() {
  const usuario = await exigirLeitura("conhecimento");
  if (!podeEscrever(usuario.papel, "conhecimento")) redirect("/sem-acesso?area=conhecimento");
  const [categorias, modulos] = await Promise.all([categoriasDeConhecimento(), modulosExistentes()]);
  return (
    <div className="space-y-5">
      <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Novo conhecimento</h1>
      <FormConhecimento categorias={categorias} modulos={modulos} />
    </div>
  );
}

import { erroPt } from "@/lib/erros-pt";

export function CampoErro({ chave, id }: { chave?: string; id?: string }) {
  const texto = erroPt(chave);
  if (!texto) return null;
  return (
    <p id={id} role="alert" className="text-sm text-erro">
      {texto}
    </p>
  );
}

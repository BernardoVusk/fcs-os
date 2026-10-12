import { Label } from "@/componentes/ui/label";
import { CampoErro } from "./CampoErro";

export function Campo({
  rotulo,
  nome,
  erro,
  dica,
  children,
}: {
  rotulo: string;
  nome: string;
  erro?: string;
  dica?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={nome}>{rotulo}</Label>
      {children}
      {dica && !erro && <p className="text-xs text-texto-3">{dica}</p>}
      <CampoErro id={`erro-${nome}`} chave={erro} />
    </div>
  );
}

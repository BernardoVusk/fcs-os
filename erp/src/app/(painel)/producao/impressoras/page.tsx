import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarImpressoras } from "@/dados/custos/impressoras";
import { obterParametrosVigentes } from "@/dados/custos/parametros";
import { FormImpressora } from "@/componentes/custos/FormImpressora";
import { TabelaImpressoras } from "@/componentes/custos/TabelaImpressoras";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";

export const metadata = { title: "Impressoras" };

export default async function PaginaImpressoras({
  searchParams,
}: {
  searchParams: Promise<{ novo?: string; destaque?: string }>;
}) {
  const usuario = await exigirLeitura("producao");
  const { novo, destaque } = await searchParams;
  const [impressoras, parametros] = await Promise.all([
    listarImpressoras(),
    obterParametrosVigentes(),
  ]);
  const editar = podeEscrever(usuario.papel, "producao");
  const tarifa = parametros?.dados.tarifa_kwh ?? null;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Impressoras</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Cada impressora tem custo por hora de máquina (depreciação, manutenção, consumíveis) e
            de energia. Fila, horas de uso e manutenções chegam na Fase 5.
          </p>
        </div>
        {editar && (
          <DialogoNovo
            rotulo="Nova impressora"
            titulo="Nova impressora"
            abrirInicial={novo === "1"}
          >
            <FormImpressora tarifaKwh={tarifa} />
          </DialogoNovo>
        )}
      </div>
      <TabelaImpressoras
        impressoras={impressoras}
        editar={editar}
        tarifaKwh={tarifa}
        destaque={destaque}
      />
    </div>
  );
}

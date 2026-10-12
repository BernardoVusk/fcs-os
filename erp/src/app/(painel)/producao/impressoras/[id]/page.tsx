import { notFound } from "next/navigation";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { obterImpressora } from "@/dados/custos/impressoras";
import { obterParametrosVigentes } from "@/dados/custos/parametros";
import { listarManutencoes, listarOrdens } from "@/dados/producao/ordens";
import { custoHoraImpressora, custoHoraTotal, impressoraPronta } from "@/dominio/custos/impressora";
import { formatarNumero } from "@/lib/formatos/numero";
import { formatarMoeda } from "@/lib/formatos/moeda";
import { FormImpressora } from "@/componentes/custos/FormImpressora";
import { FormManutencao, TabelaManutencoes } from "@/componentes/producao/Manutencoes";
import { ListaOrdens } from "@/componentes/producao/Ordens";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/ui/tabs";

export default async function PaginaImpressora({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirLeitura("producao");
  const { id } = await params;
  const impressora = await obterImpressora(id);
  if (!impressora) notFound();
  const [parametros, manutencoes, ordens] = await Promise.all([
    obterParametrosVigentes(),
    listarManutencoes(id),
    listarOrdens({ impressoraId: id, limite: 100 }),
  ]);
  const editar = podeEscrever(usuario.papel, "producao");
  const tarifa = parametros?.dados.tarifa_kwh ?? null;
  const pronta = impressoraPronta(impressora);
  const custo = pronta.ok && tarifa != null ? custoHoraImpressora(pronta.dados, tarifa) : null;
  const ultima = manutencoes[0];
  const proxima =
    ultima?.proxima_em_horas != null
      ? Number(ultima.proxima_em_horas) - Number(impressora.horas_uso)
      : null;
  const totalManutencao = manutencoes.reduce((acc, m) => acc + Number(m.custo), 0);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
          {impressora.nome}
        </h1>
        <p className="mt-1 text-sm text-texto-2">
          {[impressora.fabricante, impressora.modelo].filter(Boolean).join(" ") || "Sem fabricante"}{" "}
          · {impressora.status}
        </p>
      </div>
      <div className="numeros grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <div className="rounded-2xl bg-card p-4 shadow-painel">
          <p className="text-[13px] text-texto-2">Horas de uso</p>
          <p className="mt-1 text-lg font-semibold">{formatarNumero(impressora.horas_uso, 1)} h</p>
          <p className="text-xs text-texto-3">somadas pelas ordens concluídas</p>
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-painel">
          <p className="text-[13px] text-texto-2">Custo por hora de máquina</p>
          <p className="mt-1 text-lg font-semibold">
            {custo ? `R$ ${formatarNumero(custoHoraTotal(custo).maquina, 4)}` : "Não configurado"}
          </p>
          <p className="text-xs text-texto-3">
            {custo
              ? `energia R$ ${formatarNumero(custo.energia, 4)}/h`
              : "preencha os campos de custo e a tarifa"}
          </p>
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-painel">
          <p className="text-[13px] text-texto-2">Próxima manutenção</p>
          <p className="mt-1 text-lg font-semibold">
            {proxima == null
              ? "Sem previsão"
              : proxima <= 0
                ? "Vencida"
                : `em ${formatarNumero(proxima, 1)} h`}
          </p>
          <p className="text-xs text-texto-3">
            {manutencoes.length} registro(s), {formatarMoeda(totalManutencao)} no total
          </p>
        </div>
      </div>
      <Tabs defaultValue="manutencoes">
        <TabsList>
          <TabsTrigger value="manutencoes">Manutenções</TabsTrigger>
          <TabsTrigger value="ordens">Ordens ({ordens.length})</TabsTrigger>
          <TabsTrigger value="ficha">Ficha</TabsTrigger>
        </TabsList>
        <TabsContent value="manutencoes" className="space-y-3 pt-3">
          {editar && (
            <div className="flex justify-end">
              <DialogoNovo rotulo="Nova manutenção" titulo={`Manutenção de ${impressora.nome}`}>
                <FormManutencao
                  impressoraId={impressora.id}
                  horasUso={Number(impressora.horas_uso)}
                />
              </DialogoNovo>
            </div>
          )}
          <TabelaManutencoes manutencoes={manutencoes} />
        </TabsContent>
        <TabsContent value="ordens" className="pt-3">
          <ListaOrdens ordens={ordens} />
        </TabsContent>
        <TabsContent value="ficha" className="pt-3">
          <section className="rounded-2xl bg-card p-5 shadow-painel">
            {editar ? (
              <FormImpressora impressora={impressora} tarifaKwh={tarifa} />
            ) : (
              <p className="text-sm text-texto-2">Somente leitura.</p>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

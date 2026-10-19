import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarFilas } from "@/dados/ofertas/filas";
import { listarNumeros } from "@/dados/ofertas/whatsapp";
import { listarModelos } from "@/dados/ofertas/cadastros";
import { STATUS_FILA_ROTULO } from "@/dominio/ofertas/status";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { Selo } from "@/componentes/ofertas/Selo";
import { FormFila } from "@/componentes/ofertas/Filas";

export const metadata = { title: "Filas" };

export default async function PaginaFilas({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const usuario = await exigirLeitura("ofertas");
  const { status } = await searchParams;
  const [filas, numeros, modelos] = await Promise.all([
    listarFilas(status && status in STATUS_FILA_ROTULO ? status : undefined),
    listarNumeros(),
    listarModelos(),
  ]);
  const escreve = podeEscrever(usuario.papel, "ofertas");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Filas</h1>
          <p className="mt-1 max-w-3xl text-sm text-texto-2">
            Lista de ofertas que sai uma de cada vez, para todos os grupos da fila, no intervalo e
            na janela escolhidos. Remetente manual cai em Publicar; remetente número envia pelo
            worker.
          </p>
        </div>
        {escreve && (
          <DialogoNovo rotulo="Nova fila" titulo="Nova fila">
            <FormFila
              numeros={numeros.map((n) => ({
                id: n.id,
                rotulo: n.rotulo,
                conectado: n.estado?.status === "conectado",
              }))}
              modelos={modelos
                .filter((m) => m.ativo && m.tipo === "oferta")
                .map((m) => ({ id: m.id, nome: m.nome }))}
            />
          </DialogoNovo>
        )}
      </div>
      <nav className="flex flex-wrap gap-3 text-sm" aria-label="Filtrar por status">
        <Link
          href="/ofertas/filas"
          className={!status ? "font-semibold text-acao" : "text-texto-2 hover:text-texto"}
        >
          Todas
        </Link>
        {Object.entries(STATUS_FILA_ROTULO).map(([k, v]) => (
          <Link
            key={k}
            href={`/ofertas/filas?status=${k}`}
            className={status === k ? "font-semibold text-acao" : "text-texto-2 hover:text-texto"}
          >
            {v}
          </Link>
        ))}
      </nav>
      {filas.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma fila"
          descricao="Crie uma fila, escolha os grupos e cole os links das ofertas."
        />
      ) : (
        <ul className="divide-y divide-borda overflow-hidden rounded-2xl bg-card shadow-painel">
          {filas.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <div className="min-w-0 flex-1 basis-64">
                <Link href={`/ofertas/filas/${f.id}`} className="font-medium hover:text-acao">
                  {f.nome}
                </Link>
                <p className="text-xs text-texto-3">
                  {f.itens} item(ns) · {f.destinos} grupo(s) · a cada{" "}
                  {Math.round(f.intervalo_segundos / 60)} min ·{" "}
                  {f.numero ? `pelo número ${f.numero.rotulo}` : "manual"}
                  {f.reinicio_diario ? " · recomeça todo dia" : ""}
                </p>
              </div>
              <Selo
                tom={
                  f.status === "ativa" ? "sucesso" : f.status === "pausada" ? "alerta" : "neutro"
                }
              >
                {STATUS_FILA_ROTULO[f.status]}
              </Selo>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useActionState, useContext, useState, useTransition } from "react";
import { toast } from "sonner";
import { removerArquivo, salvarArquivo, urlDoArquivo } from "@/acoes/produtos/arquivos";
import type { Arquivo, Variacao } from "@/dados/produtos/produtos";
import { FORM_INICIAL } from "@/lib/forms";
import { erroPt } from "@/lib/erros-pt";
import { formatarDataHora } from "@/lib/formatos/data";
import { formatarNumero } from "@/lib/formatos/numero";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

const TIPOS = [
  { valor: "stl", rotulo: "STL" },
  { valor: "3mf", rotulo: "3MF" },
  { valor: "gcode", rotulo: "G-code" },
  { valor: "imagem", rotulo: "Foto" },
  { valor: "documento", rotulo: "Documento" },
];

export function FormArquivo({
  produtoId,
  variacoes,
}: {
  produtoId: string;
  variacoes: Variacao[];
}) {
  const [estado, acao, pendente] = useActionState(salvarArquivo, FORM_INICIAL);
  const [origem, setOrigem] = useState<"upload" | "externo">("upload");
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      <input type="hidden" name="produto_id" value={produtoId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Tipo" nome="tipo" erro={estado.erros.tipo}>
          <SelectNativo id="tipo" name="tipo" defaultValue="stl">
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Variação" nome="variacao_id" erro={estado.erros.variacao_id}>
          <SelectNativo id="variacao_id" name="variacao_id" defaultValue="">
            <option value="">Produto inteiro</option>
            {variacoes.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Onde está" nome="origem">
          <SelectNativo
            id="origem"
            value={origem}
            onChange={(e) => setOrigem(e.target.value as "upload" | "externo")}
          >
            <option value="upload">Enviar para o ERP (até 100 MB)</option>
            <option value="externo">Fica no OneDrive ou disco (só o caminho)</option>
          </SelectNativo>
        </Campo>
        <Campo
          rotulo="Nome"
          nome="nome"
          erro={estado.erros.nome}
          dica="Vazio usa o nome do arquivo. Mesmo nome gera versão nova."
        >
          <Input id="nome" name="nome" maxLength={200} />
        </Campo>
      </div>
      {origem === "upload" ? (
        <Campo rotulo="Arquivo" nome="arquivo" erro={estado.erros.arquivo}>
          <Input
            id="arquivo"
            name="arquivo"
            type="file"
            className="file:mr-3 file:rounded-full file:border-0 file:bg-superficie-2 file:px-3 file:py-1 file:text-sm"
          />
        </Campo>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            rotulo="Caminho externo"
            nome="caminho_externo"
            erro={estado.erros.caminho_externo}
            dica="Caminho completo da pasta ou arquivo."
          >
            <Input
              id="caminho_externo"
              name="caminho_externo"
              maxLength={500}
              className="font-mono text-xs"
            />
          </Campo>
          <Campo
            rotulo="SHA-256 (opcional)"
            nome="hash_sha256"
            erro={estado.erros.hash_sha256}
            dica="certutil -hashfile arquivo SHA256"
          >
            <Input
              id="hash_sha256"
              name="hash_sha256"
              maxLength={64}
              className="font-mono text-xs"
            />
          </Campo>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Licença" nome="licenca" erro={estado.erros.licenca}>
          <Input id="licenca" name="licenca" maxLength={200} />
        </Campo>
        <Campo rotulo="Notas" nome="notas" erro={estado.erros.notas}>
          <Input id="notas" name="notas" maxLength={1000} placeholder="Perfil, versão do modelo" />
        </Campo>
      </div>
      <CampoErro chave={estado.erros._form ?? estado.erros.arquivo} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Enviando" : "Salvar"}
      </Button>
    </form>
  );
}

function BotaoAbrir({ id }: { id: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const r = await urlDoArquivo(id);
          if (r.ok) window.open(r.url, "_blank", "noopener");
          else toast.error(erroPt(r.erro) ?? "Algo deu errado.");
        })
      }
    >
      Abrir
    </Button>
  );
}

export function TabelaArquivos({
  produtoId,
  arquivos,
  editar,
}: {
  produtoId: string;
  arquivos: Arquivo[];
  editar: boolean;
}) {
  if (arquivos.length === 0)
    return (
      <EstadoVazio
        titulo="Nenhum arquivo"
        descricao="STL, 3MF, G-code e fotos. Arquivos de fabricação ficam privados e abrem por URL assinada de 10 minutos."
      />
    );
  return (
    <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
      <Table>
        <TableHeader>
          <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
            <TableHead className="pl-5">Arquivo</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Versão</TableHead>
            <TableHead>Tamanho</TableHead>
            <TableHead>Hash</TableHead>
            <TableHead>Enviado</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {arquivos.map((a) => (
            <TableRow key={a.id} className="h-11">
              <TableCell className="pl-5">
                <p className="font-medium">{a.nome}</p>
                {a.caminho_externo && (
                  <p className="max-w-xs truncate font-mono text-xs text-texto-3">
                    {a.caminho_externo}
                  </p>
                )}
                {a.notas && <p className="text-xs text-texto-2">{a.notas}</p>}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {TIPOS.find((t) => t.valor === a.tipo)?.rotulo ?? a.tipo}
                </Badge>
              </TableCell>
              <TableCell className="numeros">v{a.versao}</TableCell>
              <TableCell className="numeros">
                {a.tamanho == null ? "Externo" : `${formatarNumero(a.tamanho / 1024 / 1024, 2)} MB`}
              </TableCell>
              <TableCell className="font-mono text-xs text-texto-3">
                {a.hash_sha256 ? `${a.hash_sha256.slice(0, 12)}…` : "Sem hash"}
              </TableCell>
              <TableCell className="numeros text-sm">{formatarDataHora(a.criado_em)}</TableCell>
              <TableCell className="text-right whitespace-nowrap">
                {a.storage_path && <BotaoAbrir id={a.id} />}
                {editar && (
                  <BotaoAcao
                    acao={() => removerArquivo(a.id, produtoId)}
                    confirmar={{
                      titulo: "Remover este arquivo?",
                      descricao: "O arquivo sai do storage. Versões anteriores continuam.",
                      rotulo: "Remover",
                    }}
                  >
                    Remover
                  </BotaoAcao>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

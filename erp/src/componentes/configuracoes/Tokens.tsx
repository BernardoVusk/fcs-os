"use client";

import { useState, useTransition } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { criarToken, revogarToken } from "@/acoes/integracoes";
import { ESCOPO_ROTULO, ESCOPOS } from "@/dominio/conhecimento/escopos";
import { formatarDataHora } from "@/lib/formatos/data";
import { erroPt } from "@/lib/erros-pt";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/componentes/ui/dialog";
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
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";

export type TokenLista = {
  id: string;
  nome: string;
  prefixo: string;
  escopos: string[];
  expira_em: string | null;
  ultimo_uso_em: string | null;
  revogado_em: string | null;
  criado_em: string;
};

function situacao(t: TokenLista): {
  rotulo: string;
  variante: "default" | "secondary" | "outline";
} {
  if (t.revogado_em) return { rotulo: "Revogado", variante: "secondary" };
  if (t.expira_em && new Date(t.expira_em) < new Date())
    return { rotulo: "Expirado", variante: "secondary" };
  return { rotulo: "Ativo", variante: "default" };
}

export function TabelaTokens({ tokens }: { tokens: TokenLista[] }) {
  if (tokens.length === 0) {
    return (
      <EstadoVazio
        titulo="Nenhum token criado"
        descricao="Crie um token para ligar o Claude Code à base de conhecimento."
      />
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
      <Table>
        <TableHeader>
          <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
            <TableHead className="pl-5">Nome</TableHead>
            <TableHead>Prefixo</TableHead>
            <TableHead>Escopos</TableHead>
            <TableHead>Criado</TableHead>
            <TableHead>Último uso</TableHead>
            <TableHead>Validade</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tokens.map((t) => {
            const s = situacao(t);
            return (
              <TableRow key={t.id} className="h-11">
                <TableCell className="pl-5 font-medium">{t.nome}</TableCell>
                <TableCell className="font-mono text-xs">{t.prefixo}…</TableCell>
                <TableCell className="max-w-64 text-xs text-texto-2">
                  {t.escopos.join(", ")}
                </TableCell>
                <TableCell className="numeros text-xs">{formatarDataHora(t.criado_em)}</TableCell>
                <TableCell className="numeros text-xs">
                  {t.ultimo_uso_em ? formatarDataHora(t.ultimo_uso_em) : "Nunca"}
                </TableCell>
                <TableCell className="numeros text-xs">
                  {t.expira_em ? formatarDataHora(t.expira_em) : "Sem validade"}
                </TableCell>
                <TableCell>
                  <Badge variant={s.variante}>{s.rotulo}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {!t.revogado_em && (
                    <BotaoAcao
                      acao={() => revogarToken(t.id)}
                      confirmar={{
                        titulo: `Revogar ${t.nome}?`,
                        descricao:
                          "Qualquer cliente que use este token perde o acesso na próxima chamada.",
                      }}
                    >
                      Revogar
                    </BotaoAcao>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function NovoToken() {
  const [aberto, setAberto] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [token, setToken] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pendente, iniciar] = useTransition();

  function fechar(valor: boolean) {
    setAberto(valor);
    if (!valor) {
      setToken(null);
      setErros({});
      setCopiado(false);
    }
  }

  async function copiar() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopiado(true);
    toast.success("Token copiado.");
  }

  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogTrigger asChild>
        <Button size="sm">
          <KeyRound className="size-4" /> Novo token
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{token ? "Token criado" : "Novo token de integração"}</DialogTitle>
        </DialogHeader>
        {token ? (
          <div className="space-y-4 text-sm">
            <p className="text-texto-2">
              Copie agora. Por segurança o token não aparece de novo; se perder, revogue e crie
              outro.
            </p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={token}
                className="font-mono text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button type="button" variant="secondary" onClick={copiar} aria-label="Copiar token">
                {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <div className="rounded-xl bg-superficie-2 p-3 font-mono text-xs leading-6 text-texto-2">
              <p className="mb-1 font-sans text-texto">No terminal, na pasta do Fcs OS:</p>
              <p>setx FCS_ERP_MCP_TOKEN &quot;{token.slice(0, 8)}…&quot;</p>
              <p>setx FCS_ERP_URL &quot;http://localhost:3000&quot;</p>
              <p className="mt-2 font-sans text-texto">
                O arquivo <code>.mcp.json</code> da raiz já aponta para essas variáveis. Abra uma
                sessão nova do Claude Code e aprove o servidor fcs-erp.
              </p>
            </div>
            <Button type="button" onClick={() => fechar(false)} className="w-full">
              Já copiei
            </Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              iniciar(async () => {
                const r = await criarToken(fd);
                if (r.ok) {
                  setToken(r.token);
                  setErros({});
                } else {
                  setErros(r.erros);
                  if (r.erros._form) toast.error(erroPt(r.erros._form));
                }
              });
            }}
          >
            <Campo
              rotulo="Nome"
              nome="nome"
              erro={erros.nome}
              dica="Para você saber de onde é: notebook, VS Code, servidor"
            >
              <Input id="nome" name="nome" required maxLength={80} />
            </Campo>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Escopos</legend>
              {ESCOPOS.map((e) => (
                <label key={e} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="escopos"
                    value={e}
                    defaultChecked={e.startsWith("conhecimento")}
                    className="mt-1 size-4 accent-acao"
                  />
                  <span>
                    <span className="font-mono text-xs">{e}</span>
                    <span className="block text-texto-2">{ESCOPO_ROTULO[e]}</span>
                  </span>
                </label>
              ))}
              <CampoErro chave={erros.escopos} />
            </fieldset>
            <Campo rotulo="Validade" nome="validade_dias" erro={erros.validade_dias}>
              <SelectNativo id="validade_dias" name="validade_dias" defaultValue="90">
                <option value="30">30 dias</option>
                <option value="90">90 dias</option>
                <option value="365">1 ano</option>
                <option value="0">Sem validade</option>
              </SelectNativo>
            </Campo>
            <CampoErro chave={erros._form} />
            <Button type="submit" disabled={pendente} className="w-full">
              {pendente ? "Gerando" : "Gerar token"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

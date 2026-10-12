"use client";

import { useActionState, useContext, useState } from "react";
import {
  salvarCategoriaFinanceira,
  salvarConta,
  salvarTributo,
} from "@/acoes/financeiro/cadastros";
import { salvarRecorrencia } from "@/acoes/financeiro/lancamentos";
import type {
  CategoriaFinanceira,
  Conta,
  ContaSaldo,
  Recorrencia,
} from "@/dados/financeiro/financeiro";
import { FREQUENCIA_ROTULO, FREQUENCIAS } from "@/dominio/financeiro/recorrencia";
import { FORM_INICIAL } from "@/lib/forms";
import { numeroParaCampo } from "@/lib/formatos/numero";
import { formatarMoeda } from "@/lib/formatos/moeda";
import { formatarData, hojeSaoPaulo } from "@/lib/formatos/data";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Badge } from "@/componentes/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
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
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

const TIPO_CONTA: Record<string, string> = {
  banco: "Banco",
  carteira: "Carteira",
  saldo_marketplace: "Saldo no marketplace",
  cartao: "Cartão",
};

export function FormConta({
  conta,
  canais,
}: {
  conta?: Conta;
  canais: { id: string; nome: string }[];
}) {
  const [estado, acao, pendente] = useActionState(salvarConta, FORM_INICIAL);
  const [tipo, setTipo] = useState(conta?.tipo ?? "banco");
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      {conta && <input type="hidden" name="id" value={conta.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome" nome="nome" erro={estado.erros.nome}>
          <Input
            id="nome"
            name="nome"
            defaultValue={conta?.nome}
            required
            maxLength={80}
            placeholder="Nubank PJ, Carteira Shopee"
          />
        </Campo>
        <Campo rotulo="Tipo" nome="tipo" erro={estado.erros.tipo}>
          <SelectNativo
            id="tipo"
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            {Object.entries(TIPO_CONTA).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        {tipo === "saldo_marketplace" && (
          <Campo
            rotulo="Canal"
            nome="canal_id"
            erro={estado.erros.canal_id}
            dica="Recebíveis desse canal caem nesta conta."
          >
            <SelectNativo id="canal_id" name="canal_id" defaultValue={conta?.canal_id ?? ""}>
              <option value="">Escolha</option>
              {canais.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </SelectNativo>
          </Campo>
        )}
        <Campo rotulo="Saldo inicial (R$)" nome="saldo_inicial" erro={estado.erros.saldo_inicial}>
          <Input
            id="saldo_inicial"
            name="saldo_inicial"
            inputMode="decimal"
            defaultValue={numeroParaCampo(conta?.saldo_inicial ?? 0, 2)}
            className="numeros"
          />
        </Campo>
        <Campo
          rotulo="Saldo inicial em"
          nome="saldo_inicial_em"
          erro={estado.erros.saldo_inicial_em}
        >
          <Input
            id="saldo_inicial_em"
            name="saldo_inicial_em"
            type="date"
            defaultValue={conta?.saldo_inicial_em ?? hojeSaoPaulo()}
            required
          />
        </Campo>
      </div>
      {conta && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="ativo"
            value="sim"
            defaultChecked={conta.ativo}
            className="size-4 accent-acao"
          />
          Conta ativa
        </label>
      )}
      <Campo rotulo="Observações" nome="observacoes" erro={estado.erros.observacoes}>
        <Textarea
          id="observacoes"
          name="observacoes"
          defaultValue={conta?.observacoes ?? ""}
          rows={2}
          maxLength={1000}
        />
      </Campo>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : "Salvar"}
      </Button>
    </form>
  );
}

export function TabelaContas({
  contas,
  completas,
  canais,
  editar,
}: {
  contas: ContaSaldo[];
  completas: Conta[];
  canais: { id: string; nome: string }[];
  editar: boolean;
}) {
  const [aberta, setAberta] = useState<Conta | null>(null);
  if (contas.length === 0)
    return (
      <EstadoVazio
        titulo="Nenhuma conta"
        descricao="Cadastre o banco, a carteira e o saldo de cada marketplace com o saldo inicial de hoje."
      />
    );
  return (
    <>
      <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
        <Table>
          <TableHeader>
            <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
              <TableHead className="pl-5">Conta</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Saldo inicial</TableHead>
              <TableHead className="text-right">Saldo atual</TableHead>
              <TableHead>Situação</TableHead>
              {editar && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {contas.map((c) => (
              <TableRow key={c.id} className="h-11">
                <TableCell className="pl-5 font-medium">{c.nome}</TableCell>
                <TableCell className="text-texto-2">{TIPO_CONTA[c.tipo ?? ""] ?? c.tipo}</TableCell>
                <TableCell className="numeros text-right">
                  {formatarMoeda(c.saldo_inicial)}
                </TableCell>
                <TableCell
                  className={`numeros text-right font-medium ${Number(c.saldo_atual) < 0 ? "text-erro" : ""}`}
                >
                  {formatarMoeda(c.saldo_atual)}
                </TableCell>
                <TableCell>
                  <Badge variant={c.ativo ? "default" : "secondary"}>
                    {c.ativo ? "Ativa" : "Inativa"}
                  </Badge>
                </TableCell>
                {editar && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAberta(completas.find((x) => x.id === c.id) ?? null)}
                    >
                      Editar
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={aberta !== null} onOpenChange={(o) => !o && setAberta(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar conta</DialogTitle>
          </DialogHeader>
          <ContextoDialogo.Provider value={() => setAberta(null)}>
            {aberta && <FormConta key={aberta.id} conta={aberta} canais={canais} />}
          </ContextoDialogo.Provider>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function FormCategoriaFinanceira({ categoria }: { categoria?: CategoriaFinanceira }) {
  const [estado, acao, pendente] = useActionState(salvarCategoriaFinanceira, FORM_INICIAL);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      {categoria && <input type="hidden" name="id" value={categoria.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome" nome="nome" erro={estado.erros.nome}>
          <Input id="nome" name="nome" defaultValue={categoria?.nome} required maxLength={80} />
        </Campo>
        <Campo rotulo="Tipo" nome="tipo" erro={estado.erros.tipo}>
          <SelectNativo id="tipo" name="tipo" defaultValue={categoria?.tipo ?? "despesa"}>
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </SelectNativo>
        </Campo>
        <Campo rotulo="Natureza" nome="natureza" erro={estado.erros.natureza}>
          <SelectNativo
            id="natureza"
            name="natureza"
            defaultValue={categoria?.natureza ?? "variavel"}
          >
            <option value="variavel">Variável (muda com o volume)</option>
            <option value="fixa">Fixa (todo mês)</option>
          </SelectNativo>
        </Campo>
        <Campo rotulo="Ordem" nome="ordem" erro={estado.erros.ordem}>
          <Input
            id="ordem"
            name="ordem"
            inputMode="numeric"
            defaultValue={String(categoria?.ordem ?? 0)}
            className="numeros"
          />
        </Campo>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="embutido_no_custo"
          value="sim"
          defaultChecked={categoria?.embutido_no_custo ?? false}
          className="mt-0.5 size-4 accent-acao"
        />
        <span>
          Embutida no custo
          <span className="block text-xs text-texto-3">
            Entra no caixa, mas fica fora da DRE gerencial porque já chega ao resultado pelo custo
            realizado das ordens (filamento, energia, manutenção).
          </span>
        </span>
      </label>
      {categoria && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="ativo"
            value="sim"
            defaultChecked={categoria.ativo}
            className="size-4 accent-acao"
          />
          Categoria ativa
        </label>
      )}
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : "Salvar"}
      </Button>
    </form>
  );
}

export function TabelaCategoriasFinanceiras({
  categorias,
  editar,
}: {
  categorias: CategoriaFinanceira[];
  editar: boolean;
}) {
  const [aberta, setAberta] = useState<CategoriaFinanceira | null>(null);
  return (
    <>
      <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
        <Table>
          <TableHeader>
            <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
              <TableHead className="pl-5">Categoria</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Natureza</TableHead>
              <TableHead>DRE</TableHead>
              {editar && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categorias.map((c) => (
              <TableRow key={c.id} className={c.ativo ? "h-11" : "h-11 text-texto-3"}>
                <TableCell className="pl-5 font-medium">{c.nome}</TableCell>
                <TableCell>{c.tipo === "receita" ? "Receita" : "Despesa"}</TableCell>
                <TableCell>{c.natureza === "fixa" ? "Fixa" : "Variável"}</TableCell>
                <TableCell>
                  {c.embutido_no_custo ? (
                    <Badge variant="outline">embutida no custo</Badge>
                  ) : (
                    <span className="text-texto-2">entra na DRE</span>
                  )}
                </TableCell>
                {editar && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setAberta(c)}>
                      Editar
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={aberta !== null} onOpenChange={(o) => !o && setAberta(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoria</DialogTitle>
          </DialogHeader>
          <ContextoDialogo.Provider value={() => setAberta(null)}>
            {aberta && <FormCategoriaFinanceira key={aberta.id} categoria={aberta} />}
          </ContextoDialogo.Provider>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function FormRecorrencia({
  recorrencia,
  contas,
  categorias,
}: {
  recorrencia?: Recorrencia;
  contas: { id: string; nome: string }[];
  categorias: { id: string; nome: string; tipo: string }[];
}) {
  const [estado, acao, pendente] = useActionState(salvarRecorrencia, FORM_INICIAL);
  const [tipo, setTipo] = useState(recorrencia?.tipo ?? "despesa");
  const [freq, setFreq] = useState(recorrencia?.frequencia ?? "mensal");
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      {recorrencia && <input type="hidden" name="id" value={recorrencia.id} />}
      <Campo rotulo="Descrição" nome="descricao" erro={estado.erros.descricao}>
        <Input
          id="descricao"
          name="descricao"
          defaultValue={recorrencia?.descricao}
          required
          maxLength={160}
          placeholder="Internet, pró-labore, assinatura do fatiador"
        />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Tipo" nome="tipo" erro={estado.erros.tipo}>
          <SelectNativo
            id="tipo"
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </SelectNativo>
        </Campo>
        <Campo rotulo="Valor (R$)" nome="valor" erro={estado.erros.valor}>
          <Input
            id="valor"
            name="valor"
            inputMode="decimal"
            defaultValue={numeroParaCampo(recorrencia?.valor, 2)}
            required
            className="numeros"
          />
        </Campo>
        <Campo rotulo="Frequência" nome="frequencia" erro={estado.erros.frequencia}>
          <SelectNativo
            id="frequencia"
            name="frequencia"
            value={freq}
            onChange={(e) => setFreq(e.target.value)}
          >
            {FREQUENCIAS.map((f) => (
              <option key={f} value={f}>
                {FREQUENCIA_ROTULO[f]}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        {freq === "mensal" && (
          <Campo
            rotulo="Dia do mês"
            nome="dia"
            erro={estado.erros.dia}
            dica="31 cai no último dia dos meses curtos."
          >
            <Input
              id="dia"
              name="dia"
              inputMode="numeric"
              defaultValue={recorrencia?.dia == null ? "" : String(recorrencia.dia)}
              className="numeros"
            />
          </Campo>
        )}
        <Campo rotulo="Início" nome="inicio" erro={estado.erros.inicio}>
          <Input
            id="inicio"
            name="inicio"
            type="date"
            defaultValue={recorrencia?.inicio ?? hojeSaoPaulo()}
            required
          />
        </Campo>
        <Campo rotulo="Fim" nome="fim" erro={estado.erros.fim} dica="Vazio: sem fim.">
          <Input id="fim" name="fim" type="date" defaultValue={recorrencia?.fim ?? ""} />
        </Campo>
        <Campo rotulo="Categoria" nome="categoria_id" erro={estado.erros.categoria_id}>
          <SelectNativo
            id="categoria_id"
            name="categoria_id"
            defaultValue={recorrencia?.categoria_id ?? ""}
          >
            <option value="">Sem categoria</option>
            {categorias
              .filter((c) => c.tipo === tipo)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Conta" nome="conta_id" erro={estado.erros.conta_id}>
          <SelectNativo id="conta_id" name="conta_id" defaultValue={recorrencia?.conta_id ?? ""}>
            <option value="">Definir ao realizar</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </SelectNativo>
        </Campo>
      </div>
      {recorrencia && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="ativo"
            value="sim"
            defaultChecked={recorrencia.ativo}
            className="size-4 accent-acao"
          />
          Recorrência ativa
        </label>
      )}
      <Campo rotulo="Observações" nome="observacoes" erro={estado.erros.observacoes}>
        <Input
          id="observacoes"
          name="observacoes"
          defaultValue={recorrencia?.observacoes ?? ""}
          maxLength={1000}
        />
      </Campo>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : "Salvar"}
      </Button>
    </form>
  );
}

export function TabelaRecorrencias({
  itens,
  contas,
  categorias,
  editar,
}: {
  itens: (Recorrencia & { categoria: { nome: string } | null; conta: { nome: string } | null })[];
  contas: { id: string; nome: string }[];
  categorias: { id: string; nome: string; tipo: string }[];
  editar: boolean;
}) {
  const [aberta, setAberta] = useState<Recorrencia | null>(null);
  if (itens.length === 0)
    return (
      <EstadoVazio
        titulo="Nenhuma recorrência"
        descricao="Cadastre o que se repete todo mês (internet, software, pró-labore) e gere os lançamentos dos próximos 3 meses."
      />
    );
  return (
    <>
      <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
        <Table>
          <TableHeader>
            <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
              <TableHead className="pl-5">Descrição</TableHead>
              <TableHead>Frequência</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Situação</TableHead>
              {editar && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {itens.map((r) => (
              <TableRow key={r.id} className="h-11">
                <TableCell className="pl-5">
                  <p className="font-medium">{r.descricao}</p>
                  <p className="text-xs text-texto-3">
                    {[
                      r.tipo === "receita" ? "Receita" : "Despesa",
                      r.categoria?.nome,
                      r.conta?.nome,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </TableCell>
                <TableCell>
                  {FREQUENCIA_ROTULO[r.frequencia as keyof typeof FREQUENCIA_ROTULO] ??
                    r.frequencia}
                  {r.frequencia === "mensal" && r.dia != null && (
                    <span className="text-texto-3"> dia {r.dia}</span>
                  )}
                </TableCell>
                <TableCell className="numeros text-right">{formatarMoeda(r.valor)}</TableCell>
                <TableCell className="numeros text-sm">
                  {formatarData(r.inicio)}
                  {r.fim ? ` a ${formatarData(r.fim)}` : " em diante"}
                </TableCell>
                <TableCell>
                  <Badge variant={r.ativo ? "default" : "secondary"}>
                    {r.ativo ? "Ativa" : "Inativa"}
                  </Badge>
                </TableCell>
                {editar && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setAberta(r)}>
                      Editar
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={aberta !== null} onOpenChange={(o) => !o && setAberta(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar recorrência</DialogTitle>
          </DialogHeader>
          <ContextoDialogo.Provider value={() => setAberta(null)}>
            {aberta && (
              <FormRecorrencia
                key={aberta.id}
                recorrencia={aberta}
                contas={contas}
                categorias={categorias}
              />
            )}
          </ContextoDialogo.Provider>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function FormTributo() {
  const [estado, acao, pendente] = useActionState(salvarTributo, FORM_INICIAL);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Regime"
          nome="regime"
          erro={estado.erros.regime}
          dica="Texto livre: MEI, Simples Nacional Anexo II, etc."
        >
          <Input id="regime" name="regime" required maxLength={80} />
        </Campo>
        <Campo
          rotulo="Alíquota efetiva (%)"
          nome="aliquota_efetiva_pct"
          erro={estado.erros.aliquota_efetiva_pct}
          dica="Confira com o contador. Sem valor padrão."
        >
          <Input
            id="aliquota_efetiva_pct"
            name="aliquota_efetiva_pct"
            inputMode="decimal"
            required
            className="numeros"
          />
        </Campo>
        <Campo rotulo="Base de cálculo" nome="base" erro={estado.erros.base}>
          <SelectNativo id="base" name="base" defaultValue="faturamento_bruto">
            <option value="faturamento_bruto">Faturamento bruto (base de vendas)</option>
            <option value="receita_liquida">Receita líquida</option>
          </SelectNativo>
        </Campo>
        <Campo
          rotulo="Dia do vencimento"
          nome="dia_vencimento"
          erro={estado.erros.dia_vencimento}
          dica="No mês seguinte à competência (1 a 28)."
        >
          <Input
            id="dia_vencimento"
            name="dia_vencimento"
            inputMode="numeric"
            defaultValue="20"
            className="numeros"
          />
        </Campo>
        <Campo rotulo="Vigente desde" nome="vigente_desde" erro={estado.erros.vigente_desde}>
          <Input
            id="vigente_desde"
            name="vigente_desde"
            type="date"
            defaultValue={hojeSaoPaulo()}
            required
          />
        </Campo>
      </div>
      <Campo rotulo="Observações" nome="observacoes" erro={estado.erros.observacoes}>
        <Input id="observacoes" name="observacoes" maxLength={1000} />
      </Campo>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : "Registrar"}
      </Button>
    </form>
  );
}

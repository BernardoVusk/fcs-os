"use client";

import { useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { autorizarOrigem, salvarCupom, salvarGrupo } from "@/acoes/ofertas/cadastros";
import { PLATAFORMAS, PLATAFORMA_ROTULO } from "@/dominio/ofertas/plataformas";
import { erroPt } from "@/lib/erros-pt";
import type { EstadoForm } from "@/lib/forms";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";

function useEnvio(acao: (fd: FormData) => Promise<EstadoForm>) {
  const router = useRouter();
  const fechar = useContext(ContextoDialogo);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [pendente, iniciar] = useTransition();
  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    iniciar(async () => {
      const r = await acao(fd);
      setErros(r.erros);
      if (r.ok) {
        toast.success(r.mensagem ?? "Salvo.");
        fechar();
        router.refresh();
      } else if (r.erros._form) toast.error(erroPt(r.erros._form));
    });
  };
  return { erros, pendente, enviar };
}

export type GrupoEdicao = {
  id: string;
  nome: string;
  funcao: string;
  link_convite: string | null;
  tag_amazon: string | null;
  campanha: string | null;
  observacoes: string | null;
};

export function FormGrupo({ grupo }: { grupo?: GrupoEdicao }) {
  const { erros, pendente, enviar } = useEnvio((fd) => salvarGrupo(grupo?.id ?? null, fd));
  return (
    <form className="space-y-4" onSubmit={enviar} noValidate>
      <Campo rotulo="Nome do grupo" nome="g-nome" erro={erros.nome}>
        <Input id="g-nome" name="nome" defaultValue={grupo?.nome} maxLength={120} required />
      </Campo>
      <Campo
        rotulo="Função"
        nome="g-funcao"
        erro={erros.funcao}
        dica="Origem autorizada é marcada pelo dono, na lista de grupos."
      >
        <SelectNativo
          id="g-funcao"
          name="funcao"
          defaultValue={grupo?.funcao === "origem" ? "monitorado" : (grupo?.funcao ?? "destino")}
        >
          <option value="destino">Destino (nosso grupo, recebe ofertas)</option>
          <option value="teste">Teste controlado</option>
          <option value="monitorado">Só monitorado</option>
          <option value="nenhuma">Sem função</option>
        </SelectNativo>
      </Campo>
      <Campo
        rotulo="Link de convite (opcional)"
        nome="g-link"
        erro={erros.link_convite}
        dica="Abre o grupo direto da tela Publicar."
      >
        <Input
          id="g-link"
          name="link_convite"
          defaultValue={grupo?.link_convite ?? ""}
          placeholder="https://chat.whatsapp.com/..."
          inputMode="url"
        />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="ID de rastreamento Amazon (opcional)"
          nome="g-tag"
          erro={erros.tag_amazon}
          dica="Para separar as vendas deste grupo. Termina em -20."
        >
          <Input id="g-tag" name="tag_amazon" defaultValue={grupo?.tag_amazon ?? ""} />
        </Campo>
        <Campo
          rotulo="Campanha (opcional)"
          nome="g-campanha"
          erro={erros.campanha}
          dica="Entra no sub ID quando a oferta não tem campanha."
        >
          <Input
            id="g-campanha"
            name="campanha"
            defaultValue={grupo?.campanha ?? ""}
            maxLength={60}
          />
        </Campo>
      </div>
      <Campo rotulo="Observações" nome="g-obs" erro={erros.observacoes}>
        <Textarea
          id="g-obs"
          name="observacoes"
          defaultValue={grupo?.observacoes ?? ""}
          rows={2}
          maxLength={1000}
        />
      </Campo>
      <CampoErro chave={erros._form} />
      <Button type="submit" disabled={pendente} className="w-full">
        {pendente ? "Salvando" : "Salvar grupo"}
      </Button>
    </form>
  );
}

export function FormAutorizacao({ grupoId }: { grupoId: string }) {
  const { erros, pendente, enviar } = useEnvio((fd) => autorizarOrigem(grupoId, fd));
  return (
    <form className="space-y-4" onSubmit={enviar}>
      <p className="text-sm text-texto-2">
        Só use grupos de terceiros que a empresa tem autorização para acompanhar e reutilizar.
        Registre quem autorizou, quando e como (mensagem, contrato, e-mail). Avisos, condições e
        dados do vendedor da oferta original são preservados.
      </p>
      <Campo rotulo="Autorização" nome="a-desc" erro={erros.descricao}>
        <Textarea
          id="a-desc"
          name="descricao"
          rows={3}
          maxLength={500}
          placeholder="Ex.: dono do grupo X autorizou por e-mail em 18/10/2026."
        />
      </Campo>
      <CampoErro chave={erros._form} />
      <Button type="submit" disabled={pendente} className="w-full">
        Registrar autorização
      </Button>
    </form>
  );
}

export type CupomEdicao = {
  id: string;
  plataforma: string;
  codigo: string | null;
  descricao: string;
  beneficio: string | null;
  regras: string | null;
  valor_minimo: number | null;
  inicio_local: string;
  fim_local: string;
  validade_confirmada: boolean;
  url_referencia: string | null;
  aplicabilidade: string | null;
};

export function FormCupom({ cupom }: { cupom?: CupomEdicao }) {
  const { erros, pendente, enviar } = useEnvio((fd) => salvarCupom(cupom?.id ?? null, fd));
  return (
    <form className="space-y-4" onSubmit={enviar} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Plataforma" nome="c-plat" erro={erros.plataforma}>
          <SelectNativo id="c-plat" name="plataforma" defaultValue={cupom?.plataforma ?? "shopee"}>
            {PLATAFORMAS.map((p) => (
              <option key={p} value={p}>
                {PLATAFORMA_ROTULO[p]}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Código (se houver)" nome="c-codigo" erro={erros.codigo}>
          <Input
            id="c-codigo"
            name="codigo"
            defaultValue={cupom?.codigo ?? ""}
            maxLength={60}
            className="uppercase"
          />
        </Campo>
      </div>
      <Campo rotulo="Descrição" nome="c-desc" erro={erros.descricao}>
        <Input id="c-desc" name="descricao" defaultValue={cupom?.descricao} maxLength={300} />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Benefício confirmado"
          nome="c-benef"
          erro={erros.beneficio}
          dica="Ex.: 10% até R$ 30. Só o que a fonte confirma."
        >
          <Input
            id="c-benef"
            name="beneficio"
            defaultValue={cupom?.beneficio ?? ""}
            maxLength={200}
          />
        </Campo>
        <Campo rotulo="Compra mínima (R$)" nome="c-min" erro={erros.valor_minimo}>
          <Input
            id="c-min"
            name="valor_minimo"
            defaultValue={cupom?.valor_minimo ?? ""}
            inputMode="decimal"
          />
        </Campo>
        <Campo rotulo="Início" nome="c-ini" erro={erros.inicio_em}>
          <Input
            id="c-ini"
            name="inicio_em"
            type="datetime-local"
            defaultValue={cupom?.inicio_local}
          />
        </Campo>
        <Campo rotulo="Fim" nome="c-fim" erro={erros.fim_em}>
          <Input id="c-fim" name="fim_em" type="datetime-local" defaultValue={cupom?.fim_local} />
        </Campo>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="validade_confirmada"
          defaultChecked={cupom?.validade_confirmada}
          className="size-4 accent-acao"
        />
        Validade conferida na fonte oficial
      </label>
      <Campo rotulo="Regras e condições" nome="c-regras" erro={erros.regras}>
        <Textarea
          id="c-regras"
          name="regras"
          defaultValue={cupom?.regras ?? ""}
          rows={2}
          maxLength={2000}
        />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Página oficial do cupom" nome="c-url" erro={erros.url_referencia}>
          <Input
            id="c-url"
            name="url_referencia"
            defaultValue={cupom?.url_referencia ?? ""}
            inputMode="url"
          />
        </Campo>
        <Campo rotulo="Produtos ou categorias" nome="c-apl" erro={erros.aplicabilidade}>
          <Input
            id="c-apl"
            name="aplicabilidade"
            defaultValue={cupom?.aplicabilidade ?? ""}
            maxLength={500}
          />
        </Campo>
      </div>
      <CampoErro chave={erros._form} />
      <Button type="submit" disabled={pendente} className="w-full">
        {pendente ? "Salvando" : "Salvar cupom"}
      </Button>
    </form>
  );
}

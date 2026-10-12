"use client";

import { useActionState } from "react";
import { importarCatalogo } from "@/acoes/produtos/importacao";
import { FORM_INICIAL } from "@/lib/forms";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { Banner } from "@/componentes/painel/Banner";

export function ImportarCatalogo() {
  const [estado, acao, pendente] = useActionState(importarCatalogo, FORM_INICIAL);
  return (
    <form action={acao} className="space-y-4 rounded-2xl bg-card p-5 shadow-painel" noValidate>
      <Campo
        rotulo="Arquivo CSV do catálogo"
        nome="arquivo"
        erro={estado.erros.arquivo}
        dica="Gerado pela skill /marketplace em dados/catalogo. Colunas canal, id, titulo, preco..."
      >
        <Input
          id="arquivo"
          name="arquivo"
          type="file"
          accept=".csv,text/csv"
          className="file:mr-3 file:rounded-full file:border-0 file:bg-superficie-2 file:px-3 file:py-1 file:text-sm"
        />
      </Campo>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Importando" : "Importar"}
      </Button>
      {estado.ok && estado.mensagem && (
        <Banner tipo="sucesso" titulo="Importação concluída">
          {estado.mensagem}
        </Banner>
      )}
    </form>
  );
}

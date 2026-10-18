"use client";

import { publicarCupom } from "@/acoes/ofertas/ofertas";
import { DialogoPublicar, type GrupoOpcao } from "./DialogoPublicar";

/** Publicação de um cupom sozinho; link só se for de afiliado da própria plataforma. */
export function PublicarCupom({
  cupomId,
  grupos,
  desabilitado,
  motivo,
}: {
  cupomId: string;
  grupos: GrupoOpcao[];
  desabilitado: boolean;
  motivo: string;
}) {
  return (
    <DialogoPublicar
      rotulo="Publicar cupom"
      grupos={grupos}
      desabilitado={desabilitado}
      motivoDesabilitado={motivo}
      extra={{
        rotulo: "Link de afiliado (opcional)",
        dica: "Só link de afiliado da mesma plataforma. Sem link, a mensagem sai só com o código e a validade.",
      }}
      acao={(g, ag, link) =>
        publicarCupom(cupomId, { grupos: g, agendado_para: ag, texto: null, link })
      }
    />
  );
}

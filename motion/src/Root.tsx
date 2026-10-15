/**
 * Registro das composições.
 *
 * Convenção: `<Peca>-<Formato>`, o mesmo componente registrado uma vez por
 * formato de entrega, com as dimensões vindas de `FORMATOS`.
 */
import React from "react";
import { Composition, Still } from "remotion";

import { ApresentacaoERP, DURACAO_APRESENTACAO_ERP } from "./composicoes/ApresentacaoERP";
import { KitMarca } from "./composicoes/KitMarca";
import { FORMATOS } from "./marca/formatos";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="ApresentacaoERP-Landscape"
      component={ApresentacaoERP}
      durationInFrames={DURACAO_APRESENTACAO_ERP}
      {...FORMATOS.landscape}
    />
    {/* Conferência da marca, não é peça de entrega. */}
    <Still id="KitMarca" component={KitMarca} width={FORMATOS.landscape.width} height={FORMATOS.landscape.height} />
  </>
);

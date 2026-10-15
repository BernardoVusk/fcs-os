/**
 * O chanfro de 45°: os cantos cortados das letras F, C, S e do bloco
 * "3D Studio" do logo. É a aresta da marca, e entra de três jeitos:
 *
 * - `chanfro()`: canto de card, moldura e botão (a marca não arredonda).
 * - `mascaraCorte()`: máscara de revelação com aresta a 45°.
 * - `ReguaCorte`: régua de pontas cortadas, sob título ou logo.
 *
 * No logo o corte aparece no canto superior esquerdo e no inferior direito:
 * esse é o par padrão de `chanfro()`.
 */
import React from "react";

/** Inclinação do chanfro, em graus. */
export const INCLINACAO = 45;

export type Canto = "se" | "sd" | "id" | "ie";

/**
 * `clipPath` com os cantos pedidos cortados a 45°. `tamanho` em px.
 * se = superior esquerdo, sd = superior direito, id = inferior direito,
 * ie = inferior esquerdo. Padrão: `se` e `id`, como no logo.
 */
export const chanfro = (tamanho: number, cantosCortados: Canto[] = ["se", "id"]) => {
  const t = (c: Canto) => (cantosCortados.includes(c) ? tamanho : 0);
  const se = t("se");
  const sd = t("sd");
  const id = t("id");
  const ie = t("ie");
  return `polygon(${se}px 0, calc(100% - ${sd}px) 0, 100% ${sd}px, 100% calc(100% - ${id}px), calc(100% - ${id}px) 100%, ${ie}px 100%, 0 calc(100% - ${ie}px), 0 ${se}px)`;
};

/**
 * Régua com as pontas cortadas a 45°. Desenha da esquerda pra direita.
 */
export const ReguaCorte: React.FC<{
  largura: number;
  espessura: number;
  cor: string;
  /** 0–1: quanto da régua já foi desenhado. */
  progresso: number;
}> = ({ largura, espessura, cor, progresso }) => {
  const p = Math.max(0, Math.min(1, progresso));
  const w = largura * p;
  // Paralelogramo: as duas pontas no mesmo ângulo do chanfro.
  return (
    <div style={{ width: largura, height: espessura }}>
      <div
        style={{
          width: w,
          height: espessura,
          background: cor,
          clipPath:
            w > espessura
              ? `polygon(${espessura}px 0, 100% 0, calc(100% - ${espessura}px) 100%, 0 100%)`
              : "none",
        }}
      />
    </div>
  );
};

/**
 * Máscara de revelação com aresta a 45°, da esquerda pra direita.
 * `progresso` 0 = tudo escondido, 1 = tudo à mostra. Devolve o `clipPath`.
 *
 * A 45°, a aresta avança `altura` px na horizontal entre o topo e a base: por
 * isso o curso total é `largura + altura`.
 */
export const mascaraCorte = (progresso: number, largura: number, altura: number) => {
  const total = largura + altura;
  const frente = progresso * total;
  const topo = frente;
  const base = frente - altura;
  return `polygon(0 0, ${topo}px 0, ${base}px 100%, 0 100%)`;
};

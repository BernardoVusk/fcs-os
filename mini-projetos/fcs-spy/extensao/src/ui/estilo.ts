// Identidade FCS: preto, ciano, cantos retos, sem sombra.
export const ESTILO_BASE = `
:host { all: initial; }
* { box-sizing: border-box; font-family: Inter, Poppins, system-ui, sans-serif; }
.card, .painel, .barra {
  background: #0A0A0A; color: #FFFFFF; border: 1px solid #1F1F1F;
  border-radius: 2px; font-size: 11px; line-height: 1.4;
}
button {
  background: #00D8FF; color: #0A0A0A; border: 0; border-radius: 2px;
  font-weight: 700; text-transform: uppercase; cursor: pointer; font-size: 10px; padding: 2px 6px;
}
input, select {
  background: #141414; color: #FFFFFF; border: 1px solid #1F1F1F;
  border-radius: 2px; font-size: 11px; padding: 2px 4px;
}
`

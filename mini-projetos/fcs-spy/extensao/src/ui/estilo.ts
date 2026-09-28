// Visual v2: fundo branco, cantos arredondados, preto e ciano da FCS.
// Exceção ao design guide aprovada pelo usuário em 27/09/2026 (só na extensão).
export const ESTILO_BASE = `
:host { all: initial; }
:host {
  --fundo: #FFFFFF; --superficie: #F3F5F6; --linha: #E6E9EB; --texto: #0A0A0A; --suave: #6B7177;
  --ciano: #00D8FF; --ciano-claro: #E0F9FF; --ciano-escuro: #006B80; --preto: #0A0A0A;
  --raio: 14px; --raio-sm: 10px;
  --sombra: 0 1px 2px rgba(10,10,10,.04), 0 8px 24px rgba(10,10,10,.06);
}
* { box-sizing: border-box; margin: 0; font-family: Inter, "Segoe UI", system-ui, sans-serif; }
.num { font-variant-numeric: tabular-nums; }
svg.ic { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: none; }
.rotulo { color: var(--suave); font-size: 10px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
.heroi { display: flex; align-items: flex-end; justify-content: space-between; gap: 6px; }
.grande { font-size: 28px; font-weight: 700; line-height: 1; letter-spacing: -.02em; color: var(--texto); }
.chip { display: inline-flex; align-items: center; gap: 3px; border-radius: 999px; padding: 3px 7px; font-size: 10px; font-weight: 700; white-space: nowrap; }
.chip.sobe { background: var(--ciano); color: var(--preto); }
.chip.cai { background: var(--preto); color: #FFFFFF; }
.chip.estavel, .chip.novo { background: var(--superficie); color: var(--suave); }
.est { display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: var(--ciano); margin-left: 4px; vertical-align: middle; }
.so-leitor { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.linha { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
.linha > span:first-child { color: var(--suave); display: inline-flex; gap: 5px; align-items: center; }
.linha b { font-weight: 600; }
.pilulas { display: flex; gap: 4px; flex-wrap: wrap; }
.pilula { background: var(--superficie); border-radius: 999px; padding: 3px 7px; font-size: 10px; }
.pilula em { font-style: normal; color: var(--suave); }
.selo { background: var(--ciano-claro); color: var(--ciano-escuro); border-radius: 999px; padding: 3px 7px; font-size: 10px; font-weight: 700; }
.icone-btn { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 999px; border: 1px solid var(--linha); background: var(--fundo); color: var(--texto); cursor: pointer; flex: none; padding: 0; }
.icone-btn:hover { border-color: var(--texto); }
button:focus-visible, select:focus-visible, input:focus-visible { outline: 2px solid var(--ciano); outline-offset: 2px; }
.marca { display: inline-flex; align-items: center; gap: 6px; font-weight: 800; letter-spacing: .02em; color: var(--texto); }
.logo { width: 22px; height: 22px; border-radius: 7px; background: var(--preto); display: grid; place-items: center; }
.logo i { width: 8px; height: 8px; border-radius: 2px; background: var(--ciano); }
.interruptor { appearance: none; position: relative; width: 34px; height: 20px; border: 0; border-radius: 999px; background: #D5DADD; cursor: pointer; flex: none; margin: 0; padding: 0; }
.interruptor::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #FFFFFF; box-shadow: 0 1px 2px rgba(0,0,0,.2); transition: left .15s; }
.interruptor[aria-checked="true"], .interruptor:checked { background: var(--ciano); }
.interruptor[aria-checked="true"]::after, .interruptor:checked::after { left: 16px; }
.interruptor:disabled { opacity: .5; cursor: default; }
`

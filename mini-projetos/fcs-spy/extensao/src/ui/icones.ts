// Ícones de linha 24x24 desenhados só com formas fixas daqui. Nada vem da página.
const SVG = 'http://www.w3.org/2000/svg'

type Forma = [string, Record<string, string>]
const p = (d: string): Forma => ['path', { d }]

export const ICONES = {
  calendario: [['rect', { x: '3', y: '5', width: '18', height: '16', rx: '3' }], p('M8 3v4M16 3v4M3 10h18')],
  carteira: [p('M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z'), p('M4 7l11-3v3M16 13.5h.01')],
  sobe: [p('M4 16l6-6 4 4 6-7'), p('M15 7h5v5')],
  cai: [p('M4 8l6 6 4-4 6 7'), p('M15 17h5v-5')],
  seta: [p('M6 9l6 6 6-6')],
  copiar: [['rect', { x: '9', y: '9', width: '11', height: '11', rx: '2.5' }], p('M5 15V6a2 2 0 0 1 2-2h9')],
  coracao: [p('M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z')],
  balao: [p('M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-5 4V6a1 1 0 0 1 1-1z')],
  estrela: [p('M12 4l2.5 5 5.5.8-4 3.9.9 5.5L12 16.6 7.1 19.2l.9-5.5-4-3.9 5.5-.8z')],
  ordenar: [p('M7 4v16M4 17l3 3 3-3M17 20V4M14 7l3-3 3 3')],
  engrenagem: [
    ['circle', { cx: '12', cy: '12', r: '3' }],
    p('M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4.4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4.4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z'),
  ],
  menos: [p('M6 12h12')],
  mais: [p('M6 12h12M12 6v12')],
  cubo: [p('M12 3l8 4.5v9L12 21l-8-4.5v-9z'), p('M4 7.5l8 4.5 8-4.5M12 12v9')],
  loja: [p('M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16'), p('M9 20v-6h6v6')],
  alvo: [
    ['circle', { cx: '12', cy: '12', r: '8' }],
    ['circle', { cx: '12', cy: '12', r: '4' }],
    ['circle', { cx: '12', cy: '12', r: '.5' }],
  ],
  check: [p('M5 12.5l4.5 4.5L19 7.5')],
} satisfies Record<string, Forma[]>

export type NomeIcone = keyof typeof ICONES

export function icone(nome: NomeIcone, doc: Document = document): SVGSVGElement {
  const svg = doc.createElementNS(SVG, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('class', 'ic')
  svg.setAttribute('aria-hidden', 'true')
  for (const [tag, attrs] of ICONES[nome] as Forma[]) {
    const forma = doc.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) forma.setAttribute(k, v)
    svg.append(forma)
  }
  return svg
}

// Marca da FCS: quadrado preto com miolo ciano, seguido do texto.
export function marcaFcs(texto: string, doc: Document = document): HTMLElement {
  const marca = doc.createElement('span')
  marca.className = 'marca'
  const logo = doc.createElement('span')
  logo.className = 'logo'
  logo.append(doc.createElement('i'))
  marca.append(logo, texto)
  return marca
}

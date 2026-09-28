// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { icone, marcaFcs, ICONES, type NomeIcone } from '../src/ui/icones'

describe('icone', () => {
  it('svg decorativo com classe ic e viewBox 24', () => {
    const svg = icone('calendario')
    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg')
    expect(svg.getAttribute('class')).toBe('ic')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(svg.children).toHaveLength(2)
  })
  it('todo ícone do conjunto desenha pelo menos uma forma', () => {
    for (const nome of Object.keys(ICONES) as NomeIcone[]) {
      expect(icone(nome).children.length, nome).toBeGreaterThan(0)
    }
  })
  it('conjunto completo da spec', () => {
    expect(Object.keys(ICONES).sort()).toEqual([
      'alvo', 'balao', 'cai', 'calendario', 'carteira', 'check', 'copiar', 'coracao',
      'cubo', 'engrenagem', 'estrela', 'loja', 'mais', 'menos', 'ordenar', 'seta', 'sobe',
    ])
  })
})

describe('marcaFcs', () => {
  it('logo e texto', () => {
    const m = marcaFcs('Calculadora')
    expect(m.className).toBe('marca')
    expect(m.querySelector('.logo')).not.toBeNull()
    expect(m.textContent).toBe('Calculadora')
  })
})

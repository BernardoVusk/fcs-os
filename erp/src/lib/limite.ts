/** Janela deslizante em memória: até `maximo` chamadas por `janelaMs` por chave (token). */
export class Limitador {
  private registros = new Map<string, number[]>();
  constructor(
    private readonly maximo = 60,
    private readonly janelaMs = 60_000,
  ) {}

  permitir(chave: string, agora = Date.now()): { permitido: boolean; restante: number } {
    const inicio = agora - this.janelaMs;
    const lista = (this.registros.get(chave) ?? []).filter((t) => t > inicio);
    if (lista.length >= this.maximo) {
      this.registros.set(chave, lista);
      return { permitido: false, restante: 0 };
    }
    lista.push(agora);
    this.registros.set(chave, lista);
    if (this.registros.size > 1000) this.limpar(agora);
    return { permitido: true, restante: this.maximo - lista.length };
  }

  private limpar(agora: number) {
    const inicio = agora - this.janelaMs;
    for (const [chave, lista] of this.registros) {
      const vivos = lista.filter((t) => t > inicio);
      if (vivos.length === 0) this.registros.delete(chave);
      else this.registros.set(chave, vivos);
    }
  }
}

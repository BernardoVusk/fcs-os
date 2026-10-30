import { describe, it, expect } from "vitest";
import { NOME_MAXIMO, classificar, limparNome, urlCapa } from "./catalogo.mjs";

describe("limparNome", () => {
  it("tira as marcas de AMS em qualquer formato", () => {
    expect(limparNome("SON GOKU DRAGON BALL / SEM AMS")).toBe("Son Goku Dragon Ball");
    expect(limparNome("Lutador de Artes Marciais - Sem AMS")).toBe("Lutador de Artes Marciais");
    expect(limparNome(".50 BMG - Projétil Simulado/Réplica (Com e Sem AMS)")).toBe(
      ".50 BMG: Projétil Simulado/Réplica",
    );
    expect(limparNome("Martial art fighter NO AMS")).toBe("Martial art fighter");
  });

  it("troca travessão e hífen separador por dois-pontos", () => {
    expect(limparNome("Valorant - Vandal Campeões 2025")).toBe("Valorant: Vandal Campeões 2025");
    expect(limparNome("Menina em um Balanço – Escultura Poética Minimalista")).toBe(
      "Menina em um Balanço: Escultura Poética Minimalista",
    );
    expect(limparNome("Base para miniaturas ou troféus — Personalizável")).toBe(
      "Base para miniaturas ou troféus: Personalizável",
    );
  });

  it("mantém só a primeira parte antes da barra vertical", () => {
    expect(limparNome("Logo da Mesa CS GO | Placa de Mesa Counterstrike")).toBe(
      "Logo da Mesa CS GO",
    );
  });

  it("tira parênteses de instrução de impressão", () => {
    expect(
      limparNome(
        "Arena Breakout G17 (duas configurações de impressão: a primeira é versão pequena A1mini, a segunda é versão grande escala 1:1)",
      ),
    ).toBe("Arena Breakout G17");
    expect(limparNome("Tom & Jerry (versão Jerry)")).toBe("Tom & Jerry");
    expect(limparNome("Soco Inglês Cravejado Estilo Antigo (Soco Inglês)")).toBe(
      "Soco Inglês Cravejado Estilo Antigo (Soco Inglês)",
    );
  });

  it("converte nome todo em maiúsculas, com preposição em minúscula", () => {
    expect(limparNome("FIGURA DE AGACHAMENTO - TROFÉU / HOME DE GINÁSIO")).toBe(
      "Figura de Agachamento: Troféu / Home de Ginásio",
    );
    expect(limparNome("VALORANT - CAÇADOR DE CABEÇAS")).toBe("Valorant: Caçador de Cabeças");
  });

  it("não mexe em sigla curta nem em nome normal", () => {
    expect(limparNome("Chaveiro Luva de Boxe Mão Esquerda")).toBe(
      "Chaveiro Luva de Boxe Mão Esquerda",
    );
    expect(limparNome("USP - Cosplay")).toBe("USP: Cosplay");
  });

  it("limpa espaços e separadores sobrando", () => {
    expect(limparNome("  Busto   de Marco Aurélio  -  ")).toBe("Busto de Marco Aurélio");
  });

  it("tira AMS em barra, com 'não precisa' e 'necessário'", () => {
    expect(limparNome("Bender edição urbana /AMS - brinquedo Futurama")).toBe(
      "Bender edição urbana: brinquedo Futurama",
    );
    expect(limparNome("Homer Simpson em um Donut - Não precisa de AMS")).toBe(
      "Homer Simpson em um Donut",
    );
    expect(limparNome("Pacman multipart com AMS necessário")).toBe("Pacman");
    expect(limparNome("Crash Rockstar! Multipeça - NÃO É NECESSÁRIO AMS")).toBe("Crash Rockstar!");
  });

  it("tira multicor, suporte, medida, ideogramas e colchetes", () => {
    expect(limparNome("Lugia Multicor")).toBe("Lugia");
    expect(limparNome("Pokemon-Charmander (SEM SUPORTE)")).toBe("Pokemon-Charmander");
    expect(limparNome("Ghost Face * Pânico * ~22 cm ~22 cm")).toBe("Ghost Face Pânico");
    expect(limparNome("Painel perfurado IKEA Skadis 宜家洞洞板")).toBe(
      "Painel perfurado IKEA Skadis",
    );
    expect(limparNome("【Nissan】Nissan Skyline GT-R R33")).toBe("Nissan Nissan Skyline GT-R R33");
    expect(limparNome("[Escala 64] Dodge Charger Daytona Clássica")).toBe(
      "Dodge Charger Daytona Clássica",
    );
    expect(limparNome("Kuromi Fan-Art ( )")).toBe("Kuromi Fan-Art");
    expect(limparNome("Digimon—V-mon")).toBe("Digimon: V-mon");
  });

  it("preserva escala e siglas", () => {
    expect(limparNome("BMW M2 F87 com Direção 1:19")).toBe("BMW M2 F87 com Direção 1:19");
    expect(limparNome("911 GT3 RS MODELO EM ESCALA 1/24 SEM AMS")).toBe(
      "911 GT3 RS Modelo em Escala 1/24",
    );
    expect(limparNome("MODELO AVENTADOR SVJ ESCALA 1/24")).toBe("Modelo Aventador SVJ Escala 1/24");
  });

  it("junta separadores sobrando depois de tirar AMS", () => {
    expect(limparNome("Pernalonga - (AMS) - Fácil montagem")).toBe("Pernalonga: Fácil montagem");
    expect(limparNome("Bowser Super Mario / NÃO AMS")).toBe("Bowser Super Mario");
    expect(limparNome("Kuromi Fan-Art (NOAMS)")).toBe("Kuromi Fan-Art");
    expect(limparNome("jerry shelby fan art (3mf/multipartes)")).toBe("Jerry shelby fan art");
    expect(limparNome("Luigi- Super Mario Movie")).toBe("Luigi: Super Mario Movie");
    expect(limparNome("Porta-lápis do Bob Esponja")).toBe("Porta-lápis do Bob Esponja");
  });

  it("tira AMS colado, 'com e sem AMS' em parênteses e impressão em partes", () => {
    expect(limparNome("Pato Urbano NoAMS")).toBe("Pato Urbano");
    expect(limparNome("Caixa para Hotend - Série A1 (com AMS e Sem AMS)")).toBe(
      "Caixa para Hotend: Série A1",
    );
    expect(limparNome("Ferrari F40 Impressão em Múltiplas Partes + AMS")).toBe("Ferrari F40");
    expect(limparNome("Porsche 718 GT4 RS Impressão Multipartes + AMS Completo")).toBe(
      "Porsche 718 GT4 RS",
    );
    expect(limparNome("Turbo para Crocs (Jibbitz) USE WITH CAUTION!")).toBe(
      "Turbo para Crocs (Jibbitz)",
    );
  });

  it("não termina em preposição depois de tirar medida", () => {
    expect(limparNome("Estojo para marcadores MTG de 20mm")).toBe("Estojo para marcadores MTG");
  });

  it("corta nome longo no separador ou na palavra, sem passar do máximo", () => {
    const longo =
      "Apenas 8g para impressão rápida! Ferramenta de manutenção e calibração para a sua impressora, com encaixe magnético e furos";
    const nome = limparNome(longo);
    expect(nome.length).toBeLessThanOrEqual(NOME_MAXIMO);
    expect(nome).toBe(
      "Apenas 8g para impressão rápida! Ferramenta de manutenção e calibração para a sua",
    );
    const semSeparador = limparNome(`Peça ${"muito ".repeat(30)}grande`);
    expect(semSeparador.length).toBeLessThanOrEqual(NOME_MAXIMO);
    expect(semSeparador.endsWith("muito")).toBe(true);
  });

  it("começa com maiúscula", () => {
    expect(limparNome("punhos de metal")).toBe("Punhos de metal");
  });
});

describe("classificar", () => {
  it("usa o nome antes da coleção de origem", () => {
    expect(
      classificar("Organizador de Algodão e Cotonete com Malha Voronoi", "carros-e-motos"),
    ).toBe("organizacao-e-utilidades");
    expect(classificar("Suporte vertical para laptop", "personagens")).toBe("tecnologia");
    expect(classificar("Monkey D. Luffy: One Piece: Estátua de Batalha", "carros-e-motos")).toBe(
      "personagens",
    );
    expect(classificar("Esqueleto Flexível de Tiranossauro Rex", "loja")).toBe("animais");
    expect(classificar("Cortador de biscoito de capivara", "loja")).toBe(
      "organizacao-e-utilidades",
    );
  });

  it("tema de carro e F1 vence o tipo de peça", () => {
    expect(classificar("Suporte para Fones de Ouvido F1", "personagens")).toBe("carros-e-motos");
    expect(classificar("Chaveiro GT3 RS", "carros-e-motos")).toBe("carros-e-motos");
    expect(classificar("Luminária Porsche: Escapamento", "decoracao")).toBe("carros-e-motos");
  });

  it("chaveiro vai para presentes e luminária para decoração", () => {
    expect(classificar("Chaveiro Pokémon Meowth", "loja")).toBe("presentes");
    expect(classificar("Luminária LED 001", "decoracao")).toBe("decoracao");
  });

  it("suporte de chaveiro é organização; vaso e luminária no começo do nome são decoração", () => {
    expect(classificar("Suporte giratório para chaveiros, personalizável", "loja")).toBe(
      "organizacao-e-utilidades",
    );
    expect(classificar("Vaso Estético Ondulado com Bandeja de Gotejamento", "decoracao")).toBe(
      "decoracao",
    );
    expect(classificar("Luminária de Pássaro", "decoracao")).toBe("decoracao");
    expect(classificar("Vasos de flores suspensos", "decoracao")).toBe("decoracao");
  });

  it("sem palavra-chave vale a coleção; Loja cai em decoração", () => {
    expect(classificar("Transcend", "personagens")).toBe("personagens");
    expect(classificar("Máquina do Mistério", "loja")).toBe("decoracao");
  });
});

describe("urlCapa", () => {
  it("pede à CDN a capa em webp com 800 px, trocando a query original", () => {
    expect(
      urlCapa(
        "https://makerworld.bblmw.com/makerworld/model/X/design/a.jpg?x-oss-process=image/resize,w_400/format,webp",
      ),
    ).toBe(
      "https://makerworld.bblmw.com/makerworld/model/X/design/a.jpg?x-oss-process=image/resize,w_800/format,webp",
    );
  });

  it("recusa host fora da CDN do MakerWorld", () => {
    expect(() => urlCapa("https://exemplo.com/a.jpg")).toThrow(/CDN/);
  });
});

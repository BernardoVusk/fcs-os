// Gerado por npm run tipos. Nao editar a mao.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      alertas: {
        Row: {
          criado_em: string;
          descricao: string | null;
          entidade_id: string | null;
          entidade_tipo: string | null;
          id: string;
          resolvido_em: string | null;
          severidade: string;
          silenciado_ate: string | null;
          tipo: string;
          titulo: string;
        };
        Insert: {
          criado_em?: string;
          descricao?: string | null;
          entidade_id?: string | null;
          entidade_tipo?: string | null;
          id?: string;
          resolvido_em?: string | null;
          severidade: string;
          silenciado_ate?: string | null;
          tipo: string;
          titulo: string;
        };
        Update: {
          criado_em?: string;
          descricao?: string | null;
          entidade_id?: string | null;
          entidade_tipo?: string | null;
          id?: string;
          resolvido_em?: string | null;
          severidade?: string;
          silenciado_ate?: string | null;
          tipo?: string;
          titulo?: string;
        };
        Relationships: [];
      };
      auditoria: {
        Row: {
          acao: string;
          antes: Json | null;
          depois: Json | null;
          em: string;
          id: number;
          origem: string;
          registro_id: string;
          tabela: string;
          usuario_id: string | null;
        };
        Insert: {
          acao: string;
          antes?: Json | null;
          depois?: Json | null;
          em?: string;
          id?: never;
          origem: string;
          registro_id: string;
          tabela: string;
          usuario_id?: string | null;
        };
        Update: {
          acao?: string;
          antes?: Json | null;
          depois?: Json | null;
          em?: string;
          id?: never;
          origem?: string;
          registro_id?: string;
          tabela?: string;
          usuario_id?: string | null;
        };
        Relationships: [];
      };
      canais_venda: {
        Row: {
          ativo: boolean;
          atualizado_em: string;
          criado_em: string;
          id: string;
          nome: string;
          observacoes: string | null;
          tipo: string;
        };
        Insert: {
          ativo?: boolean;
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          nome: string;
          observacoes?: string | null;
          tipo: string;
        };
        Update: {
          ativo?: boolean;
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          nome?: string;
          observacoes?: string | null;
          tipo?: string;
        };
        Relationships: [];
      };
      canais_venda_taxas: {
        Row: {
          ads_pct_padrao: number | null;
          canal_id: string;
          comissao_pct: number | null;
          criado_em: string;
          dias_repasse: number | null;
          frete_subsidio_padrao: number | null;
          id: string;
          observacoes: string | null;
          taxa_fixa_item: number | null;
          taxa_pagamento_pct: number | null;
          vigente_desde: string;
        };
        Insert: {
          ads_pct_padrao?: number | null;
          canal_id: string;
          comissao_pct?: number | null;
          criado_em?: string;
          dias_repasse?: number | null;
          frete_subsidio_padrao?: number | null;
          id?: string;
          observacoes?: string | null;
          taxa_fixa_item?: number | null;
          taxa_pagamento_pct?: number | null;
          vigente_desde: string;
        };
        Update: {
          ads_pct_padrao?: number | null;
          canal_id?: string;
          comissao_pct?: number | null;
          criado_em?: string;
          dias_repasse?: number | null;
          frete_subsidio_padrao?: number | null;
          id?: string;
          observacoes?: string | null;
          taxa_fixa_item?: number | null;
          taxa_pagamento_pct?: number | null;
          vigente_desde?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canais_venda_taxas_canal_id_fkey";
            columns: ["canal_id"];
            isOneToOne: false;
            referencedRelation: "canais_venda";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "canais_venda_taxas_canal_id_fkey";
            columns: ["canal_id"];
            isOneToOne: false;
            referencedRelation: "canais_venda_vigentes";
            referencedColumns: ["id"];
          },
        ];
      };
      categorias: {
        Row: {
          ativo: boolean;
          atualizado_em: string;
          cor: string | null;
          criado_em: string;
          escopo: string;
          id: string;
          nome: string;
          ordem: number;
          pai_id: string | null;
        };
        Insert: {
          ativo?: boolean;
          atualizado_em?: string;
          cor?: string | null;
          criado_em?: string;
          escopo: string;
          id?: string;
          nome: string;
          ordem?: number;
          pai_id?: string | null;
        };
        Update: {
          ativo?: boolean;
          atualizado_em?: string;
          cor?: string | null;
          criado_em?: string;
          escopo?: string;
          id?: string;
          nome?: string;
          ordem?: number;
          pai_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "categorias_pai_id_fkey";
            columns: ["pai_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
        ];
      };
      compras: {
        Row: {
          atualizado_em: string;
          confirmada_em: string | null;
          criado_em: string;
          criado_por: string | null;
          data: string;
          desconto_total: number;
          fornecedor_id: string | null;
          frete: number;
          id: string;
          metodo_rateio: string;
          numero_documento: string | null;
          observacoes: string | null;
          outros_custos: number;
          preco_inclui_frete: boolean;
          status: string;
        };
        Insert: {
          atualizado_em?: string;
          confirmada_em?: string | null;
          criado_em?: string;
          criado_por?: string | null;
          data?: string;
          desconto_total?: number;
          fornecedor_id?: string | null;
          frete?: number;
          id?: string;
          metodo_rateio?: string;
          numero_documento?: string | null;
          observacoes?: string | null;
          outros_custos?: number;
          preco_inclui_frete?: boolean;
          status?: string;
        };
        Update: {
          atualizado_em?: string;
          confirmada_em?: string | null;
          criado_em?: string;
          criado_por?: string | null;
          data?: string;
          desconto_total?: number;
          fornecedor_id?: string | null;
          frete?: number;
          id?: string;
          metodo_rateio?: string;
          numero_documento?: string | null;
          observacoes?: string | null;
          outros_custos?: number;
          preco_inclui_frete?: boolean;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "compras_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
        ];
      };
      compras_itens: {
        Row: {
          compra_id: string;
          custo_total: number | null;
          custo_unitario_final: number | null;
          desconto_item: number;
          id: string;
          insumo_id: string;
          lote_codigo: string | null;
          ordem: number;
          peso_util_g: number | null;
          preco_unitario: number;
          quantidade: number;
          quantidade_base: number | null;
          rateio: number | null;
          unidade: string;
        };
        Insert: {
          compra_id: string;
          custo_total?: number | null;
          custo_unitario_final?: number | null;
          desconto_item?: number;
          id?: string;
          insumo_id: string;
          lote_codigo?: string | null;
          ordem?: number;
          peso_util_g?: number | null;
          preco_unitario: number;
          quantidade: number;
          quantidade_base?: number | null;
          rateio?: number | null;
          unidade: string;
        };
        Update: {
          compra_id?: string;
          custo_total?: number | null;
          custo_unitario_final?: number | null;
          desconto_item?: number;
          id?: string;
          insumo_id?: string;
          lote_codigo?: string | null;
          ordem?: number;
          peso_util_g?: number | null;
          preco_unitario?: number;
          quantidade?: number;
          quantidade_base?: number | null;
          rateio?: number | null;
          unidade?: string;
        };
        Relationships: [
          {
            foreignKeyName: "compras_itens_compra_id_fkey";
            columns: ["compra_id"];
            isOneToOne: false;
            referencedRelation: "compras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "compras_itens_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "estoque_atual";
            referencedColumns: ["insumo_id"];
          },
          {
            foreignKeyName: "compras_itens_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "insumos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "compras_itens_unidade_fkey";
            columns: ["unidade"];
            isOneToOne: false;
            referencedRelation: "unidades";
            referencedColumns: ["codigo"];
          },
        ];
      };
      conhecimentos: {
        Row: {
          atualizado_em: string;
          busca: unknown;
          categoria_id: string | null;
          confidencialidade: string;
          conteudo: string;
          criado_em: string;
          criado_por: string | null;
          estrutura: Json | null;
          id: string;
          modulo: string | null;
          origem: string;
          projeto: string | null;
          referencia: string | null;
          resumo: string | null;
          slug: string;
          status: string;
          tags: string[];
          tipo: string;
          titulo: string;
          validado: boolean;
          validado_em: string | null;
          validado_por: string | null;
          versao: number;
        };
        Insert: {
          atualizado_em?: string;
          busca?: unknown;
          categoria_id?: string | null;
          confidencialidade?: string;
          conteudo: string;
          criado_em?: string;
          criado_por?: string | null;
          estrutura?: Json | null;
          id?: string;
          modulo?: string | null;
          origem?: string;
          projeto?: string | null;
          referencia?: string | null;
          resumo?: string | null;
          slug: string;
          status?: string;
          tags?: string[];
          tipo: string;
          titulo: string;
          validado?: boolean;
          validado_em?: string | null;
          validado_por?: string | null;
          versao?: number;
        };
        Update: {
          atualizado_em?: string;
          busca?: unknown;
          categoria_id?: string | null;
          confidencialidade?: string;
          conteudo?: string;
          criado_em?: string;
          criado_por?: string | null;
          estrutura?: Json | null;
          id?: string;
          modulo?: string | null;
          origem?: string;
          projeto?: string | null;
          referencia?: string | null;
          resumo?: string | null;
          slug?: string;
          status?: string;
          tags?: string[];
          tipo?: string;
          titulo?: string;
          validado?: boolean;
          validado_em?: string | null;
          validado_por?: string | null;
          versao?: number;
        };
        Relationships: [
          {
            foreignKeyName: "conhecimentos_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
        ];
      };
      conhecimentos_anexos: {
        Row: {
          conhecimento_id: string;
          criado_em: string;
          criado_por: string | null;
          id: string;
          nome: string;
          storage_path: string;
          tamanho: number | null;
          tipo: string | null;
        };
        Insert: {
          conhecimento_id: string;
          criado_em?: string;
          criado_por?: string | null;
          id?: string;
          nome: string;
          storage_path: string;
          tamanho?: number | null;
          tipo?: string | null;
        };
        Update: {
          conhecimento_id?: string;
          criado_em?: string;
          criado_por?: string | null;
          id?: string;
          nome?: string;
          storage_path?: string;
          tamanho?: number | null;
          tipo?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conhecimentos_anexos_conhecimento_id_fkey";
            columns: ["conhecimento_id"];
            isOneToOne: false;
            referencedRelation: "conhecimentos";
            referencedColumns: ["id"];
          },
        ];
      };
      conhecimentos_relacoes: {
        Row: {
          criado_em: string;
          de_id: string;
          para_id: string;
          tipo: string;
        };
        Insert: {
          criado_em?: string;
          de_id: string;
          para_id: string;
          tipo: string;
        };
        Update: {
          criado_em?: string;
          de_id?: string;
          para_id?: string;
          tipo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conhecimentos_relacoes_de_id_fkey";
            columns: ["de_id"];
            isOneToOne: false;
            referencedRelation: "conhecimentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conhecimentos_relacoes_para_id_fkey";
            columns: ["para_id"];
            isOneToOne: false;
            referencedRelation: "conhecimentos";
            referencedColumns: ["id"];
          },
        ];
      };
      conhecimentos_versoes: {
        Row: {
          alterado_por: string | null;
          conhecimento_id: string;
          conteudo: string;
          em: string;
          estrutura: Json | null;
          id: number;
          motivo: string | null;
          origem: string | null;
          resumo: string | null;
          tags: string[];
          titulo: string;
          versao: number;
        };
        Insert: {
          alterado_por?: string | null;
          conhecimento_id: string;
          conteudo: string;
          em?: string;
          estrutura?: Json | null;
          id?: never;
          motivo?: string | null;
          origem?: string | null;
          resumo?: string | null;
          tags?: string[];
          titulo: string;
          versao: number;
        };
        Update: {
          alterado_por?: string | null;
          conhecimento_id?: string;
          conteudo?: string;
          em?: string;
          estrutura?: Json | null;
          id?: never;
          motivo?: string | null;
          origem?: string | null;
          resumo?: string | null;
          tags?: string[];
          titulo?: string;
          versao?: number;
        };
        Relationships: [
          {
            foreignKeyName: "conhecimentos_versoes_conhecimento_id_fkey";
            columns: ["conhecimento_id"];
            isOneToOne: false;
            referencedRelation: "conhecimentos";
            referencedColumns: ["id"];
          },
        ];
      };
      fornecedores: {
        Row: {
          ativo: boolean;
          atualizado_em: string;
          contato: string | null;
          criado_em: string;
          id: string;
          nome: string;
          observacoes: string | null;
          prazo_medio_dias: number | null;
          site: string | null;
        };
        Insert: {
          ativo?: boolean;
          atualizado_em?: string;
          contato?: string | null;
          criado_em?: string;
          id?: string;
          nome: string;
          observacoes?: string | null;
          prazo_medio_dias?: number | null;
          site?: string | null;
        };
        Update: {
          ativo?: boolean;
          atualizado_em?: string;
          contato?: string | null;
          criado_em?: string;
          id?: string;
          nome?: string;
          observacoes?: string | null;
          prazo_medio_dias?: number | null;
          site?: string | null;
        };
        Relationships: [];
      };
      insumos: {
        Row: {
          ativo: boolean;
          atributos: Json;
          atualizado_em: string;
          categoria_id: string | null;
          codigo_interno: string | null;
          criado_em: string;
          custo_manual: number | null;
          custo_medio: number | null;
          estoque_minimo: number;
          id: string;
          localizacao: string | null;
          nome: string;
          observacoes: string | null;
          origem_custo: string;
          tipo: string;
          ultimo_custo: number | null;
          unidade_base: string;
        };
        Insert: {
          ativo?: boolean;
          atributos?: Json;
          atualizado_em?: string;
          categoria_id?: string | null;
          codigo_interno?: string | null;
          criado_em?: string;
          custo_manual?: number | null;
          custo_medio?: number | null;
          estoque_minimo?: number;
          id?: string;
          localizacao?: string | null;
          nome: string;
          observacoes?: string | null;
          origem_custo?: string;
          tipo: string;
          ultimo_custo?: number | null;
          unidade_base?: string;
        };
        Update: {
          ativo?: boolean;
          atributos?: Json;
          atualizado_em?: string;
          categoria_id?: string | null;
          codigo_interno?: string | null;
          criado_em?: string;
          custo_manual?: number | null;
          custo_medio?: number | null;
          estoque_minimo?: number;
          id?: string;
          localizacao?: string | null;
          nome?: string;
          observacoes?: string | null;
          origem_custo?: string;
          tipo?: string;
          ultimo_custo?: number | null;
          unidade_base?: string;
        };
        Relationships: [
          {
            foreignKeyName: "insumos_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "insumos_unidade_base_fkey";
            columns: ["unidade_base"];
            isOneToOne: false;
            referencedRelation: "unidades";
            referencedColumns: ["codigo"];
          },
        ];
      };
      lotes_insumo: {
        Row: {
          aberto_em: string;
          codigo: string;
          compra_item_id: string | null;
          custo_unitario: number;
          divergente: boolean;
          encerrado_em: string | null;
          id: string;
          insumo_id: string;
          observacoes: string | null;
          peso_carretel_vazio_g: number | null;
          quantidade_atual: number;
          quantidade_inicial: number;
          valor_atual: number;
        };
        Insert: {
          aberto_em?: string;
          codigo: string;
          compra_item_id?: string | null;
          custo_unitario?: number;
          divergente?: boolean;
          encerrado_em?: string | null;
          id?: string;
          insumo_id: string;
          observacoes?: string | null;
          peso_carretel_vazio_g?: number | null;
          quantidade_atual: number;
          quantidade_inicial: number;
          valor_atual?: number;
        };
        Update: {
          aberto_em?: string;
          codigo?: string;
          compra_item_id?: string | null;
          custo_unitario?: number;
          divergente?: boolean;
          encerrado_em?: string | null;
          id?: string;
          insumo_id?: string;
          observacoes?: string | null;
          peso_carretel_vazio_g?: number | null;
          quantidade_atual?: number;
          quantidade_inicial?: number;
          valor_atual?: number;
        };
        Relationships: [
          {
            foreignKeyName: "lotes_insumo_compra_item_id_fkey";
            columns: ["compra_item_id"];
            isOneToOne: false;
            referencedRelation: "compras_itens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lotes_insumo_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "estoque_atual";
            referencedColumns: ["insumo_id"];
          },
          {
            foreignKeyName: "lotes_insumo_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "insumos";
            referencedColumns: ["id"];
          },
        ];
      };
      migracoes_aplicadas: {
        Row: {
          aplicada_em: string;
          nome: string;
        };
        Insert: {
          aplicada_em?: string;
          nome: string;
        };
        Update: {
          aplicada_em?: string;
          nome?: string;
        };
        Relationships: [];
      };
      movimentacoes_estoque: {
        Row: {
          custo_unitario: number;
          em: string;
          id: string;
          insumo_id: string;
          justificativa: string | null;
          lote_id: string | null;
          motivo: string | null;
          origem_id: string | null;
          origem_tipo: string | null;
          quantidade: number;
          tipo: string;
          usuario_id: string | null;
          valor: number;
        };
        Insert: {
          custo_unitario?: number;
          em?: string;
          id?: string;
          insumo_id: string;
          justificativa?: string | null;
          lote_id?: string | null;
          motivo?: string | null;
          origem_id?: string | null;
          origem_tipo?: string | null;
          quantidade: number;
          tipo: string;
          usuario_id?: string | null;
          valor?: number;
        };
        Update: {
          custo_unitario?: number;
          em?: string;
          id?: string;
          insumo_id?: string;
          justificativa?: string | null;
          lote_id?: string | null;
          motivo?: string | null;
          origem_id?: string | null;
          origem_tipo?: string | null;
          quantidade?: number;
          tipo?: string;
          usuario_id?: string | null;
          valor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "estoque_atual";
            referencedColumns: ["insumo_id"];
          },
          {
            foreignKeyName: "movimentacoes_estoque_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "insumos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimentacoes_estoque_lote_id_fkey";
            columns: ["lote_id"];
            isOneToOne: false;
            referencedRelation: "lotes_insumo";
            referencedColumns: ["id"];
          },
        ];
      };
      tokens_integracao: {
        Row: {
          criado_em: string;
          escopos: string[];
          expira_em: string | null;
          hash_token: string;
          id: string;
          nome: string;
          prefixo: string;
          revogado_em: string | null;
          ultimo_uso_em: string | null;
          usuario_id: string;
        };
        Insert: {
          criado_em?: string;
          escopos?: string[];
          expira_em?: string | null;
          hash_token: string;
          id?: string;
          nome: string;
          prefixo: string;
          revogado_em?: string | null;
          ultimo_uso_em?: string | null;
          usuario_id: string;
        };
        Update: {
          criado_em?: string;
          escopos?: string[];
          expira_em?: string | null;
          hash_token?: string;
          id?: string;
          nome?: string;
          prefixo?: string;
          revogado_em?: string | null;
          ultimo_uso_em?: string | null;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tokens_integracao_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuarios_app";
            referencedColumns: ["id"];
          },
        ];
      };
      unidades: {
        Row: {
          base: string | null;
          codigo: string;
          fator_para_base: number;
          nome: string;
        };
        Insert: {
          base?: string | null;
          codigo: string;
          fator_para_base?: number;
          nome: string;
        };
        Update: {
          base?: string | null;
          codigo?: string;
          fator_para_base?: number;
          nome?: string;
        };
        Relationships: [
          {
            foreignKeyName: "unidades_base_fkey";
            columns: ["base"];
            isOneToOne: false;
            referencedRelation: "unidades";
            referencedColumns: ["codigo"];
          },
        ];
      };
      usuarios_app: {
        Row: {
          ativo: boolean;
          atualizado_em: string;
          criado_em: string;
          id: string;
          nome: string;
          papel: string;
        };
        Insert: {
          ativo?: boolean;
          atualizado_em?: string;
          criado_em?: string;
          id: string;
          nome: string;
          papel: string;
        };
        Update: {
          ativo?: boolean;
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          nome?: string;
          papel?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      canais_venda_vigentes: {
        Row: {
          ads_pct_padrao: number | null;
          ativo: boolean | null;
          atualizado_em: string | null;
          comissao_pct: number | null;
          criado_em: string | null;
          dias_repasse: number | null;
          frete_subsidio_padrao: number | null;
          id: string | null;
          nome: string | null;
          observacoes: string | null;
          taxa_fixa_item: number | null;
          taxa_pagamento_pct: number | null;
          taxas_id: string | null;
          tipo: string | null;
          vigente_desde: string | null;
        };
        Relationships: [];
      };
      estoque_atual: {
        Row: {
          abaixo_minimo: boolean | null;
          ativo: boolean | null;
          custo_manual: number | null;
          custo_medio: number | null;
          estoque_minimo: number | null;
          insumo_id: string | null;
          lotes_com_saldo: number | null;
          nome: string | null;
          origem_custo: string | null;
          saldo: number | null;
          saldo_negativo: number | null;
          tipo: string | null;
          ultimo_custo: number | null;
          unidade_base: string | null;
          valor: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "insumos_unidade_base_fkey";
            columns: ["unidade_base"];
            isOneToOne: false;
            referencedRelation: "unidades";
            referencedColumns: ["codigo"];
          },
        ];
      };
    };
    Functions: {
      buscar_global: {
        Args: { limite?: number; termo: string; tipos?: string[] };
        Returns: {
          id: string;
          pontuacao: number;
          rota: string;
          subtitulo: string;
          tipo: string;
          titulo: string;
        }[];
      };
      confirmar_compra: { Args: { p_compra: string }; Returns: Json };
      estornar_movimentacao: {
        Args: { p_motivo: string; p_movimentacao: string };
        Returns: string;
      };
      listar_conhecimentos: {
        Args: {
          p_categoria?: string;
          p_limite?: number;
          p_modulo?: string;
          p_status?: string;
          p_tag?: string;
          p_termo?: string;
          p_tipo?: string;
        };
        Returns: {
          atualizado_em: string;
          busca: unknown;
          categoria_id: string | null;
          confidencialidade: string;
          conteudo: string;
          criado_em: string;
          criado_por: string | null;
          estrutura: Json | null;
          id: string;
          modulo: string | null;
          origem: string;
          projeto: string | null;
          referencia: string | null;
          resumo: string | null;
          slug: string;
          status: string;
          tags: string[];
          tipo: string;
          titulo: string;
          validado: boolean;
          validado_em: string | null;
          validado_por: string | null;
          versao: number;
        }[];
        SetofOptions: {
          from: "*";
          to: "conhecimentos";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      movimentar_estoque: {
        Args: {
          p_insumo: string;
          p_justificativa?: string;
          p_lote?: string;
          p_motivo?: string;
          p_origem_id?: string;
          p_origem_tipo?: string;
          p_permitir_negativo?: boolean;
          p_quantidade: number;
          p_tipo: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

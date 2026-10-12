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
      calculos_custo: {
        Row: {
          canal_id: string | null;
          criado_em: string;
          criado_por: string | null;
          custo_unitario_total: number;
          custo_variavel: number;
          entradas: Json;
          id: string;
          impressora_id: string | null;
          insumo_id: string | null;
          margem_alvo: number | null;
          markup_alvo: number | null;
          metodo_margem: string | null;
          motivo: string;
          nome: string;
          observacoes: string | null;
          ordem_producao_id: string | null;
          parametros_versao: number | null;
          preco_sugerido: number | null;
          produto_id: string | null;
          resultado: Json;
          variacao_id: string | null;
          versao_motor: string;
        };
        Insert: {
          canal_id?: string | null;
          criado_em?: string;
          criado_por?: string | null;
          custo_unitario_total: number;
          custo_variavel: number;
          entradas: Json;
          id?: string;
          impressora_id?: string | null;
          insumo_id?: string | null;
          margem_alvo?: number | null;
          markup_alvo?: number | null;
          metodo_margem?: string | null;
          motivo?: string;
          nome: string;
          observacoes?: string | null;
          ordem_producao_id?: string | null;
          parametros_versao?: number | null;
          preco_sugerido?: number | null;
          produto_id?: string | null;
          resultado: Json;
          variacao_id?: string | null;
          versao_motor: string;
        };
        Update: {
          canal_id?: string | null;
          criado_em?: string;
          criado_por?: string | null;
          custo_unitario_total?: number;
          custo_variavel?: number;
          entradas?: Json;
          id?: string;
          impressora_id?: string | null;
          insumo_id?: string | null;
          margem_alvo?: number | null;
          markup_alvo?: number | null;
          metodo_margem?: string | null;
          motivo?: string;
          nome?: string;
          observacoes?: string | null;
          ordem_producao_id?: string | null;
          parametros_versao?: number | null;
          preco_sugerido?: number | null;
          produto_id?: string | null;
          resultado?: Json;
          variacao_id?: string | null;
          versao_motor?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calculos_custo_canal_id_fkey";
            columns: ["canal_id"];
            isOneToOne: false;
            referencedRelation: "canais_venda";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calculos_custo_canal_id_fkey";
            columns: ["canal_id"];
            isOneToOne: false;
            referencedRelation: "canais_venda_vigentes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calculos_custo_impressora_id_fkey";
            columns: ["impressora_id"];
            isOneToOne: false;
            referencedRelation: "impressoras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calculos_custo_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "estoque_atual";
            referencedColumns: ["insumo_id"];
          },
          {
            foreignKeyName: "calculos_custo_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "insumos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calculos_custo_parametros_versao_fkey";
            columns: ["parametros_versao"];
            isOneToOne: false;
            referencedRelation: "parametros_custo";
            referencedColumns: ["versao"];
          },
          {
            foreignKeyName: "calculos_custo_parametros_versao_fkey";
            columns: ["parametros_versao"];
            isOneToOne: false;
            referencedRelation: "parametros_custo_vigentes";
            referencedColumns: ["versao"];
          },
          {
            foreignKeyName: "calculos_custo_produto_fk";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "estoque_produtos";
            referencedColumns: ["produto_id"];
          },
          {
            foreignKeyName: "calculos_custo_produto_fk";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calculos_custo_variacao_fk";
            columns: ["variacao_id"];
            isOneToOne: false;
            referencedRelation: "produtos_variacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      canais_venda: {
        Row: {
          ativo: boolean;
          atualizado_em: string;
          criado_em: string;
          id: string;
          mapeamento_pedidos: Json;
          nome: string;
          observacoes: string | null;
          tipo: string;
        };
        Insert: {
          ativo?: boolean;
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          mapeamento_pedidos?: Json;
          nome: string;
          observacoes?: string | null;
          tipo: string;
        };
        Update: {
          ativo?: boolean;
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          mapeamento_pedidos?: Json;
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
      categorias_financeiras: {
        Row: {
          ativo: boolean;
          embutido_no_custo: boolean;
          id: string;
          natureza: string;
          nome: string;
          ordem: number;
          pai_id: string | null;
          tipo: string;
        };
        Insert: {
          ativo?: boolean;
          embutido_no_custo?: boolean;
          id?: string;
          natureza?: string;
          nome: string;
          ordem?: number;
          pai_id?: string | null;
          tipo: string;
        };
        Update: {
          ativo?: boolean;
          embutido_no_custo?: boolean;
          id?: string;
          natureza?: string;
          nome?: string;
          ordem?: number;
          pai_id?: string | null;
          tipo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categorias_financeiras_pai_id_fkey";
            columns: ["pai_id"];
            isOneToOne: false;
            referencedRelation: "categorias_financeiras";
            referencedColumns: ["id"];
          },
        ];
      };
      centros_custo: {
        Row: {
          ativo: boolean;
          id: string;
          nome: string;
        };
        Insert: {
          ativo?: boolean;
          id?: string;
          nome: string;
        };
        Update: {
          ativo?: boolean;
          id?: string;
          nome?: string;
        };
        Relationships: [];
      };
      clientes: {
        Row: {
          anonimizado: boolean;
          atualizado_em: string;
          canal_origem_id: string | null;
          criado_em: string;
          documento: string | null;
          email: string | null;
          endereco: Json;
          id: string;
          nome: string;
          observacoes: string | null;
          telefone: string | null;
        };
        Insert: {
          anonimizado?: boolean;
          atualizado_em?: string;
          canal_origem_id?: string | null;
          criado_em?: string;
          documento?: string | null;
          email?: string | null;
          endereco?: Json;
          id?: string;
          nome: string;
          observacoes?: string | null;
          telefone?: string | null;
        };
        Update: {
          anonimizado?: boolean;
          atualizado_em?: string;
          canal_origem_id?: string | null;
          criado_em?: string;
          documento?: string | null;
          email?: string | null;
          endereco?: Json;
          id?: string;
          nome?: string;
          observacoes?: string | null;
          telefone?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clientes_canal_origem_id_fkey";
            columns: ["canal_origem_id"];
            isOneToOne: false;
            referencedRelation: "canais_venda";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clientes_canal_origem_id_fkey";
            columns: ["canal_origem_id"];
            isOneToOne: false;
            referencedRelation: "canais_venda_vigentes";
            referencedColumns: ["id"];
          },
        ];
      };
      componentes_custo: {
        Row: {
          ativo: boolean;
          atualizado_em: string;
          chave_motor: string | null;
          codigo: string;
          descricao: string | null;
          grupo: string;
          id: string;
          metodo: string;
          nome: string;
          ordem: number;
          parametros: Json;
        };
        Insert: {
          ativo?: boolean;
          atualizado_em?: string;
          chave_motor?: string | null;
          codigo: string;
          descricao?: string | null;
          grupo: string;
          id?: string;
          metodo: string;
          nome: string;
          ordem?: number;
          parametros?: Json;
        };
        Update: {
          ativo?: boolean;
          atualizado_em?: string;
          chave_motor?: string | null;
          codigo?: string;
          descricao?: string | null;
          grupo?: string;
          id?: string;
          metodo?: string;
          nome?: string;
          ordem?: number;
          parametros?: Json;
        };
        Relationships: [];
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
      contas_financeiras: {
        Row: {
          ativo: boolean;
          atualizado_em: string;
          canal_id: string | null;
          criado_em: string;
          id: string;
          nome: string;
          observacoes: string | null;
          saldo_inicial: number;
          saldo_inicial_em: string;
          tipo: string;
        };
        Insert: {
          ativo?: boolean;
          atualizado_em?: string;
          canal_id?: string | null;
          criado_em?: string;
          id?: string;
          nome: string;
          observacoes?: string | null;
          saldo_inicial?: number;
          saldo_inicial_em?: string;
          tipo: string;
        };
        Update: {
          ativo?: boolean;
          atualizado_em?: string;
          canal_id?: string | null;
          criado_em?: string;
          id?: string;
          nome?: string;
          observacoes?: string | null;
          saldo_inicial?: number;
          saldo_inicial_em?: string;
          tipo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contas_financeiras_canal_id_fkey";
            columns: ["canal_id"];
            isOneToOne: false;
            referencedRelation: "canais_venda";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contas_financeiras_canal_id_fkey";
            columns: ["canal_id"];
            isOneToOne: false;
            referencedRelation: "canais_venda_vigentes";
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
      importacoes: {
        Row: {
          atualizadas: number;
          canal_id: string | null;
          criadas: number;
          em: string;
          erros: Json;
          hash_sha256: string;
          id: string;
          ignoradas: number;
          nome_arquivo: string;
          tipo: string;
          total_linhas: number;
          usuario_id: string | null;
        };
        Insert: {
          atualizadas?: number;
          canal_id?: string | null;
          criadas?: number;
          em?: string;
          erros?: Json;
          hash_sha256: string;
          id?: string;
          ignoradas?: number;
          nome_arquivo: string;
          tipo?: string;
          total_linhas?: number;
          usuario_id?: string | null;
        };
        Update: {
          atualizadas?: number;
          canal_id?: string | null;
          criadas?: number;
          em?: string;
          erros?: Json;
          hash_sha256?: string;
          id?: string;
          ignoradas?: number;
          nome_arquivo?: string;
          tipo?: string;
          total_linhas?: number;
          usuario_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "importacoes_canal_id_fkey";
            columns: ["canal_id"];
            isOneToOne: false;
            referencedRelation: "canais_venda";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "importacoes_canal_id_fkey";
            columns: ["canal_id"];
            isOneToOne: false;
            referencedRelation: "canais_venda_vigentes";
            referencedColumns: ["id"];
          },
        ];
      };
      impressoras: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          custo_aquisicao: number | null;
          custo_consumiveis_ano: number | null;
          custo_manutencao_ano: number | null;
          data_aquisicao: string | null;
          fabricante: string | null;
          horas_produtivas_ano: number | null;
          horas_uso: number;
          id: string;
          modelo: string | null;
          nome: string;
          observacoes: string | null;
          potencia_media_w: number | null;
          status: string;
          valor_residual: number;
          vida_util_horas: number | null;
        };
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          custo_aquisicao?: number | null;
          custo_consumiveis_ano?: number | null;
          custo_manutencao_ano?: number | null;
          data_aquisicao?: string | null;
          fabricante?: string | null;
          horas_produtivas_ano?: number | null;
          horas_uso?: number;
          id?: string;
          modelo?: string | null;
          nome: string;
          observacoes?: string | null;
          potencia_media_w?: number | null;
          status?: string;
          valor_residual?: number;
          vida_util_horas?: number | null;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          custo_aquisicao?: number | null;
          custo_consumiveis_ano?: number | null;
          custo_manutencao_ano?: number | null;
          data_aquisicao?: string | null;
          fabricante?: string | null;
          horas_produtivas_ano?: number | null;
          horas_uso?: number;
          id?: string;
          modelo?: string | null;
          nome?: string;
          observacoes?: string | null;
          potencia_media_w?: number | null;
          status?: string;
          valor_residual?: number;
          vida_util_horas?: number | null;
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
      lancamentos: {
        Row: {
          anexo_path: string | null;
          atualizado_em: string;
          cancelado_em: string | null;
          cancelado_motivo: string | null;
          categoria_id: string | null;
          centro_custo_id: string | null;
          competencia: string;
          conta_destino_id: string | null;
          conta_id: string | null;
          criado_em: string;
          criado_por: string | null;
          data_prevista: string;
          descricao: string;
          encerrado_em: string | null;
          encerrado_motivo: string | null;
          estorna_id: string | null;
          estornado_em: string | null;
          forma_pagamento: string | null;
          id: string;
          observacoes: string | null;
          origem_id: string | null;
          origem_tipo: string | null;
          papel_origem: string;
          recorrencia_id: string | null;
          tipo: string;
          valor_previsto: number;
        };
        Insert: {
          anexo_path?: string | null;
          atualizado_em?: string;
          cancelado_em?: string | null;
          cancelado_motivo?: string | null;
          categoria_id?: string | null;
          centro_custo_id?: string | null;
          competencia: string;
          conta_destino_id?: string | null;
          conta_id?: string | null;
          criado_em?: string;
          criado_por?: string | null;
          data_prevista: string;
          descricao: string;
          encerrado_em?: string | null;
          encerrado_motivo?: string | null;
          estorna_id?: string | null;
          estornado_em?: string | null;
          forma_pagamento?: string | null;
          id?: string;
          observacoes?: string | null;
          origem_id?: string | null;
          origem_tipo?: string | null;
          papel_origem?: string;
          recorrencia_id?: string | null;
          tipo: string;
          valor_previsto: number;
        };
        Update: {
          anexo_path?: string | null;
          atualizado_em?: string;
          cancelado_em?: string | null;
          cancelado_motivo?: string | null;
          categoria_id?: string | null;
          centro_custo_id?: string | null;
          competencia?: string;
          conta_destino_id?: string | null;
          conta_id?: string | null;
          criado_em?: string;
          criado_por?: string | null;
          data_prevista?: string;
          descricao?: string;
          encerrado_em?: string | null;
          encerrado_motivo?: string | null;
          estorna_id?: string | null;
          estornado_em?: string | null;
          forma_pagamento?: string | null;
          id?: string;
          observacoes?: string | null;
          origem_id?: string | null;
          origem_tipo?: string | null;
          papel_origem?: string;
          recorrencia_id?: string | null;
          tipo?: string;
          valor_previsto?: number;
        };
        Relationships: [
          {
            foreignKeyName: "lancamentos_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias_financeiras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_centro_custo_id_fkey";
            columns: ["centro_custo_id"];
            isOneToOne: false;
            referencedRelation: "centros_custo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_conta_destino_id_fkey";
            columns: ["conta_destino_id"];
            isOneToOne: false;
            referencedRelation: "contas_financeiras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_conta_destino_id_fkey";
            columns: ["conta_destino_id"];
            isOneToOne: false;
            referencedRelation: "contas_saldos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_conta_id_fkey";
            columns: ["conta_id"];
            isOneToOne: false;
            referencedRelation: "contas_financeiras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_conta_id_fkey";
            columns: ["conta_id"];
            isOneToOne: false;
            referencedRelation: "contas_saldos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_estorna_id_fkey";
            columns: ["estorna_id"];
            isOneToOne: false;
            referencedRelation: "lancamentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_estorna_id_fkey";
            columns: ["estorna_id"];
            isOneToOne: false;
            referencedRelation: "lancamentos_situacao";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_recorrencia_id_fkey";
            columns: ["recorrencia_id"];
            isOneToOne: false;
            referencedRelation: "recorrencias";
            referencedColumns: ["id"];
          },
        ];
      };
      lancamentos_realizacoes: {
        Row: {
          conta_id: string;
          data: string;
          em: string;
          id: string;
          lancamento_id: string;
          observacao: string | null;
          usuario_id: string | null;
          valor: number;
        };
        Insert: {
          conta_id: string;
          data?: string;
          em?: string;
          id?: string;
          lancamento_id: string;
          observacao?: string | null;
          usuario_id?: string | null;
          valor: number;
        };
        Update: {
          conta_id?: string;
          data?: string;
          em?: string;
          id?: string;
          lancamento_id?: string;
          observacao?: string | null;
          usuario_id?: string | null;
          valor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "lancamentos_realizacoes_conta_id_fkey";
            columns: ["conta_id"];
            isOneToOne: false;
            referencedRelation: "contas_financeiras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_realizacoes_conta_id_fkey";
            columns: ["conta_id"];
            isOneToOne: false;
            referencedRelation: "contas_saldos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_realizacoes_lancamento_id_fkey";
            columns: ["lancamento_id"];
            isOneToOne: false;
            referencedRelation: "lancamentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_realizacoes_lancamento_id_fkey";
            columns: ["lancamento_id"];
            isOneToOne: false;
            referencedRelation: "lancamentos_situacao";
            referencedColumns: ["id"];
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
      manutencoes: {
        Row: {
          criado_em: string;
          custo: number;
          data: string;
          descricao: string;
          horas_no_momento: number | null;
          id: string;
          impressora_id: string;
          lancamento_id: string | null;
          proxima_em_horas: number | null;
          tipo: string;
        };
        Insert: {
          criado_em?: string;
          custo?: number;
          data?: string;
          descricao: string;
          horas_no_momento?: number | null;
          id?: string;
          impressora_id: string;
          lancamento_id?: string | null;
          proxima_em_horas?: number | null;
          tipo: string;
        };
        Update: {
          criado_em?: string;
          custo?: number;
          data?: string;
          descricao?: string;
          horas_no_momento?: number | null;
          id?: string;
          impressora_id?: string;
          lancamento_id?: string | null;
          proxima_em_horas?: number | null;
          tipo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "manutencoes_impressora_id_fkey";
            columns: ["impressora_id"];
            isOneToOne: false;
            referencedRelation: "impressoras";
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
      movimentacoes_produto: {
        Row: {
          custo_unitario_momento: number | null;
          em: string;
          id: string;
          motivo: string | null;
          origem_id: string | null;
          origem_tipo: string | null;
          produto_id: string;
          quantidade: number;
          tipo: string;
          usuario_id: string | null;
          valor: number;
          variacao_id: string | null;
        };
        Insert: {
          custo_unitario_momento?: number | null;
          em?: string;
          id?: string;
          motivo?: string | null;
          origem_id?: string | null;
          origem_tipo?: string | null;
          produto_id: string;
          quantidade: number;
          tipo: string;
          usuario_id?: string | null;
          valor?: number;
          variacao_id?: string | null;
        };
        Update: {
          custo_unitario_momento?: number | null;
          em?: string;
          id?: string;
          motivo?: string | null;
          origem_id?: string | null;
          origem_tipo?: string | null;
          produto_id?: string;
          quantidade?: number;
          tipo?: string;
          usuario_id?: string | null;
          valor?: number;
          variacao_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "movimentacoes_produto_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "estoque_produtos";
            referencedColumns: ["produto_id"];
          },
          {
            foreignKeyName: "movimentacoes_produto_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimentacoes_produto_variacao_id_fkey";
            columns: ["variacao_id"];
            isOneToOne: false;
            referencedRelation: "produtos_variacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      ordens_consumo: {
        Row: {
          criado_em: string;
          custo_unitario: number | null;
          id: string;
          insumo_id: string;
          lote_id: string | null;
          movimentacoes: string[];
          ordem_id: string;
          quantidade_prevista: number | null;
          quantidade_real: number | null;
          valor: number | null;
        };
        Insert: {
          criado_em?: string;
          custo_unitario?: number | null;
          id?: string;
          insumo_id: string;
          lote_id?: string | null;
          movimentacoes?: string[];
          ordem_id: string;
          quantidade_prevista?: number | null;
          quantidade_real?: number | null;
          valor?: number | null;
        };
        Update: {
          criado_em?: string;
          custo_unitario?: number | null;
          id?: string;
          insumo_id?: string;
          lote_id?: string | null;
          movimentacoes?: string[];
          ordem_id?: string;
          quantidade_prevista?: number | null;
          quantidade_real?: number | null;
          valor?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "ordens_consumo_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "estoque_atual";
            referencedColumns: ["insumo_id"];
          },
          {
            foreignKeyName: "ordens_consumo_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "insumos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ordens_consumo_lote_id_fkey";
            columns: ["lote_id"];
            isOneToOne: false;
            referencedRelation: "lotes_insumo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ordens_consumo_ordem_id_fkey";
            columns: ["ordem_id"];
            isOneToOne: false;
            referencedRelation: "ordens_producao";
            referencedColumns: ["id"];
          },
        ];
      };
      ordens_producao: {
        Row: {
          atualizado_em: string;
          calculo_estimado_id: string | null;
          codigo: string;
          criado_em: string;
          criado_por: string | null;
          custo_estimado: number | null;
          custo_realizado: number | null;
          custo_realizado_detalhe: Json | null;
          fim_previsto: string | null;
          fim_real: string | null;
          id: string;
          impressora_id: string | null;
          inicio_previsto: string | null;
          inicio_real: string | null;
          instrucoes: string | null;
          lote_id: string | null;
          minutos_mao_de_obra: number | null;
          motivo_falha: string | null;
          pedido_item_id: string | null;
          prazo: string | null;
          prioridade: number;
          produto_id: string;
          quantidade_aprovada: number;
          quantidade_perdida: number;
          quantidade_planejada: number;
          responsavel: string | null;
          status: string;
          tempo_previsto_min: number | null;
          tempo_real_min: number | null;
          variacao_id: string | null;
        };
        Insert: {
          atualizado_em?: string;
          calculo_estimado_id?: string | null;
          codigo?: string;
          criado_em?: string;
          criado_por?: string | null;
          custo_estimado?: number | null;
          custo_realizado?: number | null;
          custo_realizado_detalhe?: Json | null;
          fim_previsto?: string | null;
          fim_real?: string | null;
          id?: string;
          impressora_id?: string | null;
          inicio_previsto?: string | null;
          inicio_real?: string | null;
          instrucoes?: string | null;
          lote_id?: string | null;
          minutos_mao_de_obra?: number | null;
          motivo_falha?: string | null;
          pedido_item_id?: string | null;
          prazo?: string | null;
          prioridade?: number;
          produto_id: string;
          quantidade_aprovada?: number;
          quantidade_perdida?: number;
          quantidade_planejada: number;
          responsavel?: string | null;
          status?: string;
          tempo_previsto_min?: number | null;
          tempo_real_min?: number | null;
          variacao_id?: string | null;
        };
        Update: {
          atualizado_em?: string;
          calculo_estimado_id?: string | null;
          codigo?: string;
          criado_em?: string;
          criado_por?: string | null;
          custo_estimado?: number | null;
          custo_realizado?: number | null;
          custo_realizado_detalhe?: Json | null;
          fim_previsto?: string | null;
          fim_real?: string | null;
          id?: string;
          impressora_id?: string | null;
          inicio_previsto?: string | null;
          inicio_real?: string | null;
          instrucoes?: string | null;
          lote_id?: string | null;
          minutos_mao_de_obra?: number | null;
          motivo_falha?: string | null;
          pedido_item_id?: string | null;
          prazo?: string | null;
          prioridade?: number;
          produto_id?: string;
          quantidade_aprovada?: number;
          quantidade_perdida?: number;
          quantidade_planejada?: number;
          responsavel?: string | null;
          status?: string;
          tempo_previsto_min?: number | null;
          tempo_real_min?: number | null;
          variacao_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ordens_pedido_item_fk";
            columns: ["pedido_item_id"];
            isOneToOne: false;
            referencedRelation: "pedidos_itens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ordens_producao_calculo_estimado_id_fkey";
            columns: ["calculo_estimado_id"];
            isOneToOne: false;
            referencedRelation: "calculos_custo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ordens_producao_impressora_id_fkey";
            columns: ["impressora_id"];
            isOneToOne: false;
            referencedRelation: "impressoras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ordens_producao_lote_id_fkey";
            columns: ["lote_id"];
            isOneToOne: false;
            referencedRelation: "lotes_insumo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ordens_producao_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "estoque_produtos";
            referencedColumns: ["produto_id"];
          },
          {
            foreignKeyName: "ordens_producao_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ordens_producao_variacao_id_fkey";
            columns: ["variacao_id"];
            isOneToOne: false;
            referencedRelation: "produtos_variacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      parametros_custo: {
        Row: {
          criado_em: string;
          criado_por: string | null;
          dados: Json;
          id: string;
          observacoes: string | null;
          versao: number;
          vigente_desde: string;
        };
        Insert: {
          criado_em?: string;
          criado_por?: string | null;
          dados?: Json;
          id?: string;
          observacoes?: string | null;
          versao?: number;
          vigente_desde?: string;
        };
        Update: {
          criado_em?: string;
          criado_por?: string | null;
          dados?: Json;
          id?: string;
          observacoes?: string | null;
          versao?: number;
          vigente_desde?: string;
        };
        Relationships: [];
      };
      parametros_tributarios: {
        Row: {
          aliquota_efetiva_pct: number;
          base: string;
          criado_em: string;
          dia_vencimento: number;
          id: string;
          observacoes: string | null;
          regime: string;
          vigente_desde: string;
        };
        Insert: {
          aliquota_efetiva_pct: number;
          base?: string;
          criado_em?: string;
          dia_vencimento?: number;
          id?: string;
          observacoes?: string | null;
          regime: string;
          vigente_desde?: string;
        };
        Update: {
          aliquota_efetiva_pct?: number;
          base?: string;
          criado_em?: string;
          dia_vencimento?: number;
          id?: string;
          observacoes?: string | null;
          regime?: string;
          vigente_desde?: string;
        };
        Relationships: [];
      };
      pedidos: {
        Row: {
          atualizado_em: string;
          canal_id: string;
          cliente_id: string | null;
          codigo: string;
          codigo_externo: string | null;
          comissao_pct: number | null;
          criado_em: string;
          criado_por: string | null;
          data_conclusao: string | null;
          data_envio: string | null;
          data_pagamento: string | null;
          data_pedido: string;
          descontos_vendedor: number;
          frete_cobrado: number;
          frete_pago: number;
          id: string;
          importacao_id: string | null;
          observacoes: string | null;
          origem: string;
          resumo: Json | null;
          status_canal: string | null;
          status_id: string;
          status_pagamento: string;
          taxa_fixa_item: number | null;
          taxa_pagamento_pct: number | null;
          taxas_canal_informadas: number | null;
          taxas_pagamento_informadas: number | null;
          total_bruto_informado: number | null;
        };
        Insert: {
          atualizado_em?: string;
          canal_id: string;
          cliente_id?: string | null;
          codigo?: string;
          codigo_externo?: string | null;
          comissao_pct?: number | null;
          criado_em?: string;
          criado_por?: string | null;
          data_conclusao?: string | null;
          data_envio?: string | null;
          data_pagamento?: string | null;
          data_pedido?: string;
          descontos_vendedor?: number;
          frete_cobrado?: number;
          frete_pago?: number;
          id?: string;
          importacao_id?: string | null;
          observacoes?: string | null;
          origem?: string;
          resumo?: Json | null;
          status_canal?: string | null;
          status_id: string;
          status_pagamento?: string;
          taxa_fixa_item?: number | null;
          taxa_pagamento_pct?: number | null;
          taxas_canal_informadas?: number | null;
          taxas_pagamento_informadas?: number | null;
          total_bruto_informado?: number | null;
        };
        Update: {
          atualizado_em?: string;
          canal_id?: string;
          cliente_id?: string | null;
          codigo?: string;
          codigo_externo?: string | null;
          comissao_pct?: number | null;
          criado_em?: string;
          criado_por?: string | null;
          data_conclusao?: string | null;
          data_envio?: string | null;
          data_pagamento?: string | null;
          data_pedido?: string;
          descontos_vendedor?: number;
          frete_cobrado?: number;
          frete_pago?: number;
          id?: string;
          importacao_id?: string | null;
          observacoes?: string | null;
          origem?: string;
          resumo?: Json | null;
          status_canal?: string | null;
          status_id?: string;
          status_pagamento?: string;
          taxa_fixa_item?: number | null;
          taxa_pagamento_pct?: number | null;
          taxas_canal_informadas?: number | null;
          taxas_pagamento_informadas?: number | null;
          total_bruto_informado?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "pedidos_canal_id_fkey";
            columns: ["canal_id"];
            isOneToOne: false;
            referencedRelation: "canais_venda";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedidos_canal_id_fkey";
            columns: ["canal_id"];
            isOneToOne: false;
            referencedRelation: "canais_venda_vigentes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedidos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedidos_importacao_id_fkey";
            columns: ["importacao_id"];
            isOneToOne: false;
            referencedRelation: "importacoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedidos_status_id_fkey";
            columns: ["status_id"];
            isOneToOne: false;
            referencedRelation: "pedidos_status";
            referencedColumns: ["id"];
          },
        ];
      };
      pedidos_eventos: {
        Row: {
          de_status_id: string | null;
          em: string;
          id: string;
          nota: string | null;
          origem: string;
          para_status_id: string;
          pedido_id: string;
          usuario_id: string | null;
        };
        Insert: {
          de_status_id?: string | null;
          em?: string;
          id?: string;
          nota?: string | null;
          origem?: string;
          para_status_id: string;
          pedido_id: string;
          usuario_id?: string | null;
        };
        Update: {
          de_status_id?: string | null;
          em?: string;
          id?: string;
          nota?: string | null;
          origem?: string;
          para_status_id?: string;
          pedido_id?: string;
          usuario_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pedidos_eventos_de_status_id_fkey";
            columns: ["de_status_id"];
            isOneToOne: false;
            referencedRelation: "pedidos_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedidos_eventos_para_status_id_fkey";
            columns: ["para_status_id"];
            isOneToOne: false;
            referencedRelation: "pedidos_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedidos_eventos_pedido_id_fkey";
            columns: ["pedido_id"];
            isOneToOne: false;
            referencedRelation: "pedidos";
            referencedColumns: ["id"];
          },
        ];
      };
      pedidos_itens: {
        Row: {
          calculo_custo_id: string | null;
          codigo_anuncio: string | null;
          criado_em: string;
          custo_unitario_estimado: number | null;
          custo_unitario_realizado: number | null;
          desconto: number;
          id: string;
          ordem: number;
          pedido_id: string;
          preco_unitario: number;
          produto_id: string | null;
          quantidade: number;
          titulo: string | null;
          variacao_id: string | null;
        };
        Insert: {
          calculo_custo_id?: string | null;
          codigo_anuncio?: string | null;
          criado_em?: string;
          custo_unitario_estimado?: number | null;
          custo_unitario_realizado?: number | null;
          desconto?: number;
          id?: string;
          ordem?: number;
          pedido_id: string;
          preco_unitario: number;
          produto_id?: string | null;
          quantidade: number;
          titulo?: string | null;
          variacao_id?: string | null;
        };
        Update: {
          calculo_custo_id?: string | null;
          codigo_anuncio?: string | null;
          criado_em?: string;
          custo_unitario_estimado?: number | null;
          custo_unitario_realizado?: number | null;
          desconto?: number;
          id?: string;
          ordem?: number;
          pedido_id?: string;
          preco_unitario?: number;
          produto_id?: string | null;
          quantidade?: number;
          titulo?: string | null;
          variacao_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pedidos_itens_calculo_custo_id_fkey";
            columns: ["calculo_custo_id"];
            isOneToOne: false;
            referencedRelation: "calculos_custo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedidos_itens_pedido_id_fkey";
            columns: ["pedido_id"];
            isOneToOne: false;
            referencedRelation: "pedidos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedidos_itens_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "estoque_produtos";
            referencedColumns: ["produto_id"];
          },
          {
            foreignKeyName: "pedidos_itens_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedidos_itens_variacao_id_fkey";
            columns: ["variacao_id"];
            isOneToOne: false;
            referencedRelation: "produtos_variacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      pedidos_status: {
        Row: {
          ativo: boolean;
          baixa_estoque: boolean;
          codigo: string;
          cor: string | null;
          fechado: boolean;
          gera_recebivel: boolean;
          id: string;
          nome: string;
          ordem: number;
          padrao: boolean;
        };
        Insert: {
          ativo?: boolean;
          baixa_estoque?: boolean;
          codigo: string;
          cor?: string | null;
          fechado?: boolean;
          gera_recebivel?: boolean;
          id?: string;
          nome: string;
          ordem: number;
          padrao?: boolean;
        };
        Update: {
          ativo?: boolean;
          baixa_estoque?: boolean;
          codigo?: string;
          cor?: string | null;
          fechado?: boolean;
          gera_recebivel?: boolean;
          id?: string;
          nome?: string;
          ordem?: number;
          padrao?: boolean;
        };
        Relationships: [];
      };
      produtos: {
        Row: {
          atributos: Json;
          atualizado_em: string;
          calculo_atual_id: string | null;
          categoria_id: string | null;
          criado_em: string;
          custo_atual: number | null;
          custo_atualizado_em: string | null;
          custo_variavel_atual: number | null;
          descricao: string | null;
          dimensoes: Json;
          id: string;
          impressora_padrao_id: string | null;
          insumo_impressao_id: string | null;
          licenca: string | null;
          licenca_comercial: boolean;
          margem_alvo: number | null;
          nome: string;
          observacoes_fabricacao: string | null;
          origem: string;
          pecas_por_ciclo: number;
          peso_g: number | null;
          sku: string | null;
          status: string;
          taxa_falha_pct: number | null;
          tempo_acabamento_min: number | null;
          tempo_embalagem_min: number | null;
          tempo_impressao_min: number | null;
          tempo_preparo_min: number | null;
        };
        Insert: {
          atributos?: Json;
          atualizado_em?: string;
          calculo_atual_id?: string | null;
          categoria_id?: string | null;
          criado_em?: string;
          custo_atual?: number | null;
          custo_atualizado_em?: string | null;
          custo_variavel_atual?: number | null;
          descricao?: string | null;
          dimensoes?: Json;
          id?: string;
          impressora_padrao_id?: string | null;
          insumo_impressao_id?: string | null;
          licenca?: string | null;
          licenca_comercial?: boolean;
          margem_alvo?: number | null;
          nome: string;
          observacoes_fabricacao?: string | null;
          origem?: string;
          pecas_por_ciclo?: number;
          peso_g?: number | null;
          sku?: string | null;
          status?: string;
          taxa_falha_pct?: number | null;
          tempo_acabamento_min?: number | null;
          tempo_embalagem_min?: number | null;
          tempo_impressao_min?: number | null;
          tempo_preparo_min?: number | null;
        };
        Update: {
          atributos?: Json;
          atualizado_em?: string;
          calculo_atual_id?: string | null;
          categoria_id?: string | null;
          criado_em?: string;
          custo_atual?: number | null;
          custo_atualizado_em?: string | null;
          custo_variavel_atual?: number | null;
          descricao?: string | null;
          dimensoes?: Json;
          id?: string;
          impressora_padrao_id?: string | null;
          insumo_impressao_id?: string | null;
          licenca?: string | null;
          licenca_comercial?: boolean;
          margem_alvo?: number | null;
          nome?: string;
          observacoes_fabricacao?: string | null;
          origem?: string;
          pecas_por_ciclo?: number;
          peso_g?: number | null;
          sku?: string | null;
          status?: string;
          taxa_falha_pct?: number | null;
          tempo_acabamento_min?: number | null;
          tempo_embalagem_min?: number | null;
          tempo_impressao_min?: number | null;
          tempo_preparo_min?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "produtos_calculo_atual_id_fkey";
            columns: ["calculo_atual_id"];
            isOneToOne: false;
            referencedRelation: "calculos_custo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produtos_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produtos_impressora_padrao_id_fkey";
            columns: ["impressora_padrao_id"];
            isOneToOne: false;
            referencedRelation: "impressoras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produtos_insumo_impressao_id_fkey";
            columns: ["insumo_impressao_id"];
            isOneToOne: false;
            referencedRelation: "estoque_atual";
            referencedColumns: ["insumo_id"];
          },
          {
            foreignKeyName: "produtos_insumo_impressao_id_fkey";
            columns: ["insumo_impressao_id"];
            isOneToOne: false;
            referencedRelation: "insumos";
            referencedColumns: ["id"];
          },
        ];
      };
      produtos_anuncios: {
        Row: {
          atualizado_em: string;
          avaliacoes: number | null;
          canal_id: string;
          categoria_externa: string | null;
          codigo_externo: string;
          coletado_em: string | null;
          conversao: number | null;
          criado_em: string;
          estoque: number | null;
          fotos: number | null;
          id: string;
          nota: number | null;
          preco: number | null;
          produto_id: string;
          titulo: string | null;
          url: string | null;
          variacao_id: string | null;
          vendas_periodo: number | null;
          vendas_total: number | null;
          visitas_periodo: number | null;
        };
        Insert: {
          atualizado_em?: string;
          avaliacoes?: number | null;
          canal_id: string;
          categoria_externa?: string | null;
          codigo_externo: string;
          coletado_em?: string | null;
          conversao?: number | null;
          criado_em?: string;
          estoque?: number | null;
          fotos?: number | null;
          id?: string;
          nota?: number | null;
          preco?: number | null;
          produto_id: string;
          titulo?: string | null;
          url?: string | null;
          variacao_id?: string | null;
          vendas_periodo?: number | null;
          vendas_total?: number | null;
          visitas_periodo?: number | null;
        };
        Update: {
          atualizado_em?: string;
          avaliacoes?: number | null;
          canal_id?: string;
          categoria_externa?: string | null;
          codigo_externo?: string;
          coletado_em?: string | null;
          conversao?: number | null;
          criado_em?: string;
          estoque?: number | null;
          fotos?: number | null;
          id?: string;
          nota?: number | null;
          preco?: number | null;
          produto_id?: string;
          titulo?: string | null;
          url?: string | null;
          variacao_id?: string | null;
          vendas_periodo?: number | null;
          vendas_total?: number | null;
          visitas_periodo?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "produtos_anuncios_canal_id_fkey";
            columns: ["canal_id"];
            isOneToOne: false;
            referencedRelation: "canais_venda";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produtos_anuncios_canal_id_fkey";
            columns: ["canal_id"];
            isOneToOne: false;
            referencedRelation: "canais_venda_vigentes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produtos_anuncios_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "estoque_produtos";
            referencedColumns: ["produto_id"];
          },
          {
            foreignKeyName: "produtos_anuncios_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produtos_anuncios_variacao_id_fkey";
            columns: ["variacao_id"];
            isOneToOne: false;
            referencedRelation: "produtos_variacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      produtos_arquivos: {
        Row: {
          bucket: string | null;
          caminho_externo: string | null;
          criado_em: string;
          criado_por: string | null;
          hash_sha256: string | null;
          id: string;
          licenca: string | null;
          nome: string;
          notas: string | null;
          produto_id: string;
          storage_path: string | null;
          tamanho: number | null;
          tipo: string;
          variacao_id: string | null;
          versao: number;
        };
        Insert: {
          bucket?: string | null;
          caminho_externo?: string | null;
          criado_em?: string;
          criado_por?: string | null;
          hash_sha256?: string | null;
          id?: string;
          licenca?: string | null;
          nome: string;
          notas?: string | null;
          produto_id: string;
          storage_path?: string | null;
          tamanho?: number | null;
          tipo: string;
          variacao_id?: string | null;
          versao?: number;
        };
        Update: {
          bucket?: string | null;
          caminho_externo?: string | null;
          criado_em?: string;
          criado_por?: string | null;
          hash_sha256?: string | null;
          id?: string;
          licenca?: string | null;
          nome?: string;
          notas?: string | null;
          produto_id?: string;
          storage_path?: string | null;
          tamanho?: number | null;
          tipo?: string;
          variacao_id?: string | null;
          versao?: number;
        };
        Relationships: [
          {
            foreignKeyName: "produtos_arquivos_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "estoque_produtos";
            referencedColumns: ["produto_id"];
          },
          {
            foreignKeyName: "produtos_arquivos_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produtos_arquivos_variacao_id_fkey";
            columns: ["variacao_id"];
            isOneToOne: false;
            referencedRelation: "produtos_variacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      produtos_materiais: {
        Row: {
          criado_em: string;
          id: string;
          insumo_id: string;
          observacoes: string | null;
          papel: string;
          por: string;
          produto_id: string;
          quantidade: number;
          unidade: string;
          variacao_id: string | null;
        };
        Insert: {
          criado_em?: string;
          id?: string;
          insumo_id: string;
          observacoes?: string | null;
          papel?: string;
          por?: string;
          produto_id: string;
          quantidade: number;
          unidade: string;
          variacao_id?: string | null;
        };
        Update: {
          criado_em?: string;
          id?: string;
          insumo_id?: string;
          observacoes?: string | null;
          papel?: string;
          por?: string;
          produto_id?: string;
          quantidade?: number;
          unidade?: string;
          variacao_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "produtos_materiais_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "estoque_atual";
            referencedColumns: ["insumo_id"];
          },
          {
            foreignKeyName: "produtos_materiais_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "insumos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produtos_materiais_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "estoque_produtos";
            referencedColumns: ["produto_id"];
          },
          {
            foreignKeyName: "produtos_materiais_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produtos_materiais_unidade_fkey";
            columns: ["unidade"];
            isOneToOne: false;
            referencedRelation: "unidades";
            referencedColumns: ["codigo"];
          },
          {
            foreignKeyName: "produtos_materiais_variacao_id_fkey";
            columns: ["variacao_id"];
            isOneToOne: false;
            referencedRelation: "produtos_variacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      produtos_precos_canal: {
        Row: {
          calculo_custo_id: string | null;
          canal_id: string;
          criado_em: string;
          id: string;
          margem_estimada_cache: number | null;
          observacoes: string | null;
          origem: string;
          preco_venda: number;
          produto_id: string;
          variacao_id: string | null;
          vigente_ate: string | null;
          vigente_desde: string;
        };
        Insert: {
          calculo_custo_id?: string | null;
          canal_id: string;
          criado_em?: string;
          id?: string;
          margem_estimada_cache?: number | null;
          observacoes?: string | null;
          origem?: string;
          preco_venda: number;
          produto_id: string;
          variacao_id?: string | null;
          vigente_ate?: string | null;
          vigente_desde?: string;
        };
        Update: {
          calculo_custo_id?: string | null;
          canal_id?: string;
          criado_em?: string;
          id?: string;
          margem_estimada_cache?: number | null;
          observacoes?: string | null;
          origem?: string;
          preco_venda?: number;
          produto_id?: string;
          variacao_id?: string | null;
          vigente_ate?: string | null;
          vigente_desde?: string;
        };
        Relationships: [
          {
            foreignKeyName: "produtos_precos_canal_calculo_custo_id_fkey";
            columns: ["calculo_custo_id"];
            isOneToOne: false;
            referencedRelation: "calculos_custo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produtos_precos_canal_canal_id_fkey";
            columns: ["canal_id"];
            isOneToOne: false;
            referencedRelation: "canais_venda";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produtos_precos_canal_canal_id_fkey";
            columns: ["canal_id"];
            isOneToOne: false;
            referencedRelation: "canais_venda_vigentes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produtos_precos_canal_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "estoque_produtos";
            referencedColumns: ["produto_id"];
          },
          {
            foreignKeyName: "produtos_precos_canal_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produtos_precos_canal_variacao_id_fkey";
            columns: ["variacao_id"];
            isOneToOne: false;
            referencedRelation: "produtos_variacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      produtos_variacoes: {
        Row: {
          ativo: boolean;
          atributos: Json;
          atualizado_em: string;
          calculo_atual_id: string | null;
          criado_em: string;
          custo_atual: number | null;
          custo_variavel_atual: number | null;
          id: string;
          impressora_padrao_id: string | null;
          insumo_impressao_id: string | null;
          nome: string;
          pecas_por_ciclo: number | null;
          peso_g: number | null;
          produto_id: string;
          sku: string | null;
          taxa_falha_pct: number | null;
          tempo_acabamento_min: number | null;
          tempo_embalagem_min: number | null;
          tempo_impressao_min: number | null;
          tempo_preparo_min: number | null;
        };
        Insert: {
          ativo?: boolean;
          atributos?: Json;
          atualizado_em?: string;
          calculo_atual_id?: string | null;
          criado_em?: string;
          custo_atual?: number | null;
          custo_variavel_atual?: number | null;
          id?: string;
          impressora_padrao_id?: string | null;
          insumo_impressao_id?: string | null;
          nome: string;
          pecas_por_ciclo?: number | null;
          peso_g?: number | null;
          produto_id: string;
          sku?: string | null;
          taxa_falha_pct?: number | null;
          tempo_acabamento_min?: number | null;
          tempo_embalagem_min?: number | null;
          tempo_impressao_min?: number | null;
          tempo_preparo_min?: number | null;
        };
        Update: {
          ativo?: boolean;
          atributos?: Json;
          atualizado_em?: string;
          calculo_atual_id?: string | null;
          criado_em?: string;
          custo_atual?: number | null;
          custo_variavel_atual?: number | null;
          id?: string;
          impressora_padrao_id?: string | null;
          insumo_impressao_id?: string | null;
          nome?: string;
          pecas_por_ciclo?: number | null;
          peso_g?: number | null;
          produto_id?: string;
          sku?: string | null;
          taxa_falha_pct?: number | null;
          tempo_acabamento_min?: number | null;
          tempo_embalagem_min?: number | null;
          tempo_impressao_min?: number | null;
          tempo_preparo_min?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "produtos_variacoes_calculo_atual_id_fkey";
            columns: ["calculo_atual_id"];
            isOneToOne: false;
            referencedRelation: "calculos_custo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produtos_variacoes_impressora_padrao_id_fkey";
            columns: ["impressora_padrao_id"];
            isOneToOne: false;
            referencedRelation: "impressoras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produtos_variacoes_insumo_impressao_id_fkey";
            columns: ["insumo_impressao_id"];
            isOneToOne: false;
            referencedRelation: "estoque_atual";
            referencedColumns: ["insumo_id"];
          },
          {
            foreignKeyName: "produtos_variacoes_insumo_impressao_id_fkey";
            columns: ["insumo_impressao_id"];
            isOneToOne: false;
            referencedRelation: "insumos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produtos_variacoes_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "estoque_produtos";
            referencedColumns: ["produto_id"];
          },
          {
            foreignKeyName: "produtos_variacoes_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
        ];
      };
      provisoes_imposto: {
        Row: {
          aliquota: number;
          atualizado_em: string;
          base_calculo: number;
          competencia: string;
          id: string;
          lancamento_id: string | null;
          valor: number;
        };
        Insert: {
          aliquota: number;
          atualizado_em?: string;
          base_calculo?: number;
          competencia: string;
          id?: string;
          lancamento_id?: string | null;
          valor?: number;
        };
        Update: {
          aliquota?: number;
          atualizado_em?: string;
          base_calculo?: number;
          competencia?: string;
          id?: string;
          lancamento_id?: string | null;
          valor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "provisoes_imposto_lancamento_id_fkey";
            columns: ["lancamento_id"];
            isOneToOne: false;
            referencedRelation: "lancamentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "provisoes_imposto_lancamento_id_fkey";
            columns: ["lancamento_id"];
            isOneToOne: false;
            referencedRelation: "lancamentos_situacao";
            referencedColumns: ["id"];
          },
        ];
      };
      recorrencias: {
        Row: {
          ativo: boolean;
          atualizado_em: string;
          categoria_id: string | null;
          centro_custo_id: string | null;
          conta_id: string | null;
          criado_em: string;
          descricao: string;
          dia: number | null;
          fim: string | null;
          frequencia: string;
          id: string;
          inicio: string;
          observacoes: string | null;
          tipo: string;
          valor: number;
        };
        Insert: {
          ativo?: boolean;
          atualizado_em?: string;
          categoria_id?: string | null;
          centro_custo_id?: string | null;
          conta_id?: string | null;
          criado_em?: string;
          descricao: string;
          dia?: number | null;
          fim?: string | null;
          frequencia: string;
          id?: string;
          inicio: string;
          observacoes?: string | null;
          tipo: string;
          valor: number;
        };
        Update: {
          ativo?: boolean;
          atualizado_em?: string;
          categoria_id?: string | null;
          centro_custo_id?: string | null;
          conta_id?: string | null;
          criado_em?: string;
          descricao?: string;
          dia?: number | null;
          fim?: string | null;
          frequencia?: string;
          id?: string;
          inicio?: string;
          observacoes?: string | null;
          tipo?: string;
          valor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "recorrencias_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias_financeiras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recorrencias_centro_custo_id_fkey";
            columns: ["centro_custo_id"];
            isOneToOne: false;
            referencedRelation: "centros_custo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recorrencias_conta_id_fkey";
            columns: ["conta_id"];
            isOneToOne: false;
            referencedRelation: "contas_financeiras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recorrencias_conta_id_fkey";
            columns: ["conta_id"];
            isOneToOne: false;
            referencedRelation: "contas_saldos";
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
      contas_saldos: {
        Row: {
          ativo: boolean | null;
          id: string | null;
          nome: string | null;
          saldo_atual: number | null;
          saldo_inicial: number | null;
          tipo: string | null;
        };
        Insert: {
          ativo?: boolean | null;
          id?: string | null;
          nome?: string | null;
          saldo_atual?: never;
          saldo_inicial?: number | null;
          tipo?: string | null;
        };
        Update: {
          ativo?: boolean | null;
          id?: string | null;
          nome?: string | null;
          saldo_atual?: never;
          saldo_inicial?: number | null;
          tipo?: string | null;
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
      estoque_produtos: {
        Row: {
          custo_medio: number | null;
          nome: string | null;
          produto_id: string | null;
          saldo: number | null;
          valor: number | null;
          variacao_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "movimentacoes_produto_variacao_id_fkey";
            columns: ["variacao_id"];
            isOneToOne: false;
            referencedRelation: "produtos_variacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      lancamentos_situacao: {
        Row: {
          anexo_path: string | null;
          atrasado: boolean | null;
          atualizado_em: string | null;
          cancelado_em: string | null;
          cancelado_motivo: string | null;
          categoria_id: string | null;
          categoria_natureza: string | null;
          categoria_nome: string | null;
          centro_custo_id: string | null;
          competencia: string | null;
          conta_destino_id: string | null;
          conta_id: string | null;
          conta_nome: string | null;
          criado_em: string | null;
          criado_por: string | null;
          data_prevista: string | null;
          descricao: string | null;
          embutido_no_custo: boolean | null;
          encerrado_em: string | null;
          encerrado_motivo: string | null;
          estado: string | null;
          estorna_id: string | null;
          estornado_em: string | null;
          forma_pagamento: string | null;
          id: string | null;
          observacoes: string | null;
          origem_id: string | null;
          origem_tipo: string | null;
          papel_origem: string | null;
          recorrencia_id: string | null;
          saldo_restante: number | null;
          tipo: string | null;
          ultima_data: string | null;
          valor_previsto: number | null;
          valor_realizado: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "lancamentos_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias_financeiras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_centro_custo_id_fkey";
            columns: ["centro_custo_id"];
            isOneToOne: false;
            referencedRelation: "centros_custo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_conta_destino_id_fkey";
            columns: ["conta_destino_id"];
            isOneToOne: false;
            referencedRelation: "contas_financeiras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_conta_destino_id_fkey";
            columns: ["conta_destino_id"];
            isOneToOne: false;
            referencedRelation: "contas_saldos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_conta_id_fkey";
            columns: ["conta_id"];
            isOneToOne: false;
            referencedRelation: "contas_financeiras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_conta_id_fkey";
            columns: ["conta_id"];
            isOneToOne: false;
            referencedRelation: "contas_saldos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_estorna_id_fkey";
            columns: ["estorna_id"];
            isOneToOne: false;
            referencedRelation: "lancamentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_estorna_id_fkey";
            columns: ["estorna_id"];
            isOneToOne: false;
            referencedRelation: "lancamentos_situacao";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_recorrencia_id_fkey";
            columns: ["recorrencia_id"];
            isOneToOne: false;
            referencedRelation: "recorrencias";
            referencedColumns: ["id"];
          },
        ];
      };
      parametros_custo_vigentes: {
        Row: {
          criado_em: string | null;
          criado_por: string | null;
          dados: Json | null;
          id: string | null;
          observacoes: string | null;
          versao: number | null;
          vigente_desde: string | null;
        };
        Relationships: [];
      };
      produtos_precos_vigentes: {
        Row: {
          calculo_custo_id: string | null;
          canal_id: string | null;
          criado_em: string | null;
          id: string | null;
          margem_estimada_cache: number | null;
          observacoes: string | null;
          origem: string | null;
          preco_venda: number | null;
          produto_id: string | null;
          variacao_id: string | null;
          vigente_ate: string | null;
          vigente_desde: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "produtos_precos_canal_calculo_custo_id_fkey";
            columns: ["calculo_custo_id"];
            isOneToOne: false;
            referencedRelation: "calculos_custo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produtos_precos_canal_canal_id_fkey";
            columns: ["canal_id"];
            isOneToOne: false;
            referencedRelation: "canais_venda";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produtos_precos_canal_canal_id_fkey";
            columns: ["canal_id"];
            isOneToOne: false;
            referencedRelation: "canais_venda_vigentes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produtos_precos_canal_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "estoque_produtos";
            referencedColumns: ["produto_id"];
          },
          {
            foreignKeyName: "produtos_precos_canal_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produtos_precos_canal_variacao_id_fkey";
            columns: ["variacao_id"];
            isOneToOne: false;
            referencedRelation: "produtos_variacoes";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      anonimizar_cliente: { Args: { p_cliente: string }; Returns: undefined };
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
      cancelar_lancamento: {
        Args: { p_lancamento: string; p_motivo: string };
        Returns: undefined;
      };
      concluir_ordem_producao: {
        Args: {
          p_aprovadas: number;
          p_complementares_por_peca?: number;
          p_consumos: Json;
          p_custo_hora_mao_obra: number;
          p_justificativa?: string;
          p_minutos_mao_de_obra: number;
          p_motivo_falha?: string;
          p_ordem: string;
          p_perdidas: number;
          p_permitir_negativo?: boolean;
          p_tempo_real_min: number;
        };
        Returns: Json;
      };
      confirmar_compra: { Args: { p_compra: string }; Returns: Json };
      devolver_pedido: {
        Args: { p_nota?: string; p_pedido: string };
        Returns: Json;
      };
      estornar_lancamento: {
        Args: { p_lancamento: string; p_motivo: string };
        Returns: string;
      };
      estornar_movimentacao: {
        Args: { p_motivo: string; p_movimentacao: string };
        Returns: string;
      };
      garantir_recebivel: { Args: { p_pedido: string }; Returns: string };
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
      mudar_status_pedido: {
        Args: {
          p_nota?: string;
          p_origem?: string;
          p_pedido: string;
          p_status_codigo: string;
        };
        Returns: Json;
      };
      reabrir_ordem_producao: {
        Args: { p_motivo: string; p_ordem: string };
        Returns: undefined;
      };
      realizar_lancamento: {
        Args: {
          p_conta: string;
          p_data?: string;
          p_encerrar?: boolean;
          p_lancamento: string;
          p_motivo?: string;
          p_observacao?: string;
          p_valor: number;
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

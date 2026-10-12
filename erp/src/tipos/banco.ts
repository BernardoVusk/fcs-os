// Gerado por npm run tipos. Nao editar a mao.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alertas: {
        Row: {
          criado_em: string
          descricao: string | null
          entidade_id: string | null
          entidade_tipo: string | null
          id: string
          resolvido_em: string | null
          severidade: string
          silenciado_ate: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          criado_em?: string
          descricao?: string | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          resolvido_em?: string | null
          severidade: string
          silenciado_ate?: string | null
          tipo: string
          titulo: string
        }
        Update: {
          criado_em?: string
          descricao?: string | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          resolvido_em?: string | null
          severidade?: string
          silenciado_ate?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      auditoria: {
        Row: {
          acao: string
          antes: Json | null
          depois: Json | null
          em: string
          id: number
          origem: string
          registro_id: string
          tabela: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          antes?: Json | null
          depois?: Json | null
          em?: string
          id?: never
          origem: string
          registro_id: string
          tabela: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          antes?: Json | null
          depois?: Json | null
          em?: string
          id?: never
          origem?: string
          registro_id?: string
          tabela?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      canais_venda: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          id: string
          nome: string
          observacoes: string | null
          tipo: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome: string
          observacoes?: string | null
          tipo: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome?: string
          observacoes?: string | null
          tipo?: string
        }
        Relationships: []
      }
      canais_venda_taxas: {
        Row: {
          ads_pct_padrao: number | null
          canal_id: string
          comissao_pct: number | null
          criado_em: string
          dias_repasse: number | null
          frete_subsidio_padrao: number | null
          id: string
          observacoes: string | null
          taxa_fixa_item: number | null
          taxa_pagamento_pct: number | null
          vigente_desde: string
        }
        Insert: {
          ads_pct_padrao?: number | null
          canal_id: string
          comissao_pct?: number | null
          criado_em?: string
          dias_repasse?: number | null
          frete_subsidio_padrao?: number | null
          id?: string
          observacoes?: string | null
          taxa_fixa_item?: number | null
          taxa_pagamento_pct?: number | null
          vigente_desde: string
        }
        Update: {
          ads_pct_padrao?: number | null
          canal_id?: string
          comissao_pct?: number | null
          criado_em?: string
          dias_repasse?: number | null
          frete_subsidio_padrao?: number | null
          id?: string
          observacoes?: string | null
          taxa_fixa_item?: number | null
          taxa_pagamento_pct?: number | null
          vigente_desde?: string
        }
        Relationships: [
          {
            foreignKeyName: "canais_venda_taxas_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "canais_venda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canais_venda_taxas_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "canais_venda_vigentes"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          ativo: boolean
          atualizado_em: string
          cor: string | null
          criado_em: string
          escopo: string
          id: string
          nome: string
          ordem: number
          pai_id: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          cor?: string | null
          criado_em?: string
          escopo: string
          id?: string
          nome: string
          ordem?: number
          pai_id?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          cor?: string | null
          criado_em?: string
          escopo?: string
          id?: string
          nome?: string
          ordem?: number
          pai_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categorias_pai_id_fkey"
            columns: ["pai_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      migracoes_aplicadas: {
        Row: {
          aplicada_em: string
          nome: string
        }
        Insert: {
          aplicada_em?: string
          nome: string
        }
        Update: {
          aplicada_em?: string
          nome?: string
        }
        Relationships: []
      }
      tokens_integracao: {
        Row: {
          criado_em: string
          escopos: string[]
          expira_em: string | null
          hash_token: string
          id: string
          nome: string
          prefixo: string
          revogado_em: string | null
          ultimo_uso_em: string | null
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          escopos?: string[]
          expira_em?: string | null
          hash_token: string
          id?: string
          nome: string
          prefixo: string
          revogado_em?: string | null
          ultimo_uso_em?: string | null
          usuario_id: string
        }
        Update: {
          criado_em?: string
          escopos?: string[]
          expira_em?: string | null
          hash_token?: string
          id?: string
          nome?: string
          prefixo?: string
          revogado_em?: string | null
          ultimo_uso_em?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tokens_integracao_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios_app"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          base: string | null
          codigo: string
          fator_para_base: number
          nome: string
        }
        Insert: {
          base?: string | null
          codigo: string
          fator_para_base?: number
          nome: string
        }
        Update: {
          base?: string | null
          codigo?: string
          fator_para_base?: number
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_base_fkey"
            columns: ["base"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["codigo"]
          },
        ]
      }
      usuarios_app: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          id: string
          nome: string
          papel: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id: string
          nome: string
          papel: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome?: string
          papel?: string
        }
        Relationships: []
      }
    }
    Views: {
      canais_venda_vigentes: {
        Row: {
          ads_pct_padrao: number | null
          ativo: boolean | null
          atualizado_em: string | null
          comissao_pct: number | null
          criado_em: string | null
          dias_repasse: number | null
          frete_subsidio_padrao: number | null
          id: string | null
          nome: string | null
          observacoes: string | null
          taxa_fixa_item: number | null
          taxa_pagamento_pct: number | null
          taxas_id: string | null
          tipo: string | null
          vigente_desde: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      buscar_global: {
        Args: { limite?: number; termo: string; tipos?: string[] }
        Returns: {
          id: string
          pontuacao: number
          rota: string
          subtitulo: string
          tipo: string
          titulo: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      bancas: {
        Row: {
          created_at: string
          data: string
          discente_id: number | null
          id: number
          link_comprovacao: string
          membros: string
          observacoes: string
          tipo: string
          titulo_trabalho: string
        }
        Insert: {
          created_at?: string
          data?: string
          discente_id?: number | null
          id?: number
          link_comprovacao?: string
          membros?: string
          observacoes?: string
          tipo?: string
          titulo_trabalho: string
        }
        Update: {
          created_at?: string
          data?: string
          discente_id?: number | null
          id?: number
          link_comprovacao?: string
          membros?: string
          observacoes?: string
          tipo?: string
          titulo_trabalho?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bancas_discente_id_fkey'
            columns: ['discente_id']
            isOneToOne: false
            referencedRelation: 'discentes'
            referencedColumns: ['id']
          },
        ]
      }
      discentes: {
        Row: {
          cpf: string
          created_at: string
          data_ingresso: string
          id: number
          link_comprovacao: string
          link_lattes: string
          nome: string
          observacoes: string
          status: string
        }
        Insert: {
          cpf?: string
          created_at?: string
          data_ingresso?: string
          id?: number
          link_comprovacao?: string
          link_lattes?: string
          nome: string
          observacoes?: string
          status?: string
        }
        Update: {
          cpf?: string
          created_at?: string
          data_ingresso?: string
          id?: number
          link_comprovacao?: string
          link_lattes?: string
          nome?: string
          observacoes?: string
          status?: string
        }
        Relationships: []
      }
      disciplinas: {
        Row: {
          ano_semestre: string
          codigo: string
          created_at: string
          creditos: number
          id: number
          link_comprovacao: string
          nome: string
          observacoes: string
        }
        Insert: {
          ano_semestre?: string
          codigo?: string
          created_at?: string
          creditos?: number
          id?: number
          link_comprovacao?: string
          nome: string
          observacoes?: string
        }
        Update: {
          ano_semestre?: string
          codigo?: string
          created_at?: string
          creditos?: number
          id?: number
          link_comprovacao?: string
          nome?: string
          observacoes?: string
        }
        Relationships: []
      }
      docentes: {
        Row: {
          bolsa_cnpq: string
          created_at: string
          id: number
          id_lattes: string | null
          indice_h: number
          jdp: boolean
          licenca: string
          nome: string
          openalex_id: string | null
          scopus_id: string
        }
        Insert: {
          bolsa_cnpq?: string
          created_at?: string
          id?: number
          id_lattes?: string | null
          indice_h?: number
          jdp?: boolean
          licenca?: string
          nome: string
          openalex_id?: string | null
          scopus_id?: string
        }
        Update: {
          bolsa_cnpq?: string
          created_at?: string
          id?: number
          id_lattes?: string | null
          indice_h?: number
          jdp?: boolean
          licenca?: string
          nome?: string
          openalex_id?: string | null
          scopus_id?: string
        }
        Relationships: []
      }
      egressos: {
        Row: {
          ano_titulacao: number | null
          atuacao_profissional: string
          created_at: string
          id: number
          link_comprovacao: string
          link_lattes: string
          nome: string
          observacoes: string
        }
        Insert: {
          ano_titulacao?: number | null
          atuacao_profissional?: string
          created_at?: string
          id?: number
          link_comprovacao?: string
          link_lattes?: string
          nome: string
          observacoes?: string
        }
        Update: {
          ano_titulacao?: number | null
          atuacao_profissional?: string
          created_at?: string
          id?: number
          link_comprovacao?: string
          link_lattes?: string
          nome?: string
          observacoes?: string
        }
        Relationships: []
      }
      eventos: {
        Row: {
          created_at: string
          docente: string
          evento: string
          id: number
          link_comprovacao: string
          local_data: string
          observacoes: string
          papel: string
        }
        Insert: {
          created_at?: string
          docente: string
          evento: string
          id?: number
          link_comprovacao?: string
          local_data: string
          observacoes?: string
          papel: string
        }
        Update: {
          created_at?: string
          docente?: string
          evento?: string
          id?: number
          link_comprovacao?: string
          local_data?: string
          observacoes?: string
          papel?: string
        }
        Relationships: []
      }
      impacto_social: {
        Row: {
          ano: number | null
          created_at: string
          descricao: string
          id: number
          link_comprovacao: string
          observacoes: string
          titulo: string
        }
        Insert: {
          ano?: number | null
          created_at?: string
          descricao?: string
          id?: number
          link_comprovacao?: string
          observacoes?: string
          titulo: string
        }
        Update: {
          ano?: number | null
          created_at?: string
          descricao?: string
          id?: number
          link_comprovacao?: string
          observacoes?: string
          titulo?: string
        }
        Relationships: []
      }
      mobilidade_docente: {
        Row: {
          created_at: string
          id: number
          instituicao: string
          link: string
          link_comprovacao: string
          modalidade: string
          nome: string
          observacoes: string
          periodo: string
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: number
          instituicao: string
          link?: string
          link_comprovacao?: string
          modalidade?: string
          nome: string
          observacoes?: string
          periodo: string
          tipo?: string
        }
        Update: {
          created_at?: string
          id?: number
          instituicao?: string
          link?: string
          link_comprovacao?: string
          modalidade?: string
          nome?: string
          observacoes?: string
          periodo?: string
          tipo?: string
        }
        Relationships: []
      }
      orientacoes: {
        Row: {
          created_at: string
          discente_id: number | null
          docente_id: number | null
          fim: string
          id: number
          inicio: string
          link_comprovacao: string
          observacoes: string
          status: string
          tipo: string
        }
        Insert: {
          created_at?: string
          discente_id?: number | null
          docente_id?: number | null
          fim?: string
          id?: number
          inicio?: string
          link_comprovacao?: string
          observacoes?: string
          status?: string
          tipo?: string
        }
        Update: {
          created_at?: string
          discente_id?: number | null
          docente_id?: number | null
          fim?: string
          id?: number
          inicio?: string
          link_comprovacao?: string
          observacoes?: string
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: 'orientacoes_discente_id_fkey'
            columns: ['discente_id']
            isOneToOne: false
            referencedRelation: 'discentes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orientacoes_docente_id_fkey'
            columns: ['docente_id']
            isOneToOne: false
            referencedRelation: 'docentes'
            referencedColumns: ['id']
          },
        ]
      }
      patentes: {
        Row: {
          autores: string
          created_at: string
          id: number
          inpi: string
          link_comprovacao: string
          observacoes: string
          status: string
          titulo: string
        }
        Insert: {
          autores: string
          created_at?: string
          id?: number
          inpi: string
          link_comprovacao?: string
          observacoes?: string
          status?: string
          titulo: string
        }
        Update: {
          autores?: string
          created_at?: string
          id?: number
          inpi?: string
          link_comprovacao?: string
          observacoes?: string
          status?: string
          titulo?: string
        }
        Relationships: []
      }
      ppg: {
        Row: {
          created_at: string
          id: number
          modalidade: string
          nivel: string
          nome: string
          uf: string
        }
        Insert: {
          created_at?: string
          id?: number
          modalidade?: string
          nivel?: string
          nome: string
          uf?: string
        }
        Update: {
          created_at?: string
          id?: number
          modalidade?: string
          nivel?: string
          nome?: string
          uf?: string
        }
        Relationships: []
      }
      premiacoes: {
        Row: {
          ano: number | null
          created_at: string
          id: number
          instituicao: string
          link_comprovacao: string
          nome_premiado: string
          observacoes: string
          titulo: string
        }
        Insert: {
          ano?: number | null
          created_at?: string
          id?: number
          instituicao?: string
          link_comprovacao?: string
          nome_premiado?: string
          observacoes?: string
          titulo: string
        }
        Update: {
          ano?: number | null
          created_at?: string
          id?: number
          instituicao?: string
          link_comprovacao?: string
          nome_premiado?: string
          observacoes?: string
          titulo?: string
        }
        Relationships: []
      }
      producao_tecnica: {
        Row: {
          ano: number | null
          autores: string
          created_at: string
          id: number
          link_comprovacao: string
          observacoes: string
          tipo: string
          titulo: string
        }
        Insert: {
          ano?: number | null
          autores?: string
          created_at?: string
          id?: number
          link_comprovacao?: string
          observacoes?: string
          tipo?: string
          titulo: string
        }
        Update: {
          ano?: number | null
          autores?: string
          created_at?: string
          id?: number
          link_comprovacao?: string
          observacoes?: string
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: number
          name: string
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: number
          name?: string
          role?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: number
          name?: string
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
      projetos_pesquisa: {
        Row: {
          coordenador_id: number | null
          created_at: string
          descricao: string
          fim: string
          financiamento: boolean
          id: number
          inicio: string
          link_comprovacao: string
          observacoes: string
          orgao_fomento: string
          titulo: string
        }
        Insert: {
          coordenador_id?: number | null
          created_at?: string
          descricao?: string
          fim?: string
          financiamento?: boolean
          id?: number
          inicio?: string
          link_comprovacao?: string
          observacoes?: string
          orgao_fomento?: string
          titulo: string
        }
        Update: {
          coordenador_id?: number | null
          created_at?: string
          descricao?: string
          fim?: string
          financiamento?: boolean
          id?: number
          inicio?: string
          link_comprovacao?: string
          observacoes?: string
          orgao_fomento?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: 'projetos_pesquisa_coordenador_id_fkey'
            columns: ['coordenador_id']
            isOneToOne: false
            referencedRelation: 'docentes'
            referencedColumns: ['id']
          },
        ]
      }
      publicacoes: {
        Row: {
          ano: number
          autores: string
          created_at: string
          doi: string
          id: number
          justificativa: string
          link_comprovacao: string
          observacoes: string
          periodico: string
          titulo: string
        }
        Insert: {
          ano: number
          autores: string
          created_at?: string
          doi?: string
          id?: number
          justificativa?: string
          link_comprovacao?: string
          observacoes?: string
          periodico: string
          titulo: string
        }
        Update: {
          ano?: number
          autores?: string
          created_at?: string
          doi?: string
          id?: number
          justificativa?: string
          link_comprovacao?: string
          observacoes?: string
          periodico?: string
          titulo?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      discentes: {
        Row: {
          ano_conclusao: string | null
          cpf: string
          created_at: string
          data_ingresso: string
          docente_orientador_id: number | null
          id: number
          link_comprovacao: string
          link_lattes: string
          nome: string
          observacoes: string
          orientador: string | null
          projeto_id: number | null
          status: string
          tipo_curso: string | null
        }
        Insert: {
          ano_conclusao?: string | null
          cpf?: string
          created_at?: string
          data_ingresso?: string
          docente_orientador_id?: number | null
          id?: number
          link_comprovacao?: string
          link_lattes?: string
          nome: string
          observacoes?: string
          orientador?: string | null
          projeto_id?: number | null
          status?: string
          tipo_curso?: string | null
        }
        Update: {
          ano_conclusao?: string | null
          cpf?: string
          created_at?: string
          data_ingresso?: string
          docente_orientador_id?: number | null
          id?: number
          link_comprovacao?: string
          link_lattes?: string
          nome?: string
          observacoes?: string
          orientador?: string | null
          projeto_id?: number | null
          status?: string
          tipo_curso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discentes_docente_orientador_id_fkey"
            columns: ["docente_orientador_id"]
            isOneToOne: false
            referencedRelation: "docentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discentes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos_pesquisa"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplinas: {
        Row: {
          ano_semestre: string
          codigo: string
          created_at: string
          creditos: number
          docente_id: number | null
          id: number
          link_comprovacao: string
          nivel: string | null
          nome: string
          observacoes: string
        }
        Insert: {
          ano_semestre?: string
          codigo?: string
          created_at?: string
          creditos?: number
          docente_id?: number | null
          id?: number
          link_comprovacao?: string
          nivel?: string | null
          nome: string
          observacoes?: string
        }
        Update: {
          ano_semestre?: string
          codigo?: string
          created_at?: string
          creditos?: number
          docente_id?: number | null
          id?: number
          link_comprovacao?: string
          nivel?: string | null
          nome?: string
          observacoes?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplinas_docente_id_fkey"
            columns: ["docente_id"]
            isOneToOne: false
            referencedRelation: "docentes"
            referencedColumns: ["id"]
          },
        ]
      }
      docentes: {
        Row: {
          ano_doutorado: number | null
          bolsa_cnpq: string
          categoria: string | null
          cpf: string | null
          created_at: string
          email: string | null
          id: number
          id_lattes: string | null
          indice_h: number
          jdp: boolean
          jdp_desde: number | null
          licenca: string
          nome: string
          openalex_id: string | null
          orc_id: string | null
          scopus_id: string
          siape: string | null
          status: boolean
        }
        Insert: {
          ano_doutorado?: number | null
          bolsa_cnpq?: string
          categoria?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: number
          id_lattes?: string | null
          indice_h?: number
          jdp?: boolean
          jdp_desde?: number | null
          licenca?: string
          nome: string
          openalex_id?: string | null
          orc_id?: string | null
          scopus_id?: string
          siape?: string | null
          status?: boolean
        }
        Update: {
          ano_doutorado?: number | null
          bolsa_cnpq?: string
          categoria?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: number
          id_lattes?: string | null
          indice_h?: number
          jdp?: boolean
          jdp_desde?: number | null
          licenca?: string
          nome?: string
          openalex_id?: string | null
          orc_id?: string | null
          scopus_id?: string
          siape?: string | null
          status?: boolean
        }
        Relationships: []
      }
      docentes_linhas: {
        Row: {
          created_at: string
          docente_id: number
          id: number
          linha_id: number
        }
        Insert: {
          created_at?: string
          docente_id: number
          id?: number
          linha_id: number
        }
        Update: {
          created_at?: string
          docente_id?: number
          id?: number
          linha_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "docentes_linhas_docente_id_fkey"
            columns: ["docente_id"]
            isOneToOne: false
            referencedRelation: "docentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docentes_linhas_linha_id_fkey"
            columns: ["linha_id"]
            isOneToOne: false
            referencedRelation: "linhas_pesquisa"
            referencedColumns: ["id"]
          },
        ]
      }
      egressos: {
        Row: {
          ano_ingresso: string | null
          ano_titulacao: number | null
          atuacao_profissional: string
          created_at: string
          docente_orientador_id: number | null
          id: number
          lattes_id: string | null
          link_comprovacao: string
          link_lattes: string
          nome: string
          observacoes: string
          orientador: string | null
          tipo_curso: string | null
        }
        Insert: {
          ano_ingresso?: string | null
          ano_titulacao?: number | null
          atuacao_profissional?: string
          created_at?: string
          docente_orientador_id?: number | null
          id?: number
          lattes_id?: string | null
          link_comprovacao?: string
          link_lattes?: string
          nome: string
          observacoes?: string
          orientador?: string | null
          tipo_curso?: string | null
        }
        Update: {
          ano_ingresso?: string | null
          ano_titulacao?: number | null
          atuacao_profissional?: string
          created_at?: string
          docente_orientador_id?: number | null
          id?: number
          lattes_id?: string | null
          link_comprovacao?: string
          link_lattes?: string
          nome?: string
          observacoes?: string
          orientador?: string | null
          tipo_curso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "egressos_docente_orientador_id_fkey"
            columns: ["docente_orientador_id"]
            isOneToOne: false
            referencedRelation: "docentes"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          created_at: string
          docente: string
          evento: string
          id: number
          link_comprovacao: string
          local_data: string
          nacionalidade: string | null
          observacoes: string
          papel: string
          tipo: string | null
        }
        Insert: {
          created_at?: string
          docente: string
          evento: string
          id?: number
          link_comprovacao?: string
          local_data: string
          nacionalidade?: string | null
          observacoes?: string
          papel: string
          tipo?: string | null
        }
        Update: {
          created_at?: string
          docente?: string
          evento?: string
          id?: number
          link_comprovacao?: string
          local_data?: string
          nacionalidade?: string | null
          observacoes?: string
          papel?: string
          tipo?: string | null
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
      impactos_vinculos: {
        Row: {
          created_at: string
          entidade: string
          entidade_id: number
          id: number
          impacto_social_id: number
        }
        Insert: {
          created_at?: string
          entidade: string
          entidade_id: number
          id?: number
          impacto_social_id: number
        }
        Update: {
          created_at?: string
          entidade?: string
          entidade_id?: number
          id?: number
          impacto_social_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "impactos_vinculos_impacto_social_id_fkey"
            columns: ["impacto_social_id"]
            isOneToOne: false
            referencedRelation: "impacto_social"
            referencedColumns: ["id"]
          },
        ]
      }
      iniciacao_cientifica: {
        Row: {
          ano: number | null
          bolsa_cnpq: string
          created_at: string
          discente_id: number | null
          discente_nome: string | null
          docente_orientador_id: number | null
          id: number
          observacoes: string
          projeto_id: number | null
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ano?: number | null
          bolsa_cnpq?: string
          created_at?: string
          discente_id?: number | null
          discente_nome?: string | null
          docente_orientador_id?: number | null
          id?: number
          observacoes?: string
          projeto_id?: number | null
          tipo: string
          titulo?: string
          updated_at?: string
        }
        Update: {
          ano?: number | null
          bolsa_cnpq?: string
          created_at?: string
          discente_id?: number | null
          discente_nome?: string | null
          docente_orientador_id?: number | null
          id?: number
          observacoes?: string
          projeto_id?: number | null
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iniciacao_cientifica_discente_id_fkey"
            columns: ["discente_id"]
            isOneToOne: false
            referencedRelation: "discentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iniciacao_cientifica_docente_orientador_id_fkey"
            columns: ["docente_orientador_id"]
            isOneToOne: false
            referencedRelation: "docentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iniciacao_cientifica_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos_pesquisa"
            referencedColumns: ["id"]
          },
        ]
      }
      linhas_pesquisa: {
        Row: {
          area: string | null
          created_at: string
          id: number
          nome: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          id?: number
          nome: string
        }
        Update: {
          area?: string | null
          created_at?: string
          id?: number
          nome?: string
        }
        Relationships: []
      }
      logs: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          entidade: string
          entidade_id: string | null
          id: number
          user_email: string | null
          user_id: string | null
          user_nome: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          entidade: string
          entidade_id?: string | null
          id?: never
          user_email?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          entidade?: string
          entidade_id?: string | null
          id?: never
          user_email?: string | null
          user_id?: string | null
          user_nome?: string | null
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
          cancelado: boolean
          created_at: string
          data_defesa: string | null
          discente_id: number | null
          docente_id: number | null
          fim: string
          flag_orientador_principal: boolean
          id: number
          inicio: string
          link_comprovacao: string
          observacoes: string
          status: string
          tipo: string
        }
        Insert: {
          cancelado?: boolean
          created_at?: string
          data_defesa?: string | null
          discente_id?: number | null
          docente_id?: number | null
          fim?: string
          flag_orientador_principal?: boolean
          id?: number
          inicio?: string
          link_comprovacao?: string
          observacoes?: string
          status?: string
          tipo?: string
        }
        Update: {
          cancelado?: boolean
          created_at?: string
          data_defesa?: string | null
          discente_id?: number | null
          docente_id?: number | null
          fim?: string
          flag_orientador_principal?: boolean
          id?: number
          inicio?: string
          link_comprovacao?: string
          observacoes?: string
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "orientacoes_discente_id_fkey"
            columns: ["discente_id"]
            isOneToOne: false
            referencedRelation: "discentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orientacoes_docente_id_fkey"
            columns: ["docente_id"]
            isOneToOne: false
            referencedRelation: "docentes"
            referencedColumns: ["id"]
          },
        ]
      }
      patentes: {
        Row: {
          ambito: string | null
          autores: string
          created_at: string
          id: number
          inpi: string
          link_comprovacao: string
          observacoes: string
          status: string
          tipo: string | null
          titulo: string
        }
        Insert: {
          ambito?: string | null
          autores: string
          created_at?: string
          id?: number
          inpi: string
          link_comprovacao?: string
          observacoes?: string
          status?: string
          tipo?: string | null
          titulo: string
        }
        Update: {
          ambito?: string | null
          autores?: string
          created_at?: string
          id?: number
          inpi?: string
          link_comprovacao?: string
          observacoes?: string
          status?: string
          tipo?: string | null
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
          docente_id: number | null
          email: string
          id: number
          name: string
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          docente_id?: number | null
          email: string
          id?: number
          name?: string
          role?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          docente_id?: number | null
          email?: string
          id?: number
          name?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_docente_id_fkey"
            columns: ["docente_id"]
            isOneToOne: true
            referencedRelation: "docentes"
            referencedColumns: ["id"]
          },
        ]
      }
      projetos_discentes: {
        Row: {
          created_at: string
          discente_id: number
          papel: string | null
          projeto_id: number
        }
        Insert: {
          created_at?: string
          discente_id: number
          papel?: string | null
          projeto_id: number
        }
        Update: {
          created_at?: string
          discente_id?: number
          papel?: string | null
          projeto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "projetos_discentes_discente_id_fkey"
            columns: ["discente_id"]
            isOneToOne: false
            referencedRelation: "discentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_discentes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos_pesquisa"
            referencedColumns: ["id"]
          },
        ]
      }
      projetos_participantes: {
        Row: {
          created_at: string
          docente_id: number
          papel: string | null
          projeto_id: number
        }
        Insert: {
          created_at?: string
          docente_id: number
          papel?: string | null
          projeto_id: number
        }
        Update: {
          created_at?: string
          docente_id?: number
          papel?: string | null
          projeto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "projetos_participantes_docente_id_fkey"
            columns: ["docente_id"]
            isOneToOne: false
            referencedRelation: "docentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_participantes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos_pesquisa"
            referencedColumns: ["id"]
          },
        ]
      }
      projetos_pesquisa: {
        Row: {
          classificacao: string | null
          comprovante_url: string | null
          coordenador_id: number | null
          created_at: string
          descricao: string
          fim: string
          financiador_nome: string | null
          financiamento: boolean
          id: number
          inicio: string
          link_comprovacao: string
          observacoes: string
          orgao_fomento: string
          titulo: string
          valor_financiamento: number | null
        }
        Insert: {
          classificacao?: string | null
          comprovante_url?: string | null
          coordenador_id?: number | null
          created_at?: string
          descricao?: string
          fim?: string
          financiador_nome?: string | null
          financiamento?: boolean
          id?: number
          inicio?: string
          link_comprovacao?: string
          observacoes?: string
          orgao_fomento?: string
          titulo: string
          valor_financiamento?: number | null
        }
        Update: {
          classificacao?: string | null
          comprovante_url?: string | null
          coordenador_id?: number | null
          created_at?: string
          descricao?: string
          fim?: string
          financiador_nome?: string | null
          financiamento?: boolean
          id?: number
          inicio?: string
          link_comprovacao?: string
          observacoes?: string
          orgao_fomento?: string
          titulo?: string
          valor_financiamento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projetos_pesquisa_coordenador_id_fkey"
            columns: ["coordenador_id"]
            isOneToOne: false
            referencedRelation: "docentes"
            referencedColumns: ["id"]
          },
        ]
      }
      publicacoes: {
        Row: {
          ano: number
          autores: string
          created_at: string
          doi: string
          estrato_qualis: string | null
          fator_impacto_jcr: number | null
          id: number
          indicacao_nivel: number | null
          justificativa: string
          justificativa_indicacao: string | null
          link_comprovacao: string
          observacoes: string
          periodico: string
          qualis_origem: string | null
          qualis_sugestao_justificativa: string | null
          tipo_producao: string | null
          titulo: string
        }
        Insert: {
          ano: number
          autores: string
          created_at?: string
          doi?: string
          estrato_qualis?: string | null
          fator_impacto_jcr?: number | null
          id?: number
          indicacao_nivel?: number | null
          justificativa?: string
          justificativa_indicacao?: string | null
          link_comprovacao?: string
          observacoes?: string
          periodico: string
          qualis_origem?: string | null
          qualis_sugestao_justificativa?: string | null
          tipo_producao?: string | null
          titulo: string
        }
        Update: {
          ano?: number
          autores?: string
          created_at?: string
          doi?: string
          estrato_qualis?: string | null
          fator_impacto_jcr?: number | null
          id?: number
          indicacao_nivel?: number | null
          justificativa?: string
          justificativa_indicacao?: string | null
          link_comprovacao?: string
          observacoes?: string
          periodico?: string
          qualis_origem?: string | null
          qualis_sugestao_justificativa?: string | null
          tipo_producao?: string | null
          titulo?: string
        }
        Relationships: []
      }
      publicacoes_coautores_programa: {
        Row: {
          confirmado_em: string
          confirmado_por: string | null
          created_at: string
          discente_id: number | null
          egresso_id: number | null
          grau_confianca: number | null
          id: number
          nome_citado: string
          publicacao_id: number
          tipo: string
        }
        Insert: {
          confirmado_em?: string
          confirmado_por?: string | null
          created_at?: string
          discente_id?: number | null
          egresso_id?: number | null
          grau_confianca?: number | null
          id?: number
          nome_citado?: string
          publicacao_id: number
          tipo?: string
        }
        Update: {
          confirmado_em?: string
          confirmado_por?: string | null
          created_at?: string
          discente_id?: number | null
          egresso_id?: number | null
          grau_confianca?: number | null
          id?: number
          nome_citado?: string
          publicacao_id?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "publicacoes_coautores_programa_discente_id_fkey"
            columns: ["discente_id"]
            isOneToOne: false
            referencedRelation: "discentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_coautores_programa_egresso_id_fkey"
            columns: ["egresso_id"]
            isOneToOne: false
            referencedRelation: "egressos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_coautores_programa_publicacao_id_fkey"
            columns: ["publicacao_id"]
            isOneToOne: false
            referencedRelation: "publicacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      publicacoes_docentes: {
        Row: {
          created_at: string
          docente_id: number
          id: number
          publicacao_id: number
        }
        Insert: {
          created_at?: string
          docente_id: number
          id?: number
          publicacao_id: number
        }
        Update: {
          created_at?: string
          docente_id?: number
          id?: number
          publicacao_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "publicacoes_docentes_docente_id_fkey"
            columns: ["docente_id"]
            isOneToOne: false
            referencedRelation: "docentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_docentes_publicacao_id_fkey"
            columns: ["publicacao_id"]
            isOneToOne: false
            referencedRelation: "publicacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      qualis: {
        Row: {
          created_at: string
          descricao: string
          estrato: string
          id: number
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string
          estrato: string
          id?: number
          nome?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          estrato?: string
          id?: number
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      scopus_val_log: {
        Row: {
          created_at: string
          data: Json | null
          id: number
          stage: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: number
          stage: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: number
          stage?: string
        }
        Relationships: []
      }
      sugestoes_vinculos_rejeitadas: {
        Row: {
          alvo_identificador: string
          created_at: string
          id: number
          motivo: string | null
          origem_identificador: string
          rejeitado_por: string | null
          tipo_vinculo: string
        }
        Insert: {
          alvo_identificador: string
          created_at?: string
          id?: number
          motivo?: string | null
          origem_identificador: string
          rejeitado_por?: string | null
          tipo_vinculo: string
        }
        Update: {
          alvo_identificador?: string
          created_at?: string
          id?: number
          motivo?: string | null
          origem_identificador?: string
          rejeitado_por?: string | null
          tipo_vinculo?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      alterar_papel: {
        Args: { alvo_user_id: string; novo_papel: string }
        Returns: {
          created_at: string
          docente_id: number | null
          email: string
          id: number
          name: string
          role: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_user_docente_id: { Args: never; Returns: number }
      get_user_role: { Args: never; Returns: string }
      is_admin_staff: { Args: never; Returns: boolean }
      parse_data_fim_orientacao: { Args: { p_fim: string }; Returns: string }
      status_efetivo: {
        Args: { o: Database["public"]["Tables"]["orientacoes"]["Row"] }
        Returns: string
      }
      status_efetivo_orientacao: {
        Args: { p_cancelado?: boolean; p_fim: string; p_status: string }
        Returns: string
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


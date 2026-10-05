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
      algorithm_parameters: {
        Row: {
          category: string
          created_at: string
          criteria_label: string
          display_order: number
          id: number
          input_type: string
          is_active: boolean
          justification: string
          max_val: number | null
          min_val: number | null
          name: string
          normal_range_label: string
          param_key: string
          points: number
          step_val: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          criteria_label: string
          display_order?: number
          id?: number
          input_type: string
          is_active?: boolean
          justification: string
          max_val?: number | null
          min_val?: number | null
          name: string
          normal_range_label: string
          param_key: string
          points?: number
          step_val?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          criteria_label?: string
          display_order?: number
          id?: number
          input_type?: string
          is_active?: boolean
          justification?: string
          max_val?: number | null
          min_val?: number | null
          name?: string
          normal_range_label?: string
          param_key?: string
          points?: number
          step_val?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      assessments: {
        Row: {
          altered_appearance_behavior: boolean | null
          blood_glucose: number | null
          blood_pressure: number | null
          code: string
          cold_extremities: boolean | null
          cold_sweat_pallor: boolean | null
          cold_sweating: boolean | null
          confusion_agitation: boolean | null
          created_at: string
          creatinine: number | null
          crp: number | null
          cyanosis_mucosal_discoloration: boolean | null
          diastolic_bp: number | null
          filled_count: number
          heart_rate: number | null
          hemoglobin: number | null
          id: string
          identified_factors: Json
          impaired_consciousness: boolean | null
          increased_work_of_breathing: boolean | null
          is_data_sparse: boolean
          lactate: number | null
          leukocytes: number | null
          new_weakness_immobility: boolean | null
          nurse_notes: string | null
          pallor: boolean | null
          patient_data: Json
          patient_status: string
          platelets: number | null
          potassium: number | null
          prostration_general_deterioration: boolean | null
          reduced_diuresis_oliguria: boolean | null
          respiratory_rate: number | null
          risk_description: string | null
          risk_guidance: string
          risk_level: string
          risk_title: string
          score: number
          sodium: number | null
          spo2: number | null
          suggested_actions: Json
          systolic_bp: number | null
          temperature: number | null
          total_parameters: number
          unit_sector: string | null
          updated_at: string
          urea: number | null
          user_id: string | null
        }
        Insert: {
          altered_appearance_behavior?: boolean | null
          blood_glucose?: number | null
          blood_pressure?: number | null
          code: string
          cold_extremities?: boolean | null
          cold_sweat_pallor?: boolean | null
          cold_sweating?: boolean | null
          confusion_agitation?: boolean | null
          created_at?: string
          creatinine?: number | null
          crp?: number | null
          cyanosis_mucosal_discoloration?: boolean | null
          diastolic_bp?: number | null
          filled_count?: number
          heart_rate?: number | null
          hemoglobin?: number | null
          id?: string
          identified_factors?: Json
          impaired_consciousness?: boolean | null
          increased_work_of_breathing?: boolean | null
          is_data_sparse?: boolean
          lactate?: number | null
          leukocytes?: number | null
          new_weakness_immobility?: boolean | null
          nurse_notes?: string | null
          pallor?: boolean | null
          patient_data?: Json
          patient_status?: string
          platelets?: number | null
          potassium?: number | null
          prostration_general_deterioration?: boolean | null
          reduced_diuresis_oliguria?: boolean | null
          respiratory_rate?: number | null
          risk_description?: string | null
          risk_guidance?: string
          risk_level: string
          risk_title?: string
          score?: number
          sodium?: number | null
          spo2?: number | null
          suggested_actions?: Json
          systolic_bp?: number | null
          temperature?: number | null
          total_parameters?: number
          unit_sector?: string | null
          updated_at?: string
          urea?: number | null
          user_id?: string | null
        }
        Update: {
          altered_appearance_behavior?: boolean | null
          blood_glucose?: number | null
          blood_pressure?: number | null
          code?: string
          cold_extremities?: boolean | null
          cold_sweat_pallor?: boolean | null
          cold_sweating?: boolean | null
          confusion_agitation?: boolean | null
          created_at?: string
          creatinine?: number | null
          crp?: number | null
          cyanosis_mucosal_discoloration?: boolean | null
          diastolic_bp?: number | null
          filled_count?: number
          heart_rate?: number | null
          hemoglobin?: number | null
          id?: string
          identified_factors?: Json
          impaired_consciousness?: boolean | null
          increased_work_of_breathing?: boolean | null
          is_data_sparse?: boolean
          lactate?: number | null
          leukocytes?: number | null
          new_weakness_immobility?: boolean | null
          nurse_notes?: string | null
          pallor?: boolean | null
          patient_data?: Json
          patient_status?: string
          platelets?: number | null
          potassium?: number | null
          prostration_general_deterioration?: boolean | null
          reduced_diuresis_oliguria?: boolean | null
          respiratory_rate?: number | null
          risk_description?: string | null
          risk_guidance?: string
          risk_level?: string
          risk_title?: string
          score?: number
          sodium?: number | null
          spo2?: number | null
          suggested_actions?: Json
          systolic_bp?: number | null
          temperature?: number | null
          total_parameters?: number
          unit_sector?: string | null
          updated_at?: string
          urea?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          coren: string
          created_at: string
          email: string
          estado: string
          id: string
          name: string
          role: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          coren?: string
          created_at?: string
          email?: string
          estado?: string
          id: string
          name?: string
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          coren?: string
          created_at?: string
          email?: string
          estado?: string
          id?: string
          name?: string
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { check_user_id: string }; Returns: boolean }
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


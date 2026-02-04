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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          notes: string | null
          stage_id: string | null
          status: string
          updated_at: string
          vacancy_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          notes?: string | null
          stage_id?: string | null
          status?: string
          updated_at?: string
          vacancy_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          stage_id?: string | null
          status?: string
          updated_at?: string
          vacancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_documents: {
        Row: {
          arquivo_original: string | null
          candidate_id: string
          carga_horaria_pratica: number | null
          carga_horaria_teorica: number | null
          carga_horaria_total: number | null
          catalog_document_id: string | null
          codigo: string | null
          created_at: string
          declaracao: boolean | null
          detail: string | null
          document_category: string | null
          document_name: string
          document_type: string | null
          expiry_date: string | null
          file_url: string | null
          group_name: string | null
          id: string
          issue_date: string | null
          issuing_authority: string | null
          link_validacao: string | null
          modality: string | null
          registration_number: string | null
          sigla_documento: string | null
          tipo_de_codigo: string | null
          updated_at: string
        }
        Insert: {
          arquivo_original?: string | null
          candidate_id: string
          carga_horaria_pratica?: number | null
          carga_horaria_teorica?: number | null
          carga_horaria_total?: number | null
          catalog_document_id?: string | null
          codigo?: string | null
          created_at?: string
          declaracao?: boolean | null
          detail?: string | null
          document_category?: string | null
          document_name: string
          document_type?: string | null
          expiry_date?: string | null
          file_url?: string | null
          group_name?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          link_validacao?: string | null
          modality?: string | null
          registration_number?: string | null
          sigla_documento?: string | null
          tipo_de_codigo?: string | null
          updated_at?: string
        }
        Update: {
          arquivo_original?: string | null
          candidate_id?: string
          carga_horaria_pratica?: number | null
          carga_horaria_teorica?: number | null
          carga_horaria_total?: number | null
          catalog_document_id?: string | null
          codigo?: string | null
          created_at?: string
          declaracao?: boolean | null
          detail?: string | null
          document_category?: string | null
          document_name?: string
          document_type?: string | null
          expiry_date?: string | null
          file_url?: string | null
          group_name?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          link_validacao?: string | null
          modality?: string | null
          registration_number?: string | null
          sigla_documento?: string | null
          tipo_de_codigo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_documents_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_documents_catalog_document_id_fkey"
            columns: ["catalog_document_id"]
            isOneToOne: false
            referencedRelation: "documents_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_history: {
        Row: {
          approved: boolean | null
          candidate_id: string
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          id: string
          updated_at: string
          vacancy_id: string | null
        }
        Insert: {
          approved?: boolean | null
          candidate_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          id?: string
          updated_at?: string
          vacancy_id?: string | null
        }
        Update: {
          approved?: boolean | null
          candidate_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          id?: string
          updated_at?: string
          vacancy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_history_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_history_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          address_complement: string | null
          address_district: string | null
          address_number: string | null
          address_street: string | null
          address_type: string | null
          blacklisted: boolean | null
          city: string | null
          cpf: string | null
          created_at: string
          cs_responsible_id: string | null
          email: string
          id: string
          linkedin_url: string | null
          matrix_id: string | null
          name: string
          notes: string | null
          phone: string | null
          phones: string | null
          photo_url: string | null
          resume_url: string | null
          role_title: string | null
          state: string | null
          status: string
          updated_at: string
          working_status: string | null
          zip_code: string | null
        }
        Insert: {
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_street?: string | null
          address_type?: string | null
          blacklisted?: boolean | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          cs_responsible_id?: string | null
          email: string
          id?: string
          linkedin_url?: string | null
          matrix_id?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          phones?: string | null
          photo_url?: string | null
          resume_url?: string | null
          role_title?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          working_status?: string | null
          zip_code?: string | null
        }
        Update: {
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_street?: string | null
          address_type?: string | null
          blacklisted?: boolean | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          cs_responsible_id?: string | null
          email?: string
          id?: string
          linkedin_url?: string | null
          matrix_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          phones?: string | null
          photo_url?: string | null
          resume_url?: string | null
          role_title?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          working_status?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_matrix_id_fkey"
            columns: ["matrix_id"]
            isOneToOne: false
            referencedRelation: "matrices"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          application_id: string | null
          candidate_id: string | null
          created_at: string
          file_type: string | null
          file_url: string
          id: string
          name: string
          uploaded_by: string
        }
        Insert: {
          application_id?: string | null
          candidate_id?: string | null
          created_at?: string
          file_type?: string | null
          file_url: string
          id?: string
          name: string
          uploaded_by: string
        }
        Update: {
          application_id?: string | null
          candidate_id?: string | null
          created_at?: string
          file_type?: string | null
          file_url?: string
          id?: string
          name?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      documents_catalog: {
        Row: {
          categoria: string
          created_at: string | null
          detail: string | null
          document_category: string | null
          document_type: string | null
          group_name: string | null
          id: string
          issuing_authority: string | null
          modality: string | null
          name: string
          sigla_documento: string | null
        }
        Insert: {
          categoria: string
          created_at?: string | null
          detail?: string | null
          document_category?: string | null
          document_type?: string | null
          group_name?: string | null
          id?: string
          issuing_authority?: string | null
          modality?: string | null
          name: string
          sigla_documento?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string | null
          detail?: string | null
          document_category?: string | null
          document_type?: string | null
          group_name?: string | null
          id?: string
          issuing_authority?: string | null
          modality?: string | null
          name?: string
          sigla_documento?: string | null
        }
        Relationships: []
      }
      evaluation_criteria: {
        Row: {
          created_at: string
          description: string | null
          id: string
          matrix_id: string
          max_score: number
          name: string
          weight: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          matrix_id: string
          max_score?: number
          name: string
          weight?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          matrix_id?: string
          max_score?: number
          name?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_criteria_matrix_id_fkey"
            columns: ["matrix_id"]
            isOneToOne: false
            referencedRelation: "evaluation_matrices"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_matrices: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
          vacancy_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          vacancy_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          vacancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_matrices_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          application_id: string
          created_at: string
          criteria_id: string
          evaluated_by: string
          id: string
          notes: string | null
          score: number
        }
        Insert: {
          application_id: string
          created_at?: string
          criteria_id: string
          evaluated_by: string
          id?: string
          notes?: string | null
          score: number
        }
        Update: {
          application_id?: string
          created_at?: string
          criteria_id?: string
          evaluated_by?: string
          id?: string
          notes?: string | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "evaluation_criteria"
            referencedColumns: ["id"]
          },
        ]
      }
      matrices: {
        Row: {
          active: boolean
          cargo: string
          created_at: string | null
          created_by: string | null
          empresa: string
          id: string
          solicitado_por: string
          user_email: string | null
          versao_matriz: string
        }
        Insert: {
          active?: boolean
          cargo: string
          created_at?: string | null
          created_by?: string | null
          empresa: string
          id?: string
          solicitado_por: string
          user_email?: string | null
          versao_matriz: string
        }
        Update: {
          active?: boolean
          cargo?: string
          created_at?: string | null
          created_by?: string | null
          empresa?: string
          id?: string
          solicitado_por?: string
          user_email?: string | null
          versao_matriz?: string
        }
        Relationships: []
      }
      matrix_items: {
        Row: {
          carga_horaria: number | null
          created_at: string | null
          document_id: string | null
          id: string
          matrix_id: string | null
          modalidade: string
          obrigatoriedade: string
          regra_validade: string
        }
        Insert: {
          carga_horaria?: number | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          matrix_id?: string | null
          modalidade: string
          obrigatoriedade: string
          regra_validade: string
        }
        Update: {
          carga_horaria?: number | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          matrix_id?: string | null
          modalidade?: string
          obrigatoriedade?: string
          regra_validade?: string
        }
        Relationships: [
          {
            foreignKeyName: "matrix_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matrix_items_matrix_id_fkey"
            columns: ["matrix_id"]
            isOneToOne: false
            referencedRelation: "matrices"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vacancies: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by: string
          department: string | null
          description: string | null
          employment_type: string | null
          id: string
          location: string | null
          requirements: string | null
          salary_range: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          created_by: string
          department?: string | null
          description?: string | null
          employment_type?: string | null
          id?: string
          location?: string | null
          requirements?: string | null
          salary_range?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          created_by?: string
          department?: string | null
          description?: string | null
          employment_type?: string | null
          id?: string
          location?: string | null
          requirements?: string | null
          salary_range?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "superadministrador" | "administrador" | "recrutador"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["superadministrador", "administrador", "recrutador"],
    },
  },
} as const
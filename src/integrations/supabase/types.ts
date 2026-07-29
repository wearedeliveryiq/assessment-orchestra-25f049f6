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
      assessment_observations: {
        Row: {
          category: string
          confidence: number
          created_at: string
          definition_id: string
          description: string
          evidence: string
          id: string
          knowledge_pack: string
          knowledge_pack_version: string
          question_id: string
          rule_expression: string
          session_id: string
          severity: string
          source_label: string | null
          source_value: Json | null
          title: string
          updated_at: string
          weight: number
        }
        Insert: {
          category: string
          confidence?: number
          created_at?: string
          definition_id: string
          description: string
          evidence: string
          id?: string
          knowledge_pack: string
          knowledge_pack_version: string
          question_id: string
          rule_expression: string
          session_id: string
          severity: string
          source_label?: string | null
          source_value?: Json | null
          title: string
          updated_at?: string
          weight?: number
        }
        Update: {
          category?: string
          confidence?: number
          created_at?: string
          definition_id?: string
          description?: string
          evidence?: string
          id?: string
          knowledge_pack?: string
          knowledge_pack_version?: string
          question_id?: string
          rule_expression?: string
          session_id?: string
          severity?: string
          source_label?: string | null
          source_value?: Json | null
          title?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_observations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_responses: {
        Row: {
          answered_at: string
          created_at: string
          id: string
          notes: string | null
          question_id: string
          score: number | null
          section_id: string
          session_id: string
          updated_at: string
          value: Json
        }
        Insert: {
          answered_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          question_id: string
          score?: number | null
          section_id: string
          session_id: string
          updated_at?: string
          value?: Json
        }
        Update: {
          answered_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          question_id?: string
          score?: number | null
          section_id?: string
          session_id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_rule_results: {
        Row: {
          category: string
          confidence: number
          created_at: string
          description: string
          evaluation_reason: string
          executed_at: string
          id: string
          knowledge_pack: string
          knowledge_pack_version: string
          name: string
          rule_code: string
          rule_expression: string
          session_id: string
          severity: string
          status: string
          supporting_signal_codes: string[]
          supporting_signal_ids: string[]
          weight: number
        }
        Insert: {
          category: string
          confidence?: number
          created_at?: string
          description: string
          evaluation_reason: string
          executed_at?: string
          id?: string
          knowledge_pack: string
          knowledge_pack_version: string
          name: string
          rule_code: string
          rule_expression: string
          session_id: string
          severity: string
          status: string
          supporting_signal_codes?: string[]
          supporting_signal_ids?: string[]
          weight?: number
        }
        Update: {
          category?: string
          confidence?: number
          created_at?: string
          description?: string
          evaluation_reason?: string
          executed_at?: string
          id?: string
          knowledge_pack?: string
          knowledge_pack_version?: string
          name?: string
          rule_code?: string
          rule_expression?: string
          session_id?: string
          severity?: string
          status?: string
          supporting_signal_codes?: string[]
          supporting_signal_ids?: string[]
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_rule_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_sessions: {
        Row: {
          archived_at: string | null
          assessment_type: string
          completed_at: string | null
          contact_name: string | null
          created_at: string
          current_section: string | null
          failure_reason: string | null
          id: string
          metadata: Json
          organisation_name: string
          owner_key: string
          progress: number
          results: Json | null
          status: Database["public"]["Enums"]["assessment_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          assessment_type?: string
          completed_at?: string | null
          contact_name?: string | null
          created_at?: string
          current_section?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json
          organisation_name?: string
          owner_key: string
          progress?: number
          results?: Json | null
          status?: Database["public"]["Enums"]["assessment_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          assessment_type?: string
          completed_at?: string | null
          contact_name?: string | null
          created_at?: string
          current_section?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json
          organisation_name?: string
          owner_key?: string
          progress?: number
          results?: Json | null
          status?: Database["public"]["Enums"]["assessment_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      assessment_signals: {
        Row: {
          category: string
          confidence: number
          created_at: string
          description: string
          id: string
          knowledge_pack: string
          knowledge_pack_version: string
          name: string
          rule_expression: string
          session_id: string
          severity: string
          signal_code: string
          supporting_definition_ids: string[]
          supporting_observation_ids: string[]
          weight: number
        }
        Insert: {
          category: string
          confidence: number
          created_at?: string
          description: string
          id?: string
          knowledge_pack: string
          knowledge_pack_version: string
          name: string
          rule_expression: string
          session_id: string
          severity: string
          signal_code: string
          supporting_definition_ids?: string[]
          supporting_observation_ids?: string[]
          weight: number
        }
        Update: {
          category?: string
          confidence?: number
          created_at?: string
          description?: string
          id?: string
          knowledge_pack?: string
          knowledge_pack_version?: string
          name?: string
          rule_expression?: string
          session_id?: string
          severity?: string
          signal_code?: string
          supporting_definition_ids?: string[]
          supporting_observation_ids?: string[]
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_signals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_stage_runs: {
        Row: {
          attempt: number
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          output: Json | null
          sequence: number
          session_id: string
          stage: string
          started_at: string | null
          status: Database["public"]["Enums"]["stage_status"]
          updated_at: string
        }
        Insert: {
          attempt?: number
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          output?: Json | null
          sequence: number
          session_id: string
          stage: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["stage_status"]
          updated_at?: string
        }
        Update: {
          attempt?: number
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          output?: Json | null
          sequence?: number
          session_id?: string
          stage?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["stage_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_stage_runs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      assessment_status:
        | "draft"
        | "in_progress"
        | "submitted"
        | "processing"
        | "completed"
        | "archived"
      stage_status: "pending" | "running" | "completed" | "failed" | "skipped"
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
      assessment_status: [
        "draft",
        "in_progress",
        "submitted",
        "processing",
        "completed",
        "archived",
      ],
      stage_status: ["pending", "running", "completed", "failed", "skipped"],
    },
  },
} as const

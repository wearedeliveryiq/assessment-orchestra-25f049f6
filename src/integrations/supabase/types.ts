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
      assessment_narratives: {
        Row: {
          audience: string
          confidence: number
          created_at: string
          evidence: Json
          generation_ms: number
          headline: string
          id: string
          knowledge_pack: string
          knowledge_pack_version: string
          mode: string
          model: string
          provider: string
          sections: Json
          session_id: string
          summary: string
          tone: string
          validation: Json
        }
        Insert: {
          audience?: string
          confidence?: number
          created_at?: string
          evidence?: Json
          generation_ms?: number
          headline?: string
          id?: string
          knowledge_pack: string
          knowledge_pack_version: string
          mode?: string
          model?: string
          provider?: string
          sections?: Json
          session_id: string
          summary?: string
          tone?: string
          validation?: Json
        }
        Update: {
          audience?: string
          confidence?: number
          created_at?: string
          evidence?: Json
          generation_ms?: number
          headline?: string
          id?: string
          knowledge_pack?: string
          knowledge_pack_version?: string
          mode?: string
          model?: string
          provider?: string
          sections?: Json
          session_id?: string
          summary?: string
          tone?: string
          validation?: Json
        }
        Relationships: [
          {
            foreignKeyName: "assessment_narratives_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
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
      assessment_patterns: {
        Row: {
          business_impact: string
          category: string
          confidence: number
          created_at: string
          description: string
          evaluation_reason: string
          id: string
          knowledge_pack: string
          knowledge_pack_version: string
          name: string
          pattern_code: string
          pattern_expression: string
          session_id: string
          severity: string
          supporting_rule_codes: string[]
          supporting_rule_ids: string[]
          weight: number
        }
        Insert: {
          business_impact: string
          category: string
          confidence?: number
          created_at?: string
          description: string
          evaluation_reason: string
          id?: string
          knowledge_pack: string
          knowledge_pack_version: string
          name: string
          pattern_code: string
          pattern_expression: string
          session_id: string
          severity: string
          supporting_rule_codes?: string[]
          supporting_rule_ids?: string[]
          weight?: number
        }
        Update: {
          business_impact?: string
          category?: string
          confidence?: number
          created_at?: string
          description?: string
          evaluation_reason?: string
          id?: string
          knowledge_pack?: string
          knowledge_pack_version?: string
          name?: string
          pattern_code?: string
          pattern_expression?: string
          session_id?: string
          severity?: string
          supporting_rule_codes?: string[]
          supporting_rule_ids?: string[]
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_patterns_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_reports: {
        Row: {
          branding: Json
          checksum: string
          completed_at: string | null
          content_type: string
          created_at: string
          duration_ms: number
          error: string | null
          file_size: number
          filename: string
          format: string
          id: string
          knowledge_pack: string
          knowledge_pack_version: string
          metadata: Json
          owner_key: string
          report_type: string
          requested_at: string
          session_id: string
          started_at: string | null
          status: string
          storage_path: string | null
          template_id: string
          title: string
          updated_at: string
          validation: Json
          version: number
        }
        Insert: {
          branding?: Json
          checksum?: string
          completed_at?: string | null
          content_type?: string
          created_at?: string
          duration_ms?: number
          error?: string | null
          file_size?: number
          filename?: string
          format: string
          id?: string
          knowledge_pack?: string
          knowledge_pack_version?: string
          metadata?: Json
          owner_key: string
          report_type: string
          requested_at?: string
          session_id: string
          started_at?: string | null
          status?: string
          storage_path?: string | null
          template_id?: string
          title?: string
          updated_at?: string
          validation?: Json
          version?: number
        }
        Update: {
          branding?: Json
          checksum?: string
          completed_at?: string | null
          content_type?: string
          created_at?: string
          duration_ms?: number
          error?: string | null
          file_size?: number
          filename?: string
          format?: string
          id?: string
          knowledge_pack?: string
          knowledge_pack_version?: string
          metadata?: Json
          owner_key?: string
          report_type?: string
          requested_at?: string
          session_id?: string
          started_at?: string | null
          status?: string
          storage_path?: string | null
          template_id?: string
          title?: string
          updated_at?: string
          validation?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_reports_session_id_fkey"
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
      assessment_score_summaries: {
        Row: {
          breakdown: Json
          confidence: number
          created_at: string
          dimension_count: number
          id: string
          knowledge_pack: string
          knowledge_pack_version: string
          maturity_level: string
          maximum_score: number
          overall_score: number
          pattern_count: number
          percentage: number
          session_id: string
        }
        Insert: {
          breakdown?: Json
          confidence?: number
          created_at?: string
          dimension_count?: number
          id?: string
          knowledge_pack: string
          knowledge_pack_version: string
          maturity_level: string
          maximum_score?: number
          overall_score?: number
          pattern_count?: number
          percentage?: number
          session_id: string
        }
        Update: {
          breakdown?: Json
          confidence?: number
          created_at?: string
          dimension_count?: number
          id?: string
          knowledge_pack?: string
          knowledge_pack_version?: string
          maturity_level?: string
          maximum_score?: number
          overall_score?: number
          pattern_count?: number
          percentage?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_score_summaries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_scores: {
        Row: {
          breakdown: Json
          calculation_reason: string
          confidence: number
          created_at: string
          dimension: string
          id: string
          knowledge_pack: string
          knowledge_pack_version: string
          maturity_level: string
          maximum_score: number
          overall_score: number
          percentage: number
          score_code: string
          score_expression: string
          session_id: string
          severity: string
          supporting_pattern_codes: string[]
          supporting_pattern_ids: string[]
          weight: number
        }
        Insert: {
          breakdown?: Json
          calculation_reason?: string
          confidence?: number
          created_at?: string
          dimension: string
          id?: string
          knowledge_pack: string
          knowledge_pack_version: string
          maturity_level: string
          maximum_score?: number
          overall_score?: number
          percentage?: number
          score_code: string
          score_expression?: string
          session_id: string
          severity?: string
          supporting_pattern_codes?: string[]
          supporting_pattern_ids?: string[]
          weight?: number
        }
        Update: {
          breakdown?: Json
          calculation_reason?: string
          confidence?: number
          created_at?: string
          dimension?: string
          id?: string
          knowledge_pack?: string
          knowledge_pack_version?: string
          maturity_level?: string
          maximum_score?: number
          overall_score?: number
          percentage?: number
          score_code?: string
          score_expression?: string
          session_id?: string
          severity?: string
          supporting_pattern_codes?: string[]
          supporting_pattern_ids?: string[]
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_scores_session_id_fkey"
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
      audit_events: {
        Row: {
          archived_at: string | null
          assessment_session_id: string | null
          correlation_id: string
          created_at: string
          duration_ms: number | null
          engine: string
          entity_id: string | null
          entity_type: string
          event_type: string
          execution_id: string
          expires_at: string | null
          id: string
          knowledge_pack_id: string
          knowledge_pack_version: string
          metadata: Json
          organisation_id: string
          payload: Json
          severity: string
          timestamp: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          assessment_session_id?: string | null
          correlation_id?: string
          created_at?: string
          duration_ms?: number | null
          engine?: string
          entity_id?: string | null
          entity_type?: string
          event_type: string
          execution_id?: string
          expires_at?: string | null
          id?: string
          knowledge_pack_id?: string
          knowledge_pack_version?: string
          metadata?: Json
          organisation_id?: string
          payload?: Json
          severity?: string
          timestamp?: string
          user_id?: string
        }
        Update: {
          archived_at?: string | null
          assessment_session_id?: string | null
          correlation_id?: string
          created_at?: string
          duration_ms?: number | null
          engine?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          execution_id?: string
          expires_at?: string | null
          id?: string
          knowledge_pack_id?: string
          knowledge_pack_version?: string
          metadata?: Json
          organisation_id?: string
          payload?: Json
          severity?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_explainability_edges: {
        Row: {
          assessment_session_id: string
          confidence: number
          created_at: string
          id: string
          metadata: Json
          relationship_type: string
          source_id: string
          source_label: string
          source_type: string
          target_id: string
          target_label: string
          target_type: string
        }
        Insert: {
          assessment_session_id: string
          confidence?: number
          created_at?: string
          id?: string
          metadata?: Json
          relationship_type?: string
          source_id: string
          source_label?: string
          source_type: string
          target_id: string
          target_label?: string
          target_type: string
        }
        Update: {
          assessment_session_id?: string
          confidence?: number
          created_at?: string
          id?: string
          metadata?: Json
          relationship_type?: string
          source_id?: string
          source_label?: string
          source_type?: string
          target_id?: string
          target_label?: string
          target_type?: string
        }
        Relationships: []
      }
      audit_retention_policies: {
        Row: {
          created_at: string
          description: string
          enabled: boolean
          id: string
          last_applied_at: string | null
          mode: string
          name: string
          retain_days: number | null
          scope: string
          scope_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          last_applied_at?: string | null
          mode?: string
          name: string
          retain_days?: number | null
          scope?: string
          scope_value?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          last_applied_at?: string | null
          mode?: string
          name?: string
          retain_days?: number | null
          scope?: string
          scope_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      runtime_execution_stages: {
        Row: {
          assessment_session_id: string
          attempt: number
          completed_at: string | null
          created_at: string
          depends_on: string[]
          duration_ms: number
          engine: string
          error_message: string | null
          execution_id: string
          failure_class: string | null
          id: string
          max_attempts: number
          retry_history: Json
          sequence: number
          stage_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assessment_session_id: string
          attempt?: number
          completed_at?: string | null
          created_at?: string
          depends_on?: string[]
          duration_ms?: number
          engine: string
          error_message?: string | null
          execution_id: string
          failure_class?: string | null
          id?: string
          max_attempts?: number
          retry_history?: Json
          sequence: number
          stage_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assessment_session_id?: string
          attempt?: number
          completed_at?: string | null
          created_at?: string
          depends_on?: string[]
          duration_ms?: number
          engine?: string
          error_message?: string | null
          execution_id?: string
          failure_class?: string | null
          id?: string
          max_attempts?: number
          retry_history?: Json
          sequence?: number
          stage_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "runtime_execution_stages_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "runtime_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      runtime_executions: {
        Row: {
          assessment_session_id: string
          cancel_requested: boolean
          completed_at: string | null
          correlation_id: string
          created_at: string
          current_stage: string | null
          duration_ms: number
          error_message: string | null
          execution_mode: string
          failure_class: string | null
          heartbeat_at: string | null
          id: string
          knowledge_pack_id: string
          knowledge_pack_version: string
          metadata: Json
          organisation_name: string
          owner_key: string
          pipeline_id: string
          pipeline_version: string
          progress: number
          retry_count: number
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assessment_session_id: string
          cancel_requested?: boolean
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          current_stage?: string | null
          duration_ms?: number
          error_message?: string | null
          execution_mode?: string
          failure_class?: string | null
          heartbeat_at?: string | null
          id?: string
          knowledge_pack_id?: string
          knowledge_pack_version?: string
          metadata?: Json
          organisation_name?: string
          owner_key: string
          pipeline_id?: string
          pipeline_version?: string
          progress?: number
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assessment_session_id?: string
          cancel_requested?: boolean
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          current_stage?: string | null
          duration_ms?: number
          error_message?: string | null
          execution_mode?: string
          failure_class?: string | null
          heartbeat_at?: string | null
          id?: string
          knowledge_pack_id?: string
          knowledge_pack_version?: string
          metadata?: Json
          organisation_name?: string
          owner_key?: string
          pipeline_id?: string
          pipeline_version?: string
          progress?: number
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
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

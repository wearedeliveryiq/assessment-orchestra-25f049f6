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
      analysis_recommendation_acceptances: {
        Row: {
          accepted_at: string
          accepted_by_user_id: string
          analysis_run_id: string
          organisation_id: string
          recommendation_id: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string
          accepted_by_user_id: string
          analysis_run_id: string
          organisation_id: string
          recommendation_id: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string
          accepted_by_user_id?: string
          analysis_run_id?: string
          organisation_id?: string
          recommendation_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_recommendation_acceptances_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_recommendation_acceptances_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_recommendation_acceptances_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_analysis_eligibility_decisions: {
        Row: {
          analysis_run_id: string | null
          assessment_manifest_digest: string
          assessment_revision: number
          assessment_session_id: string
          assessment_type: string | null
          configuration_set_id: string
          configured_manifest_digest: string
          correlation_id: string
          evaluated_at: string
          evaluator_version: string
          handoff_id: string
          id: string
          knowledge_pack_id: string | null
          knowledge_pack_version: string | null
          organisation_id: string
          policy_id: string
          policy_version: string
          primary_reason_code: string | null
          question_set_id: string | null
          question_set_version: string | null
          secondary_reason_codes: string[]
          status: Database["public"]["Enums"]["analysis_eligibility_status"]
          workspace_id: string
        }
        Insert: {
          analysis_run_id?: string | null
          assessment_manifest_digest: string
          assessment_revision: number
          assessment_session_id: string
          assessment_type?: string | null
          configuration_set_id: string
          configured_manifest_digest: string
          correlation_id: string
          evaluated_at?: string
          evaluator_version: string
          handoff_id: string
          id?: string
          knowledge_pack_id?: string | null
          knowledge_pack_version?: string | null
          organisation_id: string
          policy_id: string
          policy_version: string
          primary_reason_code?: string | null
          question_set_id?: string | null
          question_set_version?: string | null
          secondary_reason_codes?: string[]
          status: Database["public"]["Enums"]["analysis_eligibility_status"]
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string | null
          assessment_manifest_digest?: string
          assessment_revision?: number
          assessment_session_id?: string
          assessment_type?: string | null
          configuration_set_id?: string
          configured_manifest_digest?: string
          correlation_id?: string
          evaluated_at?: string
          evaluator_version?: string
          handoff_id?: string
          id?: string
          knowledge_pack_id?: string | null
          knowledge_pack_version?: string | null
          organisation_id?: string
          policy_id?: string
          policy_version?: string
          primary_reason_code?: string | null
          question_set_id?: string | null
          question_set_version?: string | null
          secondary_reason_codes?: string[]
          status?: Database["public"]["Enums"]["analysis_eligibility_status"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_analysis_eligibility_deci_assessment_session_id_fkey"
            columns: ["assessment_session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_analysis_eligibility_decisions_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_analysis_eligibility_decisions_handoff_id_fkey"
            columns: ["handoff_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_handoffs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_analysis_eligibility_decisions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_analysis_eligibility_decisions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_analysis_events: {
        Row: {
          analysis_run_id: string
          correlation_id: string
          event_type: string
          id: number
          occurred_at: string
          organisation_id: string
          payload: Json
          sequence: number
          severity: string
          workspace_id: string
        }
        Insert: {
          analysis_run_id: string
          correlation_id: string
          event_type: string
          id?: never
          occurred_at?: string
          organisation_id: string
          payload?: Json
          sequence?: number
          severity: string
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string
          correlation_id?: string
          event_type?: string
          id?: never
          occurred_at?: string
          organisation_id?: string
          payload?: Json
          sequence?: number
          severity?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_analysis_events_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_analysis_events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_analysis_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_analysis_handoff_events: {
        Row: {
          assessment_session_id: string
          correlation_id: string
          created_at: string
          event_type: string
          handoff_id: string
          id: number
          organisation_id: string
          payload: Json
          safe_error_code: string | null
          workspace_id: string
        }
        Insert: {
          assessment_session_id: string
          correlation_id: string
          created_at?: string
          event_type: string
          handoff_id: string
          id?: never
          organisation_id: string
          payload?: Json
          safe_error_code?: string | null
          workspace_id: string
        }
        Update: {
          assessment_session_id?: string
          correlation_id?: string
          created_at?: string
          event_type?: string
          handoff_id?: string
          id?: never
          organisation_id?: string
          payload?: Json
          safe_error_code?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_analysis_handoff_events_assessment_session_id_fkey"
            columns: ["assessment_session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_analysis_handoff_events_handoff_id_fkey"
            columns: ["handoff_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_handoffs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_analysis_handoff_events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_analysis_handoff_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_analysis_handoffs: {
        Row: {
          analysis_run_id: string | null
          assessment_revision: number
          assessment_session_id: string
          attempt: number
          claimed_at: string | null
          configuration_set_id: string
          correlation_id: string
          created_at: string
          delivered_at: string | null
          eligibility_decision_id: string | null
          id: string
          last_error_code: string | null
          next_attempt_at: string
          organisation_id: string
          requested_mode: Database["public"]["Enums"]["analysis_requested_mode"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["analysis_handoff_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          analysis_run_id?: string | null
          assessment_revision: number
          assessment_session_id: string
          attempt?: number
          claimed_at?: string | null
          configuration_set_id: string
          correlation_id?: string
          created_at?: string
          delivered_at?: string | null
          eligibility_decision_id?: string | null
          id?: string
          last_error_code?: string | null
          next_attempt_at?: string
          organisation_id: string
          requested_mode?: Database["public"]["Enums"]["analysis_requested_mode"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["analysis_handoff_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string | null
          assessment_revision?: number
          assessment_session_id?: string
          attempt?: number
          claimed_at?: string | null
          configuration_set_id?: string
          correlation_id?: string
          created_at?: string
          delivered_at?: string | null
          eligibility_decision_id?: string | null
          id?: string
          last_error_code?: string | null
          next_attempt_at?: string
          organisation_id?: string
          requested_mode?: Database["public"]["Enums"]["analysis_requested_mode"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["analysis_handoff_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_analysis_handoffs_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_analysis_handoffs_assessment_session_id_fkey"
            columns: ["assessment_session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_analysis_handoffs_eligibility_decision_id_fkey"
            columns: ["eligibility_decision_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_eligibility_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_analysis_handoffs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_analysis_handoffs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_analysis_runs: {
        Row: {
          assessment_revision: number
          assessment_session_id: string
          attempt: number
          canonical_input: Json
          completed_at: string | null
          configuration_digest: string
          configuration_set_id: string
          configuration_snapshot: Json
          configuration_version: string
          consent_basis: string
          correlation_id: string
          created_at: string
          created_by_user_id: string
          engine_version: string
          error_code: string | null
          failed_at: string | null
          id: string
          idempotency_key: string
          initiator: Json
          input_hash: string
          knowledge_pack_id: string
          knowledge_pack_version: string
          lease_expires_at: string | null
          lease_owner: string | null
          organisation_id: string
          question_set_version: string
          queued_at: string
          requested_mode: Database["public"]["Enums"]["analysis_requested_mode"]
          response_count: number
          retryable: boolean | null
          runtime_execution_id: string
          safe_error_message: string | null
          schema_version: string
          started_at: string | null
          status: Database["public"]["Enums"]["analysis_run_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assessment_revision: number
          assessment_session_id: string
          attempt?: number
          canonical_input: Json
          completed_at?: string | null
          configuration_digest: string
          configuration_set_id: string
          configuration_snapshot: Json
          configuration_version: string
          consent_basis: string
          correlation_id: string
          created_at?: string
          created_by_user_id: string
          engine_version: string
          error_code?: string | null
          failed_at?: string | null
          id?: string
          idempotency_key: string
          initiator: Json
          input_hash: string
          knowledge_pack_id: string
          knowledge_pack_version: string
          lease_expires_at?: string | null
          lease_owner?: string | null
          organisation_id: string
          question_set_version: string
          queued_at?: string
          requested_mode: Database["public"]["Enums"]["analysis_requested_mode"]
          response_count: number
          retryable?: boolean | null
          runtime_execution_id: string
          safe_error_message?: string | null
          schema_version: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["analysis_run_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assessment_revision?: number
          assessment_session_id?: string
          attempt?: number
          canonical_input?: Json
          completed_at?: string | null
          configuration_digest?: string
          configuration_set_id?: string
          configuration_snapshot?: Json
          configuration_version?: string
          consent_basis?: string
          correlation_id?: string
          created_at?: string
          created_by_user_id?: string
          engine_version?: string
          error_code?: string | null
          failed_at?: string | null
          id?: string
          idempotency_key?: string
          initiator?: Json
          input_hash?: string
          knowledge_pack_id?: string
          knowledge_pack_version?: string
          lease_expires_at?: string | null
          lease_owner?: string | null
          organisation_id?: string
          question_set_version?: string
          queued_at?: string
          requested_mode?: Database["public"]["Enums"]["analysis_requested_mode"]
          response_count?: number
          retryable?: boolean | null
          runtime_execution_id?: string
          safe_error_message?: string | null
          schema_version?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["analysis_run_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_analysis_runs_assessment_session_id_fkey"
            columns: ["assessment_session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_analysis_runs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_analysis_runs_runtime_execution_id_fkey"
            columns: ["runtime_execution_id"]
            isOneToOne: false
            referencedRelation: "runtime_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_analysis_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_lifecycle_sessions: {
        Row: {
          archived_at: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          knowledge_pack_id: string
          knowledge_pack_version: string
          last_activity: string
          metadata: Json
          name: string
          organisation_id: string
          owner_id: string
          parent_session_id: string | null
          paused_at: string | null
          priority: string
          progress: number
          root_session_id: string | null
          runtime_session_id: string | null
          started_at: string | null
          status: string
          tags: string[]
          updated_at: string
          version: number
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          knowledge_pack_id: string
          knowledge_pack_version?: string
          last_activity?: string
          metadata?: Json
          name: string
          organisation_id: string
          owner_id: string
          parent_session_id?: string | null
          paused_at?: string | null
          priority?: string
          progress?: number
          root_session_id?: string | null
          runtime_session_id?: string | null
          started_at?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          version?: number
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          knowledge_pack_id?: string
          knowledge_pack_version?: string
          last_activity?: string
          metadata?: Json
          name?: string
          organisation_id?: string
          owner_id?: string
          parent_session_id?: string | null
          paused_at?: string | null
          priority?: string
          progress?: number
          root_session_id?: string | null
          runtime_session_id?: string | null
          started_at?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_lifecycle_sessions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_lifecycle_sessions_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "assessment_lifecycle_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_lifecycle_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
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
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          evidence_at: string | null
          evidence_status: string
          exclusion_reason: string | null
          id: string
          is_deleted: boolean
          notes: string | null
          question_id: string
          respondent_group_id: string | null
          score: number | null
          section_id: string
          session_id: string
          updated_at: string
          updated_by: string | null
          value: Json
          version: number
        }
        Insert: {
          answered_at?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          evidence_at?: string | null
          evidence_status?: string
          exclusion_reason?: string | null
          id?: string
          is_deleted?: boolean
          notes?: string | null
          question_id: string
          respondent_group_id?: string | null
          score?: number | null
          section_id: string
          session_id: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
          version?: number
        }
        Update: {
          answered_at?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          evidence_at?: string | null
          evidence_status?: string
          exclusion_reason?: string | null
          id?: string
          is_deleted?: boolean
          notes?: string | null
          question_id?: string
          respondent_group_id?: string | null
          score?: number | null
          section_id?: string
          session_id?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
          version?: number
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
      assessment_session_history: {
        Row: {
          actor_email: string
          actor_id: string | null
          change_type: string
          created_at: string
          field: string
          id: string
          metadata: Json
          next_value: Json | null
          previous_value: Json | null
          session_id: string
          version: number
        }
        Insert: {
          actor_email?: string
          actor_id?: string | null
          change_type: string
          created_at?: string
          field?: string
          id?: string
          metadata?: Json
          next_value?: Json | null
          previous_value?: Json | null
          session_id: string
          version?: number
        }
        Update: {
          actor_email?: string
          actor_id?: string | null
          change_type?: string
          created_at?: string
          field?: string
          id?: string
          metadata?: Json
          next_value?: Json | null
          previous_value?: Json | null
          session_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_session_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_lifecycle_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_session_participants: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_lifecycle_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_session_timeline: {
        Row: {
          actor_email: string
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          session_id: string
          summary: string
        }
        Insert: {
          actor_email?: string
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          session_id: string
          summary: string
        }
        Update: {
          actor_email?: string
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          session_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_session_timeline_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_lifecycle_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_sessions: {
        Row: {
          archived_at: string | null
          assessment_revision: number
          assessment_type: string
          completed_at: string | null
          consent_basis: string
          contact_name: string | null
          created_at: string
          created_by: string | null
          created_by_user_id: string | null
          current_section: string | null
          deleted_at: string | null
          deleted_by: string | null
          failure_reason: string | null
          id: string
          is_deleted: boolean
          metadata: Json
          organisation_id: string | null
          organisation_name: string
          owner_key: string
          progress: number
          results: Json | null
          status: Database["public"]["Enums"]["assessment_status"]
          submitted_at: string | null
          updated_at: string
          updated_by: string | null
          version: number
          workspace_id: string | null
        }
        Insert: {
          archived_at?: string | null
          assessment_revision?: number
          assessment_type?: string
          completed_at?: string | null
          consent_basis?: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          created_by_user_id?: string | null
          current_section?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          failure_reason?: string | null
          id?: string
          is_deleted?: boolean
          metadata?: Json
          organisation_id?: string | null
          organisation_name?: string
          owner_key: string
          progress?: number
          results?: Json | null
          status?: Database["public"]["Enums"]["assessment_status"]
          submitted_at?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          workspace_id?: string | null
        }
        Update: {
          archived_at?: string | null
          assessment_revision?: number
          assessment_type?: string
          completed_at?: string | null
          consent_basis?: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          created_by_user_id?: string | null
          current_section?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          failure_reason?: string | null
          id?: string
          is_deleted?: boolean
          metadata?: Json
          organisation_id?: string | null
          organisation_name?: string
          owner_key?: string
          progress?: number
          results?: Json | null
          status?: Database["public"]["Enums"]["assessment_status"]
          submitted_at?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_sessions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      delivery_dna_public_access_events: {
        Row: {
          id: number
          ip_hash: string
          occurred_at: string
          public_result_id: string
        }
        Insert: {
          id?: never
          ip_hash: string
          occurred_at?: string
          public_result_id: string
        }
        Update: {
          id?: never
          ip_hash?: string
          occurred_at?: string
          public_result_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_dna_public_access_events_public_result_id_fkey"
            columns: ["public_result_id"]
            isOneToOne: false
            referencedRelation: "delivery_dna_public_results"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_dna_public_results: {
        Row: {
          analysis_run_id: string
          audience: string
          consented_by_user_id: string
          created_at: string
          disclosure_version: string
          expires_at: string
          id: string
          organisation_id: string
          public_projection: Json
          revoked_at: string | null
          token_hash: string
          workspace_id: string
        }
        Insert: {
          analysis_run_id: string
          audience: string
          consented_by_user_id: string
          created_at?: string
          disclosure_version: string
          expires_at: string
          id?: string
          organisation_id: string
          public_projection: Json
          revoked_at?: string | null
          token_hash: string
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string
          audience?: string
          consented_by_user_id?: string
          created_at?: string
          disclosure_version?: string
          expires_at?: string
          id?: string
          organisation_id?: string
          public_projection?: Json
          revoked_at?: string | null
          token_hash?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_dna_public_results_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_dna_public_results_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_dna_public_results_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_intelligence_results: {
        Row: {
          analysis_run_id: string
          canonical_result: Json
          configuration_digest: string
          configuration_set_id: string
          created_at: string
          engine_version: string
          id: string
          organisation_id: string
          published_at: string
          result_hash: string
          schema_version: string
          workspace_id: string
        }
        Insert: {
          analysis_run_id: string
          canonical_result: Json
          configuration_digest: string
          configuration_set_id: string
          created_at?: string
          engine_version: string
          id?: string
          organisation_id: string
          published_at?: string
          result_hash: string
          schema_version: string
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string
          canonical_result?: Json
          configuration_digest?: string
          configuration_set_id?: string
          created_at?: string
          engine_version?: string
          id?: string
          organisation_id?: string
          published_at?: string
          result_hash?: string
          schema_version?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_intelligence_results_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: true
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_intelligence_results_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_intelligence_results_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_intelligence_trace_edges: {
        Row: {
          analysis_run_id: string
          created_at: string
          edge_type: string
          id: string
          organisation_id: string
          payload: Json
          source_node_id: string
          target_node_id: string
          workspace_id: string
        }
        Insert: {
          analysis_run_id: string
          created_at?: string
          edge_type: string
          id?: string
          organisation_id: string
          payload?: Json
          source_node_id: string
          target_node_id: string
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string
          created_at?: string
          edge_type?: string
          id?: string
          organisation_id?: string
          payload?: Json
          source_node_id?: string
          target_node_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_intelligence_trace_edges_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_intelligence_trace_edges_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_intelligence_trace_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "delivery_intelligence_trace_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_intelligence_trace_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "delivery_intelligence_trace_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_intelligence_trace_edges_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_intelligence_trace_nodes: {
        Row: {
          analysis_run_id: string
          configuration_set_id: string
          content_hash: string
          created_at: string
          domain_id: string
          domain_version: string
          id: string
          node_type: string
          organisation_id: string
          payload: Json
          visible: boolean
          workspace_id: string
        }
        Insert: {
          analysis_run_id: string
          configuration_set_id: string
          content_hash: string
          created_at?: string
          domain_id: string
          domain_version: string
          id?: string
          node_type: string
          organisation_id: string
          payload: Json
          visible?: boolean
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string
          configuration_set_id?: string
          content_hash?: string
          created_at?: string
          domain_id?: string
          domain_version?: string
          id?: string
          node_type?: string
          organisation_id?: string
          payload?: Json
          visible?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_intelligence_trace_nodes_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_intelligence_trace_nodes_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_intelligence_trace_nodes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_product_availability: {
        Row: {
          product_id: string
          product_type: string
          status: string
          updated_at: string
        }
        Insert: {
          product_id: string
          product_type: string
          status: string
          updated_at?: string
        }
        Update: {
          product_id?: string
          product_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      identity_audit_events: {
        Row: {
          created_at: string
          email: string
          event_type: string
          id: string
          ip_address: string
          metadata: Json
          organisation_id: string | null
          outcome: string
          severity: string
          user_agent: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string
          event_type: string
          id?: string
          ip_address?: string
          metadata?: Json
          organisation_id?: string | null
          outcome?: string
          severity?: string
          user_agent?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          event_type?: string
          id?: string
          ip_address?: string
          metadata?: Json
          organisation_id?: string | null
          outcome?: string
          severity?: string
          user_agent?: string
          user_id?: string | null
        }
        Relationships: []
      }
      identity_profiles: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          display_name: string
          email: string
          email_verified: boolean
          failed_login_count: number
          first_name: string
          id: string
          is_deleted: boolean
          last_login_at: string | null
          last_name: string
          locked_until: string | null
          mfa_enabled: boolean
          password_changed_at: string
          preferred_language: string
          profile_image: string | null
          status: Database["public"]["Enums"]["identity_user_status"]
          timezone: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          display_name?: string
          email: string
          email_verified?: boolean
          failed_login_count?: number
          first_name?: string
          id: string
          is_deleted?: boolean
          last_login_at?: string | null
          last_name?: string
          locked_until?: string | null
          mfa_enabled?: boolean
          password_changed_at?: string
          preferred_language?: string
          profile_image?: string | null
          status?: Database["public"]["Enums"]["identity_user_status"]
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          display_name?: string
          email?: string
          email_verified?: boolean
          failed_login_count?: number
          first_name?: string
          id?: string
          is_deleted?: boolean
          last_login_at?: string | null
          last_name?: string
          locked_until?: string | null
          mfa_enabled?: boolean
          password_changed_at?: string
          preferred_language?: string
          profile_image?: string | null
          status?: Database["public"]["Enums"]["identity_user_status"]
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      identity_sessions: {
        Row: {
          browser: string
          created_at: string
          device: string
          expires_at: string
          id: string
          ip_address: string
          last_activity: string
          remember_me: boolean
          revoked: boolean
          revoked_at: string | null
          session_key: string
          user_id: string
        }
        Insert: {
          browser?: string
          created_at?: string
          device?: string
          expires_at?: string
          id?: string
          ip_address?: string
          last_activity?: string
          remember_me?: boolean
          revoked?: boolean
          revoked_at?: string | null
          session_key: string
          user_id: string
        }
        Update: {
          browser?: string
          created_at?: string
          device?: string
          expires_at?: string
          id?: string
          ip_address?: string
          last_activity?: string
          remember_me?: boolean
          revoked?: boolean
          revoked_at?: string | null
          session_key?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_packs: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          definition: Json
          deleted_at: string | null
          deleted_by: string | null
          description: string
          id: string
          is_deleted: boolean
          metadata: Json
          name: string
          organisation_id: string | null
          pack_id: string
          pack_version: string
          published_at: string | null
          source: string
          status: string
          tags: string[]
          updated_at: string
          updated_by: string | null
          version: number
          workspace_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          definition?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          id?: string
          is_deleted?: boolean
          metadata?: Json
          name?: string
          organisation_id?: string | null
          pack_id: string
          pack_version: string
          published_at?: string | null
          source?: string
          status?: string
          tags?: string[]
          updated_at?: string
          updated_by?: string | null
          version?: number
          workspace_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          definition?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          id?: string
          is_deleted?: boolean
          metadata?: Json
          name?: string
          organisation_id?: string | null
          pack_id?: string
          pack_version?: string
          published_at?: string | null
          source?: string
          status?: string
          tags?: string[]
          updated_at?: string
          updated_by?: string | null
          version?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_packs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_packs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string
          reason: string
          successful: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string
          reason?: string
          successful?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string
          reason?: string
          successful?: boolean
        }
        Relationships: []
      }
      organisation_audit_events: {
        Row: {
          actor_email: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          ip_address: string
          metadata: Json
          organisation_id: string | null
          summary: string
          workspace_id: string | null
        }
        Insert: {
          actor_email?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          ip_address?: string
          metadata?: Json
          organisation_id?: string | null
          summary?: string
          workspace_id?: string | null
        }
        Update: {
          actor_email?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          ip_address?: string
          metadata?: Json
          organisation_id?: string | null
          summary?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organisation_audit_events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_audit_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          is_deleted: boolean
          message: string
          organisation_id: string
          role: Database["public"]["Enums"]["platform_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          token_hash: string
          updated_at: string
          updated_by: string | null
          version: number
          workspace_id: string | null
          workspace_role: Database["public"]["Enums"]["platform_role"] | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          is_deleted?: boolean
          message?: string
          organisation_id: string
          role?: Database["public"]["Enums"]["platform_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token_hash: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          workspace_id?: string | null
          workspace_role?: Database["public"]["Enums"]["platform_role"] | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          is_deleted?: boolean
          message?: string
          organisation_id?: string
          role?: Database["public"]["Enums"]["platform_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token_hash?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          workspace_id?: string | null
          workspace_role?: Database["public"]["Enums"]["platform_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "organisation_invitations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_memberships: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          invited_by: string | null
          is_deleted: boolean
          joined_at: string
          organisation_id: string
          role: Database["public"]["Enums"]["platform_role"]
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          updated_by: string | null
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          invited_by?: string | null
          is_deleted?: boolean
          joined_at?: string
          organisation_id: string
          role?: Database["public"]["Enums"]["platform_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          updated_by?: string | null
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          invited_by?: string | null
          is_deleted?: boolean
          joined_at?: string
          organisation_id?: string
          role?: Database["public"]["Enums"]["platform_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "organisation_memberships_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_product_entitlements: {
        Row: {
          entitled: boolean
          organisation_id: string
          product_id: string
          product_type: string
          updated_at: string
        }
        Insert: {
          entitled?: boolean
          organisation_id: string
          product_id: string
          product_type: string
          updated_at?: string
        }
        Update: {
          entitled?: boolean
          organisation_id?: string
          product_id?: string
          product_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_product_entitlements_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_settings: {
        Row: {
          branding: Json
          created_at: string
          general: Json
          notifications: Json
          organisation_id: string
          security: Json
          updated_at: string
        }
        Insert: {
          branding?: Json
          created_at?: string
          general?: Json
          notifications?: Json
          organisation_id: string
          security?: Json
          updated_at?: string
        }
        Update: {
          branding?: Json
          created_at?: string
          general?: Json
          notifications?: Json
          organisation_id?: string
          security?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_settings_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          country: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string
          id: string
          industry: string
          is_deleted: boolean
          logo: string | null
          name: string
          organisation_size: string
          slug: string
          status: Database["public"]["Enums"]["organisation_status"]
          subscription_plan: string
          timezone: string
          updated_at: string
          updated_by: string | null
          version: number
          website: string
        }
        Insert: {
          country?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          id?: string
          industry?: string
          is_deleted?: boolean
          logo?: string | null
          name: string
          organisation_size?: string
          slug: string
          status?: Database["public"]["Enums"]["organisation_status"]
          subscription_plan?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          website?: string
        }
        Update: {
          country?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          id?: string
          industry?: string
          is_deleted?: boolean
          logo?: string | null
          name?: string
          organisation_size?: string
          slug?: string
          status?: Database["public"]["Enums"]["organisation_status"]
          subscription_plan?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          website?: string
        }
        Relationships: []
      }
      password_history: {
        Row: {
          created_at: string
          id: string
          password_fingerprint: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_fingerprint: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          password_fingerprint?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_branding_profiles: {
        Row: {
          body_font: string
          confidentiality_statement: string
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at: string
          footer_text: string
          header_text: string
          heading_font: string
          ink_colour: string
          logo_text: string
          logo_url: string | null
          metadata: Json
          muted_colour: string
          organisation_id: string
          primary_colour: string
          product_name: string
          secondary_colour: string
          surface_colour: string
          updated_at: string
          updated_by: string | null
          website: string
        }
        Insert: {
          body_font?: string
          confidentiality_statement?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          footer_text?: string
          header_text?: string
          heading_font?: string
          ink_colour?: string
          logo_text?: string
          logo_url?: string | null
          metadata?: Json
          muted_colour?: string
          organisation_id: string
          primary_colour?: string
          product_name?: string
          secondary_colour?: string
          surface_colour?: string
          updated_at?: string
          updated_by?: string | null
          website?: string
        }
        Update: {
          body_font?: string
          confidentiality_statement?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          footer_text?: string
          header_text?: string
          heading_font?: string
          ink_colour?: string
          logo_text?: string
          logo_url?: string | null
          metadata?: Json
          muted_colour?: string
          organisation_id?: string
          primary_colour?: string
          product_name?: string
          secondary_colour?: string
          surface_colour?: string
          updated_at?: string
          updated_by?: string | null
          website?: string
        }
        Relationships: []
      }
      platform_notifications: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          event_type: string
          id: string
          is_deleted: boolean
          metadata: Json
          module: string
          organisation_id: string | null
          read_at: string | null
          severity: string
          title: string
          updated_at: string
          updated_by: string | null
          user_id: string
          version: number
          workspace_id: string | null
        }
        Insert: {
          body?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          event_type: string
          id?: string
          is_deleted?: boolean
          metadata?: Json
          module?: string
          organisation_id?: string | null
          read_at?: string | null
          severity?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
          version?: number
          workspace_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          event_type?: string
          id?: string
          is_deleted?: boolean
          metadata?: Json
          module?: string
          organisation_id?: string | null
          read_at?: string | null
          severity?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          version?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_notifications_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_report_events: {
        Row: {
          actor_email: string
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          lineage_id: string | null
          metadata: Json
          organisation_id: string
          report_id: string | null
          severity: string
          summary: string
          workspace_id: string | null
        }
        Insert: {
          actor_email?: string
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          lineage_id?: string | null
          metadata?: Json
          organisation_id: string
          report_id?: string | null
          severity?: string
          summary?: string
          workspace_id?: string | null
        }
        Update: {
          actor_email?: string
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          lineage_id?: string | null
          metadata?: Json
          organisation_id?: string
          report_id?: string | null
          severity?: string
          summary?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_report_events_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "platform_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_reports: {
        Row: {
          assessment_session_id: string | null
          attempts: number
          branding: Json
          checksum: string
          content_type: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string
          distribution: Json
          download_count: number
          duration_ms: number
          error: string | null
          error_code: string | null
          expires_at: string | null
          file_size: number
          filename: string
          format: string
          generated_at: string | null
          generated_by: string | null
          generated_by_email: string
          id: string
          is_deleted: boolean
          last_downloaded_at: string | null
          lineage_id: string
          max_attempts: number
          metadata: Json
          organisation_id: string
          parameters: Json
          queued_at: string
          report_type: string
          schedule: Json
          source_id: string | null
          source_module: string
          started_at: string | null
          status: string
          storage_path: string | null
          template_id: string
          template_version: string
          title: string
          updated_at: string
          updated_by: string | null
          version: number
          workspace_id: string | null
        }
        Insert: {
          assessment_session_id?: string | null
          attempts?: number
          branding?: Json
          checksum?: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          distribution?: Json
          download_count?: number
          duration_ms?: number
          error?: string | null
          error_code?: string | null
          expires_at?: string | null
          file_size?: number
          filename?: string
          format: string
          generated_at?: string | null
          generated_by?: string | null
          generated_by_email?: string
          id?: string
          is_deleted?: boolean
          last_downloaded_at?: string | null
          lineage_id: string
          max_attempts?: number
          metadata?: Json
          organisation_id: string
          parameters?: Json
          queued_at?: string
          report_type: string
          schedule?: Json
          source_id?: string | null
          source_module?: string
          started_at?: string | null
          status?: string
          storage_path?: string | null
          template_id: string
          template_version?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          workspace_id?: string | null
        }
        Update: {
          assessment_session_id?: string | null
          attempts?: number
          branding?: Json
          checksum?: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          distribution?: Json
          download_count?: number
          duration_ms?: number
          error?: string | null
          error_code?: string | null
          expires_at?: string | null
          file_size?: number
          filename?: string
          format?: string
          generated_at?: string | null
          generated_by?: string | null
          generated_by_email?: string
          id?: string
          is_deleted?: boolean
          last_downloaded_at?: string | null
          lineage_id?: string
          max_attempts?: number
          metadata?: Json
          organisation_id?: string
          parameters?: Json
          queued_at?: string
          report_type?: string
          schedule?: Json
          source_id?: string | null
          source_module?: string
          started_at?: string | null
          status?: string
          storage_path?: string | null
          template_id?: string
          template_version?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          workspace_id?: string | null
        }
        Relationships: []
      }
      platform_retention_policies: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string
          enabled: boolean
          entity: string
          id: string
          is_deleted: boolean
          last_applied_at: string | null
          mode: string
          organisation_id: string | null
          retain_days: number | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          enabled?: boolean
          entity: string
          id?: string
          is_deleted?: boolean
          last_applied_at?: string | null
          mode?: string
          organisation_id?: string | null
          retain_days?: number | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          enabled?: boolean
          entity?: string
          id?: string
          is_deleted?: boolean
          last_applied_at?: string | null
          mode?: string
          organisation_id?: string | null
          retain_days?: number | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "platform_retention_policies_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string
          id: string
          is_deleted: boolean
          key: string
          organisation_id: string | null
          scope: string
          scope_id: string | null
          updated_at: string
          updated_by: string | null
          value: Json
          version: number
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          id?: string
          is_deleted?: boolean
          key: string
          organisation_id?: string | null
          scope?: string
          scope_id?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
          version?: number
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          id?: string
          is_deleted?: boolean
          key?: string
          organisation_id?: string | null
          scope?: string
          scope_id?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
          version?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_candidate_confidence_gates: {
        Row: {
          analysis_run_id: string
          candidate_evaluation_id: string
          catalogue_order: number
          caveat: string | null
          confidence_gate_id: string
          confidence_state: Database["public"]["Enums"]["recommendation_confidence_state"]
          created_at: string
          effort: string
          id: string
          limitation_codes: Json
          organisation_id: string
          post_gate_result: Database["public"]["Enums"]["recommendation_confidence_gate_result"]
          pre_gate_result: Database["public"]["Enums"]["recommendation_evaluation_result"]
          reason_code: string
          recommendation_definition_id: string
          recommendation_id: string
          recommendation_version: string
          semantic_hash: string
          source_trace_node_ids: Json
          workspace_id: string
        }
        Insert: {
          analysis_run_id: string
          candidate_evaluation_id: string
          catalogue_order: number
          caveat?: string | null
          confidence_gate_id: string
          confidence_state: Database["public"]["Enums"]["recommendation_confidence_state"]
          created_at?: string
          effort: string
          id?: string
          limitation_codes: Json
          organisation_id: string
          post_gate_result: Database["public"]["Enums"]["recommendation_confidence_gate_result"]
          pre_gate_result: Database["public"]["Enums"]["recommendation_evaluation_result"]
          reason_code: string
          recommendation_definition_id: string
          recommendation_id: string
          recommendation_version: string
          semantic_hash: string
          source_trace_node_ids: Json
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string
          candidate_evaluation_id?: string
          catalogue_order?: number
          caveat?: string | null
          confidence_gate_id?: string
          confidence_state?: Database["public"]["Enums"]["recommendation_confidence_state"]
          created_at?: string
          effort?: string
          id?: string
          limitation_codes?: Json
          organisation_id?: string
          post_gate_result?: Database["public"]["Enums"]["recommendation_confidence_gate_result"]
          pre_gate_result?: Database["public"]["Enums"]["recommendation_evaluation_result"]
          reason_code?: string
          recommendation_definition_id?: string
          recommendation_id?: string
          recommendation_version?: string
          semantic_hash?: string
          source_trace_node_ids?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_candidate_conf_recommendation_definition_id_fkey"
            columns: ["recommendation_definition_id"]
            isOneToOne: false
            referencedRelation: "recommendation_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_candidate_confidenc_candidate_evaluation_id_fkey"
            columns: ["candidate_evaluation_id"]
            isOneToOne: false
            referencedRelation: "recommendation_candidate_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_candidate_confidence_gat_confidence_gate_id_fkey"
            columns: ["confidence_gate_id"]
            isOneToOne: false
            referencedRelation: "recommendation_confidence_gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_candidate_confidence_gates_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_candidate_confidence_gates_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_candidate_confidence_gates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_candidate_evaluations: {
        Row: {
          analysis_run_id: string
          catalogue_order: number
          confidence_state: Database["public"]["Enums"]["recommendation_confidence_state"]
          created_at: string
          decisive_facts: Json
          evaluation_id: string
          exclusions: Json
          id: string
          matched_triggers: Json
          organisation_id: string
          recommendation_definition_id: string
          recommendation_id: string
          recommendation_version: string
          result: Database["public"]["Enums"]["recommendation_evaluation_result"]
          semantic_hash: string
          source_domain_ids: Json
          source_trace_node_ids: Json
          unmet_prerequisites: Json
          unmet_triggers: Json
          workspace_id: string
        }
        Insert: {
          analysis_run_id: string
          catalogue_order: number
          confidence_state: Database["public"]["Enums"]["recommendation_confidence_state"]
          created_at?: string
          decisive_facts: Json
          evaluation_id: string
          exclusions: Json
          id?: string
          matched_triggers: Json
          organisation_id: string
          recommendation_definition_id: string
          recommendation_id: string
          recommendation_version: string
          result: Database["public"]["Enums"]["recommendation_evaluation_result"]
          semantic_hash: string
          source_domain_ids: Json
          source_trace_node_ids: Json
          unmet_prerequisites: Json
          unmet_triggers: Json
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string
          catalogue_order?: number
          confidence_state?: Database["public"]["Enums"]["recommendation_confidence_state"]
          created_at?: string
          decisive_facts?: Json
          evaluation_id?: string
          exclusions?: Json
          id?: string
          matched_triggers?: Json
          organisation_id?: string
          recommendation_definition_id?: string
          recommendation_id?: string
          recommendation_version?: string
          result?: Database["public"]["Enums"]["recommendation_evaluation_result"]
          semantic_hash?: string
          source_domain_ids?: Json
          source_trace_node_ids?: Json
          unmet_prerequisites?: Json
          unmet_triggers?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_candidate_eval_recommendation_definition_id_fkey"
            columns: ["recommendation_definition_id"]
            isOneToOne: false
            referencedRelation: "recommendation_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_candidate_evaluations_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_candidate_evaluations_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "recommendation_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_candidate_evaluations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_candidate_evaluations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_catalogue_activations: {
        Row: {
          activated_at: string
          activated_by: string
          catalogue_version_id: string
          environment: string
          recommendation_definition_id: string
          recommendation_id: string
        }
        Insert: {
          activated_at?: string
          activated_by: string
          catalogue_version_id: string
          environment: string
          recommendation_definition_id: string
          recommendation_id: string
        }
        Update: {
          activated_at?: string
          activated_by?: string
          catalogue_version_id?: string
          environment?: string
          recommendation_definition_id?: string
          recommendation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_catalogue_acti_recommendation_definition_id_fkey"
            columns: ["recommendation_definition_id"]
            isOneToOne: false
            referencedRelation: "recommendation_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_catalogue_activations_catalogue_version_id_fkey"
            columns: ["catalogue_version_id"]
            isOneToOne: false
            referencedRelation: "recommendation_catalogue_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_catalogue_approvals: {
        Row: {
          approved_at: string
          approved_by: string
          catalogue_version_id: string
          id: string
        }
        Insert: {
          approved_at?: string
          approved_by: string
          catalogue_version_id: string
          id?: string
        }
        Update: {
          approved_at?: string
          approved_by?: string
          catalogue_version_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_catalogue_approvals_catalogue_version_id_fkey"
            columns: ["catalogue_version_id"]
            isOneToOne: false
            referencedRelation: "recommendation_catalogue_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_catalogue_lifecycle_events: {
        Row: {
          actor_id: string
          catalogue_version_id: string
          created_at: string
          event_type: string
          from_state:
            | Database["public"]["Enums"]["recommendation_catalogue_state"]
            | null
          id: number
          idempotency_key: string
          payload: Json
          to_state: Database["public"]["Enums"]["recommendation_catalogue_state"]
        }
        Insert: {
          actor_id: string
          catalogue_version_id: string
          created_at?: string
          event_type: string
          from_state?:
            | Database["public"]["Enums"]["recommendation_catalogue_state"]
            | null
          id?: never
          idempotency_key: string
          payload?: Json
          to_state: Database["public"]["Enums"]["recommendation_catalogue_state"]
        }
        Update: {
          actor_id?: string
          catalogue_version_id?: string
          created_at?: string
          event_type?: string
          from_state?:
            | Database["public"]["Enums"]["recommendation_catalogue_state"]
            | null
          id?: never
          idempotency_key?: string
          payload?: Json
          to_state?: Database["public"]["Enums"]["recommendation_catalogue_state"]
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_catalogue_lifecycle_ev_catalogue_version_id_fkey"
            columns: ["catalogue_version_id"]
            isOneToOne: false
            referencedRelation: "recommendation_catalogue_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_catalogue_versions: {
        Row: {
          authored_by: string
          catalogue_id: string
          content_digest: string
          created_at: string
          current_state: Database["public"]["Enums"]["recommendation_catalogue_state"]
          id: string
          idempotency_key: string
          snapshot: Json
          source_configuration_set_id: string
          updated_at: string
          version: string
        }
        Insert: {
          authored_by: string
          catalogue_id: string
          content_digest: string
          created_at?: string
          current_state?: Database["public"]["Enums"]["recommendation_catalogue_state"]
          id?: string
          idempotency_key: string
          snapshot: Json
          source_configuration_set_id: string
          updated_at?: string
          version: string
        }
        Update: {
          authored_by?: string
          catalogue_id?: string
          content_digest?: string
          created_at?: string
          current_state?: Database["public"]["Enums"]["recommendation_catalogue_state"]
          id?: string
          idempotency_key?: string
          snapshot?: Json
          source_configuration_set_id?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      recommendation_confidence_gate_trace_links: {
        Row: {
          analysis_run_id: string
          candidate_confidence_gate_id: string
          confidence_gate_id: string
          created_at: string
          link_kind: string
          organisation_id: string
          trace_node_id: string
          workspace_id: string
        }
        Insert: {
          analysis_run_id: string
          candidate_confidence_gate_id: string
          confidence_gate_id: string
          created_at?: string
          link_kind: string
          organisation_id: string
          trace_node_id: string
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string
          candidate_confidence_gate_id?: string
          confidence_gate_id?: string
          created_at?: string
          link_kind?: string
          organisation_id?: string
          trace_node_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_confidence_gat_candidate_confidence_gate_id_fkey"
            columns: ["candidate_confidence_gate_id"]
            isOneToOne: false
            referencedRelation: "recommendation_candidate_confidence_gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_confidence_gate_trace_li_confidence_gate_id_fkey"
            columns: ["confidence_gate_id"]
            isOneToOne: false
            referencedRelation: "recommendation_confidence_gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_confidence_gate_trace_links_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_confidence_gate_trace_links_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_confidence_gate_trace_links_trace_node_id_fkey"
            columns: ["trace_node_id"]
            isOneToOne: false
            referencedRelation: "delivery_intelligence_trace_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_confidence_gate_trace_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_confidence_gates: {
        Row: {
          analysis_run_id: string
          canonical_gate: Json
          canonical_input: Json
          catalogue_digest: string
          catalogue_id: string
          catalogue_version: string
          catalogue_version_id: string
          caveat: string | null
          confidence_index: number
          confidence_state: Database["public"]["Enums"]["recommendation_confidence_state"]
          confidence_trace_node_id: string
          confidence_version: string
          configuration_set_id: string
          created_at: string
          gate_engine_version: string
          id: string
          input_hash: string
          intelligence_result_id: string
          limitation_codes: Json
          organisation_id: string
          output_hash: string
          policy_version: string
          recommendation_evaluation_id: string
          workspace_id: string
        }
        Insert: {
          analysis_run_id: string
          canonical_gate: Json
          canonical_input: Json
          catalogue_digest: string
          catalogue_id: string
          catalogue_version: string
          catalogue_version_id: string
          caveat?: string | null
          confidence_index: number
          confidence_state: Database["public"]["Enums"]["recommendation_confidence_state"]
          confidence_trace_node_id: string
          confidence_version: string
          configuration_set_id: string
          created_at?: string
          gate_engine_version: string
          id?: string
          input_hash: string
          intelligence_result_id: string
          limitation_codes: Json
          organisation_id: string
          output_hash: string
          policy_version: string
          recommendation_evaluation_id: string
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string
          canonical_gate?: Json
          canonical_input?: Json
          catalogue_digest?: string
          catalogue_id?: string
          catalogue_version?: string
          catalogue_version_id?: string
          caveat?: string | null
          confidence_index?: number
          confidence_state?: Database["public"]["Enums"]["recommendation_confidence_state"]
          confidence_trace_node_id?: string
          confidence_version?: string
          configuration_set_id?: string
          created_at?: string
          gate_engine_version?: string
          id?: string
          input_hash?: string
          intelligence_result_id?: string
          limitation_codes?: Json
          organisation_id?: string
          output_hash?: string
          policy_version?: string
          recommendation_evaluation_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_confidence_gat_recommendation_evaluation_id_fkey"
            columns: ["recommendation_evaluation_id"]
            isOneToOne: false
            referencedRelation: "recommendation_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_confidence_gates_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_confidence_gates_catalogue_version_id_fkey"
            columns: ["catalogue_version_id"]
            isOneToOne: false
            referencedRelation: "recommendation_catalogue_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_confidence_gates_confidence_trace_node_id_fkey"
            columns: ["confidence_trace_node_id"]
            isOneToOne: false
            referencedRelation: "delivery_intelligence_trace_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_confidence_gates_intelligence_result_id_fkey"
            columns: ["intelligence_result_id"]
            isOneToOne: false
            referencedRelation: "delivery_intelligence_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_confidence_gates_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_confidence_gates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_conflict_mappings: {
        Row: {
          catalogue_version_id: string
          conflicting_recommendation_id: string
          recommendation_id: string
        }
        Insert: {
          catalogue_version_id: string
          conflicting_recommendation_id: string
          recommendation_id: string
        }
        Update: {
          catalogue_version_id?: string
          conflicting_recommendation_id?: string
          recommendation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_conflict_mappings_catalogue_version_id_fkey"
            columns: ["catalogue_version_id"]
            isOneToOne: false
            referencedRelation: "recommendation_catalogue_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_definitions: {
        Row: {
          catalogue_order: number
          catalogue_version_id: string
          created_at: string
          definition: Json
          id: string
          intent_digest: string
          recommendation_id: string
          recommendation_version: string
        }
        Insert: {
          catalogue_order: number
          catalogue_version_id: string
          created_at?: string
          definition: Json
          id?: string
          intent_digest: string
          recommendation_id: string
          recommendation_version: string
        }
        Update: {
          catalogue_order?: number
          catalogue_version_id?: string
          created_at?: string
          definition?: Json
          id?: string
          intent_digest?: string
          recommendation_id?: string
          recommendation_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_definitions_catalogue_version_id_fkey"
            columns: ["catalogue_version_id"]
            isOneToOne: false
            referencedRelation: "recommendation_catalogue_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_dependency_mappings: {
        Row: {
          catalogue_version_id: string
          dependency_id: string
          dependency_type: string
          recommendation_id: string
        }
        Insert: {
          catalogue_version_id: string
          dependency_id: string
          dependency_type?: string
          recommendation_id: string
        }
        Update: {
          catalogue_version_id?: string
          dependency_id?: string
          dependency_type?: string
          recommendation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_dependency_mappings_catalogue_version_id_fkey"
            columns: ["catalogue_version_id"]
            isOneToOne: false
            referencedRelation: "recommendation_catalogue_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_evaluation_trace_links: {
        Row: {
          analysis_run_id: string
          candidate_evaluation_id: string
          created_at: string
          evaluation_id: string
          organisation_id: string
          trace_node_id: string
          workspace_id: string
        }
        Insert: {
          analysis_run_id: string
          candidate_evaluation_id: string
          created_at?: string
          evaluation_id: string
          organisation_id: string
          trace_node_id: string
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string
          candidate_evaluation_id?: string
          created_at?: string
          evaluation_id?: string
          organisation_id?: string
          trace_node_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_evaluation_trace_li_candidate_evaluation_id_fkey"
            columns: ["candidate_evaluation_id"]
            isOneToOne: false
            referencedRelation: "recommendation_candidate_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_evaluation_trace_links_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_evaluation_trace_links_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "recommendation_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_evaluation_trace_links_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_evaluation_trace_links_trace_node_id_fkey"
            columns: ["trace_node_id"]
            isOneToOne: false
            referencedRelation: "delivery_intelligence_trace_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_evaluation_trace_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_evaluations: {
        Row: {
          analysis_run_id: string
          canonical_evaluation: Json
          canonical_input: Json
          catalogue_digest: string
          catalogue_id: string
          catalogue_version: string
          catalogue_version_id: string
          configuration_set_id: string
          created_at: string
          evaluator_version: string
          id: string
          input_hash: string
          intelligence_result_id: string
          organisation_id: string
          output_hash: string
          policy_version: string
          workspace_id: string
        }
        Insert: {
          analysis_run_id: string
          canonical_evaluation: Json
          canonical_input: Json
          catalogue_digest: string
          catalogue_id: string
          catalogue_version: string
          catalogue_version_id: string
          configuration_set_id: string
          created_at?: string
          evaluator_version: string
          id?: string
          input_hash: string
          intelligence_result_id: string
          organisation_id: string
          output_hash: string
          policy_version: string
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string
          canonical_evaluation?: Json
          canonical_input?: Json
          catalogue_digest?: string
          catalogue_id?: string
          catalogue_version?: string
          catalogue_version_id?: string
          configuration_set_id?: string
          created_at?: string
          evaluator_version?: string
          id?: string
          input_hash?: string
          intelligence_result_id?: string
          organisation_id?: string
          output_hash?: string
          policy_version?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_evaluations_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_evaluations_catalogue_version_id_fkey"
            columns: ["catalogue_version_id"]
            isOneToOne: false
            referencedRelation: "recommendation_catalogue_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_evaluations_intelligence_result_id_fkey"
            columns: ["intelligence_result_id"]
            isOneToOne: false
            referencedRelation: "delivery_intelligence_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_evaluations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_evaluations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_stable_identities: {
        Row: {
          created_at: string
          first_catalogue_version_id: string
          intent_digest: string
          recommendation_id: string
        }
        Insert: {
          created_at?: string
          first_catalogue_version_id: string
          intent_digest: string
          recommendation_id: string
        }
        Update: {
          created_at?: string
          first_catalogue_version_id?: string
          intent_digest?: string
          recommendation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_stable_identitie_first_catalogue_version_id_fkey"
            columns: ["first_catalogue_version_id"]
            isOneToOne: false
            referencedRelation: "recommendation_catalogue_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      runtime_assessment_events: {
        Row: {
          created_at: string
          id: string
          owner_key: string
          payload: Json
          session_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_key: string
          payload?: Json
          session_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_key?: string
          payload?: Json
          session_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "runtime_assessment_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "runtime_assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      runtime_assessment_responses: {
        Row: {
          page_id: string
          question_id: string
          section_id: string
          session_id: string
          updated_at: string
          valid: boolean
          value: Json | null
        }
        Insert: {
          page_id: string
          question_id: string
          section_id: string
          session_id: string
          updated_at?: string
          valid?: boolean
          value?: Json | null
        }
        Update: {
          page_id?: string
          question_id?: string
          section_id?: string
          session_id?: string
          updated_at?: string
          valid?: boolean
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "runtime_assessment_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "runtime_assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      runtime_assessment_sessions: {
        Row: {
          answered_count: number
          assessment_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          created_by_user_id: string | null
          current_page_id: string | null
          current_section_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          last_saved_at: string | null
          locked: boolean
          metadata: Json
          name: string
          organisation_id: string | null
          owner_key: string
          pack_id: string
          pack_version: string
          payload: Json | null
          progress: number
          started_at: string
          status: string
          total_questions: number
          updated_at: string
          updated_by: string | null
          version: number
          workspace_id: string | null
        }
        Insert: {
          answered_count?: number
          assessment_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          created_by_user_id?: string | null
          current_page_id?: string | null
          current_section_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          last_saved_at?: string | null
          locked?: boolean
          metadata?: Json
          name: string
          organisation_id?: string | null
          owner_key: string
          pack_id: string
          pack_version: string
          payload?: Json | null
          progress?: number
          started_at?: string
          status?: string
          total_questions?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
          workspace_id?: string | null
        }
        Update: {
          answered_count?: number
          assessment_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          created_by_user_id?: string | null
          current_page_id?: string | null
          current_section_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          last_saved_at?: string | null
          locked?: boolean
          metadata?: Json
          name?: string
          organisation_id?: string | null
          owner_key?: string
          pack_id?: string
          pack_version?: string
          payload?: Json | null
          progress?: number
          started_at?: string
          status?: string
          total_questions?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "runtime_assessment_sessions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runtime_assessment_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      user_preferences: {
        Row: {
          created_at: string
          date_format: string
          default_workspace_id: string | null
          density: string
          favourite_modules: string[]
          high_contrast: boolean
          landing_page: string
          language: string
          metadata: Json
          number_format: string
          reduced_motion: boolean
          sidebar_collapsed: boolean
          theme: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_format?: string
          default_workspace_id?: string | null
          density?: string
          favourite_modules?: string[]
          high_contrast?: boolean
          landing_page?: string
          language?: string
          metadata?: Json
          number_format?: string
          reduced_motion?: boolean
          sidebar_collapsed?: boolean
          theme?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_format?: string
          default_workspace_id?: string | null
          density?: string
          favourite_modules?: string[]
          high_contrast?: boolean
          landing_page?: string
          language?: string
          metadata?: Json
          number_format?: string
          reduced_motion?: boolean
          sidebar_collapsed?: boolean
          theme?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["platform_role"]
          user_id?: string
        }
        Relationships: []
      }
      workspace_memberships: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          favourite: boolean
          id: string
          is_deleted: boolean
          joined_at: string
          role: Database["public"]["Enums"]["platform_role"]
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          updated_by: string | null
          user_id: string
          version: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          favourite?: boolean
          id?: string
          is_deleted?: boolean
          joined_at?: string
          role: Database["public"]["Enums"]["platform_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          updated_by?: string | null
          user_id: string
          version?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          favourite?: boolean
          id?: string
          is_deleted?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["platform_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_memberships_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_settings: {
        Row: {
          archive_rules: Json
          colour: string
          created_at: string
          default_knowledge_packs: string[]
          description: string
          display_name: string
          icon: string
          organisation_id: string
          updated_at: string
          visibility: string
          workspace_id: string
        }
        Insert: {
          archive_rules?: Json
          colour?: string
          created_at?: string
          default_knowledge_packs?: string[]
          description?: string
          display_name?: string
          icon?: string
          organisation_id: string
          updated_at?: string
          visibility?: string
          workspace_id: string
        }
        Update: {
          archive_rules?: Json
          colour?: string
          created_at?: string
          default_knowledge_packs?: string[]
          description?: string
          display_name?: string
          icon?: string
          organisation_id?: string
          updated_at?: string
          visibility?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_types: {
        Row: {
          code: string
          created_at: string
          description: string
          enabled: boolean
          id: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      workspace_visits: {
        Row: {
          created_at: string
          id: string
          last_visited_at: string
          organisation_id: string
          updated_at: string
          user_id: string
          visit_count: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_visited_at?: string
          organisation_id: string
          updated_at?: string
          user_id: string
          visit_count?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_visited_at?: string
          organisation_id?: string
          updated_at?: string
          user_id?: string
          visit_count?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_visits_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_visits_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          colour: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string
          icon: string
          id: string
          is_deleted: boolean
          name: string
          organisation_id: string
          slug: string
          status: Database["public"]["Enums"]["workspace_status"]
          type: string
          updated_at: string
          updated_by: string | null
          version: number
          visibility: string
        }
        Insert: {
          colour?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          icon?: string
          id?: string
          is_deleted?: boolean
          name: string
          organisation_id: string
          slug: string
          status?: Database["public"]["Enums"]["workspace_status"]
          type?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          visibility?: string
        }
        Update: {
          colour?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          icon?: string
          id?: string
          is_deleted?: boolean
          name?: string
          organisation_id?: string
          slug?: string
          status?: Database["public"]["Enums"]["workspace_status"]
          type?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_type_fkey"
            columns: ["type"]
            isOneToOne: false
            referencedRelation: "workspace_types"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      attach_assessment_analysis_eligibility_decision: {
        Args: { p_eligibility_decision_id: string; p_handoff_id: string }
        Returns: {
          analysis_run_id: string | null
          assessment_revision: number
          assessment_session_id: string
          attempt: number
          claimed_at: string | null
          configuration_set_id: string
          correlation_id: string
          created_at: string
          delivered_at: string | null
          eligibility_decision_id: string | null
          id: string
          last_error_code: string | null
          next_attempt_at: string
          organisation_id: string
          requested_mode: Database["public"]["Enums"]["analysis_requested_mode"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["analysis_handoff_status"]
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "assessment_analysis_handoffs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_read_delivery_intelligence: {
        Args: { p_organisation_id: string; p_workspace_id: string }
        Returns: boolean
      }
      claim_assessment_analysis_handoff: {
        Args: { p_handoff_id: string }
        Returns: {
          analysis_run_id: string | null
          assessment_revision: number
          assessment_session_id: string
          attempt: number
          claimed_at: string | null
          configuration_set_id: string
          correlation_id: string
          created_at: string
          delivered_at: string | null
          eligibility_decision_id: string | null
          id: string
          last_error_code: string | null
          next_attempt_at: string
          organisation_id: string
          requested_mode: Database["public"]["Enums"]["analysis_requested_mode"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["analysis_handoff_status"]
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "assessment_analysis_handoffs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_assessment_analysis_handoffs: {
        Args: { p_limit?: number }
        Returns: {
          analysis_run_id: string | null
          assessment_revision: number
          assessment_session_id: string
          attempt: number
          claimed_at: string | null
          configuration_set_id: string
          correlation_id: string
          created_at: string
          delivered_at: string | null
          eligibility_decision_id: string | null
          id: string
          last_error_code: string | null
          next_attempt_at: string
          organisation_id: string
          requested_mode: Database["public"]["Enums"]["analysis_requested_mode"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["analysis_handoff_status"]
          updated_at: string
          workspace_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "assessment_analysis_handoffs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_assessment_analysis_run: {
        Args: {
          p_lease_owner: string
          p_lease_seconds?: number
          p_run_id: string
        }
        Returns: {
          assessment_revision: number
          assessment_session_id: string
          attempt: number
          canonical_input: Json
          completed_at: string | null
          configuration_digest: string
          configuration_set_id: string
          configuration_snapshot: Json
          configuration_version: string
          consent_basis: string
          correlation_id: string
          created_at: string
          created_by_user_id: string
          engine_version: string
          error_code: string | null
          failed_at: string | null
          id: string
          idempotency_key: string
          initiator: Json
          input_hash: string
          knowledge_pack_id: string
          knowledge_pack_version: string
          lease_expires_at: string | null
          lease_owner: string | null
          organisation_id: string
          question_set_version: string
          queued_at: string
          requested_mode: Database["public"]["Enums"]["analysis_requested_mode"]
          response_count: number
          retryable: boolean | null
          runtime_execution_id: string
          safe_error_message: string | null
          schema_version: string
          started_at: string | null
          status: Database["public"]["Enums"]["analysis_run_status"]
          updated_at: string
          workspace_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "assessment_analysis_runs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_assessment_analysis_handoff: {
        Args: { p_analysis_run_id: string; p_handoff_id: string }
        Returns: {
          analysis_run_id: string | null
          assessment_revision: number
          assessment_session_id: string
          attempt: number
          claimed_at: string | null
          configuration_set_id: string
          correlation_id: string
          created_at: string
          delivered_at: string | null
          eligibility_decision_id: string | null
          id: string
          last_error_code: string | null
          next_attempt_at: string
          organisation_id: string
          requested_mode: Database["public"]["Enums"]["analysis_requested_mode"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["analysis_handoff_status"]
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "assessment_analysis_handoffs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_assessment_analysis_run: {
        Args: { p_lease_owner: string; p_run_id: string }
        Returns: {
          assessment_revision: number
          assessment_session_id: string
          attempt: number
          canonical_input: Json
          completed_at: string | null
          configuration_digest: string
          configuration_set_id: string
          configuration_snapshot: Json
          configuration_version: string
          consent_basis: string
          correlation_id: string
          created_at: string
          created_by_user_id: string
          engine_version: string
          error_code: string | null
          failed_at: string | null
          id: string
          idempotency_key: string
          initiator: Json
          input_hash: string
          knowledge_pack_id: string
          knowledge_pack_version: string
          lease_expires_at: string | null
          lease_owner: string | null
          organisation_id: string
          question_set_version: string
          queued_at: string
          requested_mode: Database["public"]["Enums"]["analysis_requested_mode"]
          response_count: number
          retryable: boolean | null
          runtime_execution_id: string
          safe_error_message: string | null
          schema_version: string
          started_at: string | null
          status: Database["public"]["Enums"]["analysis_run_status"]
          updated_at: string
          workspace_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "assessment_analysis_runs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_recommendation_catalogue_version: {
        Args: { p_input: Json }
        Returns: {
          authored_by: string
          catalogue_id: string
          content_digest: string
          created_at: string
          current_state: Database["public"]["Enums"]["recommendation_catalogue_state"]
          id: string
          idempotency_key: string
          snapshot: Json
          source_configuration_set_id: string
          updated_at: string
          version: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_catalogue_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fail_assessment_analysis_handoff: {
        Args: { p_handoff_id: string; p_safe_error_code: string }
        Returns: {
          analysis_run_id: string | null
          assessment_revision: number
          assessment_session_id: string
          attempt: number
          claimed_at: string | null
          configuration_set_id: string
          correlation_id: string
          created_at: string
          delivered_at: string | null
          eligibility_decision_id: string | null
          id: string
          last_error_code: string | null
          next_attempt_at: string
          organisation_id: string
          requested_mode: Database["public"]["Enums"]["analysis_requested_mode"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["analysis_handoff_status"]
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "assessment_analysis_handoffs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fail_assessment_analysis_run: {
        Args: {
          p_error_code: string
          p_lease_owner: string
          p_retryable: boolean
          p_run_id: string
          p_safe_message: string
        }
        Returns: {
          assessment_revision: number
          assessment_session_id: string
          attempt: number
          canonical_input: Json
          completed_at: string | null
          configuration_digest: string
          configuration_set_id: string
          configuration_snapshot: Json
          configuration_version: string
          consent_basis: string
          correlation_id: string
          created_at: string
          created_by_user_id: string
          engine_version: string
          error_code: string | null
          failed_at: string | null
          id: string
          idempotency_key: string
          initiator: Json
          input_hash: string
          knowledge_pack_id: string
          knowledge_pack_version: string
          lease_expires_at: string | null
          lease_owner: string | null
          organisation_id: string
          question_set_version: string
          queued_at: string
          requested_mode: Database["public"]["Enums"]["analysis_requested_mode"]
          response_count: number
          retryable: boolean | null
          runtime_execution_id: string
          safe_error_message: string | null
          schema_version: string
          started_at: string | null
          status: Database["public"]["Enums"]["analysis_run_status"]
          updated_at: string
          workspace_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "assessment_analysis_runs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["platform_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["platform_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      mark_assessment_analysis_handoff_ineligible: {
        Args: { p_eligibility_decision_id: string; p_handoff_id: string }
        Returns: {
          analysis_run_id: string | null
          assessment_revision: number
          assessment_session_id: string
          attempt: number
          claimed_at: string | null
          configuration_set_id: string
          correlation_id: string
          created_at: string
          delivered_at: string | null
          eligibility_decision_id: string | null
          id: string
          last_error_code: string | null
          next_attempt_at: string
          organisation_id: string
          requested_mode: Database["public"]["Enums"]["analysis_requested_mode"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["analysis_handoff_status"]
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "assessment_analysis_handoffs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_delivery_intelligence_result: {
        Args: {
          p_canonical_result: Json
          p_lease_owner: string
          p_result_hash: string
          p_run_id: string
          p_trace_edges: Json
          p_trace_nodes: Json
        }
        Returns: {
          assessment_revision: number
          assessment_session_id: string
          attempt: number
          canonical_input: Json
          completed_at: string | null
          configuration_digest: string
          configuration_set_id: string
          configuration_snapshot: Json
          configuration_version: string
          consent_basis: string
          correlation_id: string
          created_at: string
          created_by_user_id: string
          engine_version: string
          error_code: string | null
          failed_at: string | null
          id: string
          idempotency_key: string
          initiator: Json
          input_hash: string
          knowledge_pack_id: string
          knowledge_pack_version: string
          lease_expires_at: string | null
          lease_owner: string | null
          organisation_id: string
          question_set_version: string
          queued_at: string
          requested_mode: Database["public"]["Enums"]["analysis_requested_mode"]
          response_count: number
          retryable: boolean | null
          runtime_execution_id: string
          safe_error_message: string | null
          schema_version: string
          started_at: string | null
          status: Database["public"]["Enums"]["analysis_run_status"]
          updated_at: string
          workspace_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "assessment_analysis_runs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      publish_recommendation_confidence_gate: {
        Args: { p_input: Json }
        Returns: {
          analysis_run_id: string
          canonical_gate: Json
          canonical_input: Json
          catalogue_digest: string
          catalogue_id: string
          catalogue_version: string
          catalogue_version_id: string
          caveat: string | null
          confidence_index: number
          confidence_state: Database["public"]["Enums"]["recommendation_confidence_state"]
          confidence_trace_node_id: string
          confidence_version: string
          configuration_set_id: string
          created_at: string
          gate_engine_version: string
          id: string
          input_hash: string
          intelligence_result_id: string
          limitation_codes: Json
          organisation_id: string
          output_hash: string
          policy_version: string
          recommendation_evaluation_id: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_confidence_gates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_recommendation_evaluation: {
        Args: { p_input: Json }
        Returns: {
          analysis_run_id: string
          canonical_evaluation: Json
          canonical_input: Json
          catalogue_digest: string
          catalogue_id: string
          catalogue_version: string
          catalogue_version_id: string
          configuration_set_id: string
          created_at: string
          evaluator_version: string
          id: string
          input_hash: string
          intelligence_result_id: string
          organisation_id: string
          output_hash: string
          policy_version: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_evaluations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reconcile_assessment_analysis_handoffs: {
        Args: { p_limit?: number }
        Returns: number
      }
      resolve_delivery_dna_public_result: {
        Args: { p_ip_hash: string; p_token_hash: string }
        Returns: Json
      }
      retry_assessment_analysis_run: {
        Args: { p_run_id: string }
        Returns: {
          assessment_revision: number
          assessment_session_id: string
          attempt: number
          canonical_input: Json
          completed_at: string | null
          configuration_digest: string
          configuration_set_id: string
          configuration_snapshot: Json
          configuration_version: string
          consent_basis: string
          correlation_id: string
          created_at: string
          created_by_user_id: string
          engine_version: string
          error_code: string | null
          failed_at: string | null
          id: string
          idempotency_key: string
          initiator: Json
          input_hash: string
          knowledge_pack_id: string
          knowledge_pack_version: string
          lease_expires_at: string | null
          lease_owner: string | null
          organisation_id: string
          question_set_version: string
          queued_at: string
          requested_mode: Database["public"]["Enums"]["analysis_requested_mode"]
          response_count: number
          retryable: boolean | null
          runtime_execution_id: string
          safe_error_message: string | null
          schema_version: string
          started_at: string | null
          status: Database["public"]["Enums"]["analysis_run_status"]
          updated_at: string
          workspace_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "assessment_analysis_runs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      transition_recommendation_catalogue: {
        Args: {
          p_actor_id: string
          p_catalogue_version_id: string
          p_command: string
          p_idempotency_key: string
        }
        Returns: {
          authored_by: string
          catalogue_id: string
          content_digest: string
          created_at: string
          current_state: Database["public"]["Enums"]["recommendation_catalogue_state"]
          id: string
          idempotency_key: string
          snapshot: Json
          source_configuration_set_id: string
          updated_at: string
          version: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_catalogue_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      analysis_eligibility_status: "eligible" | "ineligible"
      analysis_handoff_status:
        | "pending"
        | "processing"
        | "delivered"
        | "failed"
        | "ineligible"
      analysis_requested_mode: "workspace" | "public"
      analysis_run_status: "queued" | "running" | "completed" | "failed"
      assessment_status:
        | "draft"
        | "in_progress"
        | "submitted"
        | "processing"
        | "completed"
        | "archived"
      identity_user_status:
        | "pending_verification"
        | "active"
        | "locked"
        | "suspended"
        | "disabled"
      invitation_status: "pending" | "accepted" | "revoked" | "expired"
      membership_status: "invited" | "active" | "removed" | "suspended"
      organisation_status: "active" | "suspended" | "archived"
      platform_role:
        | "platform_admin"
        | "org_admin"
        | "assessment_manager"
        | "contributor"
        | "reviewer"
        | "read_only"
        | "organisation_owner"
        | "workspace_manager"
        | "product_governance"
      recommendation_catalogue_state:
        | "draft"
        | "in_review"
        | "approved"
        | "active"
        | "retired"
        | "superseded"
      recommendation_confidence_gate_result:
        | "presented"
        | "withheld"
        | "evidence_first"
      recommendation_confidence_state: "low" | "moderate" | "high"
      recommendation_evaluation_result: "eligible" | "ineligible" | "excluded"
      stage_status: "pending" | "running" | "completed" | "failed" | "skipped"
      workspace_status: "active" | "archived"
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
      analysis_eligibility_status: ["eligible", "ineligible"],
      analysis_handoff_status: [
        "pending",
        "processing",
        "delivered",
        "failed",
        "ineligible",
      ],
      analysis_requested_mode: ["workspace", "public"],
      analysis_run_status: ["queued", "running", "completed", "failed"],
      assessment_status: [
        "draft",
        "in_progress",
        "submitted",
        "processing",
        "completed",
        "archived",
      ],
      identity_user_status: [
        "pending_verification",
        "active",
        "locked",
        "suspended",
        "disabled",
      ],
      invitation_status: ["pending", "accepted", "revoked", "expired"],
      membership_status: ["invited", "active", "removed", "suspended"],
      organisation_status: ["active", "suspended", "archived"],
      platform_role: [
        "platform_admin",
        "org_admin",
        "assessment_manager",
        "contributor",
        "reviewer",
        "read_only",
        "organisation_owner",
        "workspace_manager",
        "product_governance",
      ],
      recommendation_catalogue_state: [
        "draft",
        "in_review",
        "approved",
        "active",
        "retired",
        "superseded",
      ],
      recommendation_confidence_gate_result: [
        "presented",
        "withheld",
        "evidence_first",
      ],
      recommendation_confidence_state: ["low", "moderate", "high"],
      recommendation_evaluation_result: ["eligible", "ineligible", "excluded"],
      stage_status: ["pending", "running", "completed", "failed", "skipped"],
      workspace_status: ["active", "archived"],
    },
  },
} as const

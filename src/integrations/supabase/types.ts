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
          evidence_reason_code: string | null
          evidence_reason_text: string | null
          evidence_status: string
          exclusion_reason: string | null
          id: string
          is_deleted: boolean
          notes: string | null
          original_responded_at: string | null
          provenance_source: string | null
          provenance_version: string | null
          question_id: string
          respondent_group_id: string | null
          score: number | null
          section_id: string
          session_id: string
          updated_at: string
          updated_by: string | null
          value: Json | null
          version: number
        }
        Insert: {
          answered_at?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          evidence_at?: string | null
          evidence_reason_code?: string | null
          evidence_reason_text?: string | null
          evidence_status?: string
          exclusion_reason?: string | null
          id?: string
          is_deleted?: boolean
          notes?: string | null
          original_responded_at?: string | null
          provenance_source?: string | null
          provenance_version?: string | null
          question_id: string
          respondent_group_id?: string | null
          score?: number | null
          section_id: string
          session_id: string
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
          version?: number
        }
        Update: {
          answered_at?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          evidence_at?: string | null
          evidence_reason_code?: string | null
          evidence_reason_text?: string | null
          evidence_status?: string
          exclusion_reason?: string | null
          id?: string
          is_deleted?: boolean
          notes?: string | null
          original_responded_at?: string | null
          provenance_source?: string | null
          provenance_version?: string | null
          question_id?: string
          respondent_group_id?: string | null
          score?: number | null
          section_id?: string
          session_id?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
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
      delivery_dna_snapshot_access_events: {
        Row: {
          id: number
          ip_hash: string
          occurred_at: string
        }
        Insert: {
          id?: never
          ip_hash: string
          occurred_at?: string
        }
        Update: {
          id?: never
          ip_hash?: string
          occurred_at?: string
        }
        Relationships: []
      }
      delivery_dna_snapshot_funnel_events: {
        Row: {
          event_type: string
          id: number
          occurred_at: string
          step_number: number | null
        }
        Insert: {
          event_type: string
          id?: never
          occurred_at?: string
          step_number?: number | null
        }
        Update: {
          event_type?: string
          id?: never
          occurred_at?: string
          step_number?: number | null
        }
        Relationships: []
      }
      delivery_dna_snapshot_responses: {
        Row: {
          answer: number | null
          capability_id: string
          capability_order: number
          created_at: string
          evidence_status: string
          not_applicable_reason_code: string | null
          not_applicable_reason_text: string | null
          question_id: string
          responded_at: string
          snapshot_session_id: string
          updated_at: string
        }
        Insert: {
          answer?: number | null
          capability_id: string
          capability_order: number
          created_at?: string
          evidence_status: string
          not_applicable_reason_code?: string | null
          not_applicable_reason_text?: string | null
          question_id: string
          responded_at: string
          snapshot_session_id: string
          updated_at?: string
        }
        Update: {
          answer?: number | null
          capability_id?: string
          capability_order?: number
          created_at?: string
          evidence_status?: string
          not_applicable_reason_code?: string | null
          not_applicable_reason_text?: string | null
          question_id?: string
          responded_at?: string
          snapshot_session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_dna_snapshot_responses_snapshot_session_id_fkey"
            columns: ["snapshot_session_id"]
            isOneToOne: false
            referencedRelation: "delivery_dna_snapshot_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_dna_snapshot_sessions: {
        Row: {
          assessment_session_id: string | null
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          linked_at: string | null
          linked_user_id: string | null
          linking_consent_at: string | null
          organisation_id: string | null
          status: string
          token_hash: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assessment_session_id?: string | null
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          linked_at?: string | null
          linked_user_id?: string | null
          linking_consent_at?: string | null
          organisation_id?: string | null
          status?: string
          token_hash: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assessment_session_id?: string | null
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          linked_at?: string | null
          linked_user_id?: string | null
          linking_consent_at?: string | null
          organisation_id?: string | null
          status?: string
          token_hash?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_dna_snapshot_sessions_assessment_session_id_fkey"
            columns: ["assessment_session_id"]
            isOneToOne: true
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_dna_snapshot_sessions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_dna_snapshot_sessions_workspace_id_fkey"
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
          product_version: string | null
          status: string
          updated_at: string
        }
        Insert: {
          product_id: string
          product_type: string
          product_version?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          product_id?: string
          product_type?: string
          product_version?: string | null
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
      organisation_product_activations: {
        Row: {
          activated_at: string | null
          organisation_id: string
          product_id: string
          product_type: string
          product_version: string
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          organisation_id: string
          product_id: string
          product_type: string
          product_version: string
          status: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          organisation_id?: string
          product_id?: string
          product_type?: string
          product_version?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_product_activations_organisation_id_fkey"
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
          entitlement_source: string
          expires_at: string | null
          organisation_id: string
          product_id: string
          product_type: string
          product_version: string | null
          revoked_at: string | null
          updated_at: string
          valid_from: string
          workspace_id: string | null
        }
        Insert: {
          entitled?: boolean
          entitlement_source?: string
          expires_at?: string | null
          organisation_id: string
          product_id: string
          product_type: string
          product_version?: string | null
          revoked_at?: string | null
          updated_at?: string
          valid_from?: string
          workspace_id?: string | null
        }
        Update: {
          entitled?: boolean
          entitlement_source?: string
          expires_at?: string | null
          organisation_id?: string
          product_id?: string
          product_type?: string
          product_version?: string | null
          revoked_at?: string | null
          updated_at?: string
          valid_from?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organisation_product_entitlements_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_product_entitlements_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      recommendation_action_outcomes: {
        Row: {
          action_id: string
          catalogue_digest: string
          catalogue_version: string
          catalogue_version_id: string
          created_at: string
          created_by_user_id: string
          id: string
          intended_outcome: string
          organisation_id: string
          policy_version: string
          portfolio_item_id: string
          recommendation_definition_id: string
          recommendation_id: string
          recommendation_version: string
          success_measure_templates: Json
          workspace_id: string
        }
        Insert: {
          action_id: string
          catalogue_digest: string
          catalogue_version: string
          catalogue_version_id: string
          created_at?: string
          created_by_user_id: string
          id?: string
          intended_outcome: string
          organisation_id: string
          policy_version: string
          portfolio_item_id: string
          recommendation_definition_id: string
          recommendation_id: string
          recommendation_version: string
          success_measure_templates: Json
          workspace_id: string
        }
        Update: {
          action_id?: string
          catalogue_digest?: string
          catalogue_version?: string
          catalogue_version_id?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          intended_outcome?: string
          organisation_id?: string
          policy_version?: string
          portfolio_item_id?: string
          recommendation_definition_id?: string
          recommendation_id?: string
          recommendation_version?: string
          success_measure_templates?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_action_outcome_recommendation_definition_id_fkey"
            columns: ["recommendation_definition_id"]
            isOneToOne: false
            referencedRelation: "recommendation_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_action_outcomes_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: true
            referencedRelation: "recommendation_improvement_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_action_outcomes_catalogue_version_id_fkey"
            columns: ["catalogue_version_id"]
            isOneToOne: false
            referencedRelation: "recommendation_catalogue_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_action_outcomes_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_action_outcomes_portfolio_item_id_fkey"
            columns: ["portfolio_item_id"]
            isOneToOne: false
            referencedRelation: "recommendation_portfolio_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_action_outcomes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_analytics_consent_events: {
        Row: {
          consent_version: number
          id: string
          idempotency_key: string
          occurred_at: string
          organisation_id: string
          request_hash: string
          status: Database["public"]["Enums"]["recommendation_analytics_consent_status"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          consent_version: number
          id?: string
          idempotency_key: string
          occurred_at?: string
          organisation_id: string
          request_hash: string
          status: Database["public"]["Enums"]["recommendation_analytics_consent_status"]
          user_id: string
          workspace_id: string
        }
        Update: {
          consent_version?: number
          id?: string
          idempotency_key?: string
          occurred_at?: string
          organisation_id?: string
          request_hash?: string
          status?: Database["public"]["Enums"]["recommendation_analytics_consent_status"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_analytics_consent_events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_analytics_consent_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_analytics_events: {
        Row: {
          actor_pseudonym: string
          archived_at: string | null
          consent_event_id: string
          event_id: string
          event_type: Database["public"]["Enums"]["recommendation_analytics_event_type"]
          ingested_at: string
          mode: Database["public"]["Enums"]["recommendation_analytics_mode"]
          object_id: string
          object_type: string
          object_version: string
          occurred_at: string
          organisation_id: string
          properties: Json
          request_hash: string
          schema_version: string
          workspace_id: string
        }
        Insert: {
          actor_pseudonym: string
          archived_at?: string | null
          consent_event_id: string
          event_id: string
          event_type: Database["public"]["Enums"]["recommendation_analytics_event_type"]
          ingested_at?: string
          mode: Database["public"]["Enums"]["recommendation_analytics_mode"]
          object_id: string
          object_type: string
          object_version: string
          occurred_at: string
          organisation_id: string
          properties?: Json
          request_hash: string
          schema_version: string
          workspace_id: string
        }
        Update: {
          actor_pseudonym?: string
          archived_at?: string | null
          consent_event_id?: string
          event_id?: string
          event_type?: Database["public"]["Enums"]["recommendation_analytics_event_type"]
          ingested_at?: string
          mode?: Database["public"]["Enums"]["recommendation_analytics_mode"]
          object_id?: string
          object_type?: string
          object_version?: string
          occurred_at?: string
          organisation_id?: string
          properties?: Json
          request_hash?: string
          schema_version?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_analytics_events_consent_event_id_fkey"
            columns: ["consent_event_id"]
            isOneToOne: false
            referencedRelation: "recommendation_analytics_consent_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_analytics_events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_analytics_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_audit_export_jobs: {
        Row: {
          attempt: number
          available_until: string | null
          completed_at: string | null
          created_at: string
          export_payload: Json | null
          failure_code: string | null
          id: string
          idempotency_key: string
          lease_expires_at: string | null
          lease_owner: string | null
          organisation_id: string
          payload_hash: string | null
          portfolio_id: string
          projection: string
          request_hash: string
          requested_by: string
          resolved_at: string | null
          retryable: boolean
          started_at: string | null
          status: Database["public"]["Enums"]["recommendation_audit_export_status"]
          workspace_id: string
        }
        Insert: {
          attempt?: number
          available_until?: string | null
          completed_at?: string | null
          created_at?: string
          export_payload?: Json | null
          failure_code?: string | null
          id?: string
          idempotency_key: string
          lease_expires_at?: string | null
          lease_owner?: string | null
          organisation_id: string
          payload_hash?: string | null
          portfolio_id: string
          projection: string
          request_hash: string
          requested_by: string
          resolved_at?: string | null
          retryable?: boolean
          started_at?: string | null
          status?: Database["public"]["Enums"]["recommendation_audit_export_status"]
          workspace_id: string
        }
        Update: {
          attempt?: number
          available_until?: string | null
          completed_at?: string | null
          created_at?: string
          export_payload?: Json | null
          failure_code?: string | null
          id?: string
          idempotency_key?: string
          lease_expires_at?: string | null
          lease_owner?: string | null
          organisation_id?: string
          payload_hash?: string | null
          portfolio_id?: string
          projection?: string
          request_hash?: string
          requested_by?: string
          resolved_at?: string | null
          retryable?: boolean
          started_at?: string | null
          status?: Database["public"]["Enums"]["recommendation_audit_export_status"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_audit_export_jobs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_audit_export_jobs_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "recommendation_portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_audit_export_jobs_workspace_id_fkey"
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
      recommendation_conflict_resolutions: {
        Row: {
          analysis_run_id: string
          canonical_input: Json
          canonical_resolution: Json
          catalogue_digest: string
          catalogue_id: string
          catalogue_version: string
          catalogue_version_id: string
          confidence_gate_id: string
          configuration_set_id: string
          created_at: string
          id: string
          input_hash: string
          organisation_id: string
          output_hash: string
          policy_version: string
          recommendation_evaluation_id: string
          resolver_version: string
          workspace_id: string
        }
        Insert: {
          analysis_run_id: string
          canonical_input: Json
          canonical_resolution: Json
          catalogue_digest: string
          catalogue_id: string
          catalogue_version: string
          catalogue_version_id: string
          confidence_gate_id: string
          configuration_set_id: string
          created_at?: string
          id?: string
          input_hash: string
          organisation_id: string
          output_hash: string
          policy_version: string
          recommendation_evaluation_id: string
          resolver_version: string
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string
          canonical_input?: Json
          canonical_resolution?: Json
          catalogue_digest?: string
          catalogue_id?: string
          catalogue_version?: string
          catalogue_version_id?: string
          confidence_gate_id?: string
          configuration_set_id?: string
          created_at?: string
          id?: string
          input_hash?: string
          organisation_id?: string
          output_hash?: string
          policy_version?: string
          recommendation_evaluation_id?: string
          resolver_version?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_conflict_resol_recommendation_evaluation_id_fkey"
            columns: ["recommendation_evaluation_id"]
            isOneToOne: false
            referencedRelation: "recommendation_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_conflict_resolutions_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_conflict_resolutions_catalogue_version_id_fkey"
            columns: ["catalogue_version_id"]
            isOneToOne: false
            referencedRelation: "recommendation_catalogue_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_conflict_resolutions_confidence_gate_id_fkey"
            columns: ["confidence_gate_id"]
            isOneToOne: false
            referencedRelation: "recommendation_confidence_gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_conflict_resolutions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_conflict_resolutions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_decision_events: {
        Row: {
          acknowledged: boolean
          actor_type: Database["public"]["Enums"]["recommendation_decision_actor_type"]
          actor_user_id: string | null
          analysis_run_id: string
          catalogue_digest: string
          catalogue_version_id: string
          command: Database["public"]["Enums"]["recommendation_decision_command"]
          current_state: Database["public"]["Enums"]["recommendation_decision_state"]
          decision_version: number
          id: string
          idempotency_key: string
          occurred_at: string
          organisation_id: string
          payload_hash: string
          portfolio_id: string
          portfolio_item_id: string
          portfolio_policy_version: string
          previous_state: Database["public"]["Enums"]["recommendation_decision_state"]
          reason_category:
            | Database["public"]["Enums"]["recommendation_decision_reason_category"]
            | null
          review_at: string | null
          workspace_id: string
        }
        Insert: {
          acknowledged?: boolean
          actor_type: Database["public"]["Enums"]["recommendation_decision_actor_type"]
          actor_user_id?: string | null
          analysis_run_id: string
          catalogue_digest: string
          catalogue_version_id: string
          command: Database["public"]["Enums"]["recommendation_decision_command"]
          current_state: Database["public"]["Enums"]["recommendation_decision_state"]
          decision_version: number
          id?: string
          idempotency_key: string
          occurred_at?: string
          organisation_id: string
          payload_hash: string
          portfolio_id: string
          portfolio_item_id: string
          portfolio_policy_version: string
          previous_state: Database["public"]["Enums"]["recommendation_decision_state"]
          reason_category?:
            | Database["public"]["Enums"]["recommendation_decision_reason_category"]
            | null
          review_at?: string | null
          workspace_id: string
        }
        Update: {
          acknowledged?: boolean
          actor_type?: Database["public"]["Enums"]["recommendation_decision_actor_type"]
          actor_user_id?: string | null
          analysis_run_id?: string
          catalogue_digest?: string
          catalogue_version_id?: string
          command?: Database["public"]["Enums"]["recommendation_decision_command"]
          current_state?: Database["public"]["Enums"]["recommendation_decision_state"]
          decision_version?: number
          id?: string
          idempotency_key?: string
          occurred_at?: string
          organisation_id?: string
          payload_hash?: string
          portfolio_id?: string
          portfolio_item_id?: string
          portfolio_policy_version?: string
          previous_state?: Database["public"]["Enums"]["recommendation_decision_state"]
          reason_category?:
            | Database["public"]["Enums"]["recommendation_decision_reason_category"]
            | null
          review_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_decision_events_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_decision_events_catalogue_version_id_fkey"
            columns: ["catalogue_version_id"]
            isOneToOne: false
            referencedRelation: "recommendation_catalogue_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_decision_events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_decision_events_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "recommendation_portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_decision_events_portfolio_item_id_fkey"
            columns: ["portfolio_item_id"]
            isOneToOne: false
            referencedRelation: "recommendation_portfolio_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_decision_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      recommendation_feature_flag_events: {
        Row: {
          actor_user_id: string
          enabled: boolean
          feature_key: string
          feature_version: number
          id: string
          idempotency_key: string
          occurred_at: string
          reason_category: string
          request_hash: string
        }
        Insert: {
          actor_user_id: string
          enabled: boolean
          feature_key: string
          feature_version: number
          id?: string
          idempotency_key: string
          occurred_at?: string
          reason_category: string
          request_hash: string
        }
        Update: {
          actor_user_id?: string
          enabled?: boolean
          feature_key?: string
          feature_version?: number
          id?: string
          idempotency_key?: string
          occurred_at?: string
          reason_category?: string
          request_hash?: string
        }
        Relationships: []
      }
      recommendation_improvement_action_events: {
        Row: {
          accountable_owner_id: string | null
          action_id: string
          action_version: number
          actor_user_id: string
          analysis_run_id: string
          blocking_dependency_ids: string[]
          command: Database["public"]["Enums"]["recommendation_action_command"]
          completion_note: string | null
          contributor_ids: string[]
          current_state: Database["public"]["Enums"]["recommendation_action_status"]
          dependency_override: boolean
          dependency_override_acknowledged: boolean
          dependency_override_reason: string | null
          evidence_not_available_reason: string | null
          evidence_references: string[]
          id: string
          idempotency_key: string
          note: string | null
          occurred_at: string
          organisation_id: string
          payload_hash: string
          plan_id: string
          portfolio_id: string
          portfolio_item_id: string
          previous_state:
            | Database["public"]["Enums"]["recommendation_action_status"]
            | null
          target_date: string | null
          workspace_id: string
        }
        Insert: {
          accountable_owner_id?: string | null
          action_id: string
          action_version: number
          actor_user_id: string
          analysis_run_id: string
          blocking_dependency_ids?: string[]
          command: Database["public"]["Enums"]["recommendation_action_command"]
          completion_note?: string | null
          contributor_ids?: string[]
          current_state: Database["public"]["Enums"]["recommendation_action_status"]
          dependency_override?: boolean
          dependency_override_acknowledged?: boolean
          dependency_override_reason?: string | null
          evidence_not_available_reason?: string | null
          evidence_references?: string[]
          id?: string
          idempotency_key: string
          note?: string | null
          occurred_at?: string
          organisation_id: string
          payload_hash: string
          plan_id: string
          portfolio_id: string
          portfolio_item_id: string
          previous_state?:
            | Database["public"]["Enums"]["recommendation_action_status"]
            | null
          target_date?: string | null
          workspace_id: string
        }
        Update: {
          accountable_owner_id?: string | null
          action_id?: string
          action_version?: number
          actor_user_id?: string
          analysis_run_id?: string
          blocking_dependency_ids?: string[]
          command?: Database["public"]["Enums"]["recommendation_action_command"]
          completion_note?: string | null
          contributor_ids?: string[]
          current_state?: Database["public"]["Enums"]["recommendation_action_status"]
          dependency_override?: boolean
          dependency_override_acknowledged?: boolean
          dependency_override_reason?: string | null
          evidence_not_available_reason?: string | null
          evidence_references?: string[]
          id?: string
          idempotency_key?: string
          note?: string | null
          occurred_at?: string
          organisation_id?: string
          payload_hash?: string
          plan_id?: string
          portfolio_id?: string
          portfolio_item_id?: string
          previous_state?:
            | Database["public"]["Enums"]["recommendation_action_status"]
            | null
          target_date?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_improvement_action_events_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "recommendation_improvement_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_improvement_action_events_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_improvement_action_events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_improvement_action_events_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "recommendation_improvement_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_improvement_action_events_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "recommendation_portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_improvement_action_events_portfolio_item_id_fkey"
            columns: ["portfolio_item_id"]
            isOneToOne: false
            referencedRelation: "recommendation_portfolio_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_improvement_action_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_improvement_actions: {
        Row: {
          accountable_owner_id: string | null
          action_version: number
          analysis_run_id: string
          cancelled_at: string | null
          completed_at: string | null
          completion_note: string | null
          contributor_ids: string[]
          created_at: string
          evidence_not_available_reason: string | null
          evidence_references: string[]
          id: string
          latest_event_id: string
          note: string | null
          organisation_id: string
          plan_id: string
          portfolio_id: string
          portfolio_item_id: string
          recommendation_id: string
          recommendation_version: string
          source_decision_id: string
          source_decision_version: number
          started_at: string | null
          status: Database["public"]["Enums"]["recommendation_action_status"]
          target_date: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          accountable_owner_id?: string | null
          action_version: number
          analysis_run_id: string
          cancelled_at?: string | null
          completed_at?: string | null
          completion_note?: string | null
          contributor_ids?: string[]
          created_at: string
          evidence_not_available_reason?: string | null
          evidence_references?: string[]
          id: string
          latest_event_id: string
          note?: string | null
          organisation_id: string
          plan_id: string
          portfolio_id: string
          portfolio_item_id: string
          recommendation_id: string
          recommendation_version: string
          source_decision_id: string
          source_decision_version: number
          started_at?: string | null
          status: Database["public"]["Enums"]["recommendation_action_status"]
          target_date?: string | null
          updated_at: string
          workspace_id: string
        }
        Update: {
          accountable_owner_id?: string | null
          action_version?: number
          analysis_run_id?: string
          cancelled_at?: string | null
          completed_at?: string | null
          completion_note?: string | null
          contributor_ids?: string[]
          created_at?: string
          evidence_not_available_reason?: string | null
          evidence_references?: string[]
          id?: string
          latest_event_id?: string
          note?: string | null
          organisation_id?: string
          plan_id?: string
          portfolio_id?: string
          portfolio_item_id?: string
          recommendation_id?: string
          recommendation_version?: string
          source_decision_id?: string
          source_decision_version?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["recommendation_action_status"]
          target_date?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_improvement_actions_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_improvement_actions_latest_event_id_fkey"
            columns: ["latest_event_id"]
            isOneToOne: true
            referencedRelation: "recommendation_improvement_action_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_improvement_actions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_improvement_actions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "recommendation_improvement_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_improvement_actions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "recommendation_portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_improvement_actions_portfolio_item_id_fkey"
            columns: ["portfolio_item_id"]
            isOneToOne: false
            referencedRelation: "recommendation_portfolio_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_improvement_actions_source_decision_id_fkey"
            columns: ["source_decision_id"]
            isOneToOne: false
            referencedRelation: "recommendation_item_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_improvement_actions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_improvement_plans: {
        Row: {
          analysis_run_id: string
          created_at: string
          created_by_user_id: string
          id: string
          organisation_id: string
          plan_version: number
          portfolio_id: string
          workspace_id: string
        }
        Insert: {
          analysis_run_id: string
          created_at?: string
          created_by_user_id: string
          id?: string
          organisation_id: string
          plan_version: number
          portfolio_id: string
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          organisation_id?: string
          plan_version?: number
          portfolio_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_improvement_plans_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_improvement_plans_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_improvement_plans_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "recommendation_portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_improvement_plans_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_integrity_results: {
        Row: {
          checker_version: string
          checks: Json
          export_job_id: string
          id: string
          organisation_id: string
          payload_hash: string
          portfolio_id: string
          recorded_at: string
          status: Database["public"]["Enums"]["recommendation_integrity_status"]
          workspace_id: string
        }
        Insert: {
          checker_version: string
          checks: Json
          export_job_id: string
          id?: string
          organisation_id: string
          payload_hash: string
          portfolio_id: string
          recorded_at?: string
          status: Database["public"]["Enums"]["recommendation_integrity_status"]
          workspace_id: string
        }
        Update: {
          checker_version?: string
          checks?: Json
          export_job_id?: string
          id?: string
          organisation_id?: string
          payload_hash?: string
          portfolio_id?: string
          recorded_at?: string
          status?: Database["public"]["Enums"]["recommendation_integrity_status"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_integrity_results_export_job_id_fkey"
            columns: ["export_job_id"]
            isOneToOne: true
            referencedRelation: "recommendation_audit_export_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_integrity_results_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_integrity_results_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "recommendation_portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_integrity_results_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_item_decisions: {
        Row: {
          acknowledged: boolean
          analysis_run_id: string
          current_state: Database["public"]["Enums"]["recommendation_decision_state"]
          decision_version: number
          id: string
          last_actor_type: Database["public"]["Enums"]["recommendation_decision_actor_type"]
          last_actor_user_id: string | null
          latest_event_id: string
          organisation_id: string
          portfolio_id: string
          portfolio_item_id: string
          reason_category:
            | Database["public"]["Enums"]["recommendation_decision_reason_category"]
            | null
          recommendation_id: string
          recommendation_version: string
          review_at: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          acknowledged?: boolean
          analysis_run_id: string
          current_state: Database["public"]["Enums"]["recommendation_decision_state"]
          decision_version: number
          id?: string
          last_actor_type: Database["public"]["Enums"]["recommendation_decision_actor_type"]
          last_actor_user_id?: string | null
          latest_event_id: string
          organisation_id: string
          portfolio_id: string
          portfolio_item_id: string
          reason_category?:
            | Database["public"]["Enums"]["recommendation_decision_reason_category"]
            | null
          recommendation_id: string
          recommendation_version: string
          review_at?: string | null
          updated_at: string
          workspace_id: string
        }
        Update: {
          acknowledged?: boolean
          analysis_run_id?: string
          current_state?: Database["public"]["Enums"]["recommendation_decision_state"]
          decision_version?: number
          id?: string
          last_actor_type?: Database["public"]["Enums"]["recommendation_decision_actor_type"]
          last_actor_user_id?: string | null
          latest_event_id?: string
          organisation_id?: string
          portfolio_id?: string
          portfolio_item_id?: string
          reason_category?:
            | Database["public"]["Enums"]["recommendation_decision_reason_category"]
            | null
          recommendation_id?: string
          recommendation_version?: string
          review_at?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_item_decisions_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_item_decisions_latest_event_id_fkey"
            columns: ["latest_event_id"]
            isOneToOne: true
            referencedRelation: "recommendation_decision_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_item_decisions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_item_decisions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "recommendation_portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_item_decisions_portfolio_item_id_fkey"
            columns: ["portfolio_item_id"]
            isOneToOne: true
            referencedRelation: "recommendation_portfolio_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_item_decisions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_operational_events: {
        Row: {
          actor_user_id: string | null
          alert_code: string | null
          categorical_metadata: Json
          correlation_id: string
          event_type: string
          id: number
          object_id: string
          object_type: string
          object_version: string
          occurred_at: string
          organisation_id: string | null
          severity: Database["public"]["Enums"]["recommendation_operational_severity"]
          workspace_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          alert_code?: string | null
          categorical_metadata?: Json
          correlation_id?: string
          event_type: string
          id?: never
          object_id: string
          object_type: string
          object_version: string
          occurred_at?: string
          organisation_id?: string | null
          severity: Database["public"]["Enums"]["recommendation_operational_severity"]
          workspace_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          alert_code?: string | null
          categorical_metadata?: Json
          correlation_id?: string
          event_type?: string
          id?: never
          object_id?: string
          object_type?: string
          object_version?: string
          occurred_at?: string
          organisation_id?: string | null
          severity?: Database["public"]["Enums"]["recommendation_operational_severity"]
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_operational_events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_operational_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_outcome_measure_versions: {
        Row: {
          absolute_tolerance: number | null
          accountable_owner_id: string
          action_id: string
          baseline_binary: boolean | null
          baseline_effective_at: string | null
          baseline_numeric: number | null
          cadence: string
          created_at: string
          created_by_user_id: string
          decimal_scale: number
          direction: Database["public"]["Enums"]["recommendation_outcome_direction"]
          evaluator_version: string
          id: string
          measure_id: string
          measure_version: number
          organisation_id: string
          outcome_id: string
          policy_version: string
          retired_at: string | null
          source_catalogue_digest: string
          source_catalogue_version: string
          source_catalogue_version_id: string
          source_description: string
          source_recommendation_id: string
          source_recommendation_version: string
          source_reference: string | null
          supersedes_measure_version_id: string | null
          target_binary: boolean | null
          target_date: string | null
          target_deadline_at: string | null
          target_numeric: number | null
          target_timezone: string | null
          unit: string
          workspace_id: string
        }
        Insert: {
          absolute_tolerance?: number | null
          accountable_owner_id: string
          action_id: string
          baseline_binary?: boolean | null
          baseline_effective_at?: string | null
          baseline_numeric?: number | null
          cadence: string
          created_at?: string
          created_by_user_id: string
          decimal_scale: number
          direction: Database["public"]["Enums"]["recommendation_outcome_direction"]
          evaluator_version: string
          id?: string
          measure_id: string
          measure_version: number
          organisation_id: string
          outcome_id: string
          policy_version: string
          retired_at?: string | null
          source_catalogue_digest: string
          source_catalogue_version: string
          source_catalogue_version_id: string
          source_description: string
          source_recommendation_id: string
          source_recommendation_version: string
          source_reference?: string | null
          supersedes_measure_version_id?: string | null
          target_binary?: boolean | null
          target_date?: string | null
          target_deadline_at?: string | null
          target_numeric?: number | null
          target_timezone?: string | null
          unit: string
          workspace_id: string
        }
        Update: {
          absolute_tolerance?: number | null
          accountable_owner_id?: string
          action_id?: string
          baseline_binary?: boolean | null
          baseline_effective_at?: string | null
          baseline_numeric?: number | null
          cadence?: string
          created_at?: string
          created_by_user_id?: string
          decimal_scale?: number
          direction?: Database["public"]["Enums"]["recommendation_outcome_direction"]
          evaluator_version?: string
          id?: string
          measure_id?: string
          measure_version?: number
          organisation_id?: string
          outcome_id?: string
          policy_version?: string
          retired_at?: string | null
          source_catalogue_digest?: string
          source_catalogue_version?: string
          source_catalogue_version_id?: string
          source_description?: string
          source_recommendation_id?: string
          source_recommendation_version?: string
          source_reference?: string | null
          supersedes_measure_version_id?: string | null
          target_binary?: boolean | null
          target_date?: string | null
          target_deadline_at?: string | null
          target_numeric?: number | null
          target_timezone?: string | null
          unit?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_outcome_measur_supersedes_measure_version_i_fkey"
            columns: ["supersedes_measure_version_id"]
            isOneToOne: true
            referencedRelation: "recommendation_outcome_measure_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_outcome_measure_source_catalogue_version_id_fkey"
            columns: ["source_catalogue_version_id"]
            isOneToOne: false
            referencedRelation: "recommendation_catalogue_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_outcome_measure_versions_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "recommendation_improvement_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_outcome_measure_versions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_outcome_measure_versions_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "recommendation_action_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_outcome_measure_versions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_outcome_observations: {
        Row: {
          actor_user_id: string
          binary_value: boolean | null
          correction_reason: string | null
          effective_at: string
          id: string
          idempotency_key: string
          measure_version_id: string
          numeric_value: number | null
          organisation_id: string
          payload_hash: string
          recorded_at: string
          source_description: string
          source_reference: string | null
          supersedes_observation_id: string | null
          trace_id: string
          workspace_id: string
        }
        Insert: {
          actor_user_id: string
          binary_value?: boolean | null
          correction_reason?: string | null
          effective_at: string
          id?: string
          idempotency_key: string
          measure_version_id: string
          numeric_value?: number | null
          organisation_id: string
          payload_hash: string
          recorded_at?: string
          source_description: string
          source_reference?: string | null
          supersedes_observation_id?: string | null
          trace_id: string
          workspace_id: string
        }
        Update: {
          actor_user_id?: string
          binary_value?: boolean | null
          correction_reason?: string | null
          effective_at?: string
          id?: string
          idempotency_key?: string
          measure_version_id?: string
          numeric_value?: number | null
          organisation_id?: string
          payload_hash?: string
          recorded_at?: string
          source_description?: string
          source_reference?: string | null
          supersedes_observation_id?: string | null
          trace_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_outcome_observati_supersedes_observation_id_fkey"
            columns: ["supersedes_observation_id"]
            isOneToOne: true
            referencedRelation: "recommendation_outcome_observations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_outcome_observations_measure_version_id_fkey"
            columns: ["measure_version_id"]
            isOneToOne: false
            referencedRelation: "recommendation_outcome_measure_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_outcome_observations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_outcome_observations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_outcome_status_events: {
        Row: {
          customer_copy: string
          deadline_was_missed: boolean
          decisive_effective_at: string | null
          decisive_observation_id: string | null
          decisive_recorded_at: string | null
          evaluator_version: string
          facts: Json
          id: string
          measure_version_id: string
          occurred_at: string
          organisation_id: string
          policy_version: string
          reason_code: string
          recorded_late: boolean
          sequence: number
          status: Database["public"]["Enums"]["recommendation_outcome_status"]
          timing: string
          trace_id: string
          trigger_observation_id: string | null
          workspace_id: string
        }
        Insert: {
          customer_copy: string
          deadline_was_missed: boolean
          decisive_effective_at?: string | null
          decisive_observation_id?: string | null
          decisive_recorded_at?: string | null
          evaluator_version: string
          facts: Json
          id?: string
          measure_version_id: string
          occurred_at?: string
          organisation_id: string
          policy_version: string
          reason_code: string
          recorded_late: boolean
          sequence: number
          status: Database["public"]["Enums"]["recommendation_outcome_status"]
          timing: string
          trace_id: string
          trigger_observation_id?: string | null
          workspace_id: string
        }
        Update: {
          customer_copy?: string
          deadline_was_missed?: boolean
          decisive_effective_at?: string | null
          decisive_observation_id?: string | null
          decisive_recorded_at?: string | null
          evaluator_version?: string
          facts?: Json
          id?: string
          measure_version_id?: string
          occurred_at?: string
          organisation_id?: string
          policy_version?: string
          reason_code?: string
          recorded_late?: boolean
          sequence?: number
          status?: Database["public"]["Enums"]["recommendation_outcome_status"]
          timing?: string
          trace_id?: string
          trigger_observation_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_outcome_status_even_decisive_observation_id_fkey"
            columns: ["decisive_observation_id"]
            isOneToOne: false
            referencedRelation: "recommendation_outcome_observations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_outcome_status_event_trigger_observation_id_fkey"
            columns: ["trigger_observation_id"]
            isOneToOne: false
            referencedRelation: "recommendation_outcome_observations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_outcome_status_events_measure_version_id_fkey"
            columns: ["measure_version_id"]
            isOneToOne: false
            referencedRelation: "recommendation_outcome_measure_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_outcome_status_events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_outcome_status_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_portfolio_items: {
        Row: {
          analysis_run_id: string
          blocking_dependency_ids: Json
          catalogue_order: number
          caveats: Json
          confidence_caveat: string | null
          confidence_result: Database["public"]["Enums"]["recommendation_confidence_gate_result"]
          confidence_state: Database["public"]["Enums"]["recommendation_confidence_state"]
          created_at: string
          dependencies: Json
          effort: string
          generated_horizon:
            | Database["public"]["Enums"]["recommendation_sequence_horizon"]
            | null
          generated_rank: number
          generated_sequence: number | null
          id: string
          impact: string
          matched_triggers: Json
          organisation_id: string
          outcome: string
          portfolio_id: string
          portfolio_order: number
          primary_class: Database["public"]["Enums"]["recommendation_portfolio_class"]
          priority_item_id: string
          priority_label: Database["public"]["Enums"]["recommendation_priority_label"]
          rationale: Json
          recommendation_definition_id: string
          recommendation_id: string
          recommendation_version: string
          resolution_candidate_id: string
          secondary_tags: Json
          semantic_hash: string
          sequence_item_id: string
          sequence_reason_code: string
          sequence_state: Database["public"]["Enums"]["recommendation_sequence_state"]
          source_trace_node_ids: Json
          success_measures: Json
          title: string
          urgency: number
          workspace_id: string
        }
        Insert: {
          analysis_run_id: string
          blocking_dependency_ids: Json
          catalogue_order: number
          caveats: Json
          confidence_caveat?: string | null
          confidence_result: Database["public"]["Enums"]["recommendation_confidence_gate_result"]
          confidence_state: Database["public"]["Enums"]["recommendation_confidence_state"]
          created_at?: string
          dependencies: Json
          effort: string
          generated_horizon?:
            | Database["public"]["Enums"]["recommendation_sequence_horizon"]
            | null
          generated_rank: number
          generated_sequence?: number | null
          id?: string
          impact: string
          matched_triggers: Json
          organisation_id: string
          outcome: string
          portfolio_id: string
          portfolio_order: number
          primary_class: Database["public"]["Enums"]["recommendation_portfolio_class"]
          priority_item_id: string
          priority_label: Database["public"]["Enums"]["recommendation_priority_label"]
          rationale: Json
          recommendation_definition_id: string
          recommendation_id: string
          recommendation_version: string
          resolution_candidate_id: string
          secondary_tags: Json
          semantic_hash: string
          sequence_item_id: string
          sequence_reason_code: string
          sequence_state: Database["public"]["Enums"]["recommendation_sequence_state"]
          source_trace_node_ids: Json
          success_measures: Json
          title: string
          urgency: number
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string
          blocking_dependency_ids?: Json
          catalogue_order?: number
          caveats?: Json
          confidence_caveat?: string | null
          confidence_result?: Database["public"]["Enums"]["recommendation_confidence_gate_result"]
          confidence_state?: Database["public"]["Enums"]["recommendation_confidence_state"]
          created_at?: string
          dependencies?: Json
          effort?: string
          generated_horizon?:
            | Database["public"]["Enums"]["recommendation_sequence_horizon"]
            | null
          generated_rank?: number
          generated_sequence?: number | null
          id?: string
          impact?: string
          matched_triggers?: Json
          organisation_id?: string
          outcome?: string
          portfolio_id?: string
          portfolio_order?: number
          primary_class?: Database["public"]["Enums"]["recommendation_portfolio_class"]
          priority_item_id?: string
          priority_label?: Database["public"]["Enums"]["recommendation_priority_label"]
          rationale?: Json
          recommendation_definition_id?: string
          recommendation_id?: string
          recommendation_version?: string
          resolution_candidate_id?: string
          secondary_tags?: Json
          semantic_hash?: string
          sequence_item_id?: string
          sequence_reason_code?: string
          sequence_state?: Database["public"]["Enums"]["recommendation_sequence_state"]
          source_trace_node_ids?: Json
          success_measures?: Json
          title?: string
          urgency?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_portfolio_item_recommendation_definition_id_fkey"
            columns: ["recommendation_definition_id"]
            isOneToOne: false
            referencedRelation: "recommendation_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_portfolio_items_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_portfolio_items_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_portfolio_items_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "recommendation_portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_portfolio_items_priority_item_id_fkey"
            columns: ["priority_item_id"]
            isOneToOne: false
            referencedRelation: "recommendation_priority_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_portfolio_items_resolution_candidate_id_fkey"
            columns: ["resolution_candidate_id"]
            isOneToOne: false
            referencedRelation: "recommendation_resolution_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_portfolio_items_sequence_item_id_fkey"
            columns: ["sequence_item_id"]
            isOneToOne: false
            referencedRelation: "recommendation_sequence_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_portfolio_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_portfolios: {
        Row: {
          analysis_run_id: string
          canonical_input: Json
          canonical_portfolio: Json
          catalogue_digest: string
          catalogue_id: string
          catalogue_version: string
          catalogue_version_id: string
          confidence_gate_id: string
          configuration_set_id: string
          conflict_resolution_id: string
          created_at: string
          id: string
          input_hash: string
          item_count: number
          organisation_id: string
          output_hash: string
          policy_version: string
          portfolio_state: Database["public"]["Enums"]["recommendation_portfolio_state"]
          priority_model_id: string
          projector_version: string
          recommendation_evaluation_id: string
          scheduled_count: number
          sequence_model_id: string
          workspace_id: string
        }
        Insert: {
          analysis_run_id: string
          canonical_input: Json
          canonical_portfolio: Json
          catalogue_digest: string
          catalogue_id: string
          catalogue_version: string
          catalogue_version_id: string
          confidence_gate_id: string
          configuration_set_id: string
          conflict_resolution_id: string
          created_at?: string
          id?: string
          input_hash: string
          item_count: number
          organisation_id: string
          output_hash: string
          policy_version: string
          portfolio_state: Database["public"]["Enums"]["recommendation_portfolio_state"]
          priority_model_id: string
          projector_version: string
          recommendation_evaluation_id: string
          scheduled_count: number
          sequence_model_id: string
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string
          canonical_input?: Json
          canonical_portfolio?: Json
          catalogue_digest?: string
          catalogue_id?: string
          catalogue_version?: string
          catalogue_version_id?: string
          confidence_gate_id?: string
          configuration_set_id?: string
          conflict_resolution_id?: string
          created_at?: string
          id?: string
          input_hash?: string
          item_count?: number
          organisation_id?: string
          output_hash?: string
          policy_version?: string
          portfolio_state?: Database["public"]["Enums"]["recommendation_portfolio_state"]
          priority_model_id?: string
          projector_version?: string
          recommendation_evaluation_id?: string
          scheduled_count?: number
          sequence_model_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_portfolios_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_portfolios_catalogue_version_id_fkey"
            columns: ["catalogue_version_id"]
            isOneToOne: false
            referencedRelation: "recommendation_catalogue_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_portfolios_confidence_gate_id_fkey"
            columns: ["confidence_gate_id"]
            isOneToOne: false
            referencedRelation: "recommendation_confidence_gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_portfolios_conflict_resolution_id_fkey"
            columns: ["conflict_resolution_id"]
            isOneToOne: false
            referencedRelation: "recommendation_conflict_resolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_portfolios_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_portfolios_priority_model_id_fkey"
            columns: ["priority_model_id"]
            isOneToOne: false
            referencedRelation: "recommendation_priority_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_portfolios_recommendation_evaluation_id_fkey"
            columns: ["recommendation_evaluation_id"]
            isOneToOne: false
            referencedRelation: "recommendation_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_portfolios_sequence_model_id_fkey"
            columns: ["sequence_model_id"]
            isOneToOne: false
            referencedRelation: "recommendation_sequence_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_portfolios_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_priority_display_preferences: {
        Row: {
          actor_user_id: string
          created_at: string
          id: string
          idempotency_key: string
          ordered_recommendation_ids: Json
          organisation_id: string
          previous_preference_id: string | null
          priority_model_id: string
          version: number
          workspace_id: string
        }
        Insert: {
          actor_user_id: string
          created_at?: string
          id?: string
          idempotency_key: string
          ordered_recommendation_ids: Json
          organisation_id: string
          previous_preference_id?: string | null
          priority_model_id: string
          version: number
          workspace_id: string
        }
        Update: {
          actor_user_id?: string
          created_at?: string
          id?: string
          idempotency_key?: string
          ordered_recommendation_ids?: Json
          organisation_id?: string
          previous_preference_id?: string | null
          priority_model_id?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_priority_display_pre_previous_preference_id_fkey"
            columns: ["previous_preference_id"]
            isOneToOne: false
            referencedRelation: "recommendation_priority_display_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_priority_display_preferen_priority_model_id_fkey"
            columns: ["priority_model_id"]
            isOneToOne: false
            referencedRelation: "recommendation_priority_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_priority_display_preference_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_priority_display_preferences_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_priority_items: {
        Row: {
          analysis_run_id: string
          catalogue_order: number
          component_weights: Json
          components: Json
          created_at: string
          effort: string
          generated_rank: number
          id: string
          impact: string
          organisation_id: string
          post_confidence_result: Database["public"]["Enums"]["recommendation_confidence_gate_result"]
          priority_label: Database["public"]["Enums"]["recommendation_priority_label"]
          priority_model_id: string
          rationale: Json
          raw_rank_score: number
          recommendation_definition_id: string
          recommendation_id: string
          recommendation_version: string
          resolution_candidate_id: string
          semantic_hash: string
          source_recommendation_ids: Json
          source_trace_node_ids: Json
          workspace_id: string
        }
        Insert: {
          analysis_run_id: string
          catalogue_order: number
          component_weights: Json
          components: Json
          created_at?: string
          effort: string
          generated_rank: number
          id?: string
          impact: string
          organisation_id: string
          post_confidence_result: Database["public"]["Enums"]["recommendation_confidence_gate_result"]
          priority_label: Database["public"]["Enums"]["recommendation_priority_label"]
          priority_model_id: string
          rationale: Json
          raw_rank_score: number
          recommendation_definition_id: string
          recommendation_id: string
          recommendation_version: string
          resolution_candidate_id: string
          semantic_hash: string
          source_recommendation_ids: Json
          source_trace_node_ids: Json
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string
          catalogue_order?: number
          component_weights?: Json
          components?: Json
          created_at?: string
          effort?: string
          generated_rank?: number
          id?: string
          impact?: string
          organisation_id?: string
          post_confidence_result?: Database["public"]["Enums"]["recommendation_confidence_gate_result"]
          priority_label?: Database["public"]["Enums"]["recommendation_priority_label"]
          priority_model_id?: string
          rationale?: Json
          raw_rank_score?: number
          recommendation_definition_id?: string
          recommendation_id?: string
          recommendation_version?: string
          resolution_candidate_id?: string
          semantic_hash?: string
          source_recommendation_ids?: Json
          source_trace_node_ids?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_priority_items_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_priority_items_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_priority_items_priority_model_id_fkey"
            columns: ["priority_model_id"]
            isOneToOne: false
            referencedRelation: "recommendation_priority_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_priority_items_recommendation_definition_id_fkey"
            columns: ["recommendation_definition_id"]
            isOneToOne: false
            referencedRelation: "recommendation_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_priority_items_resolution_candidate_id_fkey"
            columns: ["resolution_candidate_id"]
            isOneToOne: false
            referencedRelation: "recommendation_resolution_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_priority_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_priority_models: {
        Row: {
          analysis_run_id: string
          canonical_input: Json
          canonical_priority: Json
          catalogue_digest: string
          catalogue_id: string
          catalogue_version: string
          catalogue_version_id: string
          confidence_gate_id: string
          configuration_set_id: string
          conflict_resolution_id: string
          created_at: string
          id: string
          input_hash: string
          intelligence_result_id: string
          model_version: string
          organisation_id: string
          output_hash: string
          policy_version: string
          recommendation_evaluation_id: string
          workspace_id: string
        }
        Insert: {
          analysis_run_id: string
          canonical_input: Json
          canonical_priority: Json
          catalogue_digest: string
          catalogue_id: string
          catalogue_version: string
          catalogue_version_id: string
          confidence_gate_id: string
          configuration_set_id: string
          conflict_resolution_id: string
          created_at?: string
          id?: string
          input_hash: string
          intelligence_result_id: string
          model_version: string
          organisation_id: string
          output_hash: string
          policy_version: string
          recommendation_evaluation_id: string
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string
          canonical_input?: Json
          canonical_priority?: Json
          catalogue_digest?: string
          catalogue_id?: string
          catalogue_version?: string
          catalogue_version_id?: string
          confidence_gate_id?: string
          configuration_set_id?: string
          conflict_resolution_id?: string
          created_at?: string
          id?: string
          input_hash?: string
          intelligence_result_id?: string
          model_version?: string
          organisation_id?: string
          output_hash?: string
          policy_version?: string
          recommendation_evaluation_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_priority_model_recommendation_evaluation_id_fkey"
            columns: ["recommendation_evaluation_id"]
            isOneToOne: false
            referencedRelation: "recommendation_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_priority_models_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_priority_models_catalogue_version_id_fkey"
            columns: ["catalogue_version_id"]
            isOneToOne: false
            referencedRelation: "recommendation_catalogue_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_priority_models_confidence_gate_id_fkey"
            columns: ["confidence_gate_id"]
            isOneToOne: false
            referencedRelation: "recommendation_confidence_gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_priority_models_conflict_resolution_id_fkey"
            columns: ["conflict_resolution_id"]
            isOneToOne: false
            referencedRelation: "recommendation_conflict_resolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_priority_models_intelligence_result_id_fkey"
            columns: ["intelligence_result_id"]
            isOneToOne: false
            referencedRelation: "delivery_intelligence_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_priority_models_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_priority_models_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_product_handoff_events: {
        Row: {
          actor_user_id: string
          event_type: Database["public"]["Enums"]["delivery_product_handoff_event_type"]
          handoff_id: string
          id: number
          occurred_at: string
          organisation_id: string
          workspace_id: string
        }
        Insert: {
          actor_user_id: string
          event_type: Database["public"]["Enums"]["delivery_product_handoff_event_type"]
          handoff_id: string
          id?: never
          occurred_at?: string
          organisation_id: string
          workspace_id: string
        }
        Update: {
          actor_user_id?: string
          event_type?: Database["public"]["Enums"]["delivery_product_handoff_event_type"]
          handoff_id?: string
          id?: never
          occurred_at?: string
          organisation_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_product_handoff_events_handoff_id_fkey"
            columns: ["handoff_id"]
            isOneToOne: false
            referencedRelation: "recommendation_product_handoffs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_product_handoff_events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_product_handoff_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_product_handoffs: {
        Row: {
          analysis_run_id: string
          consent_basis: string
          consented_at: string
          created_at: string
          created_by_user_id: string
          cta: Database["public"]["Enums"]["delivery_product_handoff_cta"]
          expires_at: string
          id: string
          idempotency_key: string
          organisation_id: string
          recommendation_id: string
          recommendation_version: string
          request_hash: string
          source_action_id: string
          source_portfolio_item_id: string
          target_id: string
          target_type: string
          target_version: string
          token_hash: string
          workspace_id: string
        }
        Insert: {
          analysis_run_id: string
          consent_basis: string
          consented_at: string
          created_at?: string
          created_by_user_id: string
          cta: Database["public"]["Enums"]["delivery_product_handoff_cta"]
          expires_at: string
          id?: string
          idempotency_key: string
          organisation_id: string
          recommendation_id: string
          recommendation_version: string
          request_hash: string
          source_action_id: string
          source_portfolio_item_id: string
          target_id: string
          target_type: string
          target_version: string
          token_hash: string
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string
          consent_basis?: string
          consented_at?: string
          created_at?: string
          created_by_user_id?: string
          cta?: Database["public"]["Enums"]["delivery_product_handoff_cta"]
          expires_at?: string
          id?: string
          idempotency_key?: string
          organisation_id?: string
          recommendation_id?: string
          recommendation_version?: string
          request_hash?: string
          source_action_id?: string
          source_portfolio_item_id?: string
          target_id?: string
          target_type?: string
          target_version?: string
          token_hash?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_product_handoffs_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_product_handoffs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_product_handoffs_source_action_id_fkey"
            columns: ["source_action_id"]
            isOneToOne: false
            referencedRelation: "recommendation_improvement_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_product_handoffs_source_portfolio_item_id_fkey"
            columns: ["source_portfolio_item_id"]
            isOneToOne: false
            referencedRelation: "recommendation_portfolio_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_product_handoffs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_resolution_candidates: {
        Row: {
          analysis_run_id: string
          candidate_confidence_gate_id: string
          catalogue_order: number
          created_at: string
          id: string
          organisation_id: string
          post_confidence_result: Database["public"]["Enums"]["recommendation_confidence_gate_result"]
          reason_code: Database["public"]["Enums"]["recommendation_resolution_reason"]
          recommendation_definition_id: string
          recommendation_id: string
          recommendation_version: string
          resolution_id: string
          resolution_result: Database["public"]["Enums"]["recommendation_resolution_result"]
          semantic_hash: string
          source_candidate_gate_ids: Json
          source_trace_node_ids: Json
          winner_candidate_confidence_gate_id: string | null
          winner_recommendation_id: string | null
          winner_recommendation_version: string | null
          workspace_id: string
        }
        Insert: {
          analysis_run_id: string
          candidate_confidence_gate_id: string
          catalogue_order: number
          created_at?: string
          id?: string
          organisation_id: string
          post_confidence_result: Database["public"]["Enums"]["recommendation_confidence_gate_result"]
          reason_code: Database["public"]["Enums"]["recommendation_resolution_reason"]
          recommendation_definition_id: string
          recommendation_id: string
          recommendation_version: string
          resolution_id: string
          resolution_result: Database["public"]["Enums"]["recommendation_resolution_result"]
          semantic_hash: string
          source_candidate_gate_ids: Json
          source_trace_node_ids: Json
          winner_candidate_confidence_gate_id?: string | null
          winner_recommendation_id?: string | null
          winner_recommendation_version?: string | null
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string
          candidate_confidence_gate_id?: string
          catalogue_order?: number
          created_at?: string
          id?: string
          organisation_id?: string
          post_confidence_result?: Database["public"]["Enums"]["recommendation_confidence_gate_result"]
          reason_code?: Database["public"]["Enums"]["recommendation_resolution_reason"]
          recommendation_definition_id?: string
          recommendation_id?: string
          recommendation_version?: string
          resolution_id?: string
          resolution_result?: Database["public"]["Enums"]["recommendation_resolution_result"]
          semantic_hash?: string
          source_candidate_gate_ids?: Json
          source_trace_node_ids?: Json
          winner_candidate_confidence_gate_id?: string | null
          winner_recommendation_id?: string | null
          winner_recommendation_version?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_resolution_can_candidate_confidence_gate_id_fkey"
            columns: ["candidate_confidence_gate_id"]
            isOneToOne: false
            referencedRelation: "recommendation_candidate_confidence_gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_resolution_can_recommendation_definition_id_fkey"
            columns: ["recommendation_definition_id"]
            isOneToOne: false
            referencedRelation: "recommendation_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_resolution_can_winner_candidate_confidence__fkey"
            columns: ["winner_candidate_confidence_gate_id"]
            isOneToOne: false
            referencedRelation: "recommendation_candidate_confidence_gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_resolution_candidates_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_resolution_candidates_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_resolution_candidates_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "recommendation_conflict_resolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_resolution_candidates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_resolution_trace_links: {
        Row: {
          analysis_run_id: string
          created_at: string
          link_kind: string
          organisation_id: string
          resolution_candidate_id: string
          resolution_id: string
          source_candidate_confidence_gate_id: string
          trace_node_id: string
          workspace_id: string
        }
        Insert: {
          analysis_run_id: string
          created_at?: string
          link_kind: string
          organisation_id: string
          resolution_candidate_id: string
          resolution_id: string
          source_candidate_confidence_gate_id: string
          trace_node_id: string
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string
          created_at?: string
          link_kind?: string
          organisation_id?: string
          resolution_candidate_id?: string
          resolution_id?: string
          source_candidate_confidence_gate_id?: string
          trace_node_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_resolution_tra_source_candidate_confidence__fkey"
            columns: ["source_candidate_confidence_gate_id"]
            isOneToOne: false
            referencedRelation: "recommendation_candidate_confidence_gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_resolution_trace_li_resolution_candidate_id_fkey"
            columns: ["resolution_candidate_id"]
            isOneToOne: false
            referencedRelation: "recommendation_resolution_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_resolution_trace_links_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_resolution_trace_links_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_resolution_trace_links_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "recommendation_conflict_resolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_resolution_trace_links_trace_node_id_fkey"
            columns: ["trace_node_id"]
            isOneToOne: false
            referencedRelation: "delivery_intelligence_trace_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_resolution_trace_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_sequence_dependencies: {
        Row: {
          created_at: string
          dependant_recommendation_id: string
          dependant_sequence_item_id: string
          dependency_state: Database["public"]["Enums"]["recommendation_dependency_state"]
          dependency_type: string
          id: string
          organisation_id: string
          reason_code: string
          resolution: Database["public"]["Enums"]["recommendation_dependency_resolution"]
          resolved_dependency_id: string | null
          resolved_sequence_item_id: string | null
          semantic_hash: string
          sequence_model_id: string
          source_dependency_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          dependant_recommendation_id: string
          dependant_sequence_item_id: string
          dependency_state: Database["public"]["Enums"]["recommendation_dependency_state"]
          dependency_type: string
          id?: string
          organisation_id: string
          reason_code: string
          resolution: Database["public"]["Enums"]["recommendation_dependency_resolution"]
          resolved_dependency_id?: string | null
          resolved_sequence_item_id?: string | null
          semantic_hash: string
          sequence_model_id: string
          source_dependency_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          dependant_recommendation_id?: string
          dependant_sequence_item_id?: string
          dependency_state?: Database["public"]["Enums"]["recommendation_dependency_state"]
          dependency_type?: string
          id?: string
          organisation_id?: string
          reason_code?: string
          resolution?: Database["public"]["Enums"]["recommendation_dependency_resolution"]
          resolved_dependency_id?: string | null
          resolved_sequence_item_id?: string | null
          semantic_hash?: string
          sequence_model_id?: string
          source_dependency_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_sequence_depende_dependant_sequence_item_id_fkey"
            columns: ["dependant_sequence_item_id"]
            isOneToOne: false
            referencedRelation: "recommendation_sequence_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_sequence_dependen_resolved_sequence_item_id_fkey"
            columns: ["resolved_sequence_item_id"]
            isOneToOne: false
            referencedRelation: "recommendation_sequence_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_sequence_dependencies_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_sequence_dependencies_sequence_model_id_fkey"
            columns: ["sequence_model_id"]
            isOneToOne: false
            referencedRelation: "recommendation_sequence_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_sequence_dependencies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_sequence_items: {
        Row: {
          analysis_run_id: string
          blocking_dependency_ids: Json
          catalogue_order: number
          caveats: Json
          created_at: string
          effort: string
          generated_horizon:
            | Database["public"]["Enums"]["recommendation_sequence_horizon"]
            | null
          generated_rank: number
          generated_sequence: number | null
          id: string
          organisation_id: string
          priority_item_id: string
          reason_code: string
          recommendation_id: string
          recommendation_version: string
          semantic_hash: string
          sequence_model_id: string
          sequence_state: Database["public"]["Enums"]["recommendation_sequence_state"]
          source_trace_node_ids: Json
          workspace_id: string
        }
        Insert: {
          analysis_run_id: string
          blocking_dependency_ids: Json
          catalogue_order: number
          caveats: Json
          created_at?: string
          effort: string
          generated_horizon?:
            | Database["public"]["Enums"]["recommendation_sequence_horizon"]
            | null
          generated_rank: number
          generated_sequence?: number | null
          id?: string
          organisation_id: string
          priority_item_id: string
          reason_code: string
          recommendation_id: string
          recommendation_version: string
          semantic_hash: string
          sequence_model_id: string
          sequence_state: Database["public"]["Enums"]["recommendation_sequence_state"]
          source_trace_node_ids: Json
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string
          blocking_dependency_ids?: Json
          catalogue_order?: number
          caveats?: Json
          created_at?: string
          effort?: string
          generated_horizon?:
            | Database["public"]["Enums"]["recommendation_sequence_horizon"]
            | null
          generated_rank?: number
          generated_sequence?: number | null
          id?: string
          organisation_id?: string
          priority_item_id?: string
          reason_code?: string
          recommendation_id?: string
          recommendation_version?: string
          semantic_hash?: string
          sequence_model_id?: string
          sequence_state?: Database["public"]["Enums"]["recommendation_sequence_state"]
          source_trace_node_ids?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_sequence_items_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_sequence_items_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_sequence_items_priority_item_id_fkey"
            columns: ["priority_item_id"]
            isOneToOne: false
            referencedRelation: "recommendation_priority_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_sequence_items_sequence_model_id_fkey"
            columns: ["sequence_model_id"]
            isOneToOne: false
            referencedRelation: "recommendation_sequence_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_sequence_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_sequence_models: {
        Row: {
          analysis_run_id: string
          canonical_input: Json
          canonical_sequence: Json
          catalogue_digest: string
          catalogue_id: string
          catalogue_version: string
          catalogue_version_id: string
          configuration_set_id: string
          conflict_resolution_id: string
          created_at: string
          engine_version: string
          id: string
          input_hash: string
          organisation_id: string
          output_hash: string
          policy_version: string
          priority_model_id: string
          workspace_id: string
        }
        Insert: {
          analysis_run_id: string
          canonical_input: Json
          canonical_sequence: Json
          catalogue_digest: string
          catalogue_id: string
          catalogue_version: string
          catalogue_version_id: string
          configuration_set_id: string
          conflict_resolution_id: string
          created_at?: string
          engine_version: string
          id?: string
          input_hash: string
          organisation_id: string
          output_hash: string
          policy_version: string
          priority_model_id: string
          workspace_id: string
        }
        Update: {
          analysis_run_id?: string
          canonical_input?: Json
          canonical_sequence?: Json
          catalogue_digest?: string
          catalogue_id?: string
          catalogue_version?: string
          catalogue_version_id?: string
          configuration_set_id?: string
          conflict_resolution_id?: string
          created_at?: string
          engine_version?: string
          id?: string
          input_hash?: string
          organisation_id?: string
          output_hash?: string
          policy_version?: string
          priority_model_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_sequence_models_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_sequence_models_catalogue_version_id_fkey"
            columns: ["catalogue_version_id"]
            isOneToOne: false
            referencedRelation: "recommendation_catalogue_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_sequence_models_conflict_resolution_id_fkey"
            columns: ["conflict_resolution_id"]
            isOneToOne: false
            referencedRelation: "recommendation_conflict_resolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_sequence_models_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_sequence_models_priority_model_id_fkey"
            columns: ["priority_model_id"]
            isOneToOne: false
            referencedRelation: "recommendation_priority_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_sequence_models_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_sequence_overrides: {
        Row: {
          acknowledged_risk: boolean
          actor_user_id: string
          created_at: string
          dependency_risks: Json
          id: string
          idempotency_key: string
          ordered_recommendation_ids: Json
          organisation_id: string
          previous_override_id: string | null
          reason: string
          sequence_model_id: string
          version: number
          workspace_id: string
        }
        Insert: {
          acknowledged_risk: boolean
          actor_user_id: string
          created_at?: string
          dependency_risks: Json
          id?: string
          idempotency_key: string
          ordered_recommendation_ids: Json
          organisation_id: string
          previous_override_id?: string | null
          reason: string
          sequence_model_id: string
          version: number
          workspace_id: string
        }
        Update: {
          acknowledged_risk?: boolean
          actor_user_id?: string
          created_at?: string
          dependency_risks?: Json
          id?: string
          idempotency_key?: string
          ordered_recommendation_ids?: Json
          organisation_id?: string
          previous_override_id?: string | null
          reason?: string
          sequence_model_id?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_sequence_overrides_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_sequence_overrides_previous_override_id_fkey"
            columns: ["previous_override_id"]
            isOneToOne: false
            referencedRelation: "recommendation_sequence_overrides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_sequence_overrides_sequence_model_id_fkey"
            columns: ["sequence_model_id"]
            isOneToOne: false
            referencedRelation: "recommendation_sequence_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_sequence_overrides_workspace_id_fkey"
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
      append_recommendation_outcome_status_event: {
        Args: { p_input: Json }
        Returns: {
          customer_copy: string
          deadline_was_missed: boolean
          decisive_effective_at: string | null
          decisive_observation_id: string | null
          decisive_recorded_at: string | null
          evaluator_version: string
          facts: Json
          id: string
          measure_version_id: string
          occurred_at: string
          organisation_id: string
          policy_version: string
          reason_code: string
          recorded_late: boolean
          sequence: number
          status: Database["public"]["Enums"]["recommendation_outcome_status"]
          timing: string
          trace_id: string
          trigger_observation_id: string | null
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_outcome_status_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_recommendation_analytics_retention: {
        Args: {
          p_cutoff: string
          p_limit?: number
          p_mode: string
          p_organisation_id: string
        }
        Returns: number
      }
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
      capture_recommendation_analytics_event: {
        Args: { p_input: Json }
        Returns: {
          actor_pseudonym: string
          archived_at: string | null
          consent_event_id: string
          event_id: string
          event_type: Database["public"]["Enums"]["recommendation_analytics_event_type"]
          ingested_at: string
          mode: Database["public"]["Enums"]["recommendation_analytics_mode"]
          object_id: string
          object_type: string
          object_version: string
          occurred_at: string
          organisation_id: string
          properties: Json
          request_hash: string
          schema_version: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_analytics_events"
          isOneToOne: true
          isSetofReturn: false
        }
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
      claim_recommendation_audit_exports: {
        Args: { p_limit?: number }
        Returns: {
          attempt: number
          available_until: string | null
          completed_at: string | null
          created_at: string
          export_payload: Json | null
          failure_code: string | null
          id: string
          idempotency_key: string
          lease_expires_at: string | null
          lease_owner: string | null
          organisation_id: string
          payload_hash: string | null
          portfolio_id: string
          projection: string
          request_hash: string
          requested_by: string
          resolved_at: string | null
          retryable: boolean
          started_at: string | null
          status: Database["public"]["Enums"]["recommendation_audit_export_status"]
          workspace_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "recommendation_audit_export_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cleanup_expired_delivery_dna_snapshots: {
        Args: { p_limit?: number }
        Returns: number
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
      complete_recommendation_audit_export: {
        Args: {
          p_id: string
          p_lease_owner: string
          p_payload: Json
          p_payload_hash: string
        }
        Returns: {
          attempt: number
          available_until: string | null
          completed_at: string | null
          created_at: string
          export_payload: Json | null
          failure_code: string | null
          id: string
          idempotency_key: string
          lease_expires_at: string | null
          lease_owner: string | null
          organisation_id: string
          payload_hash: string | null
          portfolio_id: string
          projection: string
          request_hash: string
          requested_by: string
          resolved_at: string | null
          retryable: boolean
          started_at: string | null
          status: Database["public"]["Enums"]["recommendation_audit_export_status"]
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_audit_export_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      consume_recommendation_product_handoff: {
        Args: { p_input: Json }
        Returns: {
          analysis_run_id: string
          consent_basis: string
          consented_at: string
          created_at: string
          created_by_user_id: string
          cta: Database["public"]["Enums"]["delivery_product_handoff_cta"]
          expires_at: string
          id: string
          idempotency_key: string
          organisation_id: string
          recommendation_id: string
          recommendation_version: string
          request_hash: string
          source_action_id: string
          source_portfolio_item_id: string
          target_id: string
          target_type: string
          target_version: string
          token_hash: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_product_handoffs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_delivery_dna_snapshot: {
        Args: { p_ip_hash: string; p_token_hash: string }
        Returns: string
      }
      create_recommendation_action_outcome: {
        Args: { p_input: Json }
        Returns: {
          action_id: string
          catalogue_digest: string
          catalogue_version: string
          catalogue_version_id: string
          created_at: string
          created_by_user_id: string
          id: string
          intended_outcome: string
          organisation_id: string
          policy_version: string
          portfolio_item_id: string
          recommendation_definition_id: string
          recommendation_id: string
          recommendation_version: string
          success_measure_templates: Json
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_action_outcomes"
          isOneToOne: true
          isSetofReturn: false
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
      create_recommendation_outcome_measure_version: {
        Args: { p_input: Json }
        Returns: {
          absolute_tolerance: number | null
          accountable_owner_id: string
          action_id: string
          baseline_binary: boolean | null
          baseline_effective_at: string | null
          baseline_numeric: number | null
          cadence: string
          created_at: string
          created_by_user_id: string
          decimal_scale: number
          direction: Database["public"]["Enums"]["recommendation_outcome_direction"]
          evaluator_version: string
          id: string
          measure_id: string
          measure_version: number
          organisation_id: string
          outcome_id: string
          policy_version: string
          retired_at: string | null
          source_catalogue_digest: string
          source_catalogue_version: string
          source_catalogue_version_id: string
          source_description: string
          source_recommendation_id: string
          source_recommendation_version: string
          source_reference: string | null
          supersedes_measure_version_id: string | null
          target_binary: boolean | null
          target_date: string | null
          target_deadline_at: string | null
          target_numeric: number | null
          target_timezone: string | null
          unit: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_outcome_measure_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_recommendation_product_handoff: {
        Args: { p_input: Json }
        Returns: {
          analysis_run_id: string
          consent_basis: string
          consented_at: string
          created_at: string
          created_by_user_id: string
          cta: Database["public"]["Enums"]["delivery_product_handoff_cta"]
          expires_at: string
          id: string
          idempotency_key: string
          organisation_id: string
          recommendation_id: string
          recommendation_version: string
          request_hash: string
          source_action_id: string
          source_portfolio_item_id: string
          target_id: string
          target_type: string
          target_version: string
          token_hash: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_product_handoffs"
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
      fail_recommendation_audit_export: {
        Args: { p_failure_code: string; p_id: string; p_lease_owner: string }
        Returns: {
          attempt: number
          available_until: string | null
          completed_at: string | null
          created_at: string
          export_payload: Json | null
          failure_code: string | null
          id: string
          idempotency_key: string
          lease_expires_at: string | null
          lease_owner: string | null
          organisation_id: string
          payload_hash: string | null
          portfolio_id: string
          projection: string
          request_hash: string
          requested_by: string
          resolved_at: string | null
          retryable: boolean
          started_at: string | null
          status: Database["public"]["Enums"]["recommendation_audit_export_status"]
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_audit_export_jobs"
          isOneToOne: true
          isSetofReturn: false
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
      is_active_recommendation_outcome_member: {
        Args: {
          p_organisation_id: string
          p_user_id: string
          p_workspace_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      link_delivery_dna_snapshot: {
        Args: {
          p_consent: boolean
          p_manifest_metadata: Json
          p_organisation_id: string
          p_organisation_name: string
          p_token_hash: string
          p_user_id: string
          p_workspace_id: string
        }
        Returns: string
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
      publish_recommendation_conflict_resolution: {
        Args: { p_input: Json }
        Returns: {
          analysis_run_id: string
          canonical_input: Json
          canonical_resolution: Json
          catalogue_digest: string
          catalogue_id: string
          catalogue_version: string
          catalogue_version_id: string
          confidence_gate_id: string
          configuration_set_id: string
          created_at: string
          id: string
          input_hash: string
          organisation_id: string
          output_hash: string
          policy_version: string
          recommendation_evaluation_id: string
          resolver_version: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_conflict_resolutions"
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
      publish_recommendation_portfolio: {
        Args: { p_input: Json }
        Returns: {
          analysis_run_id: string
          canonical_input: Json
          canonical_portfolio: Json
          catalogue_digest: string
          catalogue_id: string
          catalogue_version: string
          catalogue_version_id: string
          confidence_gate_id: string
          configuration_set_id: string
          conflict_resolution_id: string
          created_at: string
          id: string
          input_hash: string
          item_count: number
          organisation_id: string
          output_hash: string
          policy_version: string
          portfolio_state: Database["public"]["Enums"]["recommendation_portfolio_state"]
          priority_model_id: string
          projector_version: string
          recommendation_evaluation_id: string
          scheduled_count: number
          sequence_model_id: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_portfolios"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_recommendation_priority_model: {
        Args: { p_input: Json }
        Returns: {
          analysis_run_id: string
          canonical_input: Json
          canonical_priority: Json
          catalogue_digest: string
          catalogue_id: string
          catalogue_version: string
          catalogue_version_id: string
          confidence_gate_id: string
          configuration_set_id: string
          conflict_resolution_id: string
          created_at: string
          id: string
          input_hash: string
          intelligence_result_id: string
          model_version: string
          organisation_id: string
          output_hash: string
          policy_version: string
          recommendation_evaluation_id: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_priority_models"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_recommendation_sequence_model: {
        Args: { p_input: Json }
        Returns: {
          analysis_run_id: string
          canonical_input: Json
          canonical_sequence: Json
          catalogue_digest: string
          catalogue_id: string
          catalogue_version: string
          catalogue_version_id: string
          configuration_set_id: string
          conflict_resolution_id: string
          created_at: string
          engine_version: string
          id: string
          input_hash: string
          organisation_id: string
          output_hash: string
          policy_version: string
          priority_model_id: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_sequence_models"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      recommendation_analytics_product_aggregate: {
        Args: { p_from: string; p_to: string }
        Returns: {
          event_count: number
          event_type: Database["public"]["Enums"]["recommendation_analytics_event_type"]
          mode: Database["public"]["Enums"]["recommendation_analytics_mode"]
          properties: Json
          tenant_count: number
        }[]
      }
      recommendation_operational_health: {
        Args: never
        Returns: {
          alert_coverage: string[]
          critical_integrity_failures: number
          failed_exports: number
          generated_at: string
          oldest_queued_seconds: number
          open_critical_alerts: number
          processing_exports: number
          queued_exports: number
          status: string
        }[]
      }
      reconcile_assessment_analysis_handoffs: {
        Args: { p_limit?: number }
        Returns: number
      }
      record_recommendation_export_access: {
        Args: {
          p_actor_user_id: string
          p_id: string
          p_mode: string
          p_organisation_id: string
          p_workspace_id: string
        }
        Returns: undefined
      }
      record_recommendation_improvement_action: {
        Args: { p_input: Json }
        Returns: {
          accountable_owner_id: string | null
          action_version: number
          analysis_run_id: string
          cancelled_at: string | null
          completed_at: string | null
          completion_note: string | null
          contributor_ids: string[]
          created_at: string
          evidence_not_available_reason: string | null
          evidence_references: string[]
          id: string
          latest_event_id: string
          note: string | null
          organisation_id: string
          plan_id: string
          portfolio_id: string
          portfolio_item_id: string
          recommendation_id: string
          recommendation_version: string
          source_decision_id: string
          source_decision_version: number
          started_at: string | null
          status: Database["public"]["Enums"]["recommendation_action_status"]
          target_date: string | null
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_improvement_actions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_recommendation_item_decision: {
        Args: { p_input: Json }
        Returns: {
          acknowledged: boolean
          analysis_run_id: string
          current_state: Database["public"]["Enums"]["recommendation_decision_state"]
          decision_version: number
          id: string
          last_actor_type: Database["public"]["Enums"]["recommendation_decision_actor_type"]
          last_actor_user_id: string | null
          latest_event_id: string
          organisation_id: string
          portfolio_id: string
          portfolio_item_id: string
          reason_category:
            | Database["public"]["Enums"]["recommendation_decision_reason_category"]
            | null
          recommendation_id: string
          recommendation_version: string
          review_at: string | null
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_item_decisions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_recommendation_outcome_observation: {
        Args: { p_input: Json }
        Returns: {
          actor_user_id: string
          binary_value: boolean | null
          correction_reason: string | null
          effective_at: string
          id: string
          idempotency_key: string
          measure_version_id: string
          numeric_value: number | null
          organisation_id: string
          payload_hash: string
          recorded_at: string
          source_description: string
          source_reference: string | null
          supersedes_observation_id: string | null
          trace_id: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_outcome_observations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_recommendation_audit_export: {
        Args: { p_input: Json }
        Returns: {
          attempt: number
          available_until: string | null
          completed_at: string | null
          created_at: string
          export_payload: Json | null
          failure_code: string | null
          id: string
          idempotency_key: string
          lease_expires_at: string | null
          lease_owner: string | null
          organisation_id: string
          payload_hash: string | null
          portfolio_id: string
          projection: string
          request_hash: string
          requested_by: string
          resolved_at: string | null
          retryable: boolean
          started_at: string | null
          status: Database["public"]["Enums"]["recommendation_audit_export_status"]
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_audit_export_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_delivery_dna_public_result: {
        Args: { p_ip_hash: string; p_token_hash: string }
        Returns: Json
      }
      resolve_recommendation_feature_flag: {
        Args: { p_feature_key: string }
        Returns: boolean
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
      retry_recommendation_audit_export: {
        Args: {
          p_id: string
          p_organisation_id: string
          p_workspace_id: string
        }
        Returns: {
          attempt: number
          available_until: string | null
          completed_at: string | null
          created_at: string
          export_payload: Json | null
          failure_code: string | null
          id: string
          idempotency_key: string
          lease_expires_at: string | null
          lease_owner: string | null
          organisation_id: string
          payload_hash: string | null
          portfolio_id: string
          projection: string
          request_hash: string
          requested_by: string
          resolved_at: string | null
          retryable: boolean
          started_at: string | null
          status: Database["public"]["Enums"]["recommendation_audit_export_status"]
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_audit_export_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_recommendation_analytics_consent: {
        Args: { p_input: Json }
        Returns: {
          consent_version: number
          id: string
          idempotency_key: string
          occurred_at: string
          organisation_id: string
          request_hash: string
          status: Database["public"]["Enums"]["recommendation_analytics_consent_status"]
          user_id: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_analytics_consent_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_recommendation_feature_flag: {
        Args: { p_input: Json }
        Returns: {
          actor_user_id: string
          enabled: boolean
          feature_key: string
          feature_version: number
          id: string
          idempotency_key: string
          occurred_at: string
          reason_category: string
          request_hash: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_feature_flag_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_recommendation_priority_display_preference: {
        Args: { p_input: Json }
        Returns: {
          actor_user_id: string
          created_at: string
          id: string
          idempotency_key: string
          ordered_recommendation_ids: Json
          organisation_id: string
          previous_preference_id: string | null
          priority_model_id: string
          version: number
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_priority_display_preferences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_recommendation_sequence_override: {
        Args: { p_input: Json }
        Returns: {
          acknowledged_risk: boolean
          actor_user_id: string
          created_at: string
          dependency_risks: Json
          id: string
          idempotency_key: string
          ordered_recommendation_ids: Json
          organisation_id: string
          previous_override_id: string | null
          reason: string
          sequence_model_id: string
          version: number
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "recommendation_sequence_overrides"
          isOneToOne: true
          isSetofReturn: false
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
      validate_recommendation_analytics_properties: {
        Args: {
          p_event_type: Database["public"]["Enums"]["recommendation_analytics_event_type"]
          p_properties: Json
        }
        Returns: boolean
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
      delivery_product_handoff_cta:
        | "start_assessment"
        | "view_pack"
        | "review_activation"
        | "view_teammate"
      delivery_product_handoff_event_type: "consumed"
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
      recommendation_action_command:
        | "created"
        | "updated"
        | "started"
        | "blocked"
        | "completed"
        | "cancelled"
      recommendation_action_status:
        | "not_started"
        | "in_progress"
        | "blocked"
        | "completed"
        | "cancelled"
      recommendation_analytics_consent_status: "granted" | "withdrawn"
      recommendation_analytics_event_type:
        | "portfolio_viewed"
        | "explanation_opened"
        | "decision_recorded"
        | "action_started"
        | "action_blocked"
        | "action_completed"
        | "outcome_observed"
        | "knowledge_pack_handoff"
        | "teammate_handoff"
        | "usefulness_submitted"
      recommendation_analytics_mode: "workspace" | "executive_report"
      recommendation_audit_export_status:
        | "queued"
        | "processing"
        | "completed"
        | "failed"
        | "expired"
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
      recommendation_decision_actor_type: "user" | "system"
      recommendation_decision_command:
        | "accepted"
        | "deferred"
        | "rejected"
        | "restored"
        | "superseded"
      recommendation_decision_reason_category:
        | "not_relevant"
        | "already_addressed"
        | "not_feasible"
        | "wrong_timing"
        | "insufficient_evidence"
        | "other"
      recommendation_decision_state:
        | "undecided"
        | "accepted"
        | "deferred"
        | "rejected"
        | "superseded"
      recommendation_dependency_resolution:
        | "direct"
        | "superseded"
        | "deduplicated"
        | "unavailable"
      recommendation_dependency_state: "available" | "blocked" | "unavailable"
      recommendation_evaluation_result: "eligible" | "ineligible" | "excluded"
      recommendation_integrity_status: "passed" | "failed"
      recommendation_operational_severity: "info" | "warning" | "critical"
      recommendation_outcome_direction:
        | "increase"
        | "decrease"
        | "maintain"
        | "binary"
      recommendation_outcome_status:
        | "not_measured"
        | "baseline_recorded"
        | "tracking"
        | "target_met"
        | "target_not_met"
        | "retired"
      recommendation_portfolio_class:
        | "immediate_attention"
        | "foundation"
        | "quick_win"
        | "strategic_initiative"
        | "watch"
      recommendation_portfolio_state: "empty" | "partial" | "complete"
      recommendation_priority_label: "critical" | "high" | "medium" | "low"
      recommendation_resolution_reason:
        | "retained"
        | "mutual_exclusion"
        | "superseded"
        | "deduplicated"
      recommendation_resolution_result: "canonical" | "suppressed"
      recommendation_sequence_horizon: "day30" | "day60" | "day90"
      recommendation_sequence_state:
        | "scheduled"
        | "blocked_dependency"
        | "capacity_exceeded"
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
      delivery_product_handoff_cta: [
        "start_assessment",
        "view_pack",
        "review_activation",
        "view_teammate",
      ],
      delivery_product_handoff_event_type: ["consumed"],
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
      recommendation_action_command: [
        "created",
        "updated",
        "started",
        "blocked",
        "completed",
        "cancelled",
      ],
      recommendation_action_status: [
        "not_started",
        "in_progress",
        "blocked",
        "completed",
        "cancelled",
      ],
      recommendation_analytics_consent_status: ["granted", "withdrawn"],
      recommendation_analytics_event_type: [
        "portfolio_viewed",
        "explanation_opened",
        "decision_recorded",
        "action_started",
        "action_blocked",
        "action_completed",
        "outcome_observed",
        "knowledge_pack_handoff",
        "teammate_handoff",
        "usefulness_submitted",
      ],
      recommendation_analytics_mode: ["workspace", "executive_report"],
      recommendation_audit_export_status: [
        "queued",
        "processing",
        "completed",
        "failed",
        "expired",
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
      recommendation_decision_actor_type: ["user", "system"],
      recommendation_decision_command: [
        "accepted",
        "deferred",
        "rejected",
        "restored",
        "superseded",
      ],
      recommendation_decision_reason_category: [
        "not_relevant",
        "already_addressed",
        "not_feasible",
        "wrong_timing",
        "insufficient_evidence",
        "other",
      ],
      recommendation_decision_state: [
        "undecided",
        "accepted",
        "deferred",
        "rejected",
        "superseded",
      ],
      recommendation_dependency_resolution: [
        "direct",
        "superseded",
        "deduplicated",
        "unavailable",
      ],
      recommendation_dependency_state: ["available", "blocked", "unavailable"],
      recommendation_evaluation_result: ["eligible", "ineligible", "excluded"],
      recommendation_integrity_status: ["passed", "failed"],
      recommendation_operational_severity: ["info", "warning", "critical"],
      recommendation_outcome_direction: [
        "increase",
        "decrease",
        "maintain",
        "binary",
      ],
      recommendation_outcome_status: [
        "not_measured",
        "baseline_recorded",
        "tracking",
        "target_met",
        "target_not_met",
        "retired",
      ],
      recommendation_portfolio_class: [
        "immediate_attention",
        "foundation",
        "quick_win",
        "strategic_initiative",
        "watch",
      ],
      recommendation_portfolio_state: ["empty", "partial", "complete"],
      recommendation_priority_label: ["critical", "high", "medium", "low"],
      recommendation_resolution_reason: [
        "retained",
        "mutual_exclusion",
        "superseded",
        "deduplicated",
      ],
      recommendation_resolution_result: ["canonical", "suppressed"],
      recommendation_sequence_horizon: ["day30", "day60", "day90"],
      recommendation_sequence_state: [
        "scheduled",
        "blocked_dependency",
        "capacity_exceeded",
      ],
      stage_status: ["pending", "running", "completed", "failed", "skipped"],
      workspace_status: ["active", "archived"],
    },
  },
} as const

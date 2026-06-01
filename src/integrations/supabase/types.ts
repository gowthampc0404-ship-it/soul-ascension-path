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
      monsters: {
        Row: {
          aura_color: string
          avatar_key: string
          created_at: string
          hp_multiplier: number
          monster_id: string
          name: string
          rank_tier: string
        }
        Insert: {
          aura_color?: string
          avatar_key?: string
          created_at?: string
          hp_multiplier?: number
          monster_id?: string
          name: string
          rank_tier: string
        }
        Update: {
          aura_color?: string
          avatar_key?: string
          created_at?: string
          hp_multiplier?: number
          monster_id?: string
          name?: string
          rank_tier?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_monster_id: string | null
          created_at: string
          current_level: number
          current_rank: string
          current_streak: number
          current_xp: number
          hunter_name: string | null
          last_active_date: string | null
          last_ambush_summary: Json | null
          pending_ambush_alert: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          active_monster_id?: string | null
          created_at?: string
          current_level?: number
          current_rank?: string
          current_streak?: number
          current_xp?: number
          hunter_name?: string | null
          last_active_date?: string | null
          last_ambush_summary?: Json | null
          pending_ambush_alert?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          active_monster_id?: string | null
          created_at?: string
          current_level?: number
          current_rank?: string
          current_streak?: number
          current_xp?: number
          hunter_name?: string | null
          last_active_date?: string | null
          last_ambush_summary?: Json | null
          pending_ambush_alert?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quest_logs: {
        Row: {
          checked_at: string
          log_id: string
          quest_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checked_at?: string
          log_id?: string
          quest_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checked_at?: string
          log_id?: string
          quest_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_logs_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["quest_id"]
          },
        ]
      }
      quests: {
        Row: {
          ai_watch_enabled: boolean
          category: string
          created_at: string
          current_progress_count: number
          difficulty: string | null
          duration_minutes: number | null
          frequency_type: string
          is_archived: boolean
          midnight_reset: boolean
          quest_id: string
          scheduled_days: boolean[]
          sensor_distance_enabled: boolean
          strict_window_end: string | null
          strict_window_start: string | null
          target_distance_km: number | null
          target_duration_mins: number | null
          target_reps: number | null
          target_steps: number | null
          task_type: string
          title: string
          user_id: string
        }
        Insert: {
          ai_watch_enabled?: boolean
          category?: string
          created_at?: string
          current_progress_count?: number
          difficulty?: string | null
          duration_minutes?: number | null
          frequency_type?: string
          is_archived?: boolean
          midnight_reset?: boolean
          quest_id?: string
          scheduled_days?: boolean[]
          sensor_distance_enabled?: boolean
          strict_window_end?: string | null
          strict_window_start?: string | null
          target_distance_km?: number | null
          target_duration_mins?: number | null
          target_reps?: number | null
          target_steps?: number | null
          task_type?: string
          title: string
          user_id: string
        }
        Update: {
          ai_watch_enabled?: boolean
          category?: string
          created_at?: string
          current_progress_count?: number
          difficulty?: string | null
          duration_minutes?: number | null
          frequency_type?: string
          is_archived?: boolean
          midnight_reset?: boolean
          quest_id?: string
          scheduled_days?: boolean[]
          sensor_distance_enabled?: boolean
          strict_window_end?: string | null
          strict_window_start?: string | null
          target_distance_km?: number | null
          target_duration_mins?: number | null
          target_reps?: number | null
          target_steps?: number | null
          task_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      step_logs: {
        Row: {
          log_id: string
          logged_date: string
          step_count: number
          user_id: string
        }
        Insert: {
          log_id?: string
          logged_date?: string
          step_count?: number
          user_id: string
        }
        Update: {
          log_id?: string
          logged_date?: string
          step_count?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acknowledge_ambush: { Args: { p_user: string }; Returns: Json }
      apply_inactivity_penalty: { Args: { p_user: string }; Returns: boolean }
      complete_quest: { Args: { p_log_id: string }; Returns: Json }
      increment_rep_progress: {
        Args: { p_delta: number; p_quest: string }
        Returns: Json
      }
      midnight_reset_all: { Args: never; Returns: undefined }
      rank_for_level: { Args: { lvl: number }; Returns: string }
      spawn_daily_quest_logs: { Args: { p_user: string }; Returns: undefined }
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
    Enums: {},
  },
} as const

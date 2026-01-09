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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      characters: {
        Row: {
          age_band: string
          archetype: string
          avoided_themes: string[] | null
          created_at: string
          hero_image_prompt: string | null
          hero_image_style: string | null
          hero_image_url: string | null
          icon: string
          id: string
          last_summary: string | null
          name: string
          pending_choice: string | null
          preferred_language: string | null
          preferred_themes: string[] | null
          sidekick_archetype: string | null
          sidekick_name: string | null
          story_count: number | null
          traits: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          age_band?: string
          archetype: string
          avoided_themes?: string[] | null
          created_at?: string
          hero_image_prompt?: string | null
          hero_image_style?: string | null
          hero_image_url?: string | null
          icon?: string
          id?: string
          last_summary?: string | null
          name: string
          pending_choice?: string | null
          preferred_language?: string | null
          preferred_themes?: string[] | null
          sidekick_archetype?: string | null
          sidekick_name?: string | null
          story_count?: number | null
          traits?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          age_band?: string
          archetype?: string
          avoided_themes?: string[] | null
          created_at?: string
          hero_image_prompt?: string | null
          hero_image_style?: string | null
          hero_image_url?: string | null
          icon?: string
          id?: string
          last_summary?: string | null
          name?: string
          pending_choice?: string | null
          preferred_language?: string | null
          preferred_themes?: string[] | null
          sidekick_archetype?: string | null
          sidekick_name?: string | null
          story_count?: number | null
          traits?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hero_creation_log: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      image_assets: {
        Row: {
          created_at: string
          hero_id: string | null
          id: string
          is_public: boolean | null
          model: string | null
          prompt_hash: string
          storage_bucket: string
          storage_path: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          hero_id?: string | null
          id?: string
          is_public?: boolean | null
          model?: string | null
          prompt_hash: string
          storage_bucket: string
          storage_path: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          hero_id?: string | null
          id?: string
          is_public?: boolean | null
          model?: string | null
          prompt_hash?: string
          storage_bucket?: string
          storage_path?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "image_assets_hero_id_fkey"
            columns: ["hero_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          page_number: number
          story_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          page_number: number
          story_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          page_number?: number
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          language: string
          parent_pin: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          language?: string
          parent_pin?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          parent_pin?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string
          feedback: string | null
          id: string
          score: number
          story_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: string
          score: number
          story_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: string
          score?: number
          story_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_settings: {
        Row: {
          bedtime_enabled: boolean
          bedtime_time: string | null
          email_opt_in: boolean
          story_enabled: boolean
          story_time: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bedtime_enabled?: boolean
          bedtime_time?: string | null
          email_opt_in?: boolean
          story_enabled?: boolean
          story_time?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bedtime_enabled?: boolean
          bedtime_time?: string | null
          email_opt_in?: boolean
          story_enabled?: boolean
          story_time?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          character_id: string
          child_state_after_story: string | null
          chosen_option: string | null
          created_at: string
          current_page: number
          feedback_submitted_at: string | null
          generated_options: Json | null
          id: string
          is_active: boolean
          last_summary: string | null
          length_setting: string
          reuse_intent_tomorrow: string | null
          story_state: Json
          themes: string[] | null
          title: string | null
          updated_at: string
        }
        Insert: {
          character_id: string
          child_state_after_story?: string | null
          chosen_option?: string | null
          created_at?: string
          current_page?: number
          feedback_submitted_at?: string | null
          generated_options?: Json | null
          id?: string
          is_active?: boolean
          last_summary?: string | null
          length_setting?: string
          reuse_intent_tomorrow?: string | null
          story_state?: Json
          themes?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          character_id?: string
          child_state_after_story?: string | null
          chosen_option?: string | null
          created_at?: string
          current_page?: number
          feedback_submitted_at?: string | null
          generated_options?: Json | null
          id?: string
          is_active?: boolean
          last_summary?: string | null
          length_setting?: string
          reuse_intent_tomorrow?: string | null
          story_state?: Json
          themes?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
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

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
      classroom_members: {
        Row: {
          classroom_id: string
          id: string
          joined_at: string
          student_id: string
        }
        Insert: {
          classroom_id: string
          id?: string
          joined_at?: string
          student_id: string
        }
        Update: {
          classroom_id?: string
          id?: string
          joined_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classroom_members_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      classroom_posts: {
        Row: {
          author_id: string
          body: string | null
          classroom_id: string
          created_at: string
          file_path: string | null
          id: string
          kind: string
          title: string
          url: string | null
        }
        Insert: {
          author_id: string
          body?: string | null
          classroom_id: string
          created_at?: string
          file_path?: string | null
          id?: string
          kind: string
          title: string
          url?: string | null
        }
        Update: {
          author_id?: string
          body?: string | null
          classroom_id?: string
          created_at?: string
          file_path?: string | null
          id?: string
          kind?: string
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classroom_posts_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          created_at: string
          description: string | null
          id: string
          join_code: string
          name: string
          subject: string | null
          teacher_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          join_code: string
          name: string
          subject?: string | null
          teacher_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          join_code?: string
          name?: string
          subject?: string | null
          teacher_id?: string
        }
        Relationships: []
      }
      concept_nodes: {
        Row: {
          concept: string
          created_at: string
          emotional_tag: string | null
          id: string
          last_reviewed: string | null
          mastery_level: number | null
          subject: string | null
          user_id: string
        }
        Insert: {
          concept: string
          created_at?: string
          emotional_tag?: string | null
          id?: string
          last_reviewed?: string | null
          mastery_level?: number | null
          subject?: string | null
          user_id: string
        }
        Update: {
          concept?: string
          created_at?: string
          emotional_tag?: string | null
          id?: string
          last_reviewed?: string | null
          mastery_level?: number | null
          subject?: string | null
          user_id?: string
        }
        Relationships: []
      }
      demo_cache: {
        Row: {
          cache_key: string
          created_at: string
          galaxy_state: Json | null
          id: string
          mind_map_data: Json | null
          response_data: Json | null
        }
        Insert: {
          cache_key: string
          created_at?: string
          galaxy_state?: Json | null
          id?: string
          mind_map_data?: Json | null
          response_data?: Json | null
        }
        Update: {
          cache_key?: string
          created_at?: string
          galaxy_state?: Json | null
          id?: string
          mind_map_data?: Json | null
          response_data?: Json | null
        }
        Relationships: []
      }
      learning_goals: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          status: string
          target_date: string | null
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          target_date?: string | null
          topic: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          target_date?: string | null
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          goal_id: string | null
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          goal_id?: string | null
          id?: string
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          goal_id?: string | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      practice_plans: {
        Row: {
          created_at: string
          id: string
          status: string
          steps: Json
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          steps?: Json
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          steps?: Json
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          class_level: string | null
          created_at: string
          full_name: string | null
          id: string
          nickname: string | null
          role: string
          student_code: string | null
        }
        Insert: {
          class_level?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          nickname?: string | null
          role?: string
          student_code?: string | null
        }
        Update: {
          class_level?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          nickname?: string | null
          role?: string
          student_code?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          cognitive_state: string | null
          created_at: string
          id: string
          mastery_score: number | null
          messages: Json | null
          subject: string | null
          topic: string | null
          user_id: string
        }
        Insert: {
          cognitive_state?: string | null
          created_at?: string
          id?: string
          mastery_score?: number | null
          messages?: Json | null
          subject?: string | null
          topic?: string | null
          user_id: string
        }
        Update: {
          cognitive_state?: string | null
          created_at?: string
          id?: string
          mastery_score?: number | null
          messages?: Json | null
          subject?: string | null
          topic?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_links: {
        Row: {
          created_at: string
          id: string
          observer_id: string
          relation: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          observer_id: string
          relation?: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          observer_id?: string
          relation?: string
          student_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_student_by_code: {
        Args: { _code: string }
        Returns: {
          class_level: string
          full_name: string
          id: string
          nickname: string
          role: string
        }[]
      }
      generate_student_code: { Args: never; Returns: string }
      is_classroom_member: {
        Args: { _classroom_id: string; _user_id: string }
        Returns: boolean
      }
      is_classroom_teacher: {
        Args: { _classroom_id: string; _user_id: string }
        Returns: boolean
      }
      is_linked_observer: {
        Args: { _observer: string; _student: string }
        Returns: boolean
      }
      is_student_in_teacher_class: {
        Args: { _student_id: string; _teacher_id: string }
        Returns: boolean
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

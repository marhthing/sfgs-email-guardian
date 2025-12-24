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
      birthday_emails_sent: {
        Row: {
          created_at: string
          id: string
          sent_date: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sent_date?: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sent_date?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "birthday_emails_sent_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      email_daily_counts: {
        Row: {
          count: number
          date: string
          id: string
        }
        Insert: {
          count?: number
          date?: string
          id?: string
        }
        Update: {
          count?: number
          date?: string
          id?: string
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          created_at: string
          email_type: Database["public"]["Enums"]["email_type"]
          error_message: string | null
          file_id: string | null
          id: string
          matric_number: string
          recipient_email: string
          sent_at: string | null
          status: Database["public"]["Enums"]["email_status"]
          student_id: string
        }
        Insert: {
          created_at?: string
          email_type: Database["public"]["Enums"]["email_type"]
          error_message?: string | null
          file_id?: string | null
          id?: string
          matric_number: string
          recipient_email: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          student_id: string
        }
        Update: {
          created_at?: string
          email_type?: Database["public"]["Enums"]["email_type"]
          error_message?: string | null
          file_id?: string | null
          id?: string
          matric_number?: string
          recipient_email?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "uploaded_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          date_of_birth: string
          id: string
          matric_number: string
          parent_email_1: string | null
          parent_email_2: string | null
          student_name: string
        }
        Insert: {
          created_at?: string
          date_of_birth: string
          id?: string
          matric_number: string
          parent_email_1?: string | null
          parent_email_2?: string | null
          student_name: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string
          id?: string
          matric_number?: string
          parent_email_1?: string | null
          parent_email_2?: string | null
          student_name?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string
          id: string
          message: string
          type: Database["public"]["Enums"]["log_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          type: Database["public"]["Enums"]["log_type"]
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          type?: Database["public"]["Enums"]["log_type"]
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          admin_password: string
          daily_email_limit: number
          email_interval_minutes: number
          id: string
          sender_email: string
          updated_at: string
        }
        Insert: {
          admin_password?: string
          daily_email_limit?: number
          email_interval_minutes?: number
          id?: string
          sender_email?: string
          updated_at?: string
        }
        Update: {
          admin_password?: string
          daily_email_limit?: number
          email_interval_minutes?: number
          id?: string
          sender_email?: string
          updated_at?: string
        }
        Relationships: []
      }
      uploaded_files: {
        Row: {
          id: string
          matric_number_parsed: string
          matric_number_raw: string
          original_file_name: string
          status: Database["public"]["Enums"]["file_status"]
          storage_path: string
          student_id: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          matric_number_parsed: string
          matric_number_raw: string
          original_file_name: string
          status?: Database["public"]["Enums"]["file_status"]
          storage_path: string
          student_id?: string | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          matric_number_parsed?: string
          matric_number_raw?: string
          original_file_name?: string
          status?: Database["public"]["Enums"]["file_status"]
          storage_path?: string
          student_id?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_files_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
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
      app_role: "admin" | "user"
      email_status: "pending" | "processing" | "sent" | "failed"
      email_type: "pdf" | "birthday"
      file_status: "matched" | "unmatched"
      log_type: "cron" | "email" | "upload"
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
      app_role: ["admin", "user"],
      email_status: ["pending", "processing", "sent", "failed"],
      email_type: ["pdf", "birthday"],
      file_status: ["matched", "unmatched"],
      log_type: ["cron", "email", "upload"],
    },
  },
} as const

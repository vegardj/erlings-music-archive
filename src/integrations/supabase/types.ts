export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      category: {
        Row: {
          description: string | null
          id: number
          name: string
        }
        Insert: {
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      person: {
        Row: {
          birth_year: number | null
          death_year: number | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_enum"] | null
          id: number
          notes: string | null
          profile_link: string | null
        }
        Insert: {
          birth_year?: number | null
          death_year?: number | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender_enum"] | null
          id?: number
          notes?: string | null
          profile_link?: string | null
        }
        Update: {
          birth_year?: number | null
          death_year?: number | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_enum"] | null
          id?: number
          notes?: string | null
          profile_link?: string | null
        }
        Relationships: []
      }
      publication: {
        Row: {
          edition_note: string | null
          id: number
          plate_number: string | null
          publication_year: number | null
          publisher_id: number | null
          publisher_name: string | null
          work_id: number | null
        }
        Insert: {
          edition_note?: string | null
          id?: number
          plate_number?: string | null
          publication_year?: number | null
          publisher_id?: number | null
          publisher_name?: string | null
          work_id?: number | null
        }
        Update: {
          edition_note?: string | null
          id?: number
          plate_number?: string | null
          publication_year?: number | null
          publisher_id?: number | null
          publisher_name?: string | null
          work_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "publication_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "publisher"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "work"
            referencedColumns: ["id"]
          },
        ]
      }
      publisher: {
        Row: {
          created_at: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      work: {
        Row: {
          category_id: number | null
          comments: string | null
          composition_year: number | null
          composition_year_to: number | null
          created_at: string | null
          form_or_genre: string | null
          id: number
          key_signature: string | null
          rating: number | null
          title: string
          title_link: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: number | null
          comments?: string | null
          composition_year?: number | null
          composition_year_to?: number | null
          created_at?: string | null
          form_or_genre?: string | null
          id?: number
          key_signature?: string | null
          rating?: number | null
          title: string
          title_link?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: number | null
          comments?: string | null
          composition_year?: number | null
          composition_year_to?: number | null
          created_at?: string | null
          form_or_genre?: string | null
          id?: number
          key_signature?: string | null
          rating?: number | null
          title?: string
          title_link?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category"
            referencedColumns: ["id"]
          },
        ]
      }
      work_contributor: {
        Row: {
          link: string | null
          notes: string | null
          person_id: number
          role: Database["public"]["Enums"]["contributor_role"]
          sequence_no: number | null
          work_id: number
        }
        Insert: {
          link?: string | null
          notes?: string | null
          person_id: number
          role?: Database["public"]["Enums"]["contributor_role"]
          sequence_no?: number | null
          work_id: number
        }
        Update: {
          link?: string | null
          notes?: string | null
          person_id?: number
          role?: Database["public"]["Enums"]["contributor_role"]
          sequence_no?: number | null
          work_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "work_contributor_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_contributor_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "work"
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
      contributor_role:
        | "composer"
        | "lyricist"
        | "arranger"
        | "translator"
        | "performer"
        | "unknown"
      file_kind: "pdf" | "musescore" | "image" | "audio" | "other"
      gender_enum: "male" | "female" | "unknown"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      contributor_role: [
        "composer",
        "lyricist",
        "arranger",
        "translator",
        "performer",
        "unknown",
      ],
      file_kind: ["pdf", "musescore", "image", "audio", "other"],
      gender_enum: ["male", "female", "unknown"],
    },
  },
} as const

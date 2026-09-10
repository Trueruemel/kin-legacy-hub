export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string;
          created_at: string;
          family_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          action: string;
          created_at?: string;
          family_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          action?: string;
          created_at?: string;
          family_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_logs_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      assistant_scopes: {
        Row: {
          created_at: string;
          family_id: string;
          id: string;
          scope: string;
        };
        Insert: {
          created_at?: string;
          family_id: string;
          id?: string;
          scope: string;
        };
        Update: {
          created_at?: string;
          family_id?: string;
          id?: string;
          scope?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assistant_scopes_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages: {
        Row: {
          chat_id: string;
          content: string;
          created_at: string;
          created_by: string;
          id: string;
          media_items: string[] | null;
          reactions: Json | null;
          role: Database["public"]["Enums"]["message_role"];
          updated_at: string | null;
        };
        Insert: {
          chat_id: string;
          content: string;
          created_at?: string;
          created_by: string;
          id?: string;
          media_items?: string[] | null;
          reactions?: Json | null;
          role: Database["public"]["Enums"]["message_role"];
          updated_at?: string | null;
        };
        Update: {
          chat_id?: string;
          content?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          media_items?: string[] | null;
          reactions?: Json | null;
          role?: Database["public"]["Enums"]["message_role"];
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      chats: {
        Row: {
          created_at: string;
          created_by: string;
          description: string | null;
          family_id: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          description?: string | null;
          family_id: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          description?: string | null;
          family_id?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chats_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chats_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      event_rsvps: {
        Row: {
          created_at: string;
          event_id: string;
          family_id: string;
          id: string;
          status: Database["public"]["Enums"]["rsvp_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          family_id: string;
          id?: string;
          status?: Database["public"]["Enums"]["rsvp_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          family_id?: string;
          id?: string;
          status?: Database["public"]["Enums"]["rsvp_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_rsvps_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_rsvps_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          created_at: string;
          created_by: string;
          description: string | null;
          end_date: string;
          family_id: string;
          id: string;
          location: string | null;
          start_date: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          description?: string | null;
          end_date: string;
          family_id: string;
          id?: string;
          location?: string | null;
          start_date: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          description?: string | null;
          end_date?: string;
          family_id?: string;
          id?: string;
          location?: string | null;
          start_date?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      families: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      family_members: {
        Row: {
          created_at: string;
          family_id: string;
          id: string;
          role: Database["public"]["Enums"]["family_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          family_id: string;
          id?: string;
          role?: Database["public"]["Enums"]["family_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          family_id?: string;
          id?: string;
          role?: Database["public"]["Enums"]["family_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      forum_posts: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          family_id: string;
          id: string;
          status: Database["public"]["Enums"]["forum_status"];
          thread_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          family_id: string;
          id?: string;
          status?: Database["public"]["Enums"]["forum_status"];
          thread_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          family_id?: string;
          id?: string;
          status?: Database["public"]["Enums"]["forum_status"];
          thread_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "forum_posts_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "forum_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      forum_threads: {
        Row: {
          created_at: string;
          created_by: string;
          description: string | null;
          family_id: string;
          id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          description?: string | null;
          family_id: string;
          id?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          description?: string | null;
          family_id?: string;
          id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "forum_threads_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      media_items: {
        Row: {
          caption: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          family_id: string;
          id: string;
          media_type: Database["public"]["Enums"]["media_type"];
          metadata: Json | null;
          storage_path: string;
          tags: string[] | null;
          thumbnail_url: string | null;
          title: string | null;
          updated_at: string;
          url: string;
        };
        Insert: {
          caption?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          family_id: string;
          id?: string;
          media_type: Database["public"]["Enums"]["media_type"];
          metadata?: Json | null;
          storage_path: string;
          tags?: string[] | null;
          thumbnail_url?: string | null;
          title?: string | null;
          updated_at?: string;
          url: string;
        };
        Update: {
          caption?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          family_id?: string;
          id?: string;
          media_type?: Database["public"]["Enums"]["media_type"];
          metadata?: Json | null;
          storage_path?: string;
          tags?: string[] | null;
          thumbnail_url?: string | null;
          title?: string | null;
          updated_at?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "media_items_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_items_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      member_visibility: {
        Row: {
          created_at: string;
          family_id: string;
          hidden_from: string[];
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          family_id: string;
          hidden_from?: string[];
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          family_id?: string;
          hidden_from?: string[];
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_visibility_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      memories: {
        Row: {
          created_at: string;
          created_by: string;
          date: string | null;
          description: string | null;
          family_id: string;
          id: string;
          location: string | null;
          media_ids: string[] | null;
          persons: string[] | null;
          tags: string[] | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          date?: string | null;
          description?: string | null;
          family_id: string;
          id?: string;
          location?: string | null;
          media_ids?: string[] | null;
          persons?: string[] | null;
          tags?: string[] | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          date?: string | null;
          description?: string | null;
          family_id?: string;
          id?: string;
          location?: string | null;
          media_ids?: string[] | null;
          persons?: string[] | null;
          tags?: string[] | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memories_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memories_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      memory_persons: {
        Row: {
          created_at: string;
          family_id: string;
          id: string;
          memory_id: string;
          person_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          family_id: string;
          id?: string;
          memory_id: string;
          person_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          family_id?: string;
          id?: string;
          memory_id?: string;
          person_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memory_persons_memory_id_fkey";
            columns: ["memory_id"];
            isOneToOne: false;
            referencedRelation: "memories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memory_persons_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "persons";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          family_id: string;
          id: string;
          message: string;
          read: boolean;
          related_id: string | null;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          family_id: string;
          id?: string;
          message: string;
          read?: boolean;
          related_id?: string | null;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          family_id?: string;
          id?: string;
          message?: string;
          read?: boolean;
          related_id?: string | null;
          type?: Database["public"]["Enums"]["notification_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      persons: {
        Row: {
          avatar_url: string | null;
          birth_date: string | null;
          created_at: string;
          death_date: string | null;
          description: string | null;
          family_id: string;
          gender: Database["public"]["Enums"]["gender"] | null;
          id: string;
          maiden_name: string | null;
          name: string;
          name_suffix: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          birth_date?: string | null;
          created_at?: string;
          death_date?: string | null;
          description?: string | null;
          family_id: string;
          gender?: Database["public"]["Enums"]["gender"] | null;
          id?: string;
          maiden_name?: string | null;
          name: string;
          name_suffix?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          birth_date?: string | null;
          created_at?: string;
          death_date?: string | null;
          description?: string | null;
          family_id?: string;
          gender?: Database["public"]["Enums"]["gender"] | null;
          id?: string;
          maiden_name?: string | null;
          name?: string;
          name_suffix?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "persons_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      post_comments: {
        Row: {
          author_id: string;
          created_at: string;
          content: string;
          family_id: string;
          id: string;
          post_id: string;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          created_at?: string;
          content: string;
          family_id: string;
          id?: string;
          post_id: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          created_at?: string;
          content?: string;
          family_id?: string;
          id?: string;
          post_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_reactions: {
        Row: {
          created_at: string;
          family_id: string;
          id: string;
          post_id: string;
          reaction_type: Database["public"]["Enums"]["reaction_type"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          family_id: string;
          id?: string;
          post_id: string;
          reaction_type: Database["public"]["Enums"]["reaction_type"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          family_id?: string;
          id?: string;
          post_id?: string;
          reaction_type?: Database["public"]["Enums"]["reaction_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          author_id: string;
          content: string;
          created_at: string;
          family_id: string;
          id: string;
          media_ids: string[] | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          content: string;
          created_at?: string;
          family_id: string;
          id?: string;
          media_ids?: string[] | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          content?: string;
          created_at?: string;
          family_id?: string;
          id?: string;
          media_ids?: string[] | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          family_id: string;
          full_name: string | null;
          id: string;
          phone_number: string | null;
          role: Database["public"]["Enums"]["profile_role"];
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          family_id: string;
          full_name?: string | null;
          id?: string;
          phone_number?: string | null;
          role?: Database["public"]["Enums"]["profile_role"];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          family_id?: string;
          full_name?: string | null;
          id?: string;
          phone_number?: string | null;
          role?: Database["public"]["Enums"]["profile_role"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      tree_members: {
        Row: {
          created_at: string;
          family_id: string;
          id: string;
          person_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          family_id: string;
          id?: string;
          person_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          family_id?: string;
          id?: string;
          person_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tree_members_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tree_members_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "persons";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      family_role: "owner" | "admin" | "member";
      forum_status: "active" | "archived" | "hidden";
      gender: "male" | "female" | "other" | "prefer_not_to_say";
      media_type: "image" | "video" | "audio" | "document";
      message_role: "user" | "assistant";
      notification_type: "mention" | "reply" | "update" | "invitation" | "system";
      profile_role: "admin" | "moderator" | "member";
      reaction_type: "like" | "love" | "haha" | "wow" | "sad" | "angry";
      rsvp_status: "going" | "maybe" | "not_going" | "no_response";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<
  PublicTableNameOrOptions extends
    keyof (PublicSchema["Tables"] & PublicSchema["Views"]) | { schema: keyof Database },
  TableName extends (PublicTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] & {
      Schema: PublicTableNameOrOptions["schema"];
    }
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    ? (PublicSchema["Tables"] & PublicSchema["Views"])[PublicTableNameOrOptions] & {
        Schema: "public";
      }
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends (PublicTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends (PublicTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema["Enums"] | { schema: keyof Database },
  EnumName extends (PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never;

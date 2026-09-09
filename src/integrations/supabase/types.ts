export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      albums: {
        Row: {
          cover_url: string | null;
          created_at: string;
          description: string | null;
          family_id: string;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
          year: number | null;
        };
        Insert: {
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          family_id: string;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string;
          year?: number | null;
        };
        Update: {
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          family_id?: string;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "albums_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          }
        ];
      };
      assistant_scopes: {
        Row: {
          allow_events: boolean;
          allow_photos: boolean;
          allow_tree: boolean;
          created_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          allow_events?: boolean;
          allow_photos?: boolean;
          allow_tree?: boolean;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          allow_events?: boolean;
          allow_photos?: boolean;
          allow_tree?: boolean;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      chat_members: {
        Row: {
          chat_id: string;
          created_at: string;
          family_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          chat_id: string;
          created_at?: string;
          family_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          chat_id?: string;
          created_at?: string;
          family_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_members_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_members_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          }
        ];
      };
      chat_messages: {
        Row: {
          author_id: string;
          chat_id: string;
          created_at: string;
          family_id: string;
          id: string;
          text: string;
        };
        Insert: {
          author_id?: string;
          chat_id: string;
          created_at?: string;
          family_id: string;
          id?: string;
          text: string;
        };
        Update: {
          author_id?: string;
          chat_id?: string;
          created_at?: string;
          family_id?: string;
          id?: string;
          text?: string;
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
            foreignKeyName: "chat_messages_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          }
        ];
      };
      chats: {
        Row: {
          created_at: string;
          created_by: string;
          family_id: string;
          id: string;
          is_group: boolean;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          family_id: string;
          id?: string;
          is_group?: boolean;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          family_id?: string;
          id?: string;
          is_group?: boolean;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chats_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          }
        ];
      };
      event_rsvps: {
        Row: {
          created_at: string;
          event_id: string;
          family_id: string;
          id: string;
          response: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          family_id: string;
          id?: string;
          response: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          family_id?: string;
          id?: string;
          response?: string;
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
          }
        ];
      };
      events: {
        Row: {
          category: string;
          created_at: string;
          created_by: string;
          description: string | null;
          ends_at: string | null;
          family_id: string;
          id: string;
          location: string | null;
          starts_at: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          category?: string;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          ends_at?: string | null;
          family_id: string;
          id?: string;
          location?: string | null;
          starts_at: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          ends_at?: string | null;
          family_id?: string;
          id?: string;
          location?: string | null;
          starts_at?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          }
        ];
      };
      families: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          is_demo: boolean;
          name: string;
          slug: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_demo?: boolean;
          name: string;
          slug?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_demo?: boolean;
          name?: string;
          slug?: string | null;
        };
        Relationships: [];
      };
      family_invitations: {
        Row: {
          accepted: boolean;
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          family_id: string;
          id: string;
          invited_by: string | null;
          role: Database["public"]["Enums"]["family_role"];
          token: string;
        };
        Insert: {
          accepted?: boolean;
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          family_id: string;
          id?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["family_role"];
          token?: string;
        };
        Update: {
          accepted?: boolean;
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          family_id?: string;
          id?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["family_role"];
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "family_invitations_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          }
        ];
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
          }
        ];
      };
      forum_posts: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          family_id: string;
          id: string;
          thread_id: string;
          updated_at: string;
        };
        Insert: {
          author_id?: string;
          body: string;
          created_at?: string;
          family_id: string;
          id?: string;
          thread_id: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          family_id?: string;
          id?: string;
          thread_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "forum_posts_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "forum_posts_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "forum_threads";
            referencedColumns: ["id"];
          }
        ];
      };
      forum_threads: {
        Row: {
          author_id: string;
          category: string;
          created_at: string;
          family_id: string;
          id: string;
          pinned: boolean;
          title: string;
          updated_at: string;
        };
        Insert: {
          author_id?: string;
          category?: string;
          created_at?: string;
          family_id: string;
          id?: string;
          pinned?: boolean;
          title: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          category?: string;
          created_at?: string;
          family_id?: string;
          id?: string;
          pinned?: boolean;
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
          }
        ];
      };
      media_items: {
        Row: {
          ai_caption: string | null;
          ai_story: string | null;
          ai_tags: string[];
          album_id: string | null;
          caption: string;
          created_at: string;
          external_url: string | null;
          family_id: string;
          id: string;
          likes: number;
          media_mime: string | null;
          slug: string;
          storage_path: string | null;
          taken_at: string;
          transcript: string | null;
          updated_at: string;
          uploaded_by_name: string | null;
        };
        Insert: {
          ai_caption?: string | null;
          ai_story?: string | null;
          ai_tags?: string[];
          album_id?: string | null;
          caption: string;
          created_at?: string;
          external_url?: string | null;
          family_id: string;
          id?: string;
          likes?: number;
          media_mime?: string | null;
          slug: string;
          storage_path?: string | null;
          taken_at?: string;
          transcript?: string | null;
          updated_at?: string;
          uploaded_by_name?: string | null;
        };
        Update: {
          ai_caption?: string | null;
          ai_story?: string | null;
          ai_tags?: string[];
          album_id?: string | null;
          caption?: string;
          created_at?: string;
          external_url?: string | null;
          family_id?: string;
          id?: string;
          likes?: number;
          media_mime?: string | null;
          slug?: string;
          storage_path?: string | null;
          taken_at?: string;
          transcript?: string | null;
          updated_at?: string;
          uploaded_by_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_items_album_id_fkey";
            columns: ["album_id"];
            isOneToOne: false;
            referencedRelation: "albums";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_items_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          }
        ];
      };
      member_visibility: {
        Row: {
          allow_events: boolean;
          allow_photos: boolean;
          allow_tree: boolean;
          created_at: string;
          family_id: string;
          member_user_id: string;
          updated_at: string;
        };
        Insert: {
          allow_events?: boolean;
          allow_photos?: boolean;
          allow_tree?: boolean;
          created_at?: string;
          family_id: string;
          member_user_id: string;
          updated_at?: string;
        };
        Update: {
          allow_events?: boolean;
          allow_photos?: boolean;
          allow_tree?: boolean;
          created_at?: string;
          family_id?: string;
          member_user_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_visibility_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          }
        ];
      };
      memories: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          family_id: string;
          happened_on: string | null;
          id: string;
          kind: Database["public"]["Enums"]["memory_kind"];
          media_mime: string | null;
          media_path: string | null;
          place: string | null;
          search_text: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          family_id: string;
          happened_on?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["memory_kind"];
          media_mime?: string | null;
          media_path?: string | null;
          place?: string | null;
          search_text?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          family_id?: string;
          happened_on?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["memory_kind"];
          media_mime?: string | null;
          media_path?: string | null;
          place?: string | null;
          search_text?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memories_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          }
        ];
      };
      memory_persons: {
        Row: {
          family_id: string;
          memory_id: string;
          person_id: string;
        };
        Insert: {
          family_id: string;
          memory_id: string;
          person_id: string;
        };
        Update: {
          family_id?: string;
          memory_id?: string;
          person_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memory_persons_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
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
          }
        ];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          family_id: string;
          id: string;
          kind: string;
          link: string | null;
          read: boolean;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          family_id: string;
          id?: string;
          kind: string;
          link?: string | null;
          read?: boolean;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          family_id?: string;
          id?: string;
          kind?: string;
          link?: string | null;
          read?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          }
        ];
      };
      persons: {
        Row: {
          bio: string | null;
          birth_date: string | null;
          birth_name: string | null;
          birth_place: string | null;
          created_at: string;
          created_by: string | null;
          death_date: string | null;
          family_id: string;
          first_name: string;
          id: string;
          last_name: string | null;
          photo_path: string | null;
          search_text: string | null;
          updated_at: string;
        };
        Insert: {
          bio?: string | null;
          birth_date?: string | null;
          birth_name?: string | null;
          birth_place?: string | null;
          created_at?: string;
          created_by?: string | null;
          death_date?: string | null;
          family_id: string;
          first_name: string;
          id?: string;
          last_name?: string | null;
          photo_path?: string | null;
          search_text?: string | null;
          updated_at?: string;
        };
        Update: {
          bio?: string | null;
          birth_date?: string | null;
          birth_name?: string | null;
          birth_place?: string | null;
          created_at?: string;
          created_by?: string | null;
          death_date?: string | null;
          family_id?: string;
          first_name?: string;
          id?: string;
          last_name?: string | null;
          photo_path?: string | null;
          search_text?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "persons_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          }
        ];
      };
      post_comments: {
        Row: {
          author_id: string;
          created_at: string;
          family_id: string;
          id: string;
          post_id: string;
          text: string;
          updated_at: string;
        };
        Insert: {
          author_id?: string;
          created_at?: string;
          family_id: string;
          id?: string;
          post_id: string;
          text: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          created_at?: string;
          family_id?: string;
          id?: string;
          post_id?: string;
          text?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_comments_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          }
        ];
      };
      post_reactions: {
        Row: {
          created_at: string;
          family_id: string;
          id: string;
          post_id: string;
          reaction: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          family_id: string;
          id?: string;
          post_id: string;
          reaction: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          family_id?: string;
          id?: string;
          post_id?: string;
          reaction?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_reactions_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_reactions_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          }
        ];
      };
      posts: {
        Row: {
          author_id: string;
          created_at: string;
          family_id: string;
          id: string;
          photos: string[];
          tagged_user_ids: string[];
          text: string;
          updated_at: string;
        };
        Insert: {
          author_id?: string;
          created_at?: string;
          family_id: string;
          id?: string;
          photos?: string[];
          tagged_user_ids?: string[];
          text: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          created_at?: string;
          family_id?: string;
          id?: string;
          photos?: string[];
          tagged_user_ids?: string[];
          text?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          locale: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          locale?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          locale?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recipes: {
        Row: {
          attributed_to: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          family_id: string;
          id: string;
          ingredients: string[];
          instructions: string[];
          photo_url: string | null;
          storage_path: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          attributed_to?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          family_id: string;
          id?: string;
          ingredients?: string[];
          instructions?: string[];
          photo_url?: string | null;
          storage_path?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          attributed_to?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          family_id?: string;
          id?: string;
          ingredients?: string[];
          instructions?: string[];
          photo_url?: string | null;
          storage_path?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipes_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          }
        ];
      };
      tree_members: {
        Row: {
          created_at: string;
          family_id: string;
          id: string;
          person_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          family_id: string;
          id?: string;
          person_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          family_id?: string;
          id?: string;
          person_id?: string;
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
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_chat_creator: {
        Args: { _chat_id: string };
        Returns: boolean;
      };
      is_chat_member: {
        Args: { _chat_id: string };
        Returns: boolean;
      };
      is_demo_family: {
        Args: { _family_id: string };
        Returns: boolean;
      };
      is_family_creator: {
        Args: { _family_id: string };
        Returns: boolean;
      };
      is_family_member: {
        Args: { _family_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      family_role: "owner" | "member";
      memory_kind: "memory" | "todo" | "link";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] & {
      Schema: PublicTableNameOrOptions["schema"];
    }
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] & PublicSchema["Views"])[PublicTableNameOrOptions] & {
        Schema: "public";
      }
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
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
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
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
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never;

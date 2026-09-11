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
      albums: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          family_id: string
          id: string
          name: string
          slug: string
          updated_at: string
          year: number | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          family_id: string
          id?: string
          name: string
          slug: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          family_id?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "albums_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_scopes: {
        Row: {
          allow_events: boolean
          allow_photos: boolean
          allow_tree: boolean
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_events?: boolean
          allow_photos?: boolean
          allow_tree?: boolean
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          allow_events?: boolean
          allow_photos?: boolean
          allow_tree?: boolean
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_members: {
        Row: {
          chat_id: string
          created_at: string
          family_id: string
          id: string
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          family_id: string
          id?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          family_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_members_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          author_id: string
          chat_id: string
          created_at: string
          family_id: string
          id: string
          text: string
        }
        Insert: {
          author_id?: string
          chat_id: string
          created_at?: string
          family_id: string
          id?: string
          text: string
        }
        Update: {
          author_id?: string
          chat_id?: string
          created_at?: string
          family_id?: string
          id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string
          created_by: string
          family_id: string
          id: string
          is_group: boolean
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          family_id: string
          id?: string
          is_group?: boolean
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          family_id?: string
          id?: string
          is_group?: boolean
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          family_id: string
          id: string
          response: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          family_id: string
          id?: string
          response: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          family_id?: string
          id?: string
          response?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          family_id: string
          id: string
          location: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          family_id: string
          id?: string
          location?: string | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          family_id?: string
          id?: string
          location?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_demo: boolean
          name: string
          slug: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_demo?: boolean
          name: string
          slug?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_demo?: boolean
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
      family_invitations: {
        Row: {
          accepted: boolean
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          family_id: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["family_role"]
          token: string
        }
        Insert: {
          accepted?: boolean
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          family_id: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["family_role"]
          token?: string
        }
        Update: {
          accepted?: boolean
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          family_id?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["family_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_invitations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          created_at: string
          family_id: string
          id: string
          role: Database["public"]["Enums"]["family_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          role?: Database["public"]["Enums"]["family_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          role?: Database["public"]["Enums"]["family_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          family_id: string
          id: string
          thread_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string
          body: string
          created_at?: string
          family_id: string
          id?: string
          thread_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          family_id?: string
          id?: string
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_threads: {
        Row: {
          author_id: string
          category: string
          created_at: string
          family_id: string
          id: string
          pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string
          category?: string
          created_at?: string
          family_id: string
          id?: string
          pinned?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string
          created_at?: string
          family_id?: string
          id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_threads_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      media_items: {
        Row: {
          ai_caption: string | null
          ai_story: string | null
          ai_tags: string[]
          album_id: string | null
          caption: string
          created_at: string
          external_url: string | null
          family_id: string
          id: string
          likes: number
          media_mime: string | null
          slug: string
          storage_path: string | null
          taken_at: string
          transcript: string | null
          updated_at: string
          uploaded_by_name: string | null
        }
        Insert: {
          ai_caption?: string | null
          ai_story?: string | null
          ai_tags?: string[]
          album_id?: string | null
          caption: string
          created_at?: string
          external_url?: string | null
          family_id: string
          id?: string
          likes?: number
          media_mime?: string | null
          slug: string
          storage_path?: string | null
          taken_at?: string
          transcript?: string | null
          updated_at?: string
          uploaded_by_name?: string | null
        }
        Update: {
          ai_caption?: string | null
          ai_story?: string | null
          ai_tags?: string[]
          album_id?: string | null
          caption?: string
          created_at?: string
          external_url?: string | null
          family_id?: string
          id?: string
          likes?: number
          media_mime?: string | null
          slug?: string
          storage_path?: string | null
          taken_at?: string
          transcript?: string | null
          updated_at?: string
          uploaded_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_items_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_items_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      member_visibility: {
        Row: {
          allow_events: boolean
          allow_photos: boolean
          allow_tree: boolean
          created_at: string
          family_id: string
          member_user_id: string
          updated_at: string
        }
        Insert: {
          allow_events?: boolean
          allow_photos?: boolean
          allow_tree?: boolean
          created_at?: string
          family_id: string
          member_user_id: string
          updated_at?: string
        }
        Update: {
          allow_events?: boolean
          allow_photos?: boolean
          allow_tree?: boolean
          created_at?: string
          family_id?: string
          member_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_visibility_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          family_id: string
          happened_on: string | null
          id: string
          kind: Database["public"]["Enums"]["memory_kind"]
          media_mime: string | null
          media_path: string | null
          place: string | null
          search_text: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          family_id: string
          happened_on?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["memory_kind"]
          media_mime?: string | null
          media_path?: string | null
          place?: string | null
          search_text?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          family_id?: string
          happened_on?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["memory_kind"]
          media_mime?: string | null
          media_path?: string | null
          place?: string | null
          search_text?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_persons: {
        Row: {
          family_id: string
          memory_id: string
          person_id: string
        }
        Insert: {
          family_id: string
          memory_id: string
          person_id: string
        }
        Update: {
          family_id?: string
          memory_id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_persons_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_persons_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_persons_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          family_id: string
          id: string
          kind: string
          link: string | null
          read: boolean
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          family_id: string
          id?: string
          kind: string
          link?: string | null
          read?: boolean
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          family_id?: string
          id?: string
          kind?: string
          link?: string | null
          read?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      persons: {
        Row: {
          bio: string | null
          birth_date: string | null
          birth_name: string | null
          birth_place: string | null
          created_at: string
          created_by: string | null
          death_date: string | null
          family_id: string
          first_name: string
          id: string
          last_name: string | null
          photo_path: string | null
          search_text: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          birth_date?: string | null
          birth_name?: string | null
          birth_place?: string | null
          created_at?: string
          created_by?: string | null
          death_date?: string | null
          family_id: string
          first_name: string
          id?: string
          last_name?: string | null
          photo_path?: string | null
          search_text?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          birth_date?: string | null
          birth_name?: string | null
          birth_place?: string | null
          created_at?: string
          created_by?: string | null
          death_date?: string | null
          family_id?: string
          first_name?: string
          id?: string
          last_name?: string | null
          photo_path?: string | null
          search_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "persons_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          created_at: string
          family_id: string
          id: string
          post_id: string
          text: string
          updated_at: string
        }
        Insert: {
          author_id?: string
          created_at?: string
          family_id: string
          id?: string
          post_id: string
          text: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          family_id?: string
          id?: string
          post_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          family_id: string
          id: string
          post_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          post_id: string
          reaction: string
          user_id?: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          post_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          created_at: string
          family_id: string
          id: string
          photos: string[]
          tagged_user_ids: string[]
          text: string
          updated_at: string
        }
        Insert: {
          author_id?: string
          created_at?: string
          family_id: string
          id?: string
          photos?: string[]
          tagged_user_ids?: string[]
          text: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          family_id?: string
          id?: string
          photos?: string[]
          tagged_user_ids?: string[]
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          locale: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          updated_at?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          attributed_to: string | null
          created_at: string
          created_by: string
          description: string | null
          family_id: string
          id: string
          ingredients: string[]
          instructions: string[]
          photo_url: string | null
          storage_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          attributed_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          family_id: string
          id?: string
          ingredients?: string[]
          instructions?: string[]
          photo_url?: string | null
          storage_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          attributed_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          family_id?: string
          id?: string
          ingredients?: string[]
          instructions?: string[]
          photo_url?: string | null
          storage_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      relationships: {
        Row: {
          created_at: string
          family_id: string
          from_person_id: string
          id: string
          to_person_id: string
          type: Database["public"]["Enums"]["relationship_type"]
        }
        Insert: {
          created_at?: string
          family_id: string
          from_person_id: string
          id?: string
          to_person_id: string
          type: Database["public"]["Enums"]["relationship_type"]
        }
        Update: {
          created_at?: string
          family_id?: string
          from_person_id?: string
          id?: string
          to_person_id?: string
          type?: Database["public"]["Enums"]["relationship_type"]
        }
        Relationships: [
          {
            foreignKeyName: "relationships_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_from_person_id_fkey"
            columns: ["from_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_to_person_id_fkey"
            columns: ["to_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vault_entries: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          family_id: string
          id: string
          kind: Database["public"]["Enums"]["vault_kind"]
          media_mime: string | null
          media_name: string | null
          media_path: string | null
          preview_label: string | null
          recipient_names: string[]
          recipient_person_id: string | null
          release_on: string | null
          release_rule: Database["public"]["Enums"]["vault_release"]
          released: boolean
          sealed_at: string
          sealed_by_name: string | null
          size_label: string | null
          title: string
          transcript: string | null
          unlock_age: number | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          family_id: string
          id?: string
          kind?: Database["public"]["Enums"]["vault_kind"]
          media_mime?: string | null
          media_name?: string | null
          media_path?: string | null
          preview_label?: string | null
          recipient_names?: string[]
          recipient_person_id?: string | null
          release_on?: string | null
          release_rule?: Database["public"]["Enums"]["vault_release"]
          released?: boolean
          sealed_at?: string
          sealed_by_name?: string | null
          size_label?: string | null
          title: string
          transcript?: string | null
          unlock_age?: number | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          family_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["vault_kind"]
          media_mime?: string | null
          media_name?: string | null
          media_path?: string | null
          preview_label?: string | null
          recipient_names?: string[]
          recipient_person_id?: string | null
          release_on?: string | null
          release_rule?: Database["public"]["Enums"]["vault_release"]
          released?: boolean
          sealed_at?: string
          sealed_by_name?: string | null
          size_label?: string | null
          title?: string
          transcript?: string | null
          unlock_age?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_entries_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_entries_recipient_person_id_fkey"
            columns: ["recipient_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_family_invitation: { Args: { _token: string }; Returns: string }
      can_admin_family: { Args: { _family_id: string }; Returns: boolean }
      can_edit_family: { Args: { _family_id: string }; Returns: boolean }
      family_has_owner: { Args: { _family_id: string }; Returns: boolean }
      family_invitation_preview: {
        Args: { _token: string }
        Returns: {
          accepted: boolean
          email: string
          email_matches: boolean
          expires_at: string
          family_id: string
          family_name: string
          role: Database["public"]["Enums"]["family_role"]
        }[]
      }
      family_plan_status: {
        Args: { _env?: string; _family_id: string }
        Returns: {
          cancel_at_period_end: boolean
          is_paid: boolean
          next_payment_at: string
        }[]
      }
      family_role_of: {
        Args: { _family_id: string }
        Returns: Database["public"]["Enums"]["family_role"]
      }
      family_storage_limit_bytes: {
        Args: { _env?: string; _family_id: string }
        Returns: number
      }
      family_storage_usage_bytes: {
        Args: { _family_id: string }
        Returns: number
      }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_chat_creator: { Args: { _chat_id: string }; Returns: boolean }
      is_chat_member: { Args: { _chat_id: string }; Returns: boolean }
      is_demo_family: { Args: { _family_id: string }; Returns: boolean }
      is_family_creator: { Args: { _family_id: string }; Returns: boolean }
      is_family_member: { Args: { _family_id: string }; Returns: boolean }
      member_can_see: {
        Args: { _area: string; _family_id: string }
        Returns: boolean
      }
      shares_family_with: { Args: { _user_id: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      vault_is_released: {
        Args: {
          _release_on: string
          _released: boolean
          _rule: Database["public"]["Enums"]["vault_release"]
          _unlock_age: number
        }
        Returns: boolean
      }
      vault_list: {
        Args: { _family_id: string }
        Returns: {
          content: string
          created_by: string
          id: string
          is_open: boolean
          kind: Database["public"]["Enums"]["vault_kind"]
          media_mime: string
          media_name: string
          media_path: string
          preview_label: string
          recipient_names: string[]
          release_on: string
          release_rule: Database["public"]["Enums"]["vault_release"]
          released: boolean
          sealed_at: string
          sealed_by_name: string
          size_label: string
          title: string
          transcript: string
        }[]
      }
      vault_object_readable: { Args: { _name: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      family_role: "owner" | "steward" | "member" | "viewer"
      memory_kind: "photo" | "document" | "audio" | "video" | "story"
      relationship_type: "parent" | "partner"
      vault_kind: "message" | "letter" | "video" | "audio"
      vault_release: "immediate" | "on_date" | "on_confirmation"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
      family_role: ["owner", "steward", "member", "viewer"],
      memory_kind: ["photo", "document", "audio", "video", "story"],
      relationship_type: ["parent", "partner"],
      vault_kind: ["message", "letter", "video", "audio"],
      vault_release: ["immediate", "on_date", "on_confirmation"],
    },
  },
} as const

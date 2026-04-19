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
      blog_posts: {
        Row: {
          author_id: string | null
          category: string | null
          content: string | null
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          title: string
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          title: string
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          admin_note: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          quote_distribution_id: string | null
          reason: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          admin_note?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          quote_distribution_id?: string | null
          reason: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          admin_note?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          quote_distribution_id?: string | null
          reason?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_quote_distribution_id_fkey"
            columns: ["quote_distribution_id"]
            isOneToOne: false
            referencedRelation: "quote_distributions"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          account_status: string
          address: string | null
          city: string | null
          created_at: string
          description: string | null
          didit_session_id: string | null
          email_billing: string | null
          email_contact: string | null
          email_general: string | null
          employee_count: number | null
          id: string
          is_verified: boolean
          kyc_status: string
          legal_status: string | null
          logo_url: string | null
          name: string
          pending_name: string | null
          pending_name_requested_at: string | null
          phone: string | null
          postal_code: string | null
          profile_id: string
          rating: number
          review_count: number
          siret: string
          slug: string
          trial_ends_at: string | null
          updated_at: string
          vat_number: string | null
          wallet_balance_cents: number
          website: string | null
        }
        Insert: {
          account_status?: string
          address?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          didit_session_id?: string | null
          email_billing?: string | null
          email_contact?: string | null
          email_general?: string | null
          employee_count?: number | null
          id?: string
          is_verified?: boolean
          kyc_status?: string
          legal_status?: string | null
          logo_url?: string | null
          name: string
          pending_name?: string | null
          pending_name_requested_at?: string | null
          phone?: string | null
          postal_code?: string | null
          profile_id: string
          rating?: number
          review_count?: number
          siret: string
          slug: string
          trial_ends_at?: string | null
          updated_at?: string
          vat_number?: string | null
          wallet_balance_cents?: number
          website?: string | null
        }
        Update: {
          account_status?: string
          address?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          didit_session_id?: string | null
          email_billing?: string | null
          email_contact?: string | null
          email_general?: string | null
          employee_count?: number | null
          id?: string
          is_verified?: boolean
          kyc_status?: string
          legal_status?: string | null
          logo_url?: string | null
          name?: string
          pending_name?: string | null
          pending_name_requested_at?: string | null
          phone?: string | null
          postal_code?: string | null
          profile_id?: string
          rating?: number
          review_count?: number
          siret?: string
          slug?: string
          trial_ends_at?: string | null
          updated_at?: string
          vat_number?: string | null
          wallet_balance_cents?: number
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_photos: {
        Row: {
          caption: string | null
          company_id: string
          created_at: string
          id: string
          order_index: number
          url: string
        }
        Insert: {
          caption?: string | null
          company_id: string
          created_at?: string
          id?: string
          order_index?: number
          url: string
        }
        Update: {
          caption?: string | null
          company_id?: string
          created_at?: string
          id?: string
          order_index?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_photos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_qna: {
        Row: {
          answer: string
          company_id: string
          id: string
          order_index: number
          question: string
        }
        Insert: {
          answer: string
          company_id: string
          id?: string
          order_index?: number
          question: string
        }
        Update: {
          answer?: string
          company_id?: string
          id?: string
          order_index?: number
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_qna_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_radius: {
        Row: {
          company_id: string
          created_at: string
          departure_city: string
          id: string
          lat: number
          lng: number
          move_types: string[]
          radius_km: number
        }
        Insert: {
          company_id: string
          created_at?: string
          departure_city: string
          id?: string
          lat: number
          lng: number
          move_types?: string[]
          radius_km: number
        }
        Update: {
          company_id?: string
          created_at?: string
          departure_city?: string
          id?: string
          lat?: number
          lng?: number
          move_types?: string[]
          radius_km?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_radius_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_regions: {
        Row: {
          categories: string[]
          company_id: string
          created_at: string
          department_code: string
          department_name: string
          id: string
        }
        Insert: {
          categories?: string[]
          company_id: string
          created_at?: string
          department_code: string
          department_name: string
          id?: string
        }
        Update: {
          categories?: string[]
          company_id?: string
          created_at?: string
          department_code?: string
          department_name?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_regions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          company_id: string
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          company_id: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          title: string
          type: string
        }
        Update: {
          body?: string | null
          company_id?: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          content: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      quote_distributions: {
        Row: {
          company_id: string
          competitor_count: number
          created_at: string
          id: string
          is_trial: boolean
          price_cents: number | null
          quote_request_id: string
          status: string
          unlocked_at: string | null
        }
        Insert: {
          company_id: string
          competitor_count?: number
          created_at?: string
          id?: string
          is_trial?: boolean
          price_cents?: number | null
          quote_request_id: string
          status?: string
          unlocked_at?: string | null
        }
        Update: {
          company_id?: string
          competitor_count?: number
          created_at?: string
          id?: string
          is_trial?: boolean
          price_cents?: number | null
          quote_request_id?: string
          status?: string
          unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_distributions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_distributions_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          category: string
          client_email: string | null
          client_first_name: string | null
          client_last_name: string | null
          client_name: string | null
          client_phone: string | null
          client_salutation: string | null
          created_at: string
          date_mode: string | null
          defect_flagged_at: string | null
          defect_resolved_at: string | null
          defect_resolved_by: string | null
          defect_status: string | null
          distributed_at: string | null
          email_verification_attempts: number
          email_verification_code: string | null
          email_verification_expires: string | null
          email_verification_last_sent_at: string | null
          email_verified: boolean
          from_address: string | null
          from_city: string | null
          from_country: string | null
          from_elevator: boolean | null
          from_floor: number | null
          from_housing_type: string | null
          from_lat: number | null
          from_lng: number | null
          from_postal_code: string | null
          geographic_zone: string | null
          heavy_items: string[]
          id: string
          move_date: string | null
          move_date_end: string | null
          move_type: string | null
          notes: string | null
          phone_verification_attempts: number
          phone_verification_code: string | null
          phone_verification_expires: string | null
          phone_verification_last_sent_at: string | null
          phone_verified: boolean
          prospect_id: string
          review_email_sent_at: string | null
          room_count: number | null
          services: string[]
          source: string
          source_url: string | null
          status: string
          to_address: string | null
          to_city: string | null
          to_country: string | null
          to_elevator: boolean | null
          to_floor: number | null
          to_housing_type: string | null
          to_postal_code: string | null
          updated_at: string
          volume_m3: number | null
        }
        Insert: {
          category: string
          client_email?: string | null
          client_first_name?: string | null
          client_last_name?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_salutation?: string | null
          created_at?: string
          date_mode?: string | null
          defect_flagged_at?: string | null
          defect_resolved_at?: string | null
          defect_resolved_by?: string | null
          defect_status?: string | null
          distributed_at?: string | null
          email_verification_attempts?: number
          email_verification_code?: string | null
          email_verification_expires?: string | null
          email_verification_last_sent_at?: string | null
          email_verified?: boolean
          from_address?: string | null
          from_city?: string | null
          from_country?: string | null
          from_elevator?: boolean | null
          from_floor?: number | null
          from_housing_type?: string | null
          from_lat?: number | null
          from_lng?: number | null
          from_postal_code?: string | null
          geographic_zone?: string | null
          heavy_items?: string[]
          id?: string
          move_date?: string | null
          move_date_end?: string | null
          move_type?: string | null
          notes?: string | null
          phone_verification_attempts?: number
          phone_verification_code?: string | null
          phone_verification_expires?: string | null
          phone_verification_last_sent_at?: string | null
          phone_verified?: boolean
          prospect_id: string
          review_email_sent_at?: string | null
          room_count?: number | null
          services?: string[]
          source?: string
          source_url?: string | null
          status?: string
          to_address?: string | null
          to_city?: string | null
          to_country?: string | null
          to_elevator?: boolean | null
          to_floor?: number | null
          to_housing_type?: string | null
          to_postal_code?: string | null
          updated_at?: string
          volume_m3?: number | null
        }
        Update: {
          category?: string
          client_email?: string | null
          client_first_name?: string | null
          client_last_name?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_salutation?: string | null
          created_at?: string
          date_mode?: string | null
          defect_flagged_at?: string | null
          defect_resolved_at?: string | null
          defect_resolved_by?: string | null
          defect_status?: string | null
          distributed_at?: string | null
          email_verification_attempts?: number
          email_verification_code?: string | null
          email_verification_expires?: string | null
          email_verification_last_sent_at?: string | null
          email_verified?: boolean
          from_address?: string | null
          from_city?: string | null
          from_country?: string | null
          from_elevator?: boolean | null
          from_floor?: number | null
          from_housing_type?: string | null
          from_lat?: number | null
          from_lng?: number | null
          from_postal_code?: string | null
          geographic_zone?: string | null
          heavy_items?: string[]
          id?: string
          move_date?: string | null
          move_date_end?: string | null
          move_type?: string | null
          notes?: string | null
          phone_verification_attempts?: number
          phone_verification_code?: string | null
          phone_verification_expires?: string | null
          phone_verification_last_sent_at?: string | null
          phone_verified?: boolean
          prospect_id?: string
          review_email_sent_at?: string | null
          room_count?: number | null
          services?: string[]
          source?: string
          source_url?: string | null
          status?: string
          to_address?: string | null
          to_city?: string | null
          to_country?: string | null
          to_elevator?: boolean | null
          to_floor?: number | null
          to_housing_type?: string | null
          to_postal_code?: string | null
          updated_at?: string
          volume_m3?: number | null
        }
        Relationships: []
      }
      rate_limit_events: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip?: string
        }
        Relationships: []
      }
      review_tokens: {
        Row: {
          company_id: string
          expires_at: string
          quote_request_id: string
          sent_at: string
          token: string
          used_at: string | null
        }
        Insert: {
          company_id: string
          expires_at: string
          quote_request_id: string
          sent_at?: string
          token: string
          used_at?: string | null
        }
        Update: {
          company_id?: string
          expires_at?: string
          quote_request_id?: string
          sent_at?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_tokens_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          company_id: string
          created_at: string
          id: string
          is_anonymous: boolean
          is_verified: boolean
          quote_request_id: string | null
          rating: number
          reviewer_name: string | null
        }
        Insert: {
          comment?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          is_verified?: boolean
          quote_request_id?: string | null
          rating: number
          reviewer_name?: string | null
        }
        Update: {
          comment?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          is_verified?: boolean
          quote_request_id?: string | null
          rating?: number
          reviewer_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          data: Json
          id: number
          updated_at: string
        }
        Insert: {
          data?: Json
          id?: number
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount_cents: number
          company_id: string
          created_at: string
          id: string
          mollie_customer_id: string | null
          mollie_subscription_id: string | null
          next_billing_date: string | null
          plan: string
          status: string
        }
        Insert: {
          amount_cents: number
          company_id: string
          created_at?: string
          id?: string
          mollie_customer_id?: string | null
          mollie_subscription_id?: string | null
          next_billing_date?: string | null
          plan: string
          status?: string
        }
        Update: {
          amount_cents?: number
          company_id?: string
          created_at?: string
          id?: string
          mollie_customer_id?: string | null
          mollie_subscription_id?: string | null
          next_billing_date?: string | null
          plan?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_cents: number
          company_id: string
          created_at: string
          currency: string
          id: string
          invoice_number: string | null
          invoice_url: string | null
          mollie_payment_id: string | null
          quote_distribution_id: string | null
          reconciled_at: string | null
          status: string
          type: string
          wallet_debit_cents: number
        }
        Insert: {
          amount_cents: number
          company_id: string
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          mollie_payment_id?: string | null
          quote_distribution_id?: string | null
          reconciled_at?: string | null
          status?: string
          type: string
          wallet_debit_cents?: number
        }
        Update: {
          amount_cents?: number
          company_id?: string
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          mollie_payment_id?: string | null
          quote_distribution_id?: string | null
          reconciled_at?: string | null
          status?: string
          type?: string
          wallet_debit_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_quote_distribution_id_fkey"
            columns: ["quote_distribution_id"]
            isOneToOne: false
            referencedRelation: "quote_distributions"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          admin_note: string | null
          amount_cents: number
          company_id: string
          created_at: string
          expires_at: string | null
          id: string
          mollie_refund_id: string | null
          quote_distribution_id: string | null
          reason: string | null
          refund_method: string | null
          refund_percent: number | null
          source_transaction_id: string | null
          type: string
        }
        Insert: {
          admin_note?: string | null
          amount_cents: number
          company_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          mollie_refund_id?: string | null
          quote_distribution_id?: string | null
          reason?: string | null
          refund_method?: string | null
          refund_percent?: number | null
          source_transaction_id?: string | null
          type: string
        }
        Update: {
          admin_note?: string | null
          amount_cents?: number
          company_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          mollie_refund_id?: string | null
          quote_distribution_id?: string | null
          reason?: string | null
          refund_method?: string | null
          refund_percent?: number | null
          source_transaction_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_quote_distribution_id_fkey"
            columns: ["quote_distribution_id"]
            isOneToOne: false
            referencedRelation: "quote_distributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_source_transaction_id_fkey"
            columns: ["source_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      user_role: "client" | "mover" | "admin"
      account_status: "pending" | "trial" | "active" | "suspended" | "closed"
      kyc_status: "not_started" | "pending" | "approved" | "rejected"
      quote_category: "demenagement" | "nettoyage" | "debarras" | "garde_meuble" | "monte_meuble"
      quote_status: "new" | "distributing" | "distributed" | "completed" | "cancelled" | "expired"
      distribution_status: "pending" | "viewed" | "unlocked" | "contacted" | "won" | "lost" | "expired"
      transaction_type: "lead_purchase" | "subscription" | "refund" | "credit"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      subscription_plan: "starter" | "pro" | "enterprise"
      subscription_status: "active" | "past_due" | "cancelled" | "expired"
      subscription_interval: "monthly" | "yearly"
      claim_reason: "wrong_info" | "duplicate" | "unreachable" | "fake" | "other"
      claim_status: "pending" | "reviewing" | "approved" | "rejected"
      notification_type: "new_lead" | "lead_unlocked" | "payment_received" | "payment_failed" | "review_received" | "claim_update" | "subscription_update" | "kyc_update" | "system"
      notification_channel: "in_app" | "push" | "email" | "sms"
      match_type: "department" | "radius"
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

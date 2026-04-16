export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          role: "client" | "mover" | "admin";
          avatar_url: string | null;
          company_id: string | null;
          account_status: "pending" | "trial" | "active" | "suspended" | "closed";
          kyc_status: "not_started" | "pending" | "approved" | "rejected";
          kyc_applicant_id: string | null;
          email_verified: boolean;
          phone_verified: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          role?: "client" | "mover" | "admin";
          avatar_url?: string | null;
          company_id?: string | null;
          account_status?: "pending" | "trial" | "active" | "suspended" | "closed";
          kyc_status?: "not_started" | "pending" | "approved" | "rejected";
          kyc_applicant_id?: string | null;
          email_verified?: boolean;
          phone_verified?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          role?: "client" | "mover" | "admin";
          avatar_url?: string | null;
          company_id?: string | null;
          account_status?: "pending" | "trial" | "active" | "suspended" | "closed";
          kyc_status?: "not_started" | "pending" | "approved" | "rejected";
          kyc_applicant_id?: string | null;
          email_verified?: boolean;
          phone_verified?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          id: string;
          profile_id: string;
          name: string;
          slug: string;
          siret: string;
          siren: string;
          legal_form: string | null;
          description: string | null;
          short_description: string | null;
          logo_url: string | null;
          cover_url: string | null;
          website: string | null;
          email: string;
          phone: string;
          address_street: string;
          address_city: string;
          address_postal_code: string;
          address_department: string;
          address_lat: number | null;
          address_lng: number | null;
          categories: string[];
          services: string[];
          employee_count: string | null;
          founded_year: number | null;
          insurance_number: string | null;
          insurance_expiry: string | null;
          average_rating: number;
          review_count: number;
          lead_price_cents: number;
          is_verified: boolean;
          is_featured: boolean;
          is_active: boolean;
          trial_ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          name: string;
          slug: string;
          siret: string;
          siren: string;
          legal_form?: string | null;
          description?: string | null;
          short_description?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          website?: string | null;
          email: string;
          phone: string;
          address_street: string;
          address_city: string;
          address_postal_code: string;
          address_department: string;
          address_lat?: number | null;
          address_lng?: number | null;
          categories?: string[];
          services?: string[];
          employee_count?: string | null;
          founded_year?: number | null;
          insurance_number?: string | null;
          insurance_expiry?: string | null;
          average_rating?: number;
          review_count?: number;
          lead_price_cents?: number;
          is_verified?: boolean;
          is_featured?: boolean;
          is_active?: boolean;
          trial_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          name?: string;
          slug?: string;
          siret?: string;
          siren?: string;
          legal_form?: string | null;
          description?: string | null;
          short_description?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          website?: string | null;
          email?: string;
          phone?: string;
          address_street?: string;
          address_city?: string;
          address_postal_code?: string;
          address_department?: string;
          address_lat?: number | null;
          address_lng?: number | null;
          categories?: string[];
          services?: string[];
          employee_count?: string | null;
          founded_year?: number | null;
          insurance_number?: string | null;
          insurance_expiry?: string | null;
          average_rating?: number;
          review_count?: number;
          lead_price_cents?: number;
          is_verified?: boolean;
          is_featured?: boolean;
          is_active?: boolean;
          trial_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "companies_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      company_regions: {
        Row: {
          id: string;
          company_id: string;
          department_code: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          department_code: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          department_code?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_regions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_radius: {
        Row: {
          id: string;
          company_id: string;
          center_lat: number;
          center_lng: number;
          radius_km: number;
          label: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          center_lat: number;
          center_lng: number;
          radius_km: number;
          label?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          center_lat?: number;
          center_lng?: number;
          radius_km?: number;
          label?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_radius_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_requests: {
        Row: {
          id: string;
          prospect_id: string;
          category: "demenagement" | "nettoyage" | "debarras" | "garde_meuble" | "monte_meuble";
          status: "new" | "distributing" | "distributed" | "completed" | "cancelled" | "expired";
          client_first_name: string;
          client_last_name: string;
          client_email: string;
          client_phone: string;
          departure_address: string;
          departure_city: string;
          departure_postal_code: string;
          departure_department: string;
          departure_lat: number | null;
          departure_lng: number | null;
          departure_floor: number | null;
          departure_elevator: boolean;
          departure_parking: boolean;
          arrival_address: string;
          arrival_city: string;
          arrival_postal_code: string;
          arrival_department: string;
          arrival_lat: number | null;
          arrival_lng: number | null;
          arrival_floor: number | null;
          arrival_elevator: boolean;
          arrival_parking: boolean;
          moving_date: string;
          flexible_dates: boolean;
          volume_m3: number | null;
          housing_type: string | null;
          room_count: number | null;
          has_heavy_items: boolean;
          heavy_items_details: string | null;
          additional_services: string[];
          comments: string | null;
          max_distributions: number;
          current_distributions: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          prospect_id: string;
          category: "demenagement" | "nettoyage" | "debarras" | "garde_meuble" | "monte_meuble";
          status?: "new" | "distributing" | "distributed" | "completed" | "cancelled" | "expired";
          client_first_name: string;
          client_last_name: string;
          client_email: string;
          client_phone: string;
          departure_address: string;
          departure_city: string;
          departure_postal_code: string;
          departure_department: string;
          departure_lat?: number | null;
          departure_lng?: number | null;
          departure_floor?: number | null;
          departure_elevator?: boolean;
          departure_parking?: boolean;
          arrival_address: string;
          arrival_city: string;
          arrival_postal_code: string;
          arrival_department: string;
          arrival_lat?: number | null;
          arrival_lng?: number | null;
          arrival_floor?: number | null;
          arrival_elevator?: boolean;
          arrival_parking?: boolean;
          moving_date: string;
          flexible_dates?: boolean;
          volume_m3?: number | null;
          housing_type?: string | null;
          room_count?: number | null;
          has_heavy_items?: boolean;
          heavy_items_details?: string | null;
          additional_services?: string[];
          comments?: string | null;
          max_distributions?: number;
          current_distributions?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          prospect_id?: string;
          category?: "demenagement" | "nettoyage" | "debarras" | "garde_meuble" | "monte_meuble";
          status?: "new" | "distributing" | "distributed" | "completed" | "cancelled" | "expired";
          client_first_name?: string;
          client_last_name?: string;
          client_email?: string;
          client_phone?: string;
          departure_address?: string;
          departure_city?: string;
          departure_postal_code?: string;
          departure_department?: string;
          departure_lat?: number | null;
          departure_lng?: number | null;
          departure_floor?: number | null;
          departure_elevator?: boolean;
          departure_parking?: boolean;
          arrival_address?: string;
          arrival_city?: string;
          arrival_postal_code?: string;
          arrival_department?: string;
          arrival_lat?: number | null;
          arrival_lng?: number | null;
          arrival_floor?: number | null;
          arrival_elevator?: boolean;
          arrival_parking?: boolean;
          moving_date?: string;
          flexible_dates?: boolean;
          volume_m3?: number | null;
          housing_type?: string | null;
          room_count?: number | null;
          has_heavy_items?: boolean;
          heavy_items_details?: string | null;
          additional_services?: string[];
          comments?: string | null;
          max_distributions?: number;
          current_distributions?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quote_distributions: {
        Row: {
          id: string;
          quote_request_id: string;
          company_id: string;
          status: "pending" | "viewed" | "unlocked" | "contacted" | "won" | "lost" | "expired";
          match_type: "department" | "radius";
          match_distance_km: number | null;
          price_cents: number;
          viewed_at: string | null;
          unlocked_at: string | null;
          mollie_payment_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quote_request_id: string;
          company_id: string;
          status?: "pending" | "viewed" | "unlocked" | "contacted" | "won" | "lost" | "expired";
          match_type: "department" | "radius";
          match_distance_km?: number | null;
          price_cents: number;
          viewed_at?: string | null;
          unlocked_at?: string | null;
          mollie_payment_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          quote_request_id?: string;
          company_id?: string;
          status?: "pending" | "viewed" | "unlocked" | "contacted" | "won" | "lost" | "expired";
          match_type?: "department" | "radius";
          match_distance_km?: number | null;
          price_cents?: number;
          viewed_at?: string | null;
          unlocked_at?: string | null;
          mollie_payment_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quote_distributions_quote_request_id_fkey";
            columns: ["quote_request_id"];
            isOneToOne: false;
            referencedRelation: "quote_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_distributions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          company_id: string;
          quote_distribution_id: string | null;
          type: "lead_purchase" | "subscription" | "refund" | "credit";
          amount_cents: number;
          currency: string;
          status: "pending" | "paid" | "failed" | "refunded";
          mollie_payment_id: string | null;
          mollie_refund_id: string | null;
          invoice_number: string | null;
          invoice_url: string | null;
          description: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          quote_distribution_id?: string | null;
          type: "lead_purchase" | "subscription" | "refund" | "credit";
          amount_cents: number;
          currency?: string;
          status?: "pending" | "paid" | "failed" | "refunded";
          mollie_payment_id?: string | null;
          mollie_refund_id?: string | null;
          invoice_number?: string | null;
          invoice_url?: string | null;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          quote_distribution_id?: string | null;
          type?: "lead_purchase" | "subscription" | "refund" | "credit";
          amount_cents?: number;
          currency?: string;
          status?: "pending" | "paid" | "failed" | "refunded";
          mollie_payment_id?: string | null;
          mollie_refund_id?: string | null;
          invoice_number?: string | null;
          invoice_url?: string | null;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_quote_distribution_id_fkey";
            columns: ["quote_distribution_id"];
            isOneToOne: false;
            referencedRelation: "quote_distributions";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          company_id: string;
          plan: "starter" | "pro" | "enterprise";
          status: "active" | "past_due" | "cancelled" | "expired";
          mollie_subscription_id: string | null;
          mollie_customer_id: string | null;
          amount_cents: number;
          currency: string;
          interval: "monthly" | "yearly";
          max_departments: number;
          max_radius_km: number;
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end: boolean;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          plan: "starter" | "pro" | "enterprise";
          status?: "active" | "past_due" | "cancelled" | "expired";
          mollie_subscription_id?: string | null;
          mollie_customer_id?: string | null;
          amount_cents: number;
          currency?: string;
          interval: "monthly" | "yearly";
          max_departments: number;
          max_radius_km: number;
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end?: boolean;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          plan?: "starter" | "pro" | "enterprise";
          status?: "active" | "past_due" | "cancelled" | "expired";
          mollie_subscription_id?: string | null;
          mollie_customer_id?: string | null;
          amount_cents?: number;
          currency?: string;
          interval?: "monthly" | "yearly";
          max_departments?: number;
          max_radius_km?: number;
          current_period_start?: string;
          current_period_end?: string;
          cancel_at_period_end?: boolean;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          id: string;
          company_id: string;
          quote_request_id: string | null;
          author_name: string;
          author_email: string | null;
          rating: number;
          title: string | null;
          content: string | null;
          response: string | null;
          responded_at: string | null;
          is_verified: boolean;
          is_published: boolean;
          is_anonymized: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          quote_request_id?: string | null;
          author_name: string;
          author_email?: string | null;
          rating: number;
          title?: string | null;
          content?: string | null;
          response?: string | null;
          responded_at?: string | null;
          is_verified?: boolean;
          is_published?: boolean;
          is_anonymized?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          quote_request_id?: string | null;
          author_name?: string;
          author_email?: string | null;
          rating?: number;
          title?: string | null;
          content?: string | null;
          response?: string | null;
          responded_at?: string | null;
          is_verified?: boolean;
          is_published?: boolean;
          is_anonymized?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_quote_request_id_fkey";
            columns: ["quote_request_id"];
            isOneToOne: false;
            referencedRelation: "quote_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      company_photos: {
        Row: {
          id: string;
          company_id: string;
          url: string;
          alt: string | null;
          sort_order: number;
          is_cover: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          url: string;
          alt?: string | null;
          sort_order?: number;
          is_cover?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          url?: string;
          alt?: string | null;
          sort_order?: number;
          is_cover?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_photos_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_qna: {
        Row: {
          id: string;
          company_id: string;
          question: string;
          answer: string | null;
          is_published: boolean;
          sort_order: number;
          asked_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          question: string;
          answer?: string | null;
          is_published?: boolean;
          sort_order?: number;
          asked_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          question?: string;
          answer?: string | null;
          is_published?: boolean;
          sort_order?: number;
          asked_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_qna_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      claims: {
        Row: {
          id: string;
          company_id: string;
          quote_distribution_id: string;
          reason: "wrong_info" | "duplicate" | "unreachable" | "fake" | "other";
          description: string;
          status: "pending" | "reviewing" | "approved" | "rejected";
          admin_notes: string | null;
          refund_amount_cents: number | null;
          resolved_at: string | null;
          resolved_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          quote_distribution_id: string;
          reason: "wrong_info" | "duplicate" | "unreachable" | "fake" | "other";
          description: string;
          status?: "pending" | "reviewing" | "approved" | "rejected";
          admin_notes?: string | null;
          refund_amount_cents?: number | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          quote_distribution_id?: string;
          reason?: "wrong_info" | "duplicate" | "unreachable" | "fake" | "other";
          description?: string;
          status?: "pending" | "reviewing" | "approved" | "rejected";
          admin_notes?: string | null;
          refund_amount_cents?: number | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "claims_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claims_quote_distribution_id_fkey";
            columns: ["quote_distribution_id"];
            isOneToOne: false;
            referencedRelation: "quote_distributions";
            referencedColumns: ["id"];
          },
        ];
      };
      blog_posts: {
        Row: {
          id: string;
          slug: string;
          title: string;
          excerpt: string | null;
          content: string;
          cover_image_url: string | null;
          author_name: string;
          author_avatar_url: string | null;
          category: string | null;
          tags: string[];
          is_published: boolean;
          published_at: string | null;
          meta_title: string | null;
          meta_description: string | null;
          reading_time_minutes: number | null;
          view_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          excerpt?: string | null;
          content: string;
          cover_image_url?: string | null;
          author_name: string;
          author_avatar_url?: string | null;
          category?: string | null;
          tags?: string[];
          is_published?: boolean;
          published_at?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          reading_time_minutes?: number | null;
          view_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          excerpt?: string | null;
          content?: string;
          cover_image_url?: string | null;
          author_name?: string;
          author_avatar_url?: string | null;
          category?: string | null;
          tags?: string[];
          is_published?: boolean;
          published_at?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          reading_time_minutes?: number | null;
          view_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pages: {
        Row: {
          id: string;
          slug: string;
          title: string;
          content: string;
          meta_title: string | null;
          meta_description: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          content: string;
          meta_title?: string | null;
          meta_description?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          content?: string;
          meta_title?: string | null;
          meta_description?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          profile_id: string;
          type: "new_lead" | "lead_unlocked" | "payment_received" | "payment_failed" | "review_received" | "claim_update" | "subscription_update" | "kyc_update" | "system";
          title: string;
          message: string;
          data: Json | null;
          is_read: boolean;
          read_at: string | null;
          channel: "in_app" | "push" | "email" | "sms";
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          type: "new_lead" | "lead_unlocked" | "payment_received" | "payment_failed" | "review_received" | "claim_update" | "subscription_update" | "kyc_update" | "system";
          title: string;
          message: string;
          data?: Json | null;
          is_read?: boolean;
          read_at?: string | null;
          channel?: "in_app" | "push" | "email" | "sms";
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          type?: "new_lead" | "lead_unlocked" | "payment_received" | "payment_failed" | "review_received" | "claim_update" | "subscription_update" | "kyc_update" | "system";
          title?: string;
          message?: string;
          data?: Json | null;
          is_read?: boolean;
          read_at?: string | null;
          channel?: "in_app" | "push" | "email" | "sms";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
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
      user_role: "client" | "mover" | "admin";
      account_status: "pending" | "trial" | "active" | "suspended" | "closed";
      kyc_status: "not_started" | "pending" | "approved" | "rejected";
      quote_category: "demenagement" | "nettoyage" | "debarras" | "garde_meuble" | "monte_meuble";
      quote_status: "new" | "distributing" | "distributed" | "completed" | "cancelled" | "expired";
      distribution_status: "pending" | "viewed" | "unlocked" | "contacted" | "won" | "lost" | "expired";
      transaction_type: "lead_purchase" | "subscription" | "refund" | "credit";
      payment_status: "pending" | "paid" | "failed" | "refunded";
      subscription_plan: "starter" | "pro" | "enterprise";
      subscription_status: "active" | "past_due" | "cancelled" | "expired";
      subscription_interval: "monthly" | "yearly";
      claim_reason: "wrong_info" | "duplicate" | "unreachable" | "fake" | "other";
      claim_status: "pending" | "reviewing" | "approved" | "rejected";
      notification_type: "new_lead" | "lead_unlocked" | "payment_received" | "payment_failed" | "review_received" | "claim_update" | "subscription_update" | "kyc_update" | "system";
      notification_channel: "in_app" | "push" | "email" | "sms";
      match_type: "department" | "radius";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Helper types for easier access
type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never;

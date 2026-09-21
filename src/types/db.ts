export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      banners: {
        Row: {
          accent: string | null
          created_at: string
          cta_link: string | null
          cta_text: string | null
          i18n: Json
          i18n_at: string | null
          i18n_hash: string | null
          i18n_src_hash: string | null
          id: string
          image_url: string
          is_active: boolean
          jp_text: string | null
          placement: string
          sort_order: number
          subtitle: string | null
          tag: string | null
          title: string
          updated_at: string
        }
        Insert: {
          accent?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          jp_text?: string | null
          placement?: string
          sort_order?: number
          subtitle?: string | null
          tag?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          accent?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          jp_text?: string | null
          placement?: string
          sort_order?: number
          subtitle?: string | null
          tag?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          i18n: Json
          i18n_at: string | null
          i18n_hash: string | null
          i18n_src_hash: string | null
          id: string
          is_active: boolean
          jp: string | null
          name: string
          romaji: string | null
          sort_order: number
        }
        Insert: {
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          id: string
          is_active?: boolean
          jp?: string | null
          name: string
          romaji?: string | null
          sort_order?: number
        }
        Update: {
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          id?: string
          is_active?: boolean
          jp?: string | null
          name?: string
          romaji?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      content_items: {
        Row: {
          body: string | null
          created_at: string
          i18n: Json
          i18n_at: string | null
          i18n_hash: string | null
          i18n_src_hash: string | null
          id: string
          image_url: string | null
          is_active: boolean
          jp: string | null
          key: string | null
          link: string | null
          meta: Json
          section: string
          sort_order: number
          subtitle: string | null
          tag: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          jp?: string | null
          key?: string | null
          link?: string | null
          meta?: Json
          section: string
          sort_order?: number
          subtitle?: string | null
          tag?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          jp?: string | null
          key?: string | null
          link?: string | null
          meta?: Json
          section?: string
          sort_order?: number
          subtitle?: string | null
          tag?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_points_ledger: {
        Row: {
          amount: number
          balance: number
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          order_id: string | null
          reason: string
        }
        Insert: {
          amount: number
          balance?: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          order_id?: string | null
          reason: string
        }
        Update: {
          amount?: number
          balance?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          order_id?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_points_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_points_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_quests: {
        Row: {
          created_at: string
          customer_id: string
          extra_info: string | null
          id: string
          points_reward: number
          quest_date: string
          quest_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          extra_info?: string | null
          id?: string
          points_reward: number
          quest_date?: string
          quest_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          extra_info?: string | null
          id?: string
          points_reward?: number
          quest_date?: string
          quest_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_quests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          last_visit: string | null
          name: string | null
          note: string | null
          phone: string | null
          points: number
          tier: string
          total_spent: number
          updated_at: string
          visit_count: number
          zalo_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          last_visit?: string | null
          name?: string | null
          note?: string | null
          phone?: string | null
          points?: number
          tier?: string
          total_spent?: number
          updated_at?: string
          visit_count?: number
          zalo_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          last_visit?: string | null
          name?: string | null
          note?: string | null
          phone?: string | null
          points?: number
          tier?: string
          total_spent?: number
          updated_at?: string
          visit_count?: number
          zalo_id?: string | null
        }
        Relationships: []
      }
      dish_variants: {
        Row: {
          code: string
          dish_id: string
          i18n: Json
          i18n_at: string | null
          i18n_hash: string | null
          i18n_src_hash: string | null
          id: string
          label: string
          note: string | null
          price: number
          sort_order: number
        }
        Insert: {
          code: string
          dish_id: string
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          id?: string
          label: string
          note?: string | null
          price: number
          sort_order?: number
        }
        Update: {
          code?: string
          dish_id?: string
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          id?: string
          label?: string
          note?: string | null
          price?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "dish_variants_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
        ]
      }
      dishes: {
        Row: {
          badges: string[]
          category_id: string
          compare_at_price: number | null
          created_at: string
          description: string | null
          gifts: string[]
          i18n: Json
          i18n_at: string | null
          i18n_hash: string | null
          i18n_src_hash: string | null
          id: string
          image_path: string | null
          includes: string[]
          is_available: boolean
          jp: string | null
          name: string
          price: number | null
          romaji: string | null
          sort_order: number
          source_page: string | null
          tags: string[]
          unit: string | null
          updated_at: string
        }
        Insert: {
          badges?: string[]
          category_id: string
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          gifts?: string[]
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          id: string
          image_path?: string | null
          includes?: string[]
          is_available?: boolean
          jp?: string | null
          name: string
          price?: number | null
          romaji?: string | null
          sort_order?: number
          source_page?: string | null
          tags?: string[]
          unit?: string | null
          updated_at?: string
        }
        Update: {
          badges?: string[]
          category_id?: string
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          gifts?: string[]
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          id?: string
          image_path?: string | null
          includes?: string[]
          is_available?: boolean
          jp?: string | null
          name?: string
          price?: number | null
          romaji?: string | null
          sort_order?: number
          source_page?: string | null
          tags?: string[]
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dishes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_quests: {
        Row: {
          description: string | null
          i18n: Json
          i18n_at: string | null
          i18n_hash: string | null
          i18n_src_hash: string | null
          icon: string | null
          id: string
          is_active: boolean
          points: number
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          icon?: string | null
          id: string
          is_active?: boolean
          points: number
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          points?: number
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_tiers: {
        Row: {
          code: string
          color: string | null
          earn_rate: number
          i18n: Json
          i18n_at: string | null
          i18n_hash: string | null
          i18n_src_hash: string | null
          min_points: number
          name: string
          perks: string[]
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          color?: string | null
          earn_rate?: number
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          min_points?: number
          name: string
          perks?: string[]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string | null
          earn_rate?: number
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          min_points?: number
          name?: string
          perks?: string[]
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      omakase_courses: {
        Row: {
          i18n: Json
          i18n_at: string | null
          i18n_hash: string | null
          i18n_src_hash: string | null
          id: string
          items: string[]
          section: string
          set_id: string
          sort_order: number
        }
        Insert: {
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          id?: string
          items?: string[]
          section: string
          set_id: string
          sort_order?: number
        }
        Update: {
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          id?: string
          items?: string[]
          section?: string
          set_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "omakase_courses_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "omakase_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      omakase_sets: {
        Row: {
          badge: string | null
          created_at: string
          description: string | null
          i18n: Json
          i18n_at: string | null
          i18n_hash: string | null
          i18n_src_hash: string | null
          id: string
          image_path: string | null
          is_active: boolean
          is_featured: boolean
          jp: string | null
          menu_pending: boolean
          name: string
          price: number
          service: string
          sort_order: number
          subtitle: string | null
          tier: number
          updated_at: string
        }
        Insert: {
          badge?: string | null
          created_at?: string
          description?: string | null
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          id: string
          image_path?: string | null
          is_active?: boolean
          is_featured?: boolean
          jp?: string | null
          menu_pending?: boolean
          name: string
          price: number
          service: string
          sort_order?: number
          subtitle?: string | null
          tier?: number
          updated_at?: string
        }
        Update: {
          badge?: string | null
          created_at?: string
          description?: string | null
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          is_featured?: boolean
          jp?: string | null
          menu_pending?: boolean
          name?: string
          price?: number
          service?: string
          sort_order?: number
          subtitle?: string | null
          tier?: number
          updated_at?: string
        }
        Relationships: []
      }
      opening_hours: {
        Row: {
          close_time: string
          id: string
          is_closed: boolean
          open_time: string
          service: string
          slot_capacity: number | null
          slot_minutes: number
          weekday: number
        }
        Insert: {
          close_time: string
          id?: string
          is_closed?: boolean
          open_time: string
          service: string
          slot_capacity?: number | null
          slot_minutes?: number
          weekday: number
        }
        Update: {
          close_time?: string
          id?: string
          is_closed?: boolean
          open_time?: string
          service?: string
          slot_capacity?: number | null
          slot_minutes?: number
          weekday?: number
        }
        Relationships: []
      }
      order_lines: {
        Row: {
          dish_id: string | null
          id: string
          name: string
          note: string | null
          order_id: string
          qty: number
          unit_price: number
          variant_label: string | null
        }
        Insert: {
          dish_id?: string | null
          id?: string
          name: string
          note?: string | null
          order_id: string
          qty: number
          unit_price: number
          variant_label?: string | null
        }
        Update: {
          dish_id?: string | null
          id?: string
          name?: string
          note?: string | null
          order_id?: string
          qty?: number
          unit_price?: number
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          code: string
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_fee: number
          delivery_time: string | null
          discount_amount: number
          id: string
          mode: string
          note: string | null
          payment_method: string
          payment_status: string
          points_credited: boolean
          points_earned: number
          reservation_id: string | null
          status: string
          subtotal: number
          table_id: string | null
          updated_at: string
          voucher_code: string | null
          zalo_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          delivery_time?: string | null
          discount_amount?: number
          id?: string
          mode: string
          note?: string | null
          payment_method?: string
          payment_status?: string
          points_credited?: boolean
          points_earned?: number
          reservation_id?: string | null
          status?: string
          subtotal?: number
          table_id?: string | null
          updated_at?: string
          voucher_code?: string | null
          zalo_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          delivery_time?: string | null
          discount_amount?: number
          id?: string
          mode?: string
          note?: string | null
          payment_method?: string
          payment_status?: string
          points_credited?: boolean
          points_earned?: number
          reservation_id?: string | null
          status?: string
          subtotal?: number
          table_id?: string | null
          updated_at?: string
          voucher_code?: string | null
          zalo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          account_number: string | null
          amount: number
          content: string | null
          created_at: string
          description: string | null
          gateway: string | null
          id: string
          matched_code: string | null
          note: string | null
          reference_code: string | null
          reservation_id: string | null
          sepay_code: string | null
          sepay_id: number
          status: string
          sub_account: string | null
          transaction_date: string | null
          transfer_type: string
        }
        Insert: {
          account_number?: string | null
          amount: number
          content?: string | null
          created_at?: string
          description?: string | null
          gateway?: string | null
          id?: string
          matched_code?: string | null
          note?: string | null
          reference_code?: string | null
          reservation_id?: string | null
          sepay_code?: string | null
          sepay_id: number
          status?: string
          sub_account?: string | null
          transaction_date?: string | null
          transfer_type: string
        }
        Update: {
          account_number?: string | null
          amount?: number
          content?: string | null
          created_at?: string
          description?: string | null
          gateway?: string | null
          id?: string
          matched_code?: string | null
          note?: string | null
          reference_code?: string | null
          reservation_id?: string | null
          sepay_code?: string | null
          sepay_id?: number
          status?: string
          sub_account?: string | null
          transaction_date?: string | null
          transfer_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_seats: {
        Row: {
          reservation_id: string
          seat_id: string
        }
        Insert: {
          reservation_id: string
          seat_id: string
        }
        Update: {
          reservation_id?: string
          seat_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_seats_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_seats_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          cancelled_reason: string | null
          code: string
          created_at: string
          customer_id: string | null
          deposit_amount: number
          deposit_method: string | null
          deposit_paid: boolean
          dietary: string | null
          guest_name: string
          guest_phone: string
          guests: number
          id: string
          note: string | null
          omakase_set_id: string | null
          purpose: string
          reserved_date: string
          reserved_time: string
          seating: string
          staff_note: string | null
          status: string
          table_id: string | null
          updated_at: string
          zalo_id: string | null
        }
        Insert: {
          cancelled_reason?: string | null
          code: string
          created_at?: string
          customer_id?: string | null
          deposit_amount?: number
          deposit_method?: string | null
          deposit_paid?: boolean
          dietary?: string | null
          guest_name: string
          guest_phone: string
          guests: number
          id?: string
          note?: string | null
          omakase_set_id?: string | null
          purpose: string
          reserved_date: string
          reserved_time: string
          seating: string
          staff_note?: string | null
          status?: string
          table_id?: string | null
          updated_at?: string
          zalo_id?: string | null
        }
        Update: {
          cancelled_reason?: string | null
          code?: string
          created_at?: string
          customer_id?: string | null
          deposit_amount?: number
          deposit_method?: string | null
          deposit_paid?: boolean
          dietary?: string | null
          guest_name?: string
          guest_phone?: string
          guests?: number
          id?: string
          note?: string | null
          omakase_set_id?: string | null
          purpose?: string
          reserved_date?: string
          reserved_time?: string
          seating?: string
          staff_note?: string | null
          status?: string
          table_id?: string | null
          updated_at?: string
          zalo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_omakase_set_id_fkey"
            columns: ["omakase_set_id"]
            isOneToOne: false
            referencedRelation: "omakase_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_settings: {
        Row: {
          about_counter_text: string | null
          about_wagyu_text: string | null
          address: string | null
          alacarte_services: string[]
          bank_account_name: string | null
          bank_account_number: string | null
          bank_code: string | null
          booking_lead_days: number
          butcher_badge: string | null
          butcher_guarantee: string | null
          butcher_intro: string | null
          butcher_subtitle: string | null
          butcher_title: string | null
          cancellation_policy: string | null
          city: string | null
          counter_omakase_only: boolean
          counter_seats: number
          cover_image_url: string | null
          delivery_enabled: boolean
          delivery_eta_text: string | null
          delivery_fee: number
          deposit_rate: number
          free_delivery_min: number | null
          hotline: string | null
          hotline_hours: string | null
          hotline_note: string | null
          hours_text: string | null
          i18n: Json
          i18n_at: string | null
          i18n_hash: string | null
          i18n_src_hash: string | null
          id: number
          kanji: string | null
          location_note: string | null
          logo_dark_url: string | null
          logo_url: string | null
          logo_wide_dark_url: string | null
          logo_wide_url: string | null
          maps_url: string | null
          max_guests: number
          menu_price_note: string | null
          min_guests: number
          name: string
          oa_id: string | null
          omakase_lead_hours: number
          parking_note: string | null
          payment_enabled: boolean
          payment_prefix: string
          point_value: number
          price_includes_vat: boolean
          private_room_note: string | null
          seating_duration_minutes: number
          service_charge_rate: number | null
          tagline: string | null
          takeout_enabled: boolean
          updated_at: string
          vat_rate: number | null
          welcome_points: number
        }
        Insert: {
          about_counter_text?: string | null
          about_wagyu_text?: string | null
          address?: string | null
          alacarte_services?: string[]
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_code?: string | null
          booking_lead_days?: number
          butcher_badge?: string | null
          butcher_guarantee?: string | null
          butcher_intro?: string | null
          butcher_subtitle?: string | null
          butcher_title?: string | null
          cancellation_policy?: string | null
          city?: string | null
          counter_omakase_only?: boolean
          counter_seats?: number
          cover_image_url?: string | null
          delivery_enabled?: boolean
          delivery_eta_text?: string | null
          delivery_fee?: number
          deposit_rate?: number
          free_delivery_min?: number | null
          hotline?: string | null
          hotline_hours?: string | null
          hotline_note?: string | null
          hours_text?: string | null
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          id?: number
          kanji?: string | null
          location_note?: string | null
          logo_dark_url?: string | null
          logo_url?: string | null
          logo_wide_dark_url?: string | null
          logo_wide_url?: string | null
          maps_url?: string | null
          max_guests?: number
          menu_price_note?: string | null
          min_guests?: number
          name?: string
          oa_id?: string | null
          omakase_lead_hours?: number
          parking_note?: string | null
          payment_enabled?: boolean
          payment_prefix?: string
          point_value?: number
          price_includes_vat?: boolean
          private_room_note?: string | null
          seating_duration_minutes?: number
          service_charge_rate?: number | null
          tagline?: string | null
          takeout_enabled?: boolean
          updated_at?: string
          vat_rate?: number | null
          welcome_points?: number
        }
        Update: {
          about_counter_text?: string | null
          about_wagyu_text?: string | null
          address?: string | null
          alacarte_services?: string[]
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_code?: string | null
          booking_lead_days?: number
          butcher_badge?: string | null
          butcher_guarantee?: string | null
          butcher_intro?: string | null
          butcher_subtitle?: string | null
          butcher_title?: string | null
          cancellation_policy?: string | null
          city?: string | null
          counter_omakase_only?: boolean
          counter_seats?: number
          cover_image_url?: string | null
          delivery_enabled?: boolean
          delivery_eta_text?: string | null
          delivery_fee?: number
          deposit_rate?: number
          free_delivery_min?: number | null
          hotline?: string | null
          hotline_hours?: string | null
          hotline_note?: string | null
          hours_text?: string | null
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          id?: number
          kanji?: string | null
          location_note?: string | null
          logo_dark_url?: string | null
          logo_url?: string | null
          logo_wide_dark_url?: string | null
          logo_wide_url?: string | null
          maps_url?: string | null
          max_guests?: number
          menu_price_note?: string | null
          min_guests?: number
          name?: string
          oa_id?: string | null
          omakase_lead_hours?: number
          parking_note?: string | null
          payment_enabled?: boolean
          payment_prefix?: string
          point_value?: number
          price_includes_vat?: boolean
          private_room_note?: string | null
          seating_duration_minutes?: number
          service_charge_rate?: number | null
          tagline?: string | null
          takeout_enabled?: boolean
          updated_at?: string
          vat_rate?: number | null
          welcome_points?: number
        }
        Relationships: []
      }
      restaurant_tables: {
        Row: {
          id: string
          is_active: boolean
          label: string
          seats: number
          sort_order: number
          zone: string
        }
        Insert: {
          id: string
          is_active?: boolean
          label: string
          seats: number
          sort_order?: number
          zone: string
        }
        Update: {
          id?: string
          is_active?: boolean
          label?: string
          seats?: number
          sort_order?: number
          zone?: string
        }
        Relationships: []
      }
      reward_gifts: {
        Row: {
          badge: string | null
          category: string
          created_at: string
          description: string | null
          discount_value: number | null
          i18n: Json
          i18n_at: string | null
          i18n_hash: string | null
          i18n_src_hash: string | null
          id: string
          image_url: string | null
          is_active: boolean
          min_order_value: number
          points_cost: number
          sort_order: number
          title: string
          updated_at: string
          worth_text: string | null
        }
        Insert: {
          badge?: string | null
          category: string
          created_at?: string
          description?: string | null
          discount_value?: number | null
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          id: string
          image_url?: string | null
          is_active?: boolean
          min_order_value?: number
          points_cost: number
          sort_order?: number
          title: string
          updated_at?: string
          worth_text?: string | null
        }
        Update: {
          badge?: string | null
          category?: string
          created_at?: string
          description?: string | null
          discount_value?: number | null
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_order_value?: number
          points_cost?: number
          sort_order?: number
          title?: string
          updated_at?: string
          worth_text?: string | null
        }
        Relationships: []
      }
      seats: {
        Row: {
          id: string
          is_active: boolean
          is_premium: boolean
          label: string
          note: string | null
          pos_x: number
          pos_z: number
          rotation: number
          sort_order: number
          zone: string
        }
        Insert: {
          id: string
          is_active?: boolean
          is_premium?: boolean
          label: string
          note?: string | null
          pos_x: number
          pos_z: number
          rotation?: number
          sort_order?: number
          zone?: string
        }
        Update: {
          id?: string
          is_active?: boolean
          is_premium?: boolean
          label?: string
          note?: string | null
          pos_x?: number
          pos_z?: number
          rotation?: number
          sort_order?: number
          zone?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string
          full_name: string
          is_active: boolean
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          is_active?: boolean
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          is_active?: boolean
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      telegram_settings: {
        Row: {
          bot_token: string | null
          chat_id: string | null
          id: number
          is_active: boolean
          notify_loyalty: boolean
          notify_order: boolean
          notify_reservation: boolean
          topic_loyalty: string | null
          topic_omakase: string | null
          topic_order: string | null
          topic_reservation: string | null
          updated_at: string
        }
        Insert: {
          bot_token?: string | null
          chat_id?: string | null
          id?: number
          is_active?: boolean
          notify_loyalty?: boolean
          notify_order?: boolean
          notify_reservation?: boolean
          topic_loyalty?: string | null
          topic_omakase?: string | null
          topic_order?: string | null
          topic_reservation?: string | null
          updated_at?: string
        }
        Update: {
          bot_token?: string | null
          chat_id?: string | null
          id?: number
          is_active?: boolean
          notify_loyalty?: boolean
          notify_order?: boolean
          notify_reservation?: boolean
          topic_loyalty?: string | null
          topic_omakase?: string | null
          topic_order?: string | null
          topic_reservation?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      voucher_redemptions: {
        Row: {
          code: string
          created_at: string
          customer_id: string | null
          gift_id: string | null
          id: string
          order_id: string | null
          status: string
          used_at: string | null
          used_by: string | null
          voucher_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          customer_id?: string | null
          gift_id?: string | null
          id?: string
          order_id?: string | null
          status?: string
          used_at?: string | null
          used_by?: string | null
          voucher_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          customer_id?: string | null
          gift_id?: string | null
          id?: string
          order_id?: string | null
          status?: string
          used_at?: string | null
          used_by?: string | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voucher_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_redemptions_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "reward_gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_redemptions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_order_value: number
          title: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_value?: number
          title: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_value?: number
          title?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      zalo_notification_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          recipient_phone: string | null
          recipient_zalo_id: string | null
          reference_code: string | null
          response_data: Json | null
          send_mode: string
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          recipient_phone?: string | null
          recipient_zalo_id?: string | null
          reference_code?: string | null
          response_data?: Json | null
          send_mode: string
          status: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          recipient_phone?: string | null
          recipient_zalo_id?: string | null
          reference_code?: string | null
          response_data?: Json | null
          send_mode?: string
          status?: string
        }
        Relationships: []
      }
      zalo_oa_settings: {
        Row: {
          access_token: string | null
          app_id: string | null
          id: number
          is_active: boolean
          msg_order: string | null
          msg_reservation: string | null
          oa_id: string | null
          refresh_token: string | null
          secret_key: string | null
          send_mode: string
          token_expires_at: string | null
          updated_at: string
          zns_template_order: string | null
          zns_template_reservation: string | null
        }
        Insert: {
          access_token?: string | null
          app_id?: string | null
          id?: number
          is_active?: boolean
          msg_order?: string | null
          msg_reservation?: string | null
          oa_id?: string | null
          refresh_token?: string | null
          secret_key?: string | null
          send_mode?: string
          token_expires_at?: string | null
          updated_at?: string
          zns_template_order?: string | null
          zns_template_reservation?: string | null
        }
        Update: {
          access_token?: string | null
          app_id?: string | null
          id?: number
          is_active?: boolean
          msg_order?: string | null
          msg_reservation?: string | null
          oa_id?: string | null
          refresh_token?: string | null
          secret_key?: string | null
          send_mode?: string
          token_expires_at?: string | null
          updated_at?: string
          zns_template_order?: string | null
          zns_template_reservation?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      translation_status: {
        Row: {
          entity: string | null
          has_en: boolean | null
          has_ja: boolean | null
          id: string | null
          label: string | null
          stale: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      adjust_customer_points: {
        Args: { p_amount: number; p_customer_id: string; p_reason: string }
        Returns: {
          avatar_url: string | null
          created_at: string
          id: string
          last_visit: string | null
          name: string | null
          note: string | null
          phone: string | null
          points: number
          tier: string
          total_spent: number
          updated_at: string
          visit_count: number
          zalo_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "customers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_seats: {
        Args: { p_reservation_id: string; p_seat_ids: string[] }
        Returns: {
          reservation_id: string
          seat_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "reservation_seats"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      calc_tier_rate: { Args: { p_tier: string }; Returns: number }
      cancel_reservation_by_code: {
        Args: { p_code: string }
        Returns: {
          cancelled_reason: string | null
          code: string
          created_at: string
          customer_id: string | null
          deposit_amount: number
          deposit_method: string | null
          deposit_paid: boolean
          dietary: string | null
          guest_name: string
          guest_phone: string
          guests: number
          id: string
          note: string | null
          omakase_set_id: string | null
          purpose: string
          reserved_date: string
          reserved_time: string
          seating: string
          staff_note: string | null
          status: string
          table_id: string | null
          updated_at: string
          zalo_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_quest_reward: {
        Args: { p_extra_info?: string; p_quest_id: string; p_zalo_id: string }
        Returns: Json
      }
      complete_order_and_credit_points: {
        Args: { p_order_id: string }
        Returns: Json
      }
      create_order: {
        Args: {
          p_customer_name?: string
          p_customer_phone?: string
          p_delivery_address?: string
          p_delivery_fee?: number
          p_delivery_time?: string
          p_lines: Json
          p_mode: string
          p_note?: string
          p_payment_method?: string
          p_reservation_id?: string
          p_table_id?: string
          p_voucher_code?: string
          p_zalo_id?: string
        }
        Returns: {
          code: string
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_fee: number
          delivery_time: string | null
          discount_amount: number
          id: string
          mode: string
          note: string | null
          payment_method: string
          payment_status: string
          points_credited: boolean
          points_earned: number
          reservation_id: string | null
          status: string
          subtotal: number
          table_id: string | null
          updated_at: string
          voucher_code: string | null
          zalo_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_reservation: {
        Args: {
          p_date: string
          p_dietary?: string
          p_guests: number
          p_name: string
          p_note?: string
          p_omakase_set_id?: string
          p_phone: string
          p_purpose: string
          p_seating: string
          p_time: string
          p_zalo_id?: string
        }
        Returns: {
          cancelled_reason: string | null
          code: string
          created_at: string
          customer_id: string | null
          deposit_amount: number
          deposit_method: string | null
          deposit_paid: boolean
          dietary: string | null
          guest_name: string
          guest_phone: string
          guests: number
          id: string
          note: string | null
          omakase_set_id: string | null
          purpose: string
          reserved_date: string
          reserved_time: string
          seating: string
          staff_note: string | null
          status: string
          table_id: string | null
          updated_at: string
          zalo_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_reservation_with_seats: {
        Args: {
          p_date: string
          p_dietary?: string
          p_guests: number
          p_name: string
          p_note?: string
          p_omakase_set_id?: string
          p_phone: string
          p_purpose: string
          p_seat_ids: string[]
          p_seating: string
          p_time: string
          p_zalo_id?: string
        }
        Returns: {
          cancelled_reason: string | null
          code: string
          created_at: string
          customer_id: string | null
          deposit_amount: number
          deposit_method: string | null
          deposit_paid: boolean
          dietary: string | null
          guest_name: string
          guest_phone: string
          guests: number
          id: string
          note: string | null
          omakase_set_id: string | null
          purpose: string
          reserved_date: string
          reserved_time: string
          seating: string
          staff_note: string | null
          status: string
          table_id: string | null
          updated_at: string
          zalo_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      dish_has_price: { Args: { p_dish_id: string }; Returns: boolean }
      find_reservation_code: { Args: { p_text: string }; Returns: string }
      get_availability: {
        Args: { p_date: string; p_service: string }
        Returns: {
          capacity: number
          seats_left: number
          slot_time: string
        }[]
      }
      get_customer_points_ledger: {
        Args: { p_limit?: number; p_zalo_id: string }
        Returns: {
          amount: number
          balance: number
          created_at: string
          id: string
          order_id: string
          reason: string
        }[]
      }
      get_customer_quests_today: {
        Args: { p_zalo_id: string }
        Returns: string[]
      }
      get_customer_vouchers: {
        Args: { p_zalo_id: string }
        Returns: {
          code: string
          created_at: string
          discount_value: number
          gift_category: string
          gift_id: string
          gift_title: string
          id: string
          min_order_value: number
          status: string
          used_at: string
          worth_text: string
        }[]
      }
      get_or_create_customer: {
        Args: {
          p_avatar_url?: string
          p_name?: string
          p_phone?: string
          p_zalo_id: string
        }
        Returns: {
          avatar_url: string | null
          created_at: string
          id: string
          last_visit: string | null
          name: string | null
          note: string | null
          phone: string | null
          points: number
          tier: string
          total_spent: number
          updated_at: string
          visit_count: number
          zalo_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "customers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_order_by_code: { Args: { p_code: string }; Returns: Json }
      get_reservation_by_code: {
        Args: { p_code: string }
        Returns: {
          cancelled_reason: string | null
          code: string
          created_at: string
          customer_id: string | null
          deposit_amount: number
          deposit_method: string | null
          deposit_paid: boolean
          dietary: string | null
          guest_name: string
          guest_phone: string
          guests: number
          id: string
          note: string | null
          omakase_set_id: string | null
          purpose: string
          reserved_date: string
          reserved_time: string
          seating: string
          staff_note: string | null
          status: string
          table_id: string | null
          updated_at: string
          zalo_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_reservation_seats_by_code: {
        Args: { p_code: string }
        Returns: {
          is_premium: boolean
          label: string
          seat_id: string
        }[]
      }
      get_seat_availability: {
        Args: { p_date: string; p_exclude_reservation?: string; p_time: string }
        Returns: {
          is_premium: boolean
          label: string
          pos_x: number
          pos_z: number
          rotation: number
          seat_id: string
          taken: boolean
        }[]
      }
      get_telegram_settings: { Args: never; Returns: Json }
      get_zalo_oa_settings: { Args: never; Returns: Json }
      i18n_src_banners: {
        Args: { r: Database["public"]["Tables"]["banners"]["Row"] }
        Returns: string
      }
      i18n_src_categories: {
        Args: { r: Database["public"]["Tables"]["categories"]["Row"] }
        Returns: string
      }
      i18n_src_content_items: {
        Args: { r: Database["public"]["Tables"]["content_items"]["Row"] }
        Returns: string
      }
      i18n_src_dish_variants: {
        Args: { r: Database["public"]["Tables"]["dish_variants"]["Row"] }
        Returns: string
      }
      i18n_src_dishes: {
        Args: { r: Database["public"]["Tables"]["dishes"]["Row"] }
        Returns: string
      }
      i18n_src_loyalty_quests: {
        Args: { r: Database["public"]["Tables"]["loyalty_quests"]["Row"] }
        Returns: string
      }
      i18n_src_loyalty_tiers: {
        Args: { r: Database["public"]["Tables"]["loyalty_tiers"]["Row"] }
        Returns: string
      }
      i18n_src_omakase_courses: {
        Args: { r: Database["public"]["Tables"]["omakase_courses"]["Row"] }
        Returns: string
      }
      i18n_src_omakase_sets: {
        Args: { r: Database["public"]["Tables"]["omakase_sets"]["Row"] }
        Returns: string
      }
      i18n_src_restaurant_settings: {
        Args: { r: Database["public"]["Tables"]["restaurant_settings"]["Row"] }
        Returns: string
      }
      i18n_src_reward_gifts: {
        Args: { r: Database["public"]["Tables"]["reward_gifts"]["Row"] }
        Returns: string
      }
      ignore_payment: {
        Args: { p_note?: string; p_payment_id: string }
        Returns: {
          account_number: string | null
          amount: number
          content: string | null
          created_at: string
          description: string | null
          gateway: string | null
          id: string
          matched_code: string | null
          note: string | null
          reference_code: string | null
          reservation_id: string | null
          sepay_code: string | null
          sepay_id: number
          status: string
          sub_account: string | null
          transaction_date: string | null
          transfer_type: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_manager: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      link_payment: {
        Args: { p_payment_id: string; p_reservation_id?: string }
        Returns: {
          account_number: string | null
          amount: number
          content: string | null
          created_at: string
          description: string | null
          gateway: string | null
          id: string
          matched_code: string | null
          note: string | null
          reference_code: string | null
          reservation_id: string | null
          sepay_code: string | null
          sepay_id: number
          status: string
          sub_account: string | null
          transaction_date: string | null
          transfer_type: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      make_code: { Args: { p_prefix: string }; Returns: string }
      process_payment: {
        Args: { p_payment_id: string }
        Returns: {
          account_number: string | null
          amount: number
          content: string | null
          created_at: string
          description: string | null
          gateway: string | null
          id: string
          matched_code: string | null
          note: string | null
          reference_code: string | null
          reservation_id: string | null
          sepay_code: string | null
          sepay_id: number
          status: string
          sub_account: string | null
          transaction_date: string | null
          transfer_type: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      recalc_reservation_deposit: {
        Args: { p_id: string }
        Returns: {
          cancelled_reason: string | null
          code: string
          created_at: string
          customer_id: string | null
          deposit_amount: number
          deposit_method: string | null
          deposit_paid: boolean
          dietary: string | null
          guest_name: string
          guest_phone: string
          guests: number
          id: string
          note: string | null
          omakase_set_id: string | null
          purpose: string
          reserved_date: string
          reserved_time: string
          seating: string
          staff_note: string | null
          status: string
          table_id: string | null
          updated_at: string
          zalo_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      redeem_reward_gift: {
        Args: { p_gift_id: string; p_zalo_id: string }
        Returns: Json
      }
      refresh_reservation_payment: {
        Args: { p_reservation_id: string }
        Returns: {
          cancelled_reason: string | null
          code: string
          created_at: string
          customer_id: string | null
          deposit_amount: number
          deposit_method: string | null
          deposit_paid: boolean
          dietary: string | null
          guest_name: string
          guest_phone: string
          guests: number
          id: string
          note: string | null
          omakase_set_id: string | null
          purpose: string
          reserved_date: string
          reserved_time: string
          seating: string
          staff_note: string | null
          status: string
          table_id: string | null
          updated_at: string
          zalo_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reservation_code_prefix: { Args: never; Returns: string }
      restaurant_now: { Args: never; Returns: string }
      set_order_lines: {
        Args: { p_lines: Json; p_order_id: string }
        Returns: {
          code: string
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_fee: number
          delivery_time: string | null
          discount_amount: number
          id: string
          mode: string
          note: string | null
          payment_method: string
          payment_status: string
          points_credited: boolean
          points_earned: number
          reservation_id: string | null
          status: string
          subtotal: number
          table_id: string | null
          updated_at: string
          voucher_code: string | null
          zalo_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      staff_create_order: {
        Args: {
          p_lines: Json
          p_mode: string
          p_note?: string
          p_reservation_id?: string
          p_status?: string
          p_table_id?: string
        }
        Returns: {
          code: string
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_fee: number
          delivery_time: string | null
          discount_amount: number
          id: string
          mode: string
          note: string | null
          payment_method: string
          payment_status: string
          points_credited: boolean
          points_earned: number
          reservation_id: string | null
          status: string
          subtotal: number
          table_id: string | null
          updated_at: string
          voucher_code: string | null
          zalo_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      staff_create_reservation: {
        Args: {
          p_date: string
          p_deposit_paid?: boolean
          p_dietary?: string
          p_guests: number
          p_name: string
          p_note?: string
          p_omakase_set_id?: string
          p_phone: string
          p_purpose: string
          p_seating: string
          p_staff_note?: string
          p_status?: string
          p_table_id?: string
          p_time: string
        }
        Returns: {
          cancelled_reason: string | null
          code: string
          created_at: string
          customer_id: string | null
          deposit_amount: number
          deposit_method: string | null
          deposit_paid: boolean
          dietary: string | null
          guest_name: string
          guest_phone: string
          guests: number
          id: string
          note: string | null
          omakase_set_id: string | null
          purpose: string
          reserved_date: string
          reserved_time: string
          seating: string
          staff_note: string | null
          status: string
          table_id: string | null
          updated_at: string
          zalo_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      tier_for_points: { Args: { p_points: number }; Returns: string }
      update_telegram_settings:
        | {
            Args: {
              p_bot_token: string
              p_chat_id: string
              p_is_active?: boolean
              p_notify_order: boolean
              p_notify_reservation: boolean
            }
            Returns: Json
          }
        | {
            Args: {
              p_bot_token: string
              p_chat_id: string
              p_is_active?: boolean
              p_notify_loyalty?: boolean
              p_notify_order: boolean
              p_notify_reservation: boolean
              p_topic_loyalty?: string
              p_topic_omakase?: string
              p_topic_order?: string
              p_topic_reservation?: string
            }
            Returns: Json
          }
      update_zalo_oa_settings: {
        Args: {
          p_access_token: string
          p_app_id: string
          p_is_active?: boolean
          p_oa_id: string
          p_refresh_token: string
          p_secret_key: string
          p_send_mode?: string
          p_zns_template_order: string
          p_zns_template_reservation: string
        }
        Returns: Json
      }
      update_zalo_oa_tokens: {
        Args: {
          p_access_token: string
          p_expires_in: number
          p_refresh_token: string
        }
        Returns: undefined
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const


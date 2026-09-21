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
      customers: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string | null
          note: string | null
          phone: string | null
          updated_at: string
          zalo_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          note?: string | null
          phone?: string | null
          updated_at?: string
          zalo_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          note?: string | null
          phone?: string | null
          updated_at?: string
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
          created_at: string
          description: string | null
          i18n: Json
          i18n_at: string | null
          i18n_hash: string | null
          i18n_src_hash: string | null
          id: string
          image_path: string | null
          is_active: boolean
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
          created_at?: string
          description?: string | null
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          id: string
          image_path?: string | null
          is_active?: boolean
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
          created_at?: string
          description?: string | null
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
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
          id: string
          mode: string
          note: string | null
          reservation_id: string | null
          status: string
          subtotal: number
          table_id: string | null
          updated_at: string
          zalo_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_time: string | null
          delivery_fee: number
          payment_method: string
          payment_status: string
        }
        Insert: {
          code: string
          created_at?: string
          customer_id?: string | null
          id?: string
          mode: string
          note?: string | null
          reservation_id?: string | null
          status?: string
          subtotal?: number
          table_id?: string | null
          updated_at?: string
          zalo_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_time?: string | null
          delivery_fee?: number
          payment_method?: string
          payment_status?: string
        }
        Update: {
          code?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          mode?: string
          note?: string | null
          reservation_id?: string | null
          status?: string
          subtotal?: number
          table_id?: string | null
          updated_at?: string
          zalo_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_time?: string | null
          delivery_fee?: number
          payment_method?: string
          payment_status?: string
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
          address: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_code: string | null
          booking_lead_days: number
          cancellation_policy: string | null
          city: string | null
          counter_seats: number
          deposit_rate: number
          hotline: string | null
          i18n: Json
          i18n_at: string | null
          i18n_hash: string | null
          i18n_src_hash: string | null
          id: number
          maps_url: string | null
          menu_price_note: string | null
          name: string
          oa_id: string | null
          omakase_lead_hours: number
          payment_enabled: boolean
          payment_prefix: string
          price_includes_vat: boolean
          seating_duration_minutes: number
          service_charge_rate: number | null
          tagline: string | null
          updated_at: string
          vat_rate: number | null
        }
        Insert: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_code?: string | null
          booking_lead_days?: number
          cancellation_policy?: string | null
          city?: string | null
          counter_seats?: number
          deposit_rate?: number
          hotline?: string | null
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          id?: number
          maps_url?: string | null
          menu_price_note?: string | null
          name?: string
          oa_id?: string | null
          omakase_lead_hours?: number
          payment_enabled?: boolean
          payment_prefix?: string
          price_includes_vat?: boolean
          seating_duration_minutes?: number
          service_charge_rate?: number | null
          tagline?: string | null
          updated_at?: string
          vat_rate?: number | null
        }
        Update: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_code?: string | null
          booking_lead_days?: number
          cancellation_policy?: string | null
          city?: string | null
          counter_seats?: number
          deposit_rate?: number
          hotline?: string | null
          i18n?: Json
          i18n_at?: string | null
          i18n_hash?: string | null
          i18n_src_hash?: string | null
          id?: number
          maps_url?: string | null
          menu_price_note?: string | null
          name?: string
          oa_id?: string | null
          omakase_lead_hours?: number
          payment_enabled?: boolean
          payment_prefix?: string
          price_includes_vat?: boolean
          seating_duration_minutes?: number
          service_charge_rate?: number | null
          tagline?: string | null
          updated_at?: string
          vat_rate?: number | null
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
      create_order: {
        Args: {
          p_lines: Json
          p_mode: string
          p_note?: string
          p_reservation_id?: string
          p_table_id?: string
          p_zalo_id?: string
        }
        Returns: {
          code: string
          created_at: string
          customer_id: string | null
          id: string
          mode: string
          note: string | null
          reservation_id: string | null
          status: string
          subtotal: number
          table_id: string | null
          updated_at: string
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
      get_order_by_code: {
        Args: { p_code: string }
        Returns: {
          code: string
          created_at: string
          customer_id: string | null
          id: string
          mode: string
          note: string | null
          reservation_id: string | null
          status: string
          subtotal: number
          table_id: string | null
          updated_at: string
          zalo_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
      i18n_src_categories: {
        Args: { r: Database["public"]["Tables"]["categories"]["Row"] }
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
      restaurant_now: { Args: never; Returns: string }
      set_order_lines: {
        Args: { p_lines: Json; p_order_id: string }
        Returns: {
          code: string
          created_at: string
          customer_id: string | null
          id: string
          mode: string
          note: string | null
          reservation_id: string | null
          status: string
          subtotal: number
          table_id: string | null
          updated_at: string
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
          id: string
          mode: string
          note: string | null
          reservation_id: string | null
          status: string
          subtotal: number
          table_id: string | null
          updated_at: string
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


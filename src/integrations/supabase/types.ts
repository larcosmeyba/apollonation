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
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      body_metrics: {
        Row: {
          body_fat_pct: number | null
          body_weight_lbs: number | null
          bone_density: number | null
          created_at: string
          created_by: string
          id: string
          muscle_mass_lbs: number | null
          notes: string | null
          recorded_at: string
          user_id: string
        }
        Insert: {
          body_fat_pct?: number | null
          body_weight_lbs?: number | null
          bone_density?: number | null
          created_at?: string
          created_by: string
          id?: string
          muscle_mass_lbs?: number | null
          notes?: string | null
          recorded_at?: string
          user_id: string
        }
        Update: {
          body_fat_pct?: number | null
          body_weight_lbs?: number | null
          bone_density?: number | null
          created_at?: string
          created_by?: string
          id?: string
          muscle_mass_lbs?: number | null
          notes?: string | null
          recorded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      challenge_checkins: {
        Row: {
          challenge_id: string
          checkin_date: string
          created_at: string
          id: string
          notes: string | null
          nutrition_logged: boolean | null
          user_id: string
          workout_completed: boolean | null
        }
        Insert: {
          challenge_id: string
          checkin_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          nutrition_logged?: boolean | null
          user_id: string
          workout_completed?: boolean | null
        }
        Update: {
          challenge_id?: string
          checkin_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          nutrition_logged?: boolean | null
          user_id?: string
          workout_completed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_checkins_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_enrollments: {
        Row: {
          challenge_id: string
          completed_at: string | null
          enrolled_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          enrolled_at?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          enrolled_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_enrollments_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          category: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          duration_days: number
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_notes: {
        Row: {
          admin_user_id: string
          client_user_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          client_user_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          client_user_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_nutrition_profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          created_at: string
          dietary_preferences: string[] | null
          food_restrictions: string[] | null
          goal_weight: number | null
          goals: string | null
          height_inches: number | null
          id: string
          notes: string | null
          updated_at: string
          user_id: string
          weight_lbs: number | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          created_at?: string
          dietary_preferences?: string[] | null
          food_restrictions?: string[] | null
          goal_weight?: number | null
          goals?: string | null
          height_inches?: number | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
          weight_lbs?: number | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          created_at?: string
          dietary_preferences?: string[] | null
          food_restrictions?: string[] | null
          goal_weight?: number | null
          goals?: string | null
          height_inches?: number | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          weight_lbs?: number | null
        }
        Relationships: []
      }
      client_questionnaires: {
        Row: {
          activity_level: string
          age: number
          created_at: string
          current_workout_days: string[] | null
          cycle_number: number
          cycle_start_date: string
          dietary_restrictions: string[] | null
          disliked_foods: string[] | null
          goal_next_4_weeks: string | null
          goal_weight: number | null
          grocery_store: string | null
          has_other_activities: boolean | null
          height_inches: number
          id: string
          is_active: boolean
          other_activities: Json | null
          preferred_training_days: string[] | null
          sex: string
          training_methods: string[]
          updated_at: string
          user_id: string
          waiver_accepted: boolean
          waiver_accepted_at: string | null
          weekly_food_budget: number | null
          weight_lbs: number
          workout_days_per_week: number
          workout_duration_minutes: number | null
        }
        Insert: {
          activity_level?: string
          age: number
          created_at?: string
          current_workout_days?: string[] | null
          cycle_number?: number
          cycle_start_date?: string
          dietary_restrictions?: string[] | null
          disliked_foods?: string[] | null
          goal_next_4_weeks?: string | null
          goal_weight?: number | null
          grocery_store?: string | null
          has_other_activities?: boolean | null
          height_inches: number
          id?: string
          is_active?: boolean
          other_activities?: Json | null
          preferred_training_days?: string[] | null
          sex: string
          training_methods?: string[]
          updated_at?: string
          user_id: string
          waiver_accepted?: boolean
          waiver_accepted_at?: string | null
          weekly_food_budget?: number | null
          weight_lbs: number
          workout_days_per_week?: number
          workout_duration_minutes?: number | null
        }
        Update: {
          activity_level?: string
          age?: number
          created_at?: string
          current_workout_days?: string[] | null
          cycle_number?: number
          cycle_start_date?: string
          dietary_restrictions?: string[] | null
          disliked_foods?: string[] | null
          goal_next_4_weeks?: string | null
          goal_weight?: number | null
          grocery_store?: string | null
          has_other_activities?: boolean | null
          height_inches?: number
          id?: string
          is_active?: boolean
          other_activities?: Json | null
          preferred_training_days?: string[] | null
          sex?: string
          training_methods?: string[]
          updated_at?: string
          user_id?: string
          waiver_accepted?: boolean
          waiver_accepted_at?: string | null
          weekly_food_budget?: number | null
          weight_lbs?: number
          workout_days_per_week?: number
          workout_duration_minutes?: number | null
        }
        Relationships: []
      }
      client_training_plans: {
        Row: {
          created_at: string
          cycle_number: number
          duration_weeks: number
          id: string
          questionnaire_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          workout_days_per_week: number
        }
        Insert: {
          created_at?: string
          cycle_number?: number
          duration_weeks?: number
          id?: string
          questionnaire_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          workout_days_per_week?: number
        }
        Update: {
          created_at?: string
          cycle_number?: number
          duration_weeks?: number
          id?: string
          questionnaire_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          workout_days_per_week?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_training_plans_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "client_questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_applications: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          reason: string | null
          social_media_following: string | null
          social_media_handle: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          reason?: string | null
          social_media_following?: string | null
          social_media_handle?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          reason?: string | null
          social_media_following?: string | null
          social_media_handle?: string | null
        }
        Relationships: []
      }
      coach_client_assignments: {
        Row: {
          client_user_id: string
          coach_user_id: string
          created_at: string
          id: string
        }
        Insert: {
          client_user_id: string
          coach_user_id: string
          created_at?: string
          id?: string
        }
        Update: {
          client_user_id?: string
          coach_user_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      coach_insights: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          category: string
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string | null
          name: string
          phone: string | null
          preferred_contact: string
        }
        Insert: {
          category?: string
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message?: string | null
          name: string
          phone?: string | null
          preferred_contact?: string
        }
        Update: {
          category?: string
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string | null
          name?: string
          phone?: string | null
          preferred_contact?: string
        }
        Relationships: []
      }
      custom_activity_logs: {
        Row: {
          activity_name: string
          calories_burned: number | null
          created_at: string
          duration_minutes: number | null
          id: string
          log_date: string
          notes: string | null
          user_id: string
        }
        Insert: {
          activity_name: string
          calories_burned?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          log_date?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          activity_name?: string
          calories_burned?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          log_date?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      exercise_set_logs: {
        Row: {
          created_at: string
          day_id: string
          id: string
          log_date: string
          reps_completed: number | null
          set_number: number
          training_plan_exercise_id: string
          user_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          day_id: string
          id?: string
          log_date?: string
          reps_completed?: number | null
          set_number: number
          training_plan_exercise_id: string
          user_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          day_id?: string
          id?: string
          log_date?: string
          reps_completed?: number | null
          set_number?: number
          training_plan_exercise_id?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_set_logs_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "training_plan_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_set_logs_training_plan_exercise_id_fkey"
            columns: ["training_plan_exercise_id"]
            isOneToOne: false
            referencedRelation: "training_plan_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_user_notes: {
        Row: {
          created_at: string
          day_id: string
          id: string
          is_completed: boolean
          log_date: string
          note: string
          training_plan_exercise_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_id: string
          id?: string
          is_completed?: boolean
          log_date?: string
          note?: string
          training_plan_exercise_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_id?: string
          id?: string
          is_completed?: boolean
          log_date?: string
          note?: string
          training_plan_exercise_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_user_notes_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "training_plan_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_user_notes_training_plan_exercise_id_fkey"
            columns: ["training_plan_exercise_id"]
            isOneToOne: false
            referencedRelation: "training_plan_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          description: string | null
          difficulty: string | null
          equipment: string | null
          id: string
          muscle_group: string
          thumbnail_url: string | null
          title: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty?: string | null
          equipment?: string | null
          id?: string
          muscle_group: string
          thumbnail_url?: string | null
          title: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty?: string | null
          equipment?: string | null
          id?: string
          muscle_group?: string
          thumbnail_url?: string | null
          title?: string
          video_url?: string | null
        }
        Relationships: []
      }
      food_spend_logs: {
        Row: {
          amount_spent: number
          created_at: string
          id: string
          notes: string | null
          spend_date: string
          store_name: string | null
          user_id: string
        }
        Insert: {
          amount_spent: number
          created_at?: string
          id?: string
          notes?: string | null
          spend_date?: string
          store_name?: string | null
          user_id: string
        }
        Update: {
          amount_spent?: number
          created_at?: string
          id?: string
          notes?: string | null
          spend_date?: string
          store_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      free_usage: {
        Row: {
          free_programs_used_count: number
          free_recipe_used: boolean
          free_recipes_viewed_count: number
          free_workouts_used_count: number
          last_updated_at: string
          user_id: string
          viewed_recipe_ids: string[]
        }
        Insert: {
          free_programs_used_count?: number
          free_recipe_used?: boolean
          free_recipes_viewed_count?: number
          free_workouts_used_count?: number
          last_updated_at?: string
          user_id: string
          viewed_recipe_ids?: string[]
        }
        Update: {
          free_programs_used_count?: number
          free_recipe_used?: boolean
          free_recipes_viewed_count?: number
          free_workouts_used_count?: number
          last_updated_at?: string
          user_id?: string
          viewed_recipe_ids?: string[]
        }
        Relationships: []
      }
      grocery_item_states: {
        Row: {
          already_have: boolean
          created_at: string
          id: string
          item_key: string
          original_quantity: string | null
          plan_id: string
          purchased: boolean
          quantity_factor: number
          swapped_for_budget: boolean
          updated_at: string
          user_id: string
          week_number: number
        }
        Insert: {
          already_have?: boolean
          created_at?: string
          id?: string
          item_key: string
          original_quantity?: string | null
          plan_id: string
          purchased?: boolean
          quantity_factor?: number
          swapped_for_budget?: boolean
          updated_at?: string
          user_id: string
          week_number: number
        }
        Update: {
          already_have?: boolean
          created_at?: string
          id?: string
          item_key?: string
          original_quantity?: string | null
          plan_id?: string
          purchased?: boolean
          quantity_factor?: number
          swapped_for_budget?: boolean
          updated_at?: string
          user_id?: string
          week_number?: number
        }
        Relationships: []
      }
      group_coaching_slideshows: {
        Row: {
          class_type: string
          created_at: string
          created_by: string
          equipment: string[]
          id: string
          is_template: boolean
          title: string
          updated_at: string
        }
        Insert: {
          class_type?: string
          created_at?: string
          created_by: string
          equipment?: string[]
          id?: string
          is_template?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          class_type?: string
          created_at?: string
          created_by?: string
          equipment?: string[]
          id?: string
          is_template?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      macro_logs: {
        Row: {
          ai_estimated: boolean | null
          calories: number | null
          carbs_grams: number | null
          created_at: string
          fat_grams: number | null
          id: string
          log_date: string
          meal_name: string | null
          notes: string | null
          photo_url: string | null
          protein_grams: number | null
          user_id: string
        }
        Insert: {
          ai_estimated?: boolean | null
          calories?: number | null
          carbs_grams?: number | null
          created_at?: string
          fat_grams?: number | null
          id?: string
          log_date?: string
          meal_name?: string | null
          notes?: string | null
          photo_url?: string | null
          protein_grams?: number | null
          user_id: string
        }
        Update: {
          ai_estimated?: boolean | null
          calories?: number | null
          carbs_grams?: number | null
          created_at?: string
          fat_grams?: number | null
          id?: string
          log_date?: string
          meal_name?: string | null
          notes?: string | null
          photo_url?: string | null
          protein_grams?: number | null
          user_id?: string
        }
        Relationships: []
      }
      marketing_photos: {
        Row: {
          category: string
          created_at: string
          file_name: string
          file_path: string
          id: string
          tags: string[] | null
          uploaded_by: string
        }
        Insert: {
          category?: string
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          tags?: string[] | null
          uploaded_by: string
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          tags?: string[] | null
          uploaded_by?: string
        }
        Relationships: []
      }
      marketing_posts: {
        Row: {
          created_at: string
          created_by: string
          cta_text: string | null
          generated_image_path: string | null
          headline: string | null
          height: number
          id: string
          platform: string
          source_photo_id: string | null
          status: string
          subheadline: string | null
          title: string
          updated_at: string
          width: number
        }
        Insert: {
          created_at?: string
          created_by: string
          cta_text?: string | null
          generated_image_path?: string | null
          headline?: string | null
          height?: number
          id?: string
          platform?: string
          source_photo_id?: string | null
          status?: string
          subheadline?: string | null
          title?: string
          updated_at?: string
          width?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          cta_text?: string | null
          generated_image_path?: string | null
          headline?: string | null
          height?: number
          id?: string
          platform?: string
          source_photo_id?: string | null
          status?: string
          subheadline?: string | null
          title?: string
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketing_posts_source_photo_id_fkey"
            columns: ["source_photo_id"]
            isOneToOne: false
            referencedRelation: "marketing_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      message_email_state: {
        Row: {
          last_email_sent_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          last_email_sent_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          last_email_sent_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      message_reports: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reason: string | null
          reporter_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reason?: string | null
          reporter_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reason?: string | null
          reporter_user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_plan_meals: {
        Row: {
          calories: number | null
          carbs_grams: number | null
          created_at: string
          day_number: number
          description: string | null
          fat_grams: number | null
          id: string
          ingredients: Json | null
          meal_name: string
          meal_type: string
          plan_id: string
          protein_grams: number | null
          sort_order: number | null
        }
        Insert: {
          calories?: number | null
          carbs_grams?: number | null
          created_at?: string
          day_number: number
          description?: string | null
          fat_grams?: number | null
          id?: string
          ingredients?: Json | null
          meal_name: string
          meal_type: string
          plan_id: string
          protein_grams?: number | null
          sort_order?: number | null
        }
        Update: {
          calories?: number | null
          carbs_grams?: number | null
          created_at?: string
          day_number?: number
          description?: string | null
          fat_grams?: number | null
          id?: string
          ingredients?: Json | null
          meal_name?: string
          meal_type?: string
          plan_id?: string
          protein_grams?: number | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_plan_meals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "nutrition_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_plans: {
        Row: {
          carbs_grams: number | null
          created_at: string
          created_by: string
          daily_calories: number | null
          duration_weeks: number | null
          fat_grams: number | null
          id: string
          notes: string | null
          protein_grams: number | null
          start_date: string | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
          weekly_budget_cents: number | null
        }
        Insert: {
          carbs_grams?: number | null
          created_at?: string
          created_by: string
          daily_calories?: number | null
          duration_weeks?: number | null
          fat_grams?: number | null
          id?: string
          notes?: string | null
          protein_grams?: number | null
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
          weekly_budget_cents?: number | null
        }
        Update: {
          carbs_grams?: number | null
          created_at?: string
          created_by?: string
          daily_calories?: number | null
          duration_weeks?: number | null
          fat_grams?: number | null
          id?: string
          notes?: string | null
          protein_grams?: number | null
          start_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          weekly_budget_cents?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          agreed_to_terms_at: string | null
          avatar_url: string | null
          bio: string | null
          certifications: string[]
          created_at: string
          display_name: string | null
          entitlement: string | null
          fitness_goals: string | null
          health_disclaimer_acknowledged_at: string | null
          hero_image_url: string | null
          id: string
          instagram_handle: string | null
          is_subscribed: boolean
          is_test_account: boolean
          long_bio: string | null
          manual_subscription: boolean
          revenuecat_app_user_id: string | null
          specialties: string[]
          status_changed_at: string | null
          subscription_expires_at: string | null
          subscription_plan: string | null
          subscription_store: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
          welcome_seen: boolean
          years_coaching: number | null
        }
        Insert: {
          account_status?: string
          agreed_to_terms_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: string[]
          created_at?: string
          display_name?: string | null
          entitlement?: string | null
          fitness_goals?: string | null
          health_disclaimer_acknowledged_at?: string | null
          hero_image_url?: string | null
          id?: string
          instagram_handle?: string | null
          is_subscribed?: boolean
          is_test_account?: boolean
          long_bio?: string | null
          manual_subscription?: boolean
          revenuecat_app_user_id?: string | null
          specialties?: string[]
          status_changed_at?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_store?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
          welcome_seen?: boolean
          years_coaching?: number | null
        }
        Update: {
          account_status?: string
          agreed_to_terms_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: string[]
          created_at?: string
          display_name?: string | null
          entitlement?: string | null
          fitness_goals?: string | null
          health_disclaimer_acknowledged_at?: string | null
          hero_image_url?: string | null
          id?: string
          instagram_handle?: string | null
          is_subscribed?: boolean
          is_test_account?: boolean
          long_bio?: string | null
          manual_subscription?: boolean
          revenuecat_app_user_id?: string | null
          specialties?: string[]
          status_changed_at?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_store?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
          welcome_seen?: boolean
          years_coaching?: number | null
        }
        Relationships: []
      }
      programs: {
        Row: {
          category: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          durations: number[]
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          durations?: number[]
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          durations?: number[]
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          body_fat_pct: number | null
          created_at: string
          id: string
          notes: string | null
          photo_date: string
          photo_type: string
          photo_url: string
          user_id: string
          weight_lbs: number | null
        }
        Insert: {
          body_fat_pct?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          photo_date?: string
          photo_type: string
          photo_url: string
          user_id: string
          weight_lbs?: number | null
        }
        Update: {
          body_fat_pct?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          photo_date?: string
          photo_type?: string
          photo_url?: string
          user_id?: string
          weight_lbs?: number | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          created_at: string
          id: string
          identifier: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          identifier: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          identifier?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          calories_per_serving: number | null
          carbs_grams: number | null
          category: string | null
          cook_time_minutes: number | null
          created_at: string
          description: string | null
          dietary_tags: string[] | null
          fat_grams: number | null
          id: string
          ingredients: Json | null
          instructions: string | null
          prep_time_minutes: number | null
          protein_grams: number | null
          servings: number | null
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          calories_per_serving?: number | null
          carbs_grams?: number | null
          category?: string | null
          cook_time_minutes?: number | null
          created_at?: string
          description?: string | null
          dietary_tags?: string[] | null
          fat_grams?: number | null
          id?: string
          ingredients?: Json | null
          instructions?: string | null
          prep_time_minutes?: number | null
          protein_grams?: number | null
          servings?: number | null
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          calories_per_serving?: number | null
          carbs_grams?: number | null
          category?: string | null
          cook_time_minutes?: number | null
          created_at?: string
          description?: string | null
          dietary_tags?: string[] | null
          fat_grams?: number | null
          id?: string
          ingredients?: Json | null
          instructions?: string | null
          prep_time_minutes?: number | null
          protein_grams?: number | null
          servings?: number | null
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: []
      }
      recovery_logs: {
        Row: {
          created_at: string
          hydration_liters: number | null
          id: string
          log_date: string
          mobility_minutes: number | null
          notes: string | null
          sleep_hours: number | null
          soreness_areas: Json | null
          soreness_rating: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hydration_liters?: number | null
          id?: string
          log_date?: string
          mobility_minutes?: number | null
          notes?: string | null
          sleep_hours?: number | null
          soreness_areas?: Json | null
          soreness_rating?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hydration_liters?: number | null
          id?: string
          log_date?: string
          mobility_minutes?: number | null
          notes?: string | null
          sleep_hours?: number | null
          soreness_areas?: Json | null
          soreness_rating?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          discount_percent: number
          id: string
          is_active: boolean
          max_uses: number | null
          times_used: number
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          discount_percent?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          times_used?: number
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          discount_percent?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          times_used?: number
          user_id?: string
        }
        Relationships: []
      }
      referral_tracking: {
        Row: {
          created_at: string
          id: string
          referral_code_id: string
          referred_user_id: string
          referrer_user_id: string
          reward_given: boolean
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code_id: string
          referred_user_id: string
          referrer_user_id: string
          reward_given?: boolean
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code_id?: string
          referred_user_id?: string
          referrer_user_id?: string
          reward_given?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_tracking_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      secure_contact_info: {
        Row: {
          created_at: string
          id: string
          phone_encrypted: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          phone_encrypted?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          phone_encrypted?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      slideshow_slides: {
        Row: {
          block_label: string | null
          coaching_cue: string | null
          created_at: string
          exercise_name: string | null
          id: string
          notes: string | null
          reps: string | null
          rest_seconds: number | null
          sets: number | null
          slide_number: number
          slide_type: string
          slideshow_id: string
          thumbnail_url: string | null
          video_url: string | null
        }
        Insert: {
          block_label?: string | null
          coaching_cue?: string | null
          created_at?: string
          exercise_name?: string | null
          id?: string
          notes?: string | null
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          slide_number?: number
          slide_type?: string
          slideshow_id: string
          thumbnail_url?: string | null
          video_url?: string | null
        }
        Update: {
          block_label?: string | null
          coaching_cue?: string | null
          created_at?: string
          exercise_name?: string | null
          id?: string
          notes?: string | null
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          slide_number?: number
          slide_type?: string
          slideshow_id?: string
          thumbnail_url?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slideshow_slides_slideshow_id_fkey"
            columns: ["slideshow_id"]
            isOneToOne: false
            referencedRelation: "group_coaching_slideshows"
            referencedColumns: ["id"]
          },
        ]
      }
      step_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          steps: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          steps?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          steps?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_replied_at: string | null
          admin_reply: string | null
          created_at: string
          id: string
          message: string
          priority: string
          status: string
          subject: string
          triage_status: string
          type: string
          user_id: string
        }
        Insert: {
          admin_replied_at?: string | null
          admin_reply?: string | null
          created_at?: string
          id?: string
          message: string
          priority?: string
          status?: string
          subject?: string
          triage_status?: string
          type?: string
          user_id: string
        }
        Update: {
          admin_replied_at?: string | null
          admin_reply?: string | null
          created_at?: string
          id?: string
          message?: string
          priority?: string
          status?: string
          subject?: string
          triage_status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      training_plan_days: {
        Row: {
          created_at: string
          day_label: string | null
          day_number: number
          focus: string | null
          id: string
          plan_id: string
          scheduled_date: string | null
        }
        Insert: {
          created_at?: string
          day_label?: string | null
          day_number: number
          focus?: string | null
          id?: string
          plan_id: string
          scheduled_date?: string | null
        }
        Update: {
          created_at?: string
          day_label?: string | null
          day_number?: number
          focus?: string | null
          id?: string
          plan_id?: string
          scheduled_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_plan_days_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "client_training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plan_exercises: {
        Row: {
          created_at: string
          day_id: string
          exercise_name: string
          id: string
          muscle_group: string | null
          notes: string | null
          reps: string | null
          rest_seconds: number | null
          sets: number | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          day_id: string
          exercise_name: string
          id?: string
          muscle_group?: string | null
          notes?: string | null
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          day_id?: string
          exercise_name?: string
          id?: string
          muscle_group?: string | null
          notes?: string | null
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_plan_exercises_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "training_plan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          achievement_title: string
          id: string
          is_seen: boolean
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          achievement_title: string
          id?: string
          is_seen?: boolean
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          achievement_title?: string
          id?: string
          is_seen?: boolean
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_user_id: string
          blocker_user_id: string
          created_at: string
        }
        Insert: {
          blocked_user_id: string
          blocker_user_id: string
          created_at?: string
        }
        Update: {
          blocked_user_id?: string
          blocker_user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          id: string
          recipe_id: string | null
          user_id: string
          workout_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_id?: string | null
          user_id: string
          workout_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          recipe_id?: string | null
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_food_budgets: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          weekly_budget: number
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          weekly_budget?: number
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          weekly_budget?: number
        }
        Relationships: []
      }
      user_macro_targets: {
        Row: {
          bmr: number | null
          calorie_target: number
          carb_grams: number
          created_at: string
          fat_grams: number
          goal_type: string
          id: string
          protein_grams: number
          source: string
          tdee: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bmr?: number | null
          calorie_target: number
          carb_grams: number
          created_at?: string
          fat_grams: number
          goal_type?: string
          id?: string
          protein_grams: number
          source?: string
          tdee?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bmr?: number | null
          calorie_target?: number
          carb_grams?: number
          created_at?: string
          fat_grams?: number
          goal_type?: string
          id?: string
          protein_grams?: number
          source?: string
          tdee?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          coach_messages: boolean
          created_at: string
          id: string
          meal_reminders: boolean
          updated_at: string
          user_id: string
          weekly_summary: boolean
          workout_reminders: boolean
        }
        Insert: {
          coach_messages?: boolean
          created_at?: string
          id?: string
          meal_reminders?: boolean
          updated_at?: string
          user_id: string
          weekly_summary?: boolean
          workout_reminders?: boolean
        }
        Update: {
          coach_messages?: boolean
          created_at?: string
          id?: string
          meal_reminders?: boolean
          updated_at?: string
          user_id?: string
          weekly_summary?: boolean
          workout_reminders?: boolean
        }
        Relationships: []
      }
      user_privacy_preferences: {
        Row: {
          ai_personalization_opted_out: boolean
          created_at: string
          id: string
          marketing_opted_out: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_personalization_opted_out?: boolean
          created_at?: string
          id?: string
          marketing_opted_out?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_personalization_opted_out?: boolean
          created_at?: string
          id?: string
          marketing_opted_out?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_workout_progress: {
        Row: {
          completed_at: string
          duration_seconds: number | null
          id: string
          notes: string | null
          user_id: string
          workout_id: string
        }
        Insert: {
          completed_at?: string
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          user_id: string
          workout_id: string
        }
        Update: {
          completed_at?: string
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_workout_progress_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          reps: string | null
          rest_seconds: number | null
          sets: number | null
          sort_order: number
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          sort_order?: number
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          sort_order?: number
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_recommendations: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_dismissed: boolean
          reason: string
          recommended_workout: string
          source_session_id: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_dismissed?: boolean
          reason: string
          recommended_workout: string
          source_session_id?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_dismissed?: boolean
          reason?: string
          recommended_workout?: string
          source_session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workout_session_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          day_id: string
          difficulty_rating: number | null
          id: string
          log_date: string
          notes: string | null
          user_id: string
          watch_screenshot_url: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          day_id: string
          difficulty_rating?: number | null
          id?: string
          log_date?: string
          notes?: string | null
          user_id: string
          watch_screenshot_url?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          day_id?: string
          difficulty_rating?: number | null
          id?: string
          log_date?: string
          notes?: string | null
          user_id?: string
          watch_screenshot_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_session_logs_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "training_plan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          calories_estimate: number | null
          category: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_featured: boolean | null
          is_published: boolean
          thumbnail_url: string | null
          title: string
          video_url: string | null
        }
        Insert: {
          calories_estimate?: number | null
          category: string
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          is_featured?: boolean | null
          is_published?: boolean
          thumbnail_url?: string | null
          title: string
          video_url?: string | null
        }
        Update: {
          calories_estimate?: number | null
          category?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_featured?: boolean | null
          is_published?: boolean
          thumbnail_url?: string | null
          title?: string
          video_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          p_action: string
          p_identifier: string
          p_max_requests: number
          p_window_minutes: number
        }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_message_partner_profiles: {
        Args: { partner_ids: string[] }
        Returns: {
          display_name: string
          user_id: string
        }[]
      }
      get_notification_preference: {
        Args: { _category: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked: {
        Args: { _blocked: string; _blocker: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      subscription_tier: "basic" | "pro" | "elite"
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
      subscription_tier: ["basic", "pro", "elite"],
    },
  },
} as const

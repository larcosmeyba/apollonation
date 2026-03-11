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
      contact_requests: {
        Row: {
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
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          fitness_goals: string | null
          id: string
          manual_subscription: boolean
          status_changed_at: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
          welcome_seen: boolean
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          fitness_goals?: string | null
          id?: string
          manual_subscription?: boolean
          status_changed_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
          welcome_seen?: boolean
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          fitness_goals?: string | null
          id?: string
          manual_subscription?: boolean
          status_changed_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
          welcome_seen?: boolean
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
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          status?: string
          subject?: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          type?: string
          user_id?: string
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
      workout_session_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          day_id: string
          id: string
          log_date: string
          notes: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          day_id: string
          id?: string
          log_date?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          day_id?: string
          id?: string
          log_date?: string
          notes?: string | null
          user_id?: string
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
      get_message_partner_profiles: {
        Args: { partner_ids: string[] }
        Returns: {
          display_name: string
          user_id: string
        }[]
      }
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

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { initPurchases, logOutPurchases } from "@/lib/purchases";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  fitness_goals: string | null;
  account_status: string;
  manual_subscription: boolean;
  is_subscribed: boolean;
  subscription_plan: "monthly" | "annual" | null;
  subscription_store: "app_store" | "play_store" | "manual" | null;
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data as Profile | null;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  const mountedRef = useRef(true);
  const purchasesUserRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          if (!mountedRef.current) return;
          setProfile(profileData);
          setLoading(false);
          // Initialize RevenueCat (no-op on web). Avoid re-init on token refresh.
          if (purchasesUserRef.current !== session.user.id) {
            purchasesUserRef.current = session.user.id;
            initPurchases(session.user.id).catch((e) => console.warn("initPurchases", e));
          }
        } else {
          setProfile(null);
          setLoading(false);
          if (purchasesUserRef.current) {
            purchasesUserRef.current = null;
            logOutPurchases().catch(() => undefined);
          }
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mountedRef.current) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id).then((profileData) => {
          if (!mountedRef.current) return;
          setProfile(profileData);
          setLoading(false);
          if (purchasesUserRef.current !== session.user.id) {
            purchasesUserRef.current = session.user.id;
            initPurchases(session.user.id).catch((e) => console.warn("initPurchases", e));
          }
        });
      } else {
        setLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      authSubscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          display_name: displayName,
        },
      },
    });

    if (!error) {
      supabase.functions.invoke("notify-new-signup", {
        body: { email, displayName: displayName || "No name" },
      }).then(({ error: notifError }) => {
        if (notifError) console.error("Signup notification error:", notifError);
      });
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    await logOutPurchases().catch(() => undefined);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

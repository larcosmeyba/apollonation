import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { User, Session } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { Purchases } from "@revenuecat/purchases-capacitor";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { initPurchases, logOutPurchases } from "@/lib/purchases";
import { withTimeout } from "@/lib/timeout";
import { toast } from "sonner";

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
  entitlement: "apollo_premium" | "apollo_elite" | null;
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
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await withTimeout(
      supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      8_000,
      "Profile load timed out"
    );

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
  const purchasesListenerIdRef = useRef<string | null>(null);

  const attachPurchasesListener = async (userId: string) => {
    if (!Capacitor.isNativePlatform()) return;
    if (purchasesListenerIdRef.current) return;
    try {
      const id = await Purchases.addCustomerInfoUpdateListener(() => {
        fetchProfile(userId).then((profileData) => {
          if (!mountedRef.current) return;
          setProfile(profileData);
        });
      });
      purchasesListenerIdRef.current = id;
    } catch (e) {
      console.warn("[Auth] addCustomerInfoUpdateListener", e);
    }
  };

  const detachPurchasesListener = async () => {
    if (!Capacitor.isNativePlatform()) return;
    const id = purchasesListenerIdRef.current;
    if (!id) return;
    purchasesListenerIdRef.current = null;
    try {
      await Purchases.removeCustomerInfoUpdateListener({ listenerToRemove: id });
    } catch (e) {
      console.warn("[Auth] removeCustomerInfoUpdateListener", e);
    }
  };

  const finishSessionRestore = async (nextSession: Session | null) => {
    if (!mountedRef.current) return;
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (nextSession?.user) {
      const uid = nextSession.user.id;
      initPurchases(uid)
        .then(() => attachPurchasesListener(uid))
        .catch((e) => console.warn("[Auth] initPurchases", e));
      try {
        const profileData = await fetchProfile(uid);
        if (!mountedRef.current) return;
        setProfile(profileData);
      } catch (e) {
        console.warn("[Auth] profile restore failed", e);
        if (!mountedRef.current) return;
        setProfile(null);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    } else {
      await detachPurchasesListener();
      if (!mountedRef.current) return;
      setProfile(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void finishSessionRestore(session);
      }
    );

    withTimeout(supabase.auth.getSession(), 8_000, "Session restore timed out")
      .then(({ data: { session } }) => finishSessionRestore(session))
      .catch((e) => {
        console.warn("[Auth] session restore failed", e);
        if (!mountedRef.current) return;
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      });

    return () => {
      mountedRef.current = false;
      authSubscription.unsubscribe();
      detachPurchasesListener();
    };
  }, []);

  // Subscription expiry no longer kicks users out — free tier is a first-class
  // experience. Per-feature gates handle premium-only content individually.
  // On the true → false transition, fire a one-time toast so the user knows
  // their membership ended but they can keep using free content.
  const wasSubscribedRef = useRef<boolean | null>(null);
  const wasEliteRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!profile) {
      wasSubscribedRef.current = null;
      wasEliteRef.current = null;
      return;
    }
    const prevSub = wasSubscribedRef.current;
    const nowSub = profile.is_subscribed;
    const prevElite = wasEliteRef.current;
    const nowElite = profile.entitlement === "apollo_elite";

    if (prevSub === true && nowSub === false) {
      toast(
        "Your Apollo membership has ended. You can still use the calorie tracker and your remaining free content."
      );
    } else if (prevElite === true && nowElite === false && nowSub === true) {
      toast("Your Apollo Elite™ plan has ended. You still have full Reborn™ access.");
    }
    wasSubscribedRef.current = nowSub;
    wasEliteRef.current = nowElite;
  }, [profile]);

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const { error } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: displayName,
            },
          },
        }),
        12_000,
        "Signup timed out"
      );

      if (!error) {
        supabase.functions.invoke("notify-new-signup", {
          body: { email, displayName: displayName || "No name" },
        })
          .then(({ error: notifError }) => {
            if (notifError) console.error("Signup notification error:", notifError);
          })
          .catch((err) => console.warn("notify-new-signup failed", err));
      }

      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        12_000,
        "Signin timed out"
      );
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await logOutPurchases();
    } catch (e) {
      console.warn("[Auth] logOutPurchases failed", e);
    }
    try {
      // scope: 'global' invalidates the refresh token everywhere — other
      // browser tabs lose their session on the next auth event.
      await supabase.auth.signOut({ scope: "global" });
    } catch (e) {
      console.warn("[Auth] supabase signOut failed", e);
    }
    try {
      queryClient.clear();
    } catch (e) {
      console.warn("[Auth] queryClient.clear failed", e);
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    try {
      navigate("/auth", { replace: true });
    } catch (e) {
      console.warn("[Auth] navigate failed", e);
    }
  };

  // Memoize the context value so consumers don't re-render every time the
  // AuthProvider itself re-renders (e.g. due to internal state we don't
  // expose). Only changes to user/session/profile/loading propagate.
  const value = useMemo(
    () => ({ user, session, profile, loading, signUp, signIn, signOut, refreshProfile }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, session, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

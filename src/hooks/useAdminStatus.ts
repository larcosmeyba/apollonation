import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { App } from "@capacitor/app";
import { withTimeout } from "@/lib/timeout";

const TTL_MS = 30 * 1000; // 30 seconds — revoked admins lose powers quickly

export const useAdminStatus = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastFetchedRef = useRef<number>(0);

  const checkAdminStatus = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await withTimeout(
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle(),
        8_000,
        "Admin check timed out"
      );

      if (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } else {
        setIsAdmin(!!data);
      }
      lastFetchedRef.current = Date.now();
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refetch = useCallback(() => {
    void checkAdminStatus();
  }, [checkAdminStatus]);

  // Initial check + when user changes
  useEffect(() => {
    void checkAdminStatus();
  }, [checkAdminStatus]);

  // 30-second TTL refresh on interval — keeps revoked admins from lingering.
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (Date.now() - lastFetchedRef.current >= TTL_MS) {
        void checkAdminStatus();
      }
    }, 15 * 1000); // poll every 15s
    return () => clearInterval(interval);
  }, [user, checkAdminStatus]);

  // Refetch on app resume (Capacitor native)
  useEffect(() => {
    if (!user) return;
    let removeListener: (() => void) | null = null;
    (async () => {
      try {
        const handle = await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) void checkAdminStatus();
        });
        removeListener = () => handle.remove();
      } catch {
        // Web/non-native — listener unavailable, ignore.
      }
    })();
    return () => {
      if (removeListener) removeListener();
    };
  }, [user, checkAdminStatus]);

  return { isAdmin, loading, refetch };
};

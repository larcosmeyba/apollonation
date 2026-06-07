import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

let listenersAttached = false;

/**
 * Attaches the registration / error listeners (idempotent) and triggers the
 * OS permission prompt + register() flow. Saves the device token into
 * `push_tokens` so the backend can target this device when APNs/FCM
 * server credentials are configured.
 *
 * Returns true if permission was granted, false otherwise.
 */
export const requestAndRegisterPush = async (userId: string): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;

  const { PushNotifications } = await import("@capacitor/push-notifications");

  if (!listenersAttached) {
    await PushNotifications.addListener("registration", async (token) => {
      try {
        await (supabase as any).from("push_tokens").upsert(
          {
            user_id: userId,
            token: token.value,
            platform: Capacitor.getPlatform(),
          },
          { onConflict: "user_id,token" }
        );
      } catch (e) {
        console.warn("[Push] failed to save token", e);
      }
    });
    await PushNotifications.addListener("registrationError", (err) => {
      console.warn("[Push] registration error", err);
    });
    listenersAttached = true;
  }

  const result = await PushNotifications.requestPermissions();
  if (result.receive === "granted") {
    await PushNotifications.register();
    return true;
  }
  return false;
};

const STORAGE_KEY = (userId: string) => `apollo:push-prompted:${userId}`;

export const hasPromptedPush = (userId: string): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY(userId)) === "1";
  } catch {
    return false;
  }
};

export const markPushPrompted = (userId: string) => {
  try {
    localStorage.setItem(STORAGE_KEY(userId), "1");
  } catch {
    // ignore
  }
};

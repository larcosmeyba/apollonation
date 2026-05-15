import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";
import PushPermissionModal from "@/components/PushPermissionModal";
import { hasPromptedPush, markPushPrompted, requestAndRegisterPush } from "@/lib/push";
import { toast } from "sonner";

/**
 * Auto-shows the pre-permission modal a few seconds after a logged-in user
 * lands inside the app, exactly once per user per device. Apple only allows
 * the OS permission dialog to fire once — so we explain why first.
 */
const PushPromptHost = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!Capacitor.isNativePlatform()) return;
    if (hasPromptedPush(user.id)) return;

    const t = setTimeout(() => setOpen(true), 2500);
    return () => clearTimeout(t);
  }, [user?.id]);

  const handleAllow = async () => {
    if (!user) return;
    setOpen(false);
    markPushPrompted(user.id);
    try {
      const granted = await requestAndRegisterPush(user.id);
      if (granted) toast.success("Notifications enabled");
    } catch (e) {
      console.warn("[Push] permission flow failed", e);
    }
  };

  const handleDismiss = () => {
    if (user) markPushPrompted(user.id);
  };

  return (
    <PushPermissionModal
      open={open}
      onOpenChange={setOpen}
      onAllow={handleAllow}
      onDismiss={handleDismiss}
    />
  );
};

export default PushPromptHost;

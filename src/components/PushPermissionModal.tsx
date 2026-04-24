import { Bell } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PushPermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the user taps "Allow". The host should then call PushNotifications.requestPermissions(). */
  onAllow: () => void;
  /** Called when the user dismisses (Not now). */
  onDismiss?: () => void;
}

/**
 * Pre-permission modal shown BEFORE the OS push permission prompt.
 * Apple guidelines (and good UX) recommend explaining why we need
 * notifications before triggering the system dialog — once a user
 * denies the OS prompt, we can't show it again from inside the app.
 */
const PushPermissionModal = ({
  open,
  onOpenChange,
  onAllow,
  onDismiss,
}: PushPermissionModalProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mb-2">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <AlertDialogTitle className="text-center">Stay on track</AlertDialogTitle>
          <AlertDialogDescription className="text-center leading-relaxed">
            We'll send you workout reminders, meal reminders, and messages from
            your coach. You can turn any of these off anytime in Settings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center gap-2">
          <AlertDialogCancel
            onClick={() => {
              onDismiss?.();
            }}
          >
            Not now
          </AlertDialogCancel>
          <AlertDialogAction onClick={onAllow}>Allow</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PushPermissionModal;

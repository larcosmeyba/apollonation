import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";
import Index from "@/pages/Index";
import SplashScreen from "@/components/SplashScreen";

const AppEntryRedirect = () => {
  const isNative = Capacitor.isNativePlatform();

  if (!isNative) {
    return <Index />;
  }

  return <NativeAppEntry />;
};

const NativeAppEntry = () => {
  const { user, profile, loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-white/60 text-sm tracking-widest uppercase">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!splashDone) {
    const firstName = profile?.display_name?.split(" ")[0] || "Member";
    return <SplashScreen onFinish={() => setSplashDone(true)} memberName={firstName} />;
  }

  return <Navigate to="/dashboard" replace />;
};

export default AppEntryRedirect;

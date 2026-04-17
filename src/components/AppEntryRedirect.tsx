import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";
import Index from "@/pages/Index";
import SplashScreen from "@/components/SplashScreen";
import NativeWelcome from "@/components/NativeWelcome";

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

  // New / signed-out users: show welcome landing with Get Started + Sign In
  if (!user) {
    return <NativeWelcome />;
  }

  // Returning users: show "Welcome back, {name}" splash, then go to dashboard
  if (!splashDone) {
    const firstName = profile?.display_name?.split(" ")[0] || "Member";
    return <SplashScreen onFinish={() => setSplashDone(true)} memberName={firstName} />;
  }

  return <Navigate to="/dashboard" replace />;
};

export default AppEntryRedirect;

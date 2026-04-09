import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";
import Index from "@/pages/Index";

const AppEntryRedirect = () => {
  const isNative = Capacitor.isNativePlatform();

  // On the public website, just show the normal home page
  if (!isNative) {
    return <Index />;
  }

  // Native app: splash → auth check → dashboard
  return <NativeAppEntry />;
};

const NativeAppEntry = () => {
  const { user, profile, loading } = useAuth();
  const [welcomeDone, setWelcomeDone] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      const timer = setTimeout(() => setWelcomeDone(true), 1800);
      return () => clearTimeout(timer);
    }
  }, [user, loading]);

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

  if (!welcomeDone) {
    const firstName = profile?.display_name?.split(" ")[0] || "Member";
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center transition-opacity duration-500">
        <p className="text-white/40 text-xs tracking-[0.3em] uppercase mb-3">Welcome back</p>
        <h1
          className="text-3xl font-bold text-white tracking-[0.1em]"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {firstName}
        </h1>
      </div>
    );
  }

  return <Navigate to="/dashboard" replace />;
};

export default AppEntryRedirect;

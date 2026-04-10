import { useEffect, useState } from "react";
import splashPhoto from "@/assets/splash-photo.jpg";
import apolloLogo from "@/assets/apollo-logo-black.png";

interface SplashScreenProps {
  onFinish: () => void;
  memberName?: string;
}

const SplashScreen = ({ onFinish, memberName }: SplashScreenProps) => {
  const [phase, setPhase] = useState<"logo" | "welcome" | "fadeout">("logo");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("welcome"), 1200);
    const t2 = setTimeout(() => setPhase("fadeout"), 2800);
    const t3 = setTimeout(onFinish, 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-600 ${
        phase === "fadeout" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background photo with brightness boost */}
      <div className="absolute inset-0">
        <img
          src={splashPhoto}
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: "brightness(1.15)" }}
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-6">
        {/* Logo */}
        <img
          src={apolloLogo}
          alt="Apollo"
          className={`w-32 h-32 object-contain transition-all duration-700 ${
            phase === "logo" ? "opacity-0 scale-90" : "opacity-100 scale-100"
          }`}
          style={{ filter: "invert(1)" }}
        />

        {/* Welcome text */}
        {memberName && (
          <div
            className={`text-center transition-all duration-700 delay-200 ${
              phase === "welcome" || phase === "fadeout"
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
          >
            <p className="text-white/60 text-xs tracking-[0.3em] uppercase mb-2">Welcome back</p>
            <h1
              className="text-2xl font-bold text-white tracking-[0.08em]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {memberName}
            </h1>
          </div>
        )}
      </div>
    </div>
  );
};

export default SplashScreen;

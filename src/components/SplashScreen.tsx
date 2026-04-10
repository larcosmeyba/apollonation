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
    const t2 = setTimeout(() => setPhase("fadeout"), 3000);
    const t3 = setTimeout(onFinish, 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-700 ${
        phase === "fadeout" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background photo with brightness boost */}
      <div className="absolute inset-0">
        <img
          src={splashPhoto}
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: "brightness(1.25)" }}
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-8">
        {/* Logo — fade in and scale */}
        <img
          src={apolloLogo}
          alt="Apollo"
          className={`w-36 h-36 object-contain transition-all duration-1000 ease-out ${
            phase === "logo" ? "opacity-0 scale-75" : "opacity-100 scale-100"
          }`}
          style={{ filter: "invert(1)" }}
        />

        {/* Welcome text — appears after logo */}
        {memberName && (
          <div
            className={`text-center transition-all duration-800 ease-out ${
              phase === "welcome" || phase === "fadeout"
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-6"
            }`}
          >
            <p className="text-white/50 text-[11px] tracking-[0.35em] uppercase mb-3 font-medium">
              Welcome back
            </p>
            <h1 className="text-3xl font-bold text-white tracking-[0.06em]">
              {memberName}
            </h1>
          </div>
        )}
      </div>
    </div>
  );
};

export default SplashScreen;

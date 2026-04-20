import { useNavigate } from "react-router-dom";
import splashPhoto from "@/assets/splash-photo.jpg";
import apolloLogo from "@/assets/apollo-logo-black.png";
import { Button } from "@/components/ui/button";

const NativeWelcome = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Background photo */}
      <div className="absolute inset-0">
        <img
          src={splashPhoto}
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: "brightness(0.85)" }}
          loading="eager"
          fetchPriority="high"
        />
        {/* Dark gradient for legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/90" />
      </div>

      {/* Logo top */}
      <div
        className="relative z-10 flex justify-center"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 28px)" }}
      >
        <img
          src={apolloLogo}
          alt="Apollo Reborn"
          className="h-10 w-auto object-contain"
          style={{ filter: "invert(1)" }}
          loading="eager"
        />
      </div>

      {/* Spacer + headline + CTAs */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-7 pb-2">
        <h1 className="font-heading text-white text-[44px] leading-[1.05] tracking-tight font-bold mb-10">
          On Demand
          <br />
          Training
          <br />
          Anywhere.
        </h1>

        <div
          className="flex flex-col gap-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 18px)" }}
        >
          <Button
            variant="apollo"
            size="lg"
            className="w-full h-14 rounded-full text-sm tracking-[0.2em] uppercase font-semibold"
            onClick={() => navigate("/auth?mode=signup")}
          >
            Get Started
          </Button>
          <button
            onClick={() => navigate("/auth")}
            className="text-white/90 text-xs tracking-[0.3em] uppercase font-medium py-3 hover:text-white transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default NativeWelcome;

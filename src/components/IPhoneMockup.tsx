import mockupHome from "@/assets/mockup-home.jpg";
import mockupOnDemand from "@/assets/mockup-ondemand.jpg";
import mockupFuel from "@/assets/mockup-fuel.jpg";

/* ─── Single Phone Shell ─── */
interface PhoneProps {
  screenImage: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  size?: "sm" | "md";
}

const PhoneDevice = ({ screenImage, alt, className = "", style, size = "md" }: PhoneProps) => {
  const w = size === "md" ? "w-[280px] md:w-[320px]" : "w-[220px] md:w-[260px]";

  return (
    <div className={`relative ${className}`} style={style}>
      {/* Soft glow behind device */}
      <div className="absolute -inset-12 bg-white/[0.03] rounded-full blur-3xl pointer-events-none" />

      {/* Shadow under device */}
      <div
        className="absolute -bottom-6 left-[10%] right-[10%] h-16 rounded-[50%] blur-2xl pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(0,0,0,0.7) 0%, transparent 70%)" }}
      />

      {/* Device body */}
      <div className={`${w} rounded-[2.8rem] p-[2.5px] relative`}
        style={{
          background: "linear-gradient(160deg, rgba(120,120,130,0.5) 0%, rgba(60,60,65,0.4) 30%, rgba(30,30,35,0.6) 70%, rgba(80,80,90,0.3) 100%)",
          boxShadow: "0 25px 80px rgba(0,0,0,0.7), 0 8px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      >
        {/* Inner metallic rim */}
        <div className="rounded-[2.6rem] p-[1px]"
          style={{
            background: "linear-gradient(180deg, rgba(100,100,110,0.3) 0%, rgba(40,40,45,0.2) 100%)",
          }}
        >
          {/* Screen */}
          <div className="rounded-[2.5rem] bg-black overflow-hidden relative">
            <img
              src={screenImage}
              alt={alt}
              className="w-full h-auto block"
              loading="lazy"
            />

            {/* Glass reflection overlay */}
            <div
              className="absolute inset-0 rounded-[2.5rem] pointer-events-none"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 35%, transparent 65%, rgba(255,255,255,0.03) 100%)",
              }}
            />
            {/* Top edge highlight */}
            <div
              className="absolute top-0 left-[15%] right-[15%] h-[1px] pointer-events-none"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
              }}
            />
          </div>
        </div>

        {/* Physical buttons */}
        <div className="absolute -left-[2px] top-[80px] w-[3px] h-[28px] rounded-l-sm"
          style={{ background: "linear-gradient(180deg, #555 0%, #333 100%)" }} />
        <div className="absolute -left-[2px] top-[120px] w-[3px] h-[44px] rounded-l-sm"
          style={{ background: "linear-gradient(180deg, #555 0%, #333 100%)" }} />
        <div className="absolute -left-[2px] top-[172px] w-[3px] h-[44px] rounded-l-sm"
          style={{ background: "linear-gradient(180deg, #555 0%, #333 100%)" }} />
        <div className="absolute -right-[2px] top-[130px] w-[3px] h-[60px] rounded-r-sm"
          style={{ background: "linear-gradient(180deg, #555 0%, #333 100%)" }} />
      </div>
    </div>
  );
};

/* ─── Main Exported Component ─── */
const IPhoneMockup = () => {
  return (
    <div className="relative w-full py-8">
      {/* Background vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* 3-phone arrangement */}
      <div className="relative flex items-center justify-center gap-0 md:gap-0">
        {/* Left Phone — On Demand */}
        <div className="hidden md:block relative z-10"
          style={{
            transform: "perspective(1200px) rotateY(25deg) rotateX(2deg) translateX(40px) translateZ(-80px) scale(0.85)",
            transformStyle: "preserve-3d",
          }}
        >
          <PhoneDevice screenImage={mockupOnDemand} alt="On Demand Library" size="sm" />
        </div>

        {/* Center Phone — Home Dashboard */}
        <div className="relative z-30 animate-phone-float"
          style={{
            transform: "perspective(1200px) rotateY(-2deg) rotateX(3deg)",
            transformStyle: "preserve-3d",
          }}
        >
          <PhoneDevice screenImage={mockupHome} alt="Home Dashboard" />
        </div>

        {/* Right Phone — Fuel / Nutrition */}
        <div className="hidden md:block relative z-10"
          style={{
            transform: "perspective(1200px) rotateY(-25deg) rotateX(2deg) translateX(-40px) translateZ(-80px) scale(0.85)",
            transformStyle: "preserve-3d",
          }}
        >
          <PhoneDevice screenImage={mockupFuel} alt="Fuel Nutrition" size="sm" />
        </div>
      </div>
    </div>
  );
};

export default IPhoneMockup;
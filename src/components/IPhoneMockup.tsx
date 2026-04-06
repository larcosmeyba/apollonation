import { useEffect, useRef, useState } from "react";
import mockupHome from "@/assets/mockup-home.jpg";
import mockupOnDemand from "@/assets/mockup-ondemand.jpg";
import mockupFuel from "@/assets/mockup-fuel.jpg";

const SCREENS = [
  { src: mockupHome, alt: "Home Dashboard" },
  { src: mockupOnDemand, alt: "On Demand Library" },
  { src: mockupFuel, alt: "Fuel Nutrition" },
];

/* ─── Scrolling Phone Shell ─── */
interface PhoneProps {
  screens: typeof SCREENS;
  className?: string;
  style?: React.CSSProperties;
  size?: "sm" | "md";
  /** ms per screen */
  speed?: number;
  /** stagger start delay */
  delay?: number;
}

const ScrollingPhone = ({ screens, className = "", style, size = "md", speed = 4000, delay = 0 }: PhoneProps) => {
  const w = size === "md" ? "w-[220px] md:w-[240px]" : "w-[170px] md:w-[190px]";
  const stripRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [screenH, setScreenH] = useState(0);
  const [transitioning, setTransitioning] = useState(true);

  // Measure one screen height once images load
  const measureRef = useRef<HTMLImageElement>(null);
  const handleLoad = () => {
    if (measureRef.current) setScreenH(measureRef.current.clientHeight);
  };

  useEffect(() => {
    if (!screenH) return;
    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      if (idx >= screens.length) {
        // Jump back instantly then continue
        setTransitioning(false);
        setOffset(0);
        idx = 0;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setTransitioning(true));
        });
      } else {
        setTransitioning(true);
        setOffset(idx * screenH);
      }
    }, speed);

    const delayTimer = setTimeout(() => {}, delay);
    return () => { clearInterval(timer); clearTimeout(delayTimer); };
  }, [screenH, screens.length, speed, delay]);

  // Delayed start
  const [started, setStarted] = useState(delay === 0);
  useEffect(() => {
    if (delay > 0) {
      const t = setTimeout(() => setStarted(true), delay);
      return () => clearTimeout(t);
    }
  }, [delay]);

  return (
    <div className={`relative ${className}`} style={style}>
      {/* Soft glow */}
      <div className="absolute -inset-8 bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />

      {/* Shadow */}
      <div
        className="absolute -bottom-4 left-[10%] right-[10%] h-12 rounded-[50%] blur-2xl pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, transparent 70%)" }}
      />

      {/* Device body */}
      <div className={`${w} rounded-[2.4rem] p-[2px] relative`}
        style={{
          background: "linear-gradient(160deg, rgba(120,120,130,0.5) 0%, rgba(60,60,65,0.4) 30%, rgba(30,30,35,0.6) 70%, rgba(80,80,90,0.3) 100%)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 6px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      >
        <div className="rounded-[2.2rem] p-[1px]"
          style={{ background: "linear-gradient(180deg, rgba(100,100,110,0.3) 0%, rgba(40,40,45,0.2) 100%)" }}
        >
          {/* Screen with scrolling content */}
          <div className="rounded-[2.1rem] bg-black overflow-hidden relative">
            <div
              ref={stripRef}
              style={{
                transform: started ? `translateY(-${offset}px)` : "translateY(0)",
                transition: transitioning ? `transform ${800}ms cubic-bezier(0.4, 0, 0.2, 1)` : "none",
              }}
            >
              {/* Render screens + duplicate first for seamless loop */}
              {[...screens, screens[0]].map((s, i) => (
                <img
                  key={i}
                  ref={i === 0 ? measureRef : undefined}
                  src={s.src}
                  alt={s.alt}
                  className="w-full h-auto block"
                  loading="lazy"
                  onLoad={i === 0 ? handleLoad : undefined}
                />
              ))}
            </div>

            {/* Glass reflection */}
            <div
              className="absolute inset-0 rounded-[2.1rem] pointer-events-none"
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 35%, transparent 65%, rgba(255,255,255,0.03) 100%)" }}
            />
            <div
              className="absolute top-0 left-[15%] right-[15%] h-[1px] pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)" }}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="absolute -left-[2px] top-[60px] w-[3px] h-[22px] rounded-l-sm" style={{ background: "linear-gradient(180deg, #555, #333)" }} />
        <div className="absolute -left-[2px] top-[92px] w-[3px] h-[34px] rounded-l-sm" style={{ background: "linear-gradient(180deg, #555, #333)" }} />
        <div className="absolute -left-[2px] top-[134px] w-[3px] h-[34px] rounded-l-sm" style={{ background: "linear-gradient(180deg, #555, #333)" }} />
        <div className="absolute -right-[2px] top-[100px] w-[3px] h-[48px] rounded-r-sm" style={{ background: "linear-gradient(180deg, #555, #333)" }} />
      </div>
    </div>
  );
};

/* ─── Main Exported Component ─── */
const IPhoneMockup = () => {
  return (
    <div className="relative w-full py-6">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)" }}
      />

      <div className="relative flex items-center justify-center">
        {/* Left Phone */}
        <div className="hidden md:block relative z-10"
          style={{
            transform: "perspective(1200px) rotateY(25deg) rotateX(2deg) translateX(30px) translateZ(-60px) scale(0.82)",
            transformStyle: "preserve-3d",
          }}
        >
          <ScrollingPhone screens={SCREENS} size="sm" speed={4000} delay={1300} />
        </div>

        {/* Center Phone */}
        <div className="relative z-30 animate-phone-float"
          style={{
            transform: "perspective(1200px) rotateY(-2deg) rotateX(3deg)",
            transformStyle: "preserve-3d",
          }}
        >
          <ScrollingPhone screens={SCREENS} size="md" speed={4000} delay={0} />
        </div>

        {/* Right Phone */}
        <div className="hidden md:block relative z-10"
          style={{
            transform: "perspective(1200px) rotateY(-25deg) rotateX(2deg) translateX(-30px) translateZ(-60px) scale(0.82)",
            transformStyle: "preserve-3d",
          }}
        >
          <ScrollingPhone screens={SCREENS} size="sm" speed={4000} delay={2600} />
        </div>
      </div>
    </div>
  );
};

export default IPhoneMockup;

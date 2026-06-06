import { useEffect, useState } from "react";
import mockupHome from "@/assets/mockup-home.jpg";
import mockupOnDemand from "@/assets/mockup-ondemand.jpg";
import mockupFuel from "@/assets/mockup-fuel.jpg";

const SCREENS = [
  { src: mockupHome, alt: "Home Dashboard", label: "Dashboard" },
  { src: mockupOnDemand, alt: "On Demand Library", label: "On-Demand" },
  { src: mockupFuel, alt: "Fuel Nutrition", label: "Nutrition" },
];

/* ─── Single Phone Shell ─── */
const PhoneDevice = ({ screenImage, alt }: { screenImage: string; alt: string }) => (
  <div className="relative">
    {/* Shadow */}
    <div
      className="absolute -bottom-4 left-[12%] right-[12%] h-10 rounded-[50%] blur-2xl pointer-events-none"
      style={{ background: "radial-gradient(ellipse, rgba(0,0,0,0.5) 0%, transparent 70%)" }}
    />

    <div
      className="w-[200px] md:w-[220px] rounded-[2.2rem] p-[2px] relative"
      style={{
        background: "linear-gradient(160deg, rgba(120,120,130,0.5) 0%, rgba(60,60,65,0.4) 30%, rgba(30,30,35,0.6) 70%, rgba(80,80,90,0.3) 100%)",
        boxShadow: "0 16px 50px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
      }}
    >
      <div
        className="rounded-[2rem] p-[1px]"
        style={{ background: "linear-gradient(180deg, rgba(100,100,110,0.3) 0%, rgba(40,40,45,0.2) 100%)" }}
      >
        <div className="rounded-[1.9rem] bg-black overflow-hidden relative">
          <img src={screenImage} alt={alt} className="w-full h-auto block" loading="lazy" />
          <div
            className="absolute inset-0 rounded-[1.9rem] pointer-events-none"
            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 35%, transparent 65%, rgba(255,255,255,0.03) 100%)" }}
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="absolute -left-[2px] top-[55px] w-[2.5px] h-[20px] rounded-l-sm" style={{ background: "linear-gradient(180deg, #555, #333)" }} />
      <div className="absolute -left-[2px] top-[82px] w-[2.5px] h-[30px] rounded-l-sm" style={{ background: "linear-gradient(180deg, #555, #333)" }} />
      <div className="absolute -left-[2px] top-[118px] w-[2.5px] h-[30px] rounded-l-sm" style={{ background: "linear-gradient(180deg, #555, #333)" }} />
      <div className="absolute -right-[2px] top-[90px] w-[2.5px] h-[42px] rounded-r-sm" style={{ background: "linear-gradient(180deg, #555, #333)" }} />
    </div>
  </div>
);

/* ─── Main: Centered Stack Carousel ─── */
const IPhoneMockup = () => {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % SCREENS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const OFFSET = 170; // px between phones

  return (
    <div className="relative w-full py-4">
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)" }}
      />

      {/* Centered stage */}
      <div className="relative w-full h-[480px] md:h-[510px] flex items-center justify-center overflow-hidden">
        {SCREENS.map((s, i) => {
          const diff = i - activeIdx;
          const isActive = diff === 0;
          const translateX = diff * OFFSET;
          const rotateY = isActive ? -2 : diff < 0 ? 12 : -12;
          const rotateX = isActive ? 2 : 0;
          const scale = isActive ? 1 : 0.88;
          const opacity = isActive ? 1 : 0.5;
          const zIndex = isActive ? 5 : 1;

          return (
            <div
              key={s.alt}
              onClick={() => setActiveIdx(i)}
              className="absolute cursor-pointer transition-all duration-700 ease-out"
              style={{
                transform: `translateX(${translateX}px) perspective(1000px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(${scale})`,
                transformStyle: "preserve-3d",
                opacity,
                zIndex,
              }}
            >
              <PhoneDevice screenImage={s.src} alt={s.alt} />
            </div>
          );
        })}
      </div>

      {/* Dots indicator */}
      <div className="flex items-center justify-center gap-2 mt-4 relative z-20">
        {SCREENS.map((s, i) => (
          <button
            key={s.alt}
            onClick={() => setActiveIdx(i)}
            className={`rounded-full transition-all duration-300 ${
              i === activeIdx ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/30"
            }`}
            aria-label={s.label}
          />
        ))}
      </div>

      {/* Label */}
      <p className="text-center text-white/60 text-xs uppercase tracking-widest mt-2 transition-all duration-500">
        {SCREENS[activeIdx].label}
      </p>
    </div>
  );
};

export default IPhoneMockup;

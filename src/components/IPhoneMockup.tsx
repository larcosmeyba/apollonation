import { Dumbbell, Play, Flame, BarChart3, Home, User, UtensilsCrossed } from "lucide-react";

/* ─── Screen Content ─── */

const DashboardScreen = () => (
  <div className="px-4 pb-2 space-y-3">
    <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
      <span className="text-[9px] uppercase tracking-wider text-white/50">Today's Workout</span>
      <h4 className="text-sm text-white font-semibold mt-1">Full Body Power</h4>
      <div className="flex items-center gap-2 mt-1.5 text-white/50 text-[10px]">
        <span>45 min</span><span>·</span><span>Intermediate</span>
      </div>
      <div className="mt-2.5 bg-white rounded-full h-8 flex items-center justify-center">
        <span className="text-[11px] text-black font-semibold">Start Workout →</span>
      </div>
    </div>
    <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
      <span className="text-[9px] uppercase tracking-wider text-white/50">Continue Program</span>
      <h4 className="text-xs text-white font-medium mt-1">Beginner Strength — Week 2</h4>
      <div className="mt-2 w-full bg-white/10 rounded-full h-1.5">
        <div className="bg-white h-1.5 rounded-full" style={{ width: "35%" }} />
      </div>
      <span className="text-[9px] text-white/50 mt-1 block">35% complete</span>
    </div>
    <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
      <span className="text-[9px] uppercase tracking-wider text-white/50">Weekly Progress</span>
      <div className="flex items-end gap-1.5 mt-2 h-8">
        {[60, 100, 80, 0, 40, 0, 0].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end">
            <div className={`rounded-sm ${h > 0 ? "bg-white/40" : "bg-white/10"}`} style={{ height: `${Math.max(h * 0.32, 3)}px` }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="text-[8px] text-white/40 flex-1 text-center">{d}</span>
        ))}
      </div>
    </div>
  </div>
);

const WorkoutScreen = () => (
  <div className="px-4 pb-2 space-y-2.5">
    <div className="flex gap-2 overflow-hidden">
      {["All", "Strength", "HIIT", "Core"].map((f) => (
        <span key={f} className={`text-[9px] px-3 py-1 rounded-full flex-shrink-0 ${f === "All" ? "bg-white text-black" : "bg-white/10 text-white/60"}`}>{f}</span>
      ))}
    </div>
    {[
      { title: "Upper Body Strength", dur: "35 min", level: "Intermediate" },
      { title: "Core Burner", dur: "20 min", level: "Beginner" },
      { title: "Full Body HIIT", dur: "30 min", level: "Advanced" },
      { title: "Glute & Hamstring", dur: "40 min", level: "Intermediate" },
    ].map((w) => (
      <div key={w.title} className="rounded-xl border border-white/10 bg-white/[0.06] p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
          <Dumbbell className="w-4 h-4 text-white/70" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[11px] text-white font-semibold truncate">{w.title}</h4>
          <span className="text-[9px] text-white/50">{w.dur} · {w.level}</span>
        </div>
        <Play className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />
      </div>
    ))}
  </div>
);

const NutritionScreen = () => (
  <div className="px-4 pb-2 space-y-3">
    <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4 text-center">
      <span className="text-[9px] uppercase tracking-wider text-white/50">Today's Nutrition</span>
      <div className="flex items-center justify-center gap-4 mt-3">
        <div className="relative w-16 h-16">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="#22c55e" strokeWidth="3" strokeDasharray="94.2" strokeDashoffset="33" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] text-white font-bold">1,420</span>
            <span className="text-[7px] text-white/40">cal left</span>
          </div>
        </div>
        <div className="space-y-1.5 text-left">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400" /><span className="text-[9px] text-white/60">Protein 45g</span></div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-[9px] text-white/60">Carbs 120g</span></div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-400" /><span className="text-[9px] text-white/60">Fat 38g</span></div>
        </div>
      </div>
    </div>
    <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
      <span className="text-[9px] uppercase tracking-wider text-white/50 mb-2 block">Meal Plan</span>
      {["Breakfast — Oatmeal & Berries", "Lunch — Grilled Chicken Bowl", "Dinner — Salmon & Rice"].map((m) => (
        <div key={m} className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
          <UtensilsCrossed className="w-3 h-3 text-white/40 flex-shrink-0" />
          <span className="text-[10px] text-white/70">{m}</span>
        </div>
      ))}
    </div>
    <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
      <span className="text-[9px] uppercase tracking-wider text-white/50 mb-2 block">Recipes</span>
      <div className="grid grid-cols-2 gap-2">
        {["Protein Bowl", "Green Smoothie"].map((r) => (
          <div key={r} className="rounded-lg bg-white/[0.04] p-2 text-center">
            <Flame className="w-4 h-4 text-white/30 mx-auto mb-1" />
            <span className="text-[9px] text-white/60">{r}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ─── Bottom Nav ─── */
const TABS = [
  { label: "Home", Icon: Home },
  { label: "Workouts", Icon: Dumbbell },
  { label: "Programs", Icon: BarChart3 },
  { label: "Fuel", Icon: Flame },
  { label: "Profile", Icon: User },
];

const PhoneBottomNav = ({ activeTab }: { activeTab: string }) => (
  <div className="border-t border-white/[0.06] px-2 pb-4 pt-2 mt-1">
    <div className="flex justify-around">
      {TABS.map((tab) => (
        <div key={tab.label} className="flex flex-col items-center gap-0.5">
          <tab.Icon
            className={`w-3.5 h-3.5 ${activeTab === tab.label ? "text-white" : "text-white/25"}`}
            strokeWidth={activeTab === tab.label ? 2.5 : 1.5}
          />
          <span className={`text-[7px] ${activeTab === tab.label ? "text-white font-semibold" : "text-white/25"}`}>
            {tab.label}
          </span>
        </div>
      ))}
    </div>
    <div className="flex justify-center mt-2">
      <div className="w-[100px] h-[4px] bg-white/15 rounded-full" />
    </div>
  </div>
);

/* ─── Notch ─── */
const PhoneNotch = () => (
  <>
    <div className="flex justify-center pt-2 pb-1 relative z-10">
      <div className="w-[90px] h-[28px] bg-black rounded-full flex items-center justify-center gap-2">
        <div className="w-[10px] h-[10px] rounded-full bg-[#1a1d23] ring-1 ring-[#2A2E36]" />
        <div className="w-[6px] h-[6px] rounded-full bg-[#1a1d23]" />
      </div>
    </div>
    <div className="flex items-center justify-between px-6 pb-1">
      <span className="text-[9px] text-white/50 font-medium">9:41</span>
      <div className="flex gap-1 items-center">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4].map((b) => (
            <div key={b} className={`w-[3px] rounded-sm ${b <= 3 ? "bg-white" : "bg-white/30"}`} style={{ height: `${6 + b * 2}px` }} />
          ))}
        </div>
        <div className="w-5 h-2.5 rounded-sm border border-white/40 ml-1 relative">
          <div className="absolute inset-[1px] right-[3px] bg-white/60 rounded-sm" />
          <div className="absolute right-[-2px] top-[3px] w-[2px] h-[4px] bg-white/40 rounded-r-sm" />
        </div>
      </div>
    </div>
  </>
);

/* ─── Single Phone Shell ─── */
interface PhoneProps {
  title: string;
  activeTab: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  size?: "sm" | "md";
}

const PhoneDevice = ({ title, activeTab, children, className = "", style, size = "md" }: PhoneProps) => {
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
          <div className="rounded-[2.5rem] bg-[#0a0a0a] overflow-hidden relative">
            <PhoneNotch />

            {/* Screen title */}
            <div className="px-5 pt-1 pb-2">
              <h4 className="text-[13px] text-white font-bold">{title}</h4>
            </div>

            {/* Content */}
            <div className="min-h-[300px]">
              {children}
            </div>

            <PhoneBottomNav activeTab={activeTab} />

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
        {/* Left Phone — Workouts (hidden on small screens) */}
        <div className="hidden md:block relative z-10"
          style={{
            transform: "perspective(1200px) rotateY(25deg) rotateX(2deg) translateX(40px) translateZ(-80px) scale(0.85)",
            transformStyle: "preserve-3d",
          }}
        >
          <PhoneDevice title="Workouts" activeTab="Workouts" size="sm">
            <WorkoutScreen />
          </PhoneDevice>
        </div>

        {/* Center Phone — Dashboard */}
        <div className="relative z-30 animate-phone-float"
          style={{
            transform: "perspective(1200px) rotateY(-2deg) rotateX(3deg)",
            transformStyle: "preserve-3d",
          }}
        >
          <PhoneDevice title="Dashboard" activeTab="Home">
            <DashboardScreen />
          </PhoneDevice>
        </div>

        {/* Right Phone — Nutrition (hidden on small screens) */}
        <div className="hidden md:block relative z-10"
          style={{
            transform: "perspective(1200px) rotateY(-25deg) rotateX(2deg) translateX(-40px) translateZ(-80px) scale(0.85)",
            transformStyle: "preserve-3d",
          }}
        >
          <PhoneDevice title="Fuel" activeTab="Fuel" size="sm">
            <NutritionScreen />
          </PhoneDevice>
        </div>
      </div>
    </div>
  );
};

export default IPhoneMockup;

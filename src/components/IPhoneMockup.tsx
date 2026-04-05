import { useEffect, useRef, useState } from "react";
import { Dumbbell, Play, Flame, BarChart3, Home, User } from "lucide-react";

const SCREENS = [
  {
    label: "Dashboard",
    activeTab: "Home",
    content: (
      <div className="px-4 pb-2 space-y-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Today's Workout</span>
          <h4 className="text-sm text-foreground font-semibold mt-1">Full Body Power</h4>
          <div className="flex items-center gap-2 mt-1.5 text-muted-foreground text-[10px]">
            <span>45 min</span><span>·</span><span>Intermediate</span>
          </div>
          <div className="mt-2.5 bg-accent rounded-full h-8 flex items-center justify-center">
            <span className="text-[11px] text-accent-foreground font-semibold">Start Workout →</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Continue Program</span>
          <h4 className="text-xs text-foreground font-medium mt-1">Beginner Strength — Week 2</h4>
          <div className="mt-2 w-full bg-muted rounded-full h-1.5">
            <div className="bg-accent h-1.5 rounded-full" style={{ width: "35%" }} />
          </div>
          <span className="text-[9px] text-muted-foreground mt-1 block">35% complete</span>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Weekly Progress</span>
          <div className="flex items-end gap-1.5 mt-2 h-8">
            {[60, 100, 80, 0, 40, 0, 0].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end">
                <div className={`rounded-sm ${h > 0 ? "bg-accent/60" : "bg-muted"}`} style={{ height: `${Math.max(h * 0.32, 3)}px` }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i} className="text-[8px] text-muted-foreground flex-1 text-center">{d}</span>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    label: "Workout Library",
    activeTab: "Workouts",
    content: (
      <div className="px-4 pb-2 space-y-2.5">
        <div className="flex gap-2 overflow-hidden">
          {["All", "Strength", "HIIT", "Core"].map((f) => (
            <span key={f} className={`text-[9px] px-3 py-1 rounded-full flex-shrink-0 ${f === "All" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{f}</span>
          ))}
        </div>
        {[
          { title: "Upper Body Strength", dur: "35 min", level: "Intermediate" },
          { title: "Core Burner", dur: "20 min", level: "Beginner" },
          { title: "Full Body HIIT", dur: "30 min", level: "Advanced" },
          { title: "Glute & Hamstring", dur: "40 min", level: "Intermediate" },
        ].map((w) => (
          <div key={w.title} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-4 h-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[11px] text-foreground font-semibold truncate">{w.title}</h4>
              <span className="text-[9px] text-muted-foreground">{w.dur} · {w.level}</span>
            </div>
            <Play className="w-3.5 h-3.5 text-accent flex-shrink-0" />
          </div>
        ))}
      </div>
    ),
  },
  {
    label: "Program View",
    activeTab: "Programs",
    content: (
      <div className="px-4 pb-2 space-y-3">
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
          <span className="text-[9px] uppercase tracking-wider text-accent font-semibold">Active Program</span>
          <h4 className="text-sm text-foreground font-semibold mt-1">Apollo Sculpt</h4>
          <span className="text-[9px] text-muted-foreground">6 weeks · 4x/week</span>
          <div className="mt-2 w-full bg-muted rounded-full h-1.5">
            <div className="bg-accent h-1.5 rounded-full" style={{ width: "58%" }} />
          </div>
          <span className="text-[9px] text-muted-foreground mt-1 block">Week 4 of 6</span>
        </div>
        <div className="space-y-2">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">This Week</span>
          {["Day 1 — Push", "Day 2 — Pull", "Day 3 — Legs", "Day 4 — Full Body"].map((d, i) => (
            <div key={d} className="rounded-lg border border-border bg-card p-2.5 flex items-center justify-between">
              <span className="text-[10px] text-foreground">{d}</span>
              {i < 2 ? (
                <span className="text-[8px] text-accent">✓ Done</span>
              ) : (
                <span className="text-[8px] text-muted-foreground">Upcoming</span>
              )}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    label: "Workout Player",
    activeTab: "Workouts",
    content: (
      <div className="px-4 pb-2 space-y-3">
        <div className="rounded-xl bg-accent/10 border border-accent/20 p-4 text-center">
          <Flame className="w-8 h-8 text-accent mx-auto mb-2" />
          <h4 className="text-sm text-foreground font-bold">Full Body Power</h4>
          <span className="text-[10px] text-muted-foreground">Exercise 3 of 8</span>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <h4 className="text-base text-foreground font-bold">Barbell Squat</h4>
          <div className="flex items-center justify-center gap-4 mt-2 text-muted-foreground text-[11px]">
            <span>4 sets</span><span>·</span><span>8–10 reps</span>
          </div>
          <div className="mt-3 flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground">Rest</span>
            </div>
            <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center">
              <Play className="w-6 h-6 text-accent-foreground ml-0.5" fill="currentColor" />
            </div>
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground">Skip</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 justify-center">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`rounded-lg border p-2 text-center w-12 ${s <= 2 ? "border-accent/30 bg-accent/10" : "border-border bg-card"}`}>
              <span className="text-[8px] text-muted-foreground block">Set {s}</span>
              <span className={`text-[10px] font-semibold ${s <= 2 ? "text-accent" : "text-foreground"}`}>{s <= 2 ? "✓" : "—"}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

const TABS = [
  { label: "Home", Icon: Home },
  { label: "Workouts", Icon: Dumbbell },
  { label: "Programs", Icon: BarChart3 },
  { label: "Nutrition", Icon: Flame },
  { label: "Profile", Icon: User },
];

const IPhoneMockup = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Scroll-triggered screen change
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const rect = section.getBoundingClientRect();
            const vh = window.innerHeight;
            const progress = Math.max(0, Math.min(1, (vh - rect.top) / (rect.height + vh)));
            const idx = Math.min(SCREENS.length - 1, Math.floor(progress * SCREENS.length));
            if (idx !== activeIdx) {
              setIsTransitioning(true);
              setTimeout(() => {
                setActiveIdx(idx);
                setIsTransitioning(false);
              }, 150);
            }
          }
        });
      },
      { threshold: Array.from({ length: 20 }, (_, i) => i / 19) }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [activeIdx]);

  // Also listen to scroll for finer control
  useEffect(() => {
    const handleScroll = () => {
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.max(0, Math.min(1, (vh - rect.top) / (rect.height + vh)));
      const idx = Math.min(SCREENS.length - 1, Math.floor(progress * SCREENS.length));
      if (idx !== activeIdx) {
        setIsTransitioning(true);
        setTimeout(() => {
          setActiveIdx(idx);
          setIsTransitioning(false);
        }, 150);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeIdx]);

  const screen = SCREENS[activeIdx];

  return (
    <div ref={sectionRef} className="flex justify-center">
      {/* Glow behind phone */}
      <div className="relative">
        <div className="absolute -inset-8 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute -inset-16 bg-accent/3 rounded-full blur-[60px]" />

        {/* Phone with 3D perspective + float animation */}
        <div
          className="relative animate-phone-float"
          style={{
            transform: "perspective(1200px) rotateY(-8deg) rotateX(4deg)",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Long shadow behind */}
          <div
            className="absolute -bottom-6 left-4 right-4 h-16 rounded-[2rem] bg-black/40 blur-2xl"
            style={{ transform: "translateZ(-40px)" }}
          />
          {/* Soft shadow directly under */}
          <div className="absolute -bottom-3 left-2 right-2 h-8 rounded-[2rem] bg-black/30 blur-xl" />

          {/* iPhone 15 Frame */}
          <div className="w-[280px] md:w-[300px] rounded-[2.5rem] bg-gradient-to-b from-[#2A2E36] to-[#1a1d23] p-[3px] shadow-2xl relative">
            {/* Inner bezel */}
            <div className="rounded-[2.3rem] bg-background overflow-hidden relative">
              {/* Dynamic Island */}
              <div className="flex justify-center pt-2 pb-1 relative z-10">
                <div className="w-[90px] h-[28px] bg-black rounded-full flex items-center justify-center gap-2">
                  <div className="w-[10px] h-[10px] rounded-full bg-[#1a1d23] ring-1 ring-[#2A2E36]" />
                  <div className="w-[6px] h-[6px] rounded-full bg-[#1a1d23]" />
                </div>
              </div>

              {/* Status bar */}
              <div className="flex items-center justify-between px-6 pb-1">
                <span className="text-[9px] text-muted-foreground font-medium">9:41</span>
                <div className="flex gap-1 items-center">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4].map((b) => (
                      <div key={b} className={`w-[3px] rounded-sm ${b <= 3 ? "bg-foreground" : "bg-muted"}`} style={{ height: `${6 + b * 2}px` }} />
                    ))}
                  </div>
                  <div className="w-5 h-2.5 rounded-sm border border-foreground/40 ml-1 relative">
                    <div className="absolute inset-[1px] right-[3px] bg-foreground/60 rounded-sm" />
                    <div className="absolute right-[-2px] top-[3px] w-[2px] h-[4px] bg-foreground/40 rounded-r-sm" />
                  </div>
                </div>
              </div>

              {/* Screen label */}
              <div className="px-5 pt-1 pb-2">
                <h4 className="text-[13px] text-foreground font-bold">{screen.label}</h4>
              </div>

              {/* Screen content with transition */}
              <div className={`transition-all duration-300 ease-out min-h-[320px] ${isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}>
                {screen.content}
              </div>

              {/* Bottom nav */}
              <div className="border-t border-border/50 px-2 pb-4 pt-2 mt-1">
                <div className="flex justify-around">
                  {TABS.map((tab) => (
                    <div key={tab.label} className="flex flex-col items-center gap-0.5">
                      <tab.Icon className={`w-3.5 h-3.5 ${screen.activeTab === tab.label ? "text-accent" : "text-muted-foreground/50"}`} strokeWidth={screen.activeTab === tab.label ? 2.5 : 1.5} />
                      <span className={`text-[7px] ${screen.activeTab === tab.label ? "text-accent font-semibold" : "text-muted-foreground/50"}`}>
                        {tab.label}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Home indicator */}
                <div className="flex justify-center mt-2">
                  <div className="w-[100px] h-[4px] bg-foreground/20 rounded-full" />
                </div>
              </div>

              {/* Glass reflection overlay */}
              <div
                className="absolute inset-0 rounded-[2.3rem] pointer-events-none"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.02) 100%)",
                }}
              />
            </div>

            {/* Side buttons */}
            <div className="absolute -left-[2px] top-[80px] w-[3px] h-[28px] bg-[#2A2E36] rounded-l-sm" />
            <div className="absolute -left-[2px] top-[120px] w-[3px] h-[44px] bg-[#2A2E36] rounded-l-sm" />
            <div className="absolute -left-[2px] top-[172px] w-[3px] h-[44px] bg-[#2A2E36] rounded-l-sm" />
            <div className="absolute -right-[2px] top-[130px] w-[3px] h-[60px] bg-[#2A2E36] rounded-r-sm" />
          </div>
        </div>

        {/* Screen indicator dots */}
        <div className="flex justify-center gap-2 mt-8">
          {SCREENS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => {
                setIsTransitioning(true);
                setTimeout(() => {
                  setActiveIdx(i);
                  setIsTransitioning(false);
                }, 150);
              }}
              className={`transition-all duration-300 rounded-full ${i === activeIdx ? "w-6 h-2 bg-accent" : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
              aria-label={`View ${s.label}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default IPhoneMockup;

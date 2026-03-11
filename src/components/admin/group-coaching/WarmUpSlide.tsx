import apolloLogo from "@/assets/apollo-logo.png";

const WarmUpSlide = () => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-background overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(/images/marble-bg.jpeg)` }}
      />
      <div className="absolute inset-0 bg-background/70" />

      <img src={apolloLogo} alt="Apollo Nation" className="absolute top-6 right-6 w-10 h-10 opacity-80 object-contain z-20 invert" />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center px-8">
        <div className="w-20 h-20 rounded-full border-2 border-foreground/20 flex items-center justify-center">
          <span className="font-heading text-2xl text-foreground">5:00</span>
        </div>

        <div className="space-y-3">
          <p className="text-xs tracking-[0.3em] text-muted-foreground uppercase">Coach Led</p>
          <h1 className="font-heading text-4xl md:text-5xl tracking-[0.15em] text-foreground">
            DYNAMIC WARM-UP
          </h1>
          <div className="w-16 h-px bg-foreground/30 mx-auto" />
        </div>

        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
          Follow along with Coach Marcos. Get your body moving, activate your muscles, and prepare for today's workout.
        </p>
      </div>
    </div>
  );
};

export default WarmUpSlide;

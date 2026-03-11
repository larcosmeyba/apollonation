import apolloLogo from "@/assets/apollo-logo.png";

interface CoolDownSlideProps {
  appUrl?: string;
}

const CoolDownSlide = ({ appUrl = "https://apollonation.lovable.app" }: CoolDownSlideProps) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(appUrl)}&bgcolor=0B0B0B&color=F2F2F2&format=png`;

  return (
    <div className="relative w-full h-full flex bg-background overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(/images/marble-bg.jpeg)` }}
      />
      <div className="absolute inset-0 bg-background/70" />

      {/* Logo */}
      <img src={apolloLogo} alt="Apollo Nation" className="absolute top-6 right-6 w-10 h-10 opacity-80 object-contain z-20 invert" />

      {/* Content — split layout */}
      <div className="relative z-10 flex w-full h-full items-center">
        {/* Left side — cool down */}
        <div className="flex-1 flex flex-col justify-center px-12 md:px-16 gap-6">
          <div className="space-y-3">
            <p className="text-xs tracking-[0.3em] text-muted-foreground uppercase">Wrap Up</p>
            <h2 className="font-heading text-3xl md:text-4xl tracking-[0.15em] text-foreground uppercase leading-tight">
              COOL DOWN
            </h2>
            <div className="w-12 h-px bg-foreground/30" />
          </div>

          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            Great work today! Take a few minutes to stretch, breathe, and bring your heart rate down. You showed up and gave it everything — that's what champions do.
          </p>

          <div className="flex flex-wrap gap-2 mt-2">
            {["Deep Breathing", "Full Body Stretch", "Foam Roll"].map((item) => (
              <span
                key={item}
                className="px-3 py-1.5 text-xs rounded-full border border-border bg-card/60 text-muted-foreground"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Right side — QR code + app promo */}
        <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 gap-6">
          <div className="bg-card/80 border border-border rounded-2xl p-8 flex flex-col items-center gap-5 backdrop-blur-sm">
            <img src={apolloLogo} alt="Apollo Nation" className="w-16 h-16 object-contain invert" />

            <div className="text-center space-y-1">
              <h3 className="font-heading text-lg tracking-[0.15em] text-foreground">APOLLO NATION</h3>
              <p className="text-xs text-muted-foreground">Training, nutrition & coaching — all in one place</p>
            </div>

            <div className="bg-white rounded-xl p-3">
              <img
                src={qrUrl}
                alt="Scan to download Apollo Nation"
                className="w-36 h-36"
              />
            </div>

            <p className="text-xs text-muted-foreground text-center max-w-[200px]">
              Scan to access your personalized training plans, nutrition, and more
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoolDownSlide;

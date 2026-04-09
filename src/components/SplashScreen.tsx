import { useEffect, useState } from "react";

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 1500);
    const finish = setTimeout(onFinish, 2000);
    return () => { clearTimeout(timer); clearTimeout(finish); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center transition-opacity duration-500 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <h1
        className="text-4xl font-bold text-white tracking-[0.15em] uppercase"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        Apollo Nation
      </h1>
      <p className="text-xs text-white/40 mt-3 tracking-[0.3em] uppercase">Est. 2024</p>
    </div>
  );
};

export default SplashScreen;

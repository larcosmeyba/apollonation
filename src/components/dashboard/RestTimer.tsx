import { useState, useEffect, useRef } from "react";
import { Timer, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RestTimerProps {
  seconds: number;
  autoStart?: boolean;
  onComplete?: () => void;
}

const RestTimer = ({ seconds, autoStart = false, onComplete }: RestTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [running, setRunning] = useState(autoStart);
  const [visible, setVisible] = useState(autoStart);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setRunning(false);
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, timeLeft, onComplete]);

  // Auto-start when seconds change (new set logged)
  useEffect(() => {
    if (autoStart) {
      setTimeLeft(seconds);
      setRunning(true);
      setVisible(true);
    }
  }, [autoStart, seconds]);

  const reset = () => {
    setTimeLeft(seconds);
    setRunning(false);
  };

  const toggle = () => {
    if (timeLeft === 0) {
      setTimeLeft(seconds);
      setRunning(true);
    } else {
      setRunning(!running);
    }
    setVisible(true);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = ((seconds - timeLeft) / seconds) * 100;

  if (!visible) {
    return (
      <button
        onClick={() => { setVisible(true); toggle(); }}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <Timer className="w-3 h-3" /> Rest Timer
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/50">
      <div className="relative w-8 h-8">
        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="16" fill="none" className="stroke-muted" strokeWidth="2" />
          <circle
            cx="18" cy="18" r="16" fill="none"
            className={timeLeft === 0 ? "stroke-green-500" : "stroke-primary"}
            strokeWidth="2"
            strokeDasharray={`${progress} 100`}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span className={`font-mono text-sm font-bold ${timeLeft === 0 ? "text-green-500" : "text-foreground"}`}>
        {timeLeft === 0 ? "GO!" : formatTime(timeLeft)}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggle}>
          {running ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={reset}>
          <RotateCcw className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

export default RestTimer;

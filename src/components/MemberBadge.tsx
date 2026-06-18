import { Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MemberBadgeProps {
  /** Pass `true` if the user has an active subscription/trial */
  active: boolean | null | undefined;
  /** Pass `true` to label as a trial member instead of "Active Member" */
  trial?: boolean | null;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Small star badge shown next to a user's name when they are an active
 * Apollo Reborn member (paid or free trial). Hover/tap reveals a tooltip.
 */
const MemberBadge = ({ active, trial, className, size = "sm" }: MemberBadgeProps) => {
  if (!active) return null;
  const px = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const label = trial ? "Free Trial Member" : "Active Member";
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center justify-center text-amber-400 cursor-default",
              className
            )}
            aria-label={label}
          >
            <Star className={cn(px, "fill-amber-400")} strokeWidth={1.5} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default MemberBadge;

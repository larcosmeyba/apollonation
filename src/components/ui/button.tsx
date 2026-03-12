import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs font-medium tracking-[0.15em] uppercase ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[rgba(106,163,255,0.14)] text-foreground border border-[rgba(106,163,255,0.45)] hover:bg-[rgba(106,163,255,0.22)] hover:shadow-[0_0_30px_-4px_rgba(106,163,255,0.3)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-[rgba(255,255,255,0.12)] text-foreground bg-transparent hover:bg-[rgba(106,163,255,0.08)] hover:border-[rgba(106,163,255,0.4)]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-foreground underline-offset-4 hover:underline tracking-normal",
        apollo: "bg-[rgba(106,163,255,0.14)] text-foreground border border-[rgba(106,163,255,0.45)] font-semibold hover:bg-[rgba(106,163,255,0.22)] hover:shadow-[0_0_30px_-4px_rgba(106,163,255,0.3)]",
        "apollo-outline": "border border-[rgba(255,255,255,0.12)] text-foreground bg-transparent hover:bg-[rgba(106,163,255,0.08)] hover:border-[rgba(106,163,255,0.4)]",
      },
      size: {
        default: "h-11 px-8 py-3",
        sm: "h-9 px-6 py-2",
        lg: "h-12 px-10 py-3",
        xl: "h-14 px-12 py-4",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
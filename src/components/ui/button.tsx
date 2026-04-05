import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_hsla(40,55%,51%,0.3)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border text-foreground bg-transparent hover:bg-card",
        secondary: "bg-card text-foreground border border-border hover:bg-card/80",
        ghost: "hover:bg-muted hover:text-foreground text-muted-foreground",
        link: "text-foreground underline-offset-4 hover:underline tracking-normal",
        apollo: "bg-accent text-accent-foreground font-semibold hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_hsla(40,55%,51%,0.3)] rounded-xl",
        "apollo-outline": "border border-border text-foreground bg-transparent hover:bg-card hover:border-accent/30 rounded-xl",
      },
      size: {
        default: "h-11 px-8 py-3 text-sm",
        sm: "h-9 px-6 py-2 text-xs",
        lg: "h-12 px-10 py-3 text-sm",
        xl: "h-14 px-12 py-4 text-base",
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

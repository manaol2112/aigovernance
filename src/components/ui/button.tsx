import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-page-bg)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--theme-action,var(--theme-brand))] text-[var(--theme-action-on,var(--theme-brand-on,#fff))] hover:bg-[var(--theme-action-hover,var(--theme-brand-hover))]",
        secondary: "bg-[var(--theme-brand-muted)] text-[var(--theme-text)] hover:opacity-90",
        outline:
          "border border-[var(--theme-border-strong)] bg-[var(--theme-card-bg)] text-[var(--theme-text)] hover:bg-[var(--theme-brand-muted)]",
        ghost: "text-[var(--theme-text)] hover:bg-[var(--theme-brand-muted)]",
      },
      size: {
        default: "h-10 min-h-10 px-4 py-2",
        sm: "h-9 min-h-9 rounded-md px-3 text-xs", // ≥24px target (WCAG 2.2 AA 2.5.8)
        lg: "h-11 min-h-11 rounded-lg px-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

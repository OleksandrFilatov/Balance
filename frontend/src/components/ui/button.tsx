import type { ComponentProps } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const variants = cva("button", {
  variants: {
    variant: {
      default: "button-primary",
      secondary: "button-secondary",
      ghost: "button-ghost",
      destructive: "button-danger",
    },
    size: { default: "", icon: "button-icon", small: "button-small" },
  },
  defaultVariants: { variant: "default", size: "default" },
});
export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ComponentProps<"button"> & {
  variant?: "default" | "secondary" | "ghost" | "destructive";
  size?: "default" | "icon" | "small";
}) {
  return (
    <button
      type={type}
      className={cn(variants({ variant, size }), className)}
      {...props}
    />
  );
}

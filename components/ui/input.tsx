import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefix?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, prefix, ...props }, ref) => {
    if (prefix) {
      return (
        <div className="relative flex items-center">
          <span className="absolute left-3 font-mono text-sm text-amber-400 select-none pointer-events-none">
            {prefix}
          </span>
          <input
            type={type}
            className={cn(
              "flex h-11 w-full border border-surface-border bg-surface-secondary pl-7 pr-3 py-2 font-mono text-sm text-[#e8e4d9] placeholder:text-[#555] focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/30 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full border border-surface-border bg-surface-secondary px-3 py-2 font-mono text-sm text-[#e8e4d9] placeholder:text-[#555] focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/30 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };

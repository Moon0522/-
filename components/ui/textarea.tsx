import * as React from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full border border-[#222] bg-[#111] px-3 py-2 font-mono text-xs text-white placeholder:text-[#444] focus:border-[#00D26A]/50 focus:outline-none focus:ring-1 focus:ring-[#00D26A]/20 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export { Textarea };

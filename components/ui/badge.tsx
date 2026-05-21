import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'green' | 'red' | 'amber' | 'blue' | 'ghost';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-mono text-[10px] tracking-wider uppercase px-1.5 py-0.5 border',
        {
          'bg-[#1a1a1a] text-[#888] border-[#333]': variant === 'default',
          'bg-[#00D26A]/10 text-[#00D26A] border-[#00D26A]/30': variant === 'green',
          'bg-[#FF4444]/10 text-[#FF4444] border-[#FF4444]/30': variant === 'red',
          'bg-[#F5A623]/10 text-[#F5A623] border-[#F5A623]/30': variant === 'amber',
          'bg-blue-500/10 text-blue-400 border-blue-500/30': variant === 'blue',
          'bg-transparent text-[#555] border-[#222]': variant === 'ghost',
        },
        className
      )}
      {...props}
    />
  );
}

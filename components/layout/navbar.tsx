'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, Users, TrendingUp, LineChart, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Dashboard', icon: Activity },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/deals', label: 'Deals', icon: TrendingUp },
  { href: '/prices', label: 'Prices', icon: LineChart },
];

export function Navbar() {
  const path = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-12 bg-[#0A0A0A] border-b border-[#222] flex items-center px-4 gap-0">
      <div className="flex items-center gap-2 pr-6 border-r border-[#222]">
        <BarChart2 className="w-4 h-4 text-[#00D26A]" />
        <span className="font-mono text-xs font-bold tracking-widest text-white uppercase">TradeDesk</span>
      </div>

      <nav className="flex items-center ml-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-4 h-12 font-mono text-[11px] tracking-wider uppercase transition-colors border-b-2',
                active
                  ? 'text-[#00D26A] border-[#00D26A]'
                  : 'text-[#555] border-transparent hover:text-[#888]'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00D26A] animate-pulse" />
          <span className="font-mono text-[10px] text-[#444] tracking-wider uppercase">Local Storage</span>
        </div>
        <span className="font-mono text-[10px] text-[#333] tracking-wider">
          {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>
    </header>
  );
}

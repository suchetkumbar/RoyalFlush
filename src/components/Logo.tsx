import { useId } from "react";
import { cn } from "@/lib/utils";

/** RoyalFlush mark: a crowned card fanned over a second card. Same artwork as public/favicon.svg. */
export const Logo = ({ className, title = "RoyalFlush" }: { className?: string; title?: string }) => {
  const gradient = useId();
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={cn("h-9 w-9 shrink-0", className)}>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F0812F" />
          <stop offset="1" stopColor="#B0401A" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#${gradient})`} />
      <rect x="19" y="13" width="26" height="36" rx="4" fill="#fff" fillOpacity=".38" transform="rotate(-14 32 52)" />
      <g transform="rotate(9 32 52)">
        <rect x="19" y="13" width="26" height="36" rx="4" fill="#fff" />
        <path d="M24 35V24.5l4.6 4.3L32 21.5l3.4 7.3 4.6-4.3V35z" fill="#B0401A" />
        <rect x="24" y="37" width="16" height="3" rx="1.2" fill="#B0401A" />
      </g>
    </svg>
  );
};

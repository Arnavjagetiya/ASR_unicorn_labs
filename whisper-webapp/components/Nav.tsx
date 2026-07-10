"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/pipeline", label: "How Whisper Hears" },
  { href: "/results", label: "Results" },
  { href: "/wer-calculator", label: "WER Calculator" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[#0a0b0f]/70 border-b border-white/[0.06]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm font-extrabold tracking-tight text-white shrink-0">
          Whisper<span className="hidden sm:inline"> &amp; Accent Bias</span>
        </span>
        <div className="flex gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0",
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

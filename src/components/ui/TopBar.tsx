"use client";

import { useRouter } from "next/navigation";
import { MonaLogo } from "./MonaLogo";

interface TopBarProps {
  onBack?: () => void;
  label?: string;
}

export function TopBar({ onBack, label = "Kembali" }: TopBarProps) {
  const router = useRouter();

  return (
    <div className="relative z-10 mt-4 flex items-center justify-center px-5">
      <button
        type="button"
        aria-label={label}
        onClick={() => (onBack ? onBack() : router.back())}
        className="back-circle absolute left-5"
      >
        <svg
          className="h-6 w-6 text-[#000000]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <MonaLogo />
    </div>
  );
}

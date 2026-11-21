"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/ui/TopBar";
import { useStoredPhoto } from "@/lib/useStoredPhoto";
import { DEFAULT_USER_PHOTO, readInvalidSimulation } from "@/lib/photo";

const CIRCUMFERENCE = 867;

export default function ScanPage() {
  const router = useRouter();
  const photo = useStoredPhoto(DEFAULT_USER_PHOTO);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    let current = 15;
    const timer = setInterval(() => {
      current += 15;
      if (current >= 100) {
        setProgress(100);
        clearInterval(timer);
        setTimeout(() => {
          router.push(readInvalidSimulation() ? "/error" : "/results");
        }, 260);
      } else {
        setProgress(current);
      }
    }, 260);

    return () => clearInterval(timer);
  }, [router]);

  const ringOffset = Math.round(CIRCUMFERENCE - (CIRCUMFERENCE * progress) / 100);

  return (
    <section className="screen-fade relative flex min-h-[100svh] w-full flex-col overflow-hidden pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <img
        src="/assets/botanical-leaves.png"
        alt=""
        className="pointer-events-none absolute right-0 top-0 z-0 h-auto w-[112px] max-w-[30vw]"
      />
      <img
        src="/assets/ribbon-analyzing.png"
        alt=""
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-auto w-full"
      />

      <TopBar onBack={() => router.push("/preview")} label="Batalkan Analisis" />

      {/* Circular Ring + User Portrait */}
      <div className="relative z-10 mt-16 flex justify-center">
        <div className="relative flex aspect-square w-[min(290px,72vw)] items-center justify-center">
          {/* Animated SVG Progress Ring */}
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 290 290">
            <circle cx="145" cy="145" r="138" fill="none" stroke="#E9C7C3" strokeWidth="8" />
            <circle
              cx="145"
              cy="145"
              r="138"
              fill="none"
              stroke="#6B4035"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={ringOffset}
              style={{ transition: "stroke-dashoffset 0.2s ease" }}
            />
          </svg>
          <div className="h-[90.3%] w-[90.3%] overflow-hidden rounded-full bg-[#DFDBD8] shadow-inner">
            <img src={photo} alt="Menganalisis Wajah" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>

      {/* Text & Progress Bar */}
      <div className="relative z-10 mt-10 px-8 text-center">
        <h2 className="font-heading text-[24px] font-bold text-[#000000]">Menganalisis Wajah...</h2>
        <p className="mt-2 font-body text-[13.5px] leading-[1.55] text-[#000000]">
          Sistem sedang mendeteksi wajah, menganalisis bentuk wajah, dan mencari gaya rambut yang sesuai.
        </p>

        {/* Linear Progress Bar + Percentage */}
        <div className="mt-4 flex items-center gap-3">
          <div className="h-[16px] flex-1 overflow-hidden rounded-full bg-[#E9C7C3]">
            <div
              className="h-full rounded-full bg-[#6B4035] transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-14 text-right font-body text-[22px] font-bold text-[#000000]">
            {progress}%
          </span>
        </div>
      </div>
    </section>
  );
}

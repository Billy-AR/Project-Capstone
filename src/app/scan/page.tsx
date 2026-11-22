"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/ui/TopBar";
import { useStoredPhoto } from "@/lib/useStoredPhoto";
import {
  DEFAULT_USER_PHOTO,
  readInvalidSimulation,
  storeError,
  storePrediction,
} from "@/lib/photo";

const CIRCUMFERENCE = 867;

export default function ScanPage() {
  const router = useRouter();
  const photo = useStoredPhoto(DEFAULT_USER_PHOTO);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    async function runScan() {
      // 1. Jika pengguna memilih simulasi invalid secara manual
      if (readInvalidSimulation()) {
        for (let p = 15; p <= 100; p += 15) {
          if (!isMounted) return;
          setProgress(Math.min(p, 100));
          await wait(200);
        }
        if (isMounted) {
          storeError("Wajah tidak terdeteksi (Simulasi)");
          router.push("/error");
        }
        return;
      }

      // 2. Animasikan progress bar secara bertahap sambil menunggu API
      let currentProgress = 15;
      const interval = setInterval(() => {
        if (!isMounted) return;
        currentProgress = Math.min(currentProgress + 8, 85);
        setProgress(currentProgress);
      }, 180);

      try {
        // Ambil data foto (bisa berupa dataUrl atau path aset publik)
        const photoRes = await fetch(photo);
        const blob = await photoRes.blob();

        const formData = new FormData();
        formData.append("file", blob, "user-photo.jpg");

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const startTime = Date.now();

        const response = await fetch(`${apiUrl}/predict`, {
          method: "POST",
          body: formData,
          signal: abortController.signal,
        });

        // Berikan waktu minimal ~800ms agar animasi scanning tampak natural
        const elapsed = Date.now() - startTime;
        if (elapsed < 800) {
          await wait(800 - elapsed);
        }

        clearInterval(interval);

        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          const errMsg = errData?.detail || "Wajah tidak dapat diproses";
          storeError(errMsg);

          if (!isMounted) return;
          setProgress(100);
          await wait(260);
          router.push("/error");
          return;
        }

        const result = await response.json();
        storePrediction(result);

        if (!isMounted) return;
        setProgress(100);
        await wait(300);
        router.push("/results");
      } catch (err: unknown) {
        clearInterval(interval);
        if (!isMounted) return;

        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        console.error("Scan error:", err);
        storeError("Tidak dapat terhubung ke server AI");
        setProgress(100);
        await wait(260);
        router.push("/error");
      }
    }

    runScan();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [photo, router]);

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

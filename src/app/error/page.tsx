"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/ui/TopBar";
import { CameraModal } from "@/components/ui/CameraModal";
import { storeInvalidSimulation, storePhoto } from "@/lib/photo";

export default function ErrorPage() {
  const router = useRouter();
  const [cameraOpen, setCameraOpen] = useState(false);

  return (
    <section className="screen-fade relative min-h-dvh w-full pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <img
        src="/assets/botanical-leaves.png"
        alt=""
        className="pointer-events-none absolute right-0 top-0 z-0 h-auto w-[112px] max-w-[30vw]"
      />

      <TopBar onBack={() => router.push("/upload")} label="Kembali" />

      {/* Large Pink Circle + Face Scan Icon + Red Exclamation Badge */}
      <div className="relative z-10 mt-12 flex justify-center">
        <div className="relative flex aspect-square w-[min(288px,78vw)] items-center justify-center rounded-full bg-[#F5DFDC]">
          <svg
            className="h-[60%] w-[60%] text-[#6B4035]"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Corner Brackets */}
            <path d="M18 32V23C18 19.5 20.5 17 24 17H33" />
            <path d="M67 17H76C79.5 17 82 19.5 82 23V32" />
            <path d="M18 68V77C18 80.5 20.5 83 24 83H33" />
            {/* Face Outline */}
            <path d="M30 45C30 30 39 20 50 20C61 20 70 30 70 45C70 46 73 48 73 52C73 56 70 57 69 59C66 72 58 80 50 80C42 80 34 72 31 59C30 57 27 56 27 52C27 48 30 46 30 45Z" />
            {/* Eyes & Mouth */}
            <ellipse cx="42" cy="48" rx="2.5" ry="3.5" fill="currentColor" stroke="none" />
            <ellipse cx="58" cy="48" rx="2.5" ry="3.5" fill="currentColor" stroke="none" />
            <path d="M44 62H56" strokeWidth="4.5" />
          </svg>

          {/* Red Exclamation Circle Badge */}
          <div className="absolute bottom-1 right-1 flex h-[39.5%] w-[39.5%] flex-col items-center justify-center rounded-full bg-[#E04C5B] shadow-md">
            <div
              className="h-[42%] w-[14%] rounded-full bg-white"
              style={{ clipPath: "polygon(15% 0%, 85% 0%, 68% 100%, 32% 100%)" }}
            />
            <div className="mt-[7%] h-[14%] w-[14%] rounded-full bg-white" />
          </div>
        </div>
      </div>

      {/* Error Message Copy */}
      <div className="relative z-10 mt-9 px-8 text-center">
        <h2 className="font-heading text-[24px] font-bold text-[#000000]">Wajah tidak terdeteksi</h2>
        <p className="mt-2 font-body text-[13.5px] leading-[1.5] text-[#000000]">
          Pastikan wajah terlihat jelas, menghadap kamera, pencahayaan cukup, dan tidak tertutup oleh objek lain.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="relative z-10 mt-8 space-y-6 px-4">
        <button
          type="button"
          onClick={() => setCameraOpen(true)}
          className="btn-primary flex h-[62px] w-full items-center justify-center gap-4 rounded-full px-6"
        >
          <svg className="h-9 w-10 text-[#F6E6E3]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 3L7.17 5H4C2.9 5 2 5.9 2 7V19C2 20.1 2.9 21 4 21H20C21.1 21 22 20.1 22 19V7C22 5.9 21.1 5 20 5H16.83L15 3H9ZM12 18C9.24 18 7 15.76 7 13C7 10.24 9.24 8 12 8C14.76 8 17 10.24 17 13C17 15.76 14.76 18 12 18ZM12 10C10.34 10 9 11.34 9 13C9 14.66 10.34 16 12 16C13.66 16 15 14.66 15 13C15 11.34 13.66 10 12 10Z" />
          </svg>
          <span className="font-body text-[17px] font-bold text-white">Ambil Ulang Foto</span>
        </button>

        <button
          type="button"
          onClick={() => router.push("/upload")}
          className="btn-secondary flex h-[62px] w-full items-center justify-center gap-4 rounded-full px-6"
        >
          <svg
            className="h-10 w-10 text-[#6B4035]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="4" ry="4" />
            <circle cx="8.5" cy="8.5" r="1.6" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span className="font-body text-[17px] font-bold text-[#6B4035]">Upload Foto Lain</span>
        </button>
      </div>

      {cameraOpen && (
        <CameraModal
          onClose={() => setCameraOpen(false)}
          onCaptured={(photo, isValid) => {
            storePhoto(photo);
            storeInvalidSimulation(!isValid);
            setCameraOpen(false);
            router.push("/preview");
          }}
        />
      )}
    </section>
  );
}

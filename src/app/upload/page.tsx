"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/ui/TopBar";
import { CameraModal } from "@/components/ui/CameraModal";
import {
  DEFAULT_USER_PHOTO,
  readFileAsDataUrl,
  storeInvalidSimulation,
  storePhoto,
} from "@/lib/photo";

export default function UploadPage() {
  const router = useRouter();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const handleGalleryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    readFileAsDataUrl(file, (dataUrl) => {
      storePhoto(dataUrl);
      storeInvalidSimulation(false);
      router.push("/preview");
    });
  };

  return (
    <section className="screen-fade relative min-h-dvh w-full pb-[calc(2rem+env(safe-area-inset-bottom))]">
      {/* Top-Right Decorative Botanical Leaves */}
      <img
        src="/assets/botanical-leaves.png"
        alt=""
        className="pointer-events-none absolute right-0 top-0 z-0 h-auto w-[112px] max-w-[30vw]"
      />

      <TopBar onBack={() => router.push("/")} label="Kembali ke Halaman Awal" />

      {/* Heading */}
      <div className="relative z-10 mt-7 px-7 text-center">
        <h2 className="font-heading text-[26px] font-bold text-[#6B4035]">Ambil atau Upload Foto</h2>
        <p className="mt-1.5 font-body text-[13.5px] leading-[1.45] text-[#6B4035]">
          Gunakan foto wajah yang jelas, menghadap kamera, dan pencahayaan yang baik.
        </p>
      </div>

      {/* Cards Container */}
      <div className="relative z-10 mt-5 space-y-5 px-7">
        {/* Card 1: Ambil Foto */}
        <div className="card-surface flex flex-col items-center p-5 text-center">
          <svg className="h-12 w-14 text-[#6B4035]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 3L7.17 5H4C2.9 5 2 5.9 2 7V19C2 20.1 2.9 21 4 21H20C21.1 21 22 20.1 22 19V7C22 5.9 21.1 5 20 5H16.83L15 3H9ZM12 18C9.24 18 7 15.76 7 13C7 10.24 9.24 8 12 8C14.76 8 17 10.24 17 13C17 15.76 14.76 18 12 18ZM12 10C10.34 10 9 11.34 9 13C9 14.66 10.34 16 12 16C13.66 16 15 14.66 15 13C15 11.34 13.66 10 12 10ZM18 9.5C17.45 9.5 17 9.05 17 8.5C17 7.95 17.45 7.5 18 7.5C18.55 7.5 19 7.95 19 8.5C19 9.05 18.55 9.5 18 9.5Z" />
          </svg>
          <h3 className="mt-2 font-heading text-[20px] font-bold text-[#6B4035]">Ambil Foto</h3>
          <p className="mt-1 max-w-[220px] font-body text-[12.5px] leading-snug text-[#6B4035]">
            Gunakan kamera perangkat untuk mengambil foto
          </p>
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            className="btn-primary mt-3.5 h-[36px] w-[202px] rounded-full font-body text-[14px] font-semibold"
          >
            Buka Kamera
          </button>
        </div>

        {/* Card 2: Upload Foto */}
        <div className="card-surface flex flex-col items-center p-5 text-center">
          <svg
            className="h-13 w-13 text-[#6B4035]"
            width="52"
            height="52"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="4" ry="4" />
            <circle cx="8.5" cy="8.5" r="1.6" />
            <polyline points="21 15 16 10 5 21" />
            <polyline points="14 18 10 13 3 20" />
          </svg>
          <h3 className="mt-2 font-heading text-[20px] font-bold text-[#000000]">Upload Foto</h3>
          <p className="mt-1 max-w-[180px] font-body text-[12.5px] leading-snug text-[#35231E]">
            Pilih foto dari galeri perangkat
          </p>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="btn-primary mt-3.5 h-[36px] w-[202px] rounded-full font-body text-[14px] font-semibold"
          >
            Pilih dari Galeri
          </button>
          {/* Quick Demo Action Links so user can test default portrait or invalid photo right away */}
          <div className="mt-2.5 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                storePhoto(DEFAULT_USER_PHOTO);
                storeInvalidSimulation(false);
                router.push("/preview");
              }}
              className="text-[11px] text-[#6B4035] underline hover:text-[#35231E]"
            >
              Pakai Foto Contoh (Valid)
            </button>
            <span className="text-[#C9B5A7]">•</span>
            <button
              type="button"
              onClick={() => {
                storePhoto(DEFAULT_USER_PHOTO);
                storeInvalidSimulation(true);
                router.push("/scan");
              }}
              className="text-[11px] text-[#E04C5B] underline hover:opacity-80"
            >
              Simulasi Wajah Tidak Terdeteksi
            </button>
          </div>
        </div>

        {/* Card 3: Tips Foto yang Baik */}
        <div className="card-surface px-5 py-4">
          <h4 className="font-heading text-[18px] font-bold text-[#000000]">Tips Foto yang Baik:</h4>
          <ul className="mt-2 space-y-1.5 font-body text-[12.5px] text-[#35231E]">
            {[
              "Wajah terlihat jelas",
              "Menghadap kamera",
              "Pencahayaan cukup",
              "Tidak menggunakan aksesoris wajah",
            ].map((tip) => (
              <li key={tip} className="flex items-center gap-2.5">
                <svg
                  className="h-4 w-4 shrink-0 text-[#D48C88]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleGalleryChange}
      />

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

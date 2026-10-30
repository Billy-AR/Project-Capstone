"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/ui/TopBar";
import { useStoredPhoto } from "@/lib/useStoredPhoto";
import { DEFAULT_USER_PHOTO } from "@/lib/photo";
import { RECOMMENDATIONS } from "@/data/recommendations";

export default function ResultsPage() {
  const router = useRouter();
  const photo = useStoredPhoto(DEFAULT_USER_PHOTO);
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <section className="screen-fade relative min-h-dvh w-full pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <img
        src="/assets/botanical-leaves.png"
        alt=""
        className="pointer-events-none absolute right-0 top-0 z-0 h-auto w-[112px] max-w-[30vw]"
      />

      <TopBar onBack={() => router.push("/preview")} label="Kembali ke Preview" />

      {/* Title */}
      <div className="relative z-10 mt-5 px-5 text-center">
        <h2 className="font-heading text-[24px] font-bold text-[#000000]">Hasil Analisis Wajah</h2>
      </div>

      {/* Top 2-Column Analysis Summary */}
      <div className="relative z-10 mt-4 flex items-start gap-4 px-4">
        <div className="aspect-[188/225] w-[45%] max-w-[188px] shrink-0 overflow-hidden rounded-[12px] bg-[#DFDBD8] shadow-sm">
          <img src={photo} alt="Foto Wajah Anda" className="h-full w-full object-cover" />
        </div>

        <div className="flex-1 pt-1">
          <h3 className="font-heading text-[14.5px] font-bold text-[#000000]">Bentuk Wajah Anda</h3>

          <div className="mt-4 flex items-center gap-3">
            <svg
              className="h-16 w-16 shrink-0 text-[#6B4035]"
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 32V23C18 19.5 20.5 17 24 17H33" />
              <path d="M67 17H76C79.5 17 82 19.5 82 23V32" />
              <path d="M18 68V77C18 80.5 20.5 83 24 83H33" />
              <path d="M67 83H76C79.5 83 82 80.5 82 77V68" />
              <path d="M30 45C30 30 39 20 50 20C61 20 70 30 70 45C70 46 73 48 73 52C73 56 70 57 69 59C66 72 58 80 50 80C42 80 34 72 31 59C30 57 27 56 27 52C27 48 30 46 30 45Z" />
              <ellipse cx="42" cy="48" rx="2.5" ry="3.5" fill="currentColor" stroke="none" />
              <ellipse cx="58" cy="48" rx="2.5" ry="3.5" fill="currentColor" stroke="none" />
              <path d="M44 62H56" />
            </svg>
            <span className="font-heading text-[22px] font-bold text-[#000000]">Oval</span>
          </div>

          <p className="mt-4 font-body text-[13.5px] leading-[1.45] text-[#000000]">
            Bentuk wajah oval cenderung seimbang dan cocok dengan berbagai gaya rambut.
          </p>
        </div>
      </div>

      {/* Recommendation Section */}
      <div className="relative z-10 mt-7 px-4">
        <h3 className="font-heading text-[24px] font-bold text-[#000000]">Rekomendasi Gaya Rambut</h3>

        {/* 3 Recommendation Cards */}
        <div className="mt-3.5 grid grid-cols-3 gap-3">
          {RECOMMENDATIONS.map((rec, index) => (
            <button
              key={rec.id}
              type="button"
              onClick={() => {
                setSelectedIndex(index);
                router.push(`/results/${rec.id}`);
              }}
              className={`card-surface flex flex-col items-center overflow-hidden p-1.5 pb-4 text-center transition hover:shadow-md ${
                selectedIndex === index ? "ring-2 ring-[#6B4035]" : ""
              }`}
            >
              <div className="h-[138px] w-full overflow-hidden rounded-[8px] bg-[#DFDBD8]">
                <img src={rec.previewImage} alt={rec.name} className="h-full w-full object-cover" />
              </div>
              <span className="mt-3.5 font-heading text-[16.5px] font-bold text-[#000000]">
                {rec.name}
              </span>
            </button>
          ))}
        </div>

        {/* Bottom CTA Button: Lihat Detail Rekomendasi */}
        <button
          type="button"
          onClick={() => router.push(`/results/${RECOMMENDATIONS[selectedIndex].id}`)}
          className="btn-primary mt-6 flex h-[48px] w-full items-center justify-center gap-4 rounded-full font-body text-[15px] font-bold shadow-md"
        >
          <span>Lihat Detail Rekomendasi</span>
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="13 6 19 12 13 18" />
          </svg>
        </button>
      </div>
    </section>
  );
}

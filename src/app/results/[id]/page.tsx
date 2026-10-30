"use client";

import { Suspense, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/ui/TopBar";
import { RECOMMENDATIONS } from "@/data/recommendations";

const attributeRows = [
  {
    id: "faceShape",
    label: "Bentuk Wajah",
    icon: (
      <svg
        className="h-5 w-5 text-[#6B4035]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <path d="M4 8V6a2 2 0 0 1 2-2h2M4 16v2a2 2 0 0 0 2 2h2M16 4h2a2 2 0 0 1 2 2v2M16 20h2a2 2 0 0 0 2-2v-2" />
        <ellipse cx="12" cy="12" rx="4" ry="5" />
      </svg>
    ),
  },
  {
    id: "impression",
    label: "Kesan Utama",
    icon: (
      <svg
        className="h-5 w-5 text-[#6B4035]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M10 3L12 8.5L17.5 10.5L12 12.5L10 18L8 12.5L2.5 10.5L8 8.5L10 3Z" />
        <path
          d="M18 14L19 16.5L21.5 17.5L19 18.5L18 21L17 18.5L14.5 17.5L17 16.5L18 14Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    id: "suitableFor",
    label: "Cocok Untuk",
    icon: (
      <svg
        className="h-5 w-5 text-[#6B4035]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      >
        <path d="M3 18h18M4 15l-1-9 5 4 4-5 4 5 5-4-1 9H4z" />
      </svg>
    ),
  },
] as const;

export default function RecommendationDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh w-full" />}>
      <DetailContent />
    </Suspense>
  );
}

function DetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const initialIndex = Math.max(
    RECOMMENDATIONS.findIndex((item) => item.id === id),
    0
  );
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [previewOpen, setPreviewOpen] = useState(false);

  const rec = RECOMMENDATIONS[selectedIndex];

  const values = {
    faceShape: rec.faceShape,
    impression: rec.mainImpression,
    suitableFor: rec.suitableFor,
  };

  return (
    <section className="screen-fade relative min-h-dvh w-full pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <img
        src="/assets/botanical-leaves.png"
        alt=""
        className="pointer-events-none absolute right-0 top-0 z-0 h-auto w-[112px] max-w-[30vw]"
      />

      <TopBar onBack={() => router.push("/results")} label="Kembali ke Hasil Analisis" />

      {/* Top Detail Hero Section: Photo (Left) + Metadata (Right) */}
      <div className="relative z-10 mt-5 flex items-start gap-3.5 px-3.5">
        {/* Clickable Portrait Card with 3 Pagination Dots */}
        <div className="group relative aspect-[170/254] w-[42%] max-w-[170px] shrink-0 overflow-hidden rounded-[12px] bg-[#DFDBD8] shadow-sm">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            aria-label="Perbesar Gambar Gaya Rambut"
            className="relative block h-full w-full focus:outline-none"
          >
            <img
              src={rec.detailImage}
              alt="Detail Gaya Rambut"
              className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
            />
            <span className="absolute right-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] text-white opacity-80 transition group-hover:opacity-100">
              Klik Preview
            </span>
          </button>

          {/* 3 Interactive Pagination Dots at Bottom of Photo */}
          <div className="absolute inset-x-0 bottom-3.5 z-10 flex items-center justify-center gap-5">
            {RECOMMENDATIONS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-label={`Pilih ${item.name}`}
                className={`h-2.5 w-2.5 rounded-full border border-[#E5989B] transition ${
                  selectedIndex === index ? "bg-[#E5989B]" : "bg-transparent"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Right Column: Title, Summary, and 3 Attribute Badges */}
        <div className="flex-1 pt-0.5">
          <h2 className="font-heading text-[clamp(26px,7.4vw,32px)] font-bold leading-tight text-[#6B4035]">
            {rec.name}
          </h2>
          <p className="mt-1 font-body text-[11.5px] leading-[1.45] text-[#000000]">
            {rec.tagline}
          </p>

          {/* 3 Attribute Rows */}
          <div className="mt-3 space-y-2.5">
            {attributeRows.map((row) => (
              <div key={row.id} className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3D9D6]">
                  {row.icon}
                </div>
                <div className="leading-tight">
                  <div className="font-body text-[10px] font-bold text-[#35231E]">{row.label}</div>
                  <div className="font-body text-[10px] text-[#6B4035]">{values[row.id]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Style Tabs (Layer Cut | Long Wave | Hime Cut) */}
      <div className="relative z-10 mt-4 flex items-center justify-between gap-2 px-6">
        {RECOMMENDATIONS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedIndex(index)}
            className={`flex-1 rounded-full py-1.5 text-[11.5px] font-semibold transition ${
              selectedIndex === index
                ? "bg-[#6B4035] text-white"
                : "bg-[#F3D9D6] text-[#6B4035]"
            }`}
          >
            {index + 1}. {item.name}
          </button>
        ))}
      </div>

      {/* Card 1: Karakteristik Gaya */}
      <div className="relative z-10 mt-4 px-6">
        <div className="card-surface p-4">
          <h3 className="font-heading text-[18px] font-bold text-[#000000]">Karakteristik Gaya</h3>
          <ul className="mt-2.5 list-disc space-y-1.5 pl-5 font-body text-[12px] text-[#000000]">
            {rec.characteristics.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Card 2: Tips Styling */}
      <div className="relative z-10 mt-5 px-6">
        <div className="card-surface p-4">
          <h3 className="font-heading text-[18px] font-bold text-[#000000]">Tips Styling</h3>
          <ul className="mt-2.5 list-disc space-y-1.5 pl-5 font-body text-[12px] text-[#000000]">
            {rec.stylingTips.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* IMAGE PREVIEW MODAL */}
      {previewOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#FAF3EC]/55 px-6 backdrop-blur-[5px]">
          <div className="relative aspect-[361/433] w-[361px] max-w-full overflow-hidden bg-[#DFDBD8] shadow-2xl">
            <img
              src={rec.detailImage}
              alt="Image Preview"
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              aria-label="Tutup Preview Gambar"
              className="absolute right-4 top-3.5 flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#F3D9D6] shadow-md transition hover:bg-[#EBC5C1]"
            >
              <svg
                className="h-6 w-6 text-[#000000]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

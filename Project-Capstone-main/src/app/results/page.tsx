"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/ui/TopBar";
import { useStoredPhoto } from "@/lib/useStoredPhoto";
import {
  DEFAULT_USER_PHOTO,
  PredictionResult,
  readPreferences,
  readPrediction,
  storePreferences,
} from "@/lib/photo";
import { getFaceShapeDescription, getFaceShapeLabel } from "@/data/mock-scan";
import { HairLength, HairTexture } from "@/data/recommendations";
import {
  rankRecommendations,
  ScoredRecommendation,
} from "@/lib/recommendationEngine";

function FaceShapeIcon({ shape }: { shape: string }) {
  const s = shape.toLowerCase();

  return (
    <svg
      className="h-16 w-16 shrink-0 text-[#6B4035]"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Corner Brackets */}
      <path d="M18 30V23C18 19.5 20.5 17 24 17H31" />
      <path d="M69 17H76C79.5 17 82 19.5 82 23V30" />
      <path d="M18 70V77C18 80.5 20.5 83 24 83H31" />
      <path d="M69 83H76C79.5 83 82 80.5 82 77V70" />

      {/* Face Shapes */}
      {s === "round" && <circle cx="50" cy="50" r="23" strokeWidth="3.5" />}
      {s === "square" && <rect x="29" y="27" width="42" height="46" rx="8" strokeWidth="3.5" />}
      {s === "heart" && (
        <path
          d="M32 35 C32 24, 46 24, 50 31 C54 24, 68 24, 68 35 C68 49, 57 63, 50 73 C43 63, 32 49, 32 35 Z"
          strokeWidth="3.2"
        />
      )}
      {s === "oblong" && <rect x="33" y="24" width="34" height="52" rx="15" strokeWidth="3.5" />}
      {s !== "round" && s !== "square" && s !== "heart" && s !== "oblong" && (
        <ellipse cx="50" cy="50" rx="20" ry="26" strokeWidth="3.5" />
      )}

      {/* Eyes & Mouth */}
      <ellipse cx="43" cy="46" rx="2" ry="2.8" fill="currentColor" stroke="none" />
      <ellipse cx="57" cy="46" rx="2" ry="2.8" fill="currentColor" stroke="none" />
      <path d="M45 59C48 62 52 62 55 59" strokeWidth="2.8" />
    </svg>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const photo = useStoredPhoto(DEFAULT_USER_PHOTO);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Multi-Criteria Preferences State
  const [hairLength, setHairLength] = useState<HairLength | "any">("any");
  const [hairTexture, setHairTexture] = useState<HairTexture | "any">("any");

  useEffect(() => {
    const data = readPrediction();
    if (data) {
      setPrediction(data);
    }
    const savedPrefs = readPreferences();
    setHairLength(savedPrefs.hairLength);
    setHairTexture(savedPrefs.hairTexture);
  }, []);

  const updateLength = (next: HairLength | "any") => {
    setHairLength(next);
    setSelectedIndex(0);
    storePreferences({ hairLength: next, hairTexture });
  };

  const updateTexture = (next: HairTexture | "any") => {
    setHairTexture(next);
    setSelectedIndex(0);
    storePreferences({ hairLength, hairTexture: next });
  };

  const resetFilters = () => {
    setHairLength("any");
    setHairTexture("any");
    setSelectedIndex(0);
    storePreferences({ hairLength: "any", hairTexture: "any" });
  };

  const faceShape = prediction?.face_shape || "Oval";
  const confidencePercent = prediction
    ? prediction.confidence <= 1
      ? Math.round(prediction.confidence * 100)
      : Math.round(prediction.confidence)
    : 94;

  const shapeLabel = getFaceShapeLabel(faceShape);
  const shapeDesc = getFaceShapeDescription(faceShape);

  // Multi-Criteria Ranked Recommendations
  const rankedRecommendations: ScoredRecommendation[] = rankRecommendations(
    faceShape,
    confidencePercent / 100,
    {
      hairLength,
      hairTexture,
    }
  );

  const top3 = rankedRecommendations.slice(0, 3);
  const selectedRec = top3[selectedIndex] || top3[0];

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

        <div className="flex-1 pt-0.5">
          <div className="flex items-center justify-between gap-1">
            <h3 className="font-heading text-[14px] font-bold text-[#000000]">Bentuk Wajah</h3>
            <span className="inline-flex items-center rounded-full bg-[#F3D9D6] px-2 py-0.5 font-body text-[11px] font-bold text-[#6B4035]">
              {confidencePercent}% Cocok
            </span>
          </div>

          <div className="mt-2.5 flex items-center gap-2.5">
            <FaceShapeIcon shape={faceShape} />
            <div className="min-w-0">
              <span className="block font-heading text-[20px] font-bold leading-tight text-[#000000]">
                {shapeLabel}
              </span>
              {prediction?.predictions && prediction.predictions.length > 1 && (
                <span className="mt-0.5 block text-[11px] text-[#6B4035]">
                  Alternatif: {getFaceShapeLabel(prediction.predictions[1].label)} (
                  {Math.round(
                    (prediction.predictions[1].score <= 1
                      ? prediction.predictions[1].score * 100
                      : prediction.predictions[1].score)
                  )}
                  %)
                </span>
              )}
            </div>
          </div>

          <p className="mt-2.5 font-body text-[12.5px] leading-[1.45] text-[#000000]">
            {shapeDesc}
          </p>

          {(prediction?.needs_review ||
            (prediction?.quality_warnings && prediction.quality_warnings.length > 0)) && (
            <div className="mt-2 rounded-[8px] border border-[#E5B887] bg-[#FFF5E8] px-2.5 py-1.5 text-[11px] leading-snug text-[#7A4B16]">
              {prediction.quality_warnings && prediction.quality_warnings.length > 0
                ? prediction.quality_warnings[0]
                : "Keyakinan prediksi sedang. Foto menghadap lurus dengan pencahayaan merata dapat meningkatkan akurasi."}
            </div>
          )}
        </div>
      </div>

      {/* Recommendation Section with Multi-Criteria Engine */}
      <div className="relative z-10 mt-6 px-4">
        <div className="flex items-baseline justify-between">
          <h3 className="font-heading text-[22px] font-bold text-[#000000]">
            Rekomendasi Gaya Rambut
          </h3>
          <span className="font-body text-[12px] font-semibold text-[#6B4035]">
            Multi-Criteria AI
          </span>
        </div>

        {/* Filter Bar Preferensi Rambut */}
        <div className="mt-3 space-y-2 rounded-[14px] border border-[#E9C7C3]/70 bg-[#FAF3EC] p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-heading text-[12px] font-bold text-[#6B4035]">
              Sesuaikan Preferensi Rambut Anda:
            </span>
            {(hairLength !== "any" || hairTexture !== "any") && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] font-semibold text-[#E04C5B] underline"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Filter Panjang Rambut */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <span className="shrink-0 font-medium text-[#8D6B62]">Panjang:</span>
            {[
              { id: "any", label: "Semua" },
              { id: "short", label: "Pendek" },
              { id: "medium", label: "Sebahu" },
              { id: "long", label: "Panjang" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => updateLength(opt.id as HairLength | "any")}
                className={`rounded-full px-2.5 py-0.5 font-medium transition ${
                  hairLength === opt.id
                    ? "bg-[#6B4035] text-white shadow-xs"
                    : "bg-[#F3D9D6] text-[#6B4035] hover:bg-[#EBC5C1]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Filter Tekstur Rambut */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <span className="shrink-0 font-medium text-[#8D6B62]">Tekstur:</span>
            {[
              { id: "any", label: "Semua" },
              { id: "straight", label: "Lurus" },
              { id: "wavy", label: "Bergelombang" },
              { id: "curly", label: "Keriting" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => updateTexture(opt.id as HairTexture | "any")}
                className={`rounded-full px-2.5 py-0.5 font-medium transition ${
                  hairTexture === opt.id
                    ? "bg-[#6B4035] text-white shadow-xs"
                    : "bg-[#F3D9D6] text-[#6B4035] hover:bg-[#EBC5C1]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Top Ranked Recommendation Cards */}
        <div className="mt-3.5 grid grid-cols-3 gap-3">
          {top3.map((rec, index) => (
            <button
              key={rec.id}
              type="button"
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => {
                setSelectedIndex(index);
                router.push(`/results/${rec.id}`);
              }}
              className={`card-surface flex flex-col items-center overflow-hidden p-1.5 pb-3 text-center transition hover:shadow-md ${
                selectedIndex === index ? "ring-2 ring-[#6B4035]" : ""
              }`}
            >
              <div className="h-[132px] w-full overflow-hidden rounded-[8px] bg-[#DFDBD8]">
                <img src={rec.previewImage} alt={rec.name} className="h-full w-full object-cover" />
              </div>
              <span className="mt-2 font-heading text-[15px] font-bold leading-tight text-[#000000]">
                {rec.name}
              </span>
              <span className="mt-1 text-[11.5px] font-bold text-[#6B4035]">
                {rec.calculatedScore}% Match
              </span>
            </button>
          ))}
        </div>

        {/* Primary Match Reason Box */}
        {selectedRec && selectedRec.matchReasons.length > 0 && (
          <div className="mt-3.5 flex items-start gap-2.5 rounded-[12px] bg-[#F3D9D6]/60 p-3 shadow-xs">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-[#6B4035]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <div className="text-[12px] leading-snug text-[#35231E]">
              <span className="font-bold text-[#6B4035]">
                Kenapa Cocok ({selectedRec.name}):
              </span>{" "}
              {selectedRec.matchReasons.join(" • ")}
            </div>
          </div>
        )}

        {/* Bottom CTA Button: Lihat Detail Rekomendasi */}
        <button
          type="button"
          onClick={() => router.push(`/results/${selectedRec.id}`)}
          className="btn-primary mt-5 flex h-[48px] w-full items-center justify-center gap-4 rounded-full font-body text-[15px] font-bold shadow-md"
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

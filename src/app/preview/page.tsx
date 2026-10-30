"use client";

import { useRouter } from "next/navigation";
import { TopBar } from "@/components/ui/TopBar";
import { useStoredPhoto } from "@/lib/useStoredPhoto";
import { DEFAULT_USER_PHOTO } from "@/lib/photo";

export default function PreviewPage() {
  const router = useRouter();
  const photo = useStoredPhoto(DEFAULT_USER_PHOTO);

  return (
    <section className="screen-fade relative min-h-dvh w-full pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <img
        src="/assets/botanical-leaves.png"
        alt=""
        className="pointer-events-none absolute right-0 top-0 z-0 h-auto w-[112px] max-w-[30vw]"
      />

      <TopBar onBack={() => router.push("/upload")} label="Kembali ke Upload Foto" />

      {/* Heading */}
      <div className="relative z-10 mt-7 px-7 text-center">
        <h2 className="font-heading text-[26px] font-bold text-[#000000]">Preview Foto</h2>
        <p className="mt-1 font-body text-[13.5px] leading-[1.45] text-[#000000]">
          Pastikan foto sudah jelas
          <br />
          dan terlihat wajah dengan baik.
        </p>
      </div>

      {/* Large Portrait Preview Image */}
      <div className="relative z-10 mt-5 px-6">
        <div className="relative aspect-[5/6] max-h-[52svh] w-full overflow-hidden rounded-[20px] bg-[#DFDBD8] shadow-sm">
          <img src={photo} alt="Preview Foto Wajah" className="h-full w-full object-cover" />
        </div>
      </div>

      {/* Bottom Action Buttons: Ganti Foto & Gunakan Foto */}
      <div className="relative z-10 mt-8 grid grid-cols-2 gap-4 px-6">
        <button
          type="button"
          onClick={() => router.push("/upload")}
          className="btn-secondary flex h-[72px] flex-col items-center justify-center gap-1 rounded-[22px]"
        >
          <svg
            className="h-6 w-6 text-[#000000]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
          <span className="font-body text-[14px] font-bold text-[#000000]">Ganti Foto</span>
        </button>

        <button
          type="button"
          onClick={() => router.push("/scan")}
          className="btn-primary flex h-[72px] flex-col items-center justify-center gap-1 rounded-[22px]"
        >
          <svg
            className="h-7 w-7 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="font-body text-[14px] font-bold text-white">Gunakan Foto</span>
        </button>
      </div>
    </section>
  );
}

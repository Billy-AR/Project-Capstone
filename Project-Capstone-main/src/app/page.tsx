import Link from "next/link";
import { MonaLogo } from "@/components/ui/MonaLogo";

const features = [
  {
    label: (
      <>
        Analisis
        <br />
        Bentuk Wajah
      </>
    ),
    icon: (
      <svg
        className="h-6 w-6 text-[#6B4035]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 8V6a2 2 0 0 1 2-2h2" />
        <path d="M4 16v2a2 2 0 0 0 2 2h2" />
        <path d="M16 4h2a2 2 0 0 1 2 2v2" />
        <path d="M16 20h2a2 2 0 0 0 2-2v-2" />
        <ellipse cx="12" cy="12" rx="4.5" ry="5.5" />
        <circle cx="10.5" cy="11" r="0.6" fill="currentColor" />
        <circle cx="13.5" cy="11" r="0.6" fill="currentColor" />
        <path d="M10.8 14c.7.5 1.7.5 2.4 0" />
      </svg>
    ),
  },
  {
    label: (
      <>
        Rekomendasi
        <br />
        Gaya Rambut
      </>
    ),
    icon: (
      <svg
        className="h-6 w-6 text-[#6B4035]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3.2" />
      </svg>
    ),
  },
  {
    label: (
      <>
        Penampilan
        <br />
        Lebih Percaya Diri
      </>
    ),
    icon: (
      <svg
        className="h-6 w-6 text-[#6B4035]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
];

export default function LandingPage() {
  return (
    <section className="screen-fade relative flex min-h-[100svh] w-full flex-col overflow-hidden">
      {/* Full Clean Hero Background Image with Model, Leaves, and Ribbon */}
      <img
        src="/assets/mona-hero.jpg"
        alt="Mona Salon Model"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />

      {/* Brand Logo */}
      <div className="relative z-10 mt-4 text-center">
        <MonaLogo />
      </div>

      {/* Hero Copy & Features */}
      <div className="relative z-10 mt-7 px-8">
        <h1 className="font-heading text-[clamp(28px,8.2vw,33px)] font-bold leading-[1.22] tracking-tight text-[#6B4035]">
          Temukan
          <br />
          Gaya Rambut
          <br />
          Terbaik untuk Kamu
        </h1>

        <p className="mt-2.5 max-w-[222px] font-body text-[13.5px] leading-[1.55] text-[#35231E]">
          Dengan analisis bentuk wajah, Mona Salon memberikan rekomendasi gaya rambut yang paling sesuai
        </p>

        {/* 3 Feature Items */}
        <div className="mt-6 space-y-4">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-[#F7E5E2] shadow-sm">
                {feature.icon}
              </div>
              <div className="font-body text-[13px] font-medium leading-[1.35] text-[#35231E]">
                {feature.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA Button */}
      <div className="relative z-20 mt-auto flex justify-center px-8 pb-[calc(2.25rem+env(safe-area-inset-bottom))] pt-8">
        <Link
          href="/upload"
          className="btn-primary flex h-[48px] w-full max-w-[274px] items-center justify-center gap-3 rounded-full font-body text-[14.5px] font-semibold shadow-lg"
        >
          <span>Mulai Konsultasi</span>
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
        </Link>
      </div>
    </section>
  );
}

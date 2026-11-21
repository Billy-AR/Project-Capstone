"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_USER_PHOTO } from "@/lib/photo";

interface CameraModalProps {
  onClose: () => void;
  onCaptured: (photo: string, isValid: boolean) => void;
}

export function CameraModal({ onClose, onCaptured }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [status, setStatus] = useState("Posisikan wajah di dalam bingkai oval");

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("Mode Simulasi Kamera — klik Ambil Foto di bawah");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
        setStatus("Kamera aktif — posisikan wajah di dalam bingkai");
      } catch {
        if (!cancelled) {
          setStatus("Mode Simulasi Kamera — klik Ambil Foto di bawah");
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const capture = (isValid: boolean) => {
    const video = videoRef.current;
    let photo = DEFAULT_USER_PHOTO;

    if (cameraActive && video && !video.classList.contains("hidden") && video.videoWidth > 0) {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      photo = canvas.toDataURL("image/png");
    }

    onCaptured(photo, isValid);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-between bg-[#35231E]/85 p-6 backdrop-blur-sm">
      <div className="flex w-full items-center justify-between text-[#FAF3EC]">
        <span className="font-heading text-lg font-bold">Kamera Mona Salon</span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3D9D6] font-bold text-[#35231E]"
        >
          ✕
        </button>
      </div>

      <div className="relative flex h-[420px] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-[#D5A8A3] bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover ${cameraActive ? "" : "hidden"}`}
        />
        <img
          src={DEFAULT_USER_PHOTO}
          alt="Simulasi Kamera"
          className={`h-full w-full object-cover ${cameraActive ? "hidden" : ""}`}
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-68 w-52 rounded-full border-2 border-dashed border-[#F3D9D6]/85" />
        </div>
        <div className="absolute inset-x-4 bottom-3 rounded-full bg-black/60 px-3 py-1.5 text-center text-xs text-[#FAF3EC]">
          {status}
        </div>
      </div>

      <div className="w-full space-y-2.5">
        <button
          type="button"
          onClick={() => capture(true)}
          className="btn-primary h-[46px] w-full rounded-full font-body text-sm font-semibold shadow-lg"
        >
          📸 Ambil Foto Sekarang
        </button>
        <button
          type="button"
          onClick={() => capture(false)}
          className="h-[38px] w-full rounded-full bg-[#E04C5B] font-body text-xs font-semibold text-white transition hover:opacity-95"
        >
          Simulasi Foto Buram / Wajah Tidak Terdeteksi
        </button>
      </div>
    </div>
  );
}

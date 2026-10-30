export const MOCK_FACE_SHAPES = [
  "oval",
  "round",
  "square",
  "heart",
  "diamond",
] as const;

export const FACE_SHAPE_LABELS: Record<string, string> = {
  oval: "Oval",
  round: "Bulat",
  square: "Persegi",
  heart: "Hati",
  diamond: "Berlian",
};

export const FACE_SHAPE_DESCRIPTIONS: Record<string, string> = {
  oval: "Bentuk wajah oval cenderung seimbang dan cocok dengan berbagai gaya rambut.",
  round: "Bentuk wajah bulat memiliki lebar dan panjang hampir sama dengan pipi yang melengkung.",
  square: "Bentuk wajah persegi memiliki lebar pipi dan rahang yang sama dengan sudut tegas.",
  heart: "Bentuk wajah hati memiliki dahi lebar dan rahang yang runcing ke bawah.",
  diamond: "Bentuk wajah berlian memiliki pipi paling lebar dengan dahi dan rahang sempit.",
};

export const MOCK_SCAN_RESULT: ScanResult = {
  faceShape: "oval",
  confidence: 94,
  detectedAt: "2024-01-15T10:30:00Z",
};

export const INVALID_PHOTO_ERROR = {
  title: "Wajah tidak terdeteksi",
  message:
    "Pastikan wajah terlihat jelas, menghadap kamera, pencahayaan cukup, dan tidak tertutup oleh objek lain.",
  suggestion: "Coba ambil ulang foto atau upload foto lain yang lebih jelas.",
};

export type FaceShape = (typeof MOCK_FACE_SHAPES)[number];

export interface ScanResult {
  faceShape: FaceShape;
  confidence: number;
  detectedAt: string;
}

export interface ScanState {
  status: "idle" | "scanning" | "success" | "error";
  result?: ScanResult;
  error?: {
    title: string;
    message: string;
    suggestion: string;
  };
}

export const INITIAL_SCAN_STATE: ScanState = {
  status: "idle",
};

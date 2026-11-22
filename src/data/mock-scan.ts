export const FACE_SHAPES = [
  "heart",
  "oblong",
  "oval",
  "round",
  "square",
] as const;

export const MOCK_FACE_SHAPES = FACE_SHAPES;

export const FACE_SHAPE_LABELS: Record<string, string> = {
  heart: "Hati (Heart)",
  oblong: "Lonjong (Oblong)",
  oval: "Oval",
  round: "Bulat (Round)",
  square: "Persegi (Square)",
};

export const FACE_SHAPE_DESCRIPTIONS: Record<string, string> = {
  heart: "Bentuk wajah hati memiliki dahi yang relatif lebar dengan tulang pipi tinggi dan dagu yang runcing ke bawah.",
  oblong: "Bentuk wajah lonjong cenderung lebih panjang daripada lebarnya dengan garis rahang dan dahi yang lurus.",
  oval: "Bentuk wajah oval cenderung seimbang dan proporsional, cocok dengan hampir semua gaya rambut.",
  round: "Bentuk wajah bulat memiliki lebar dan panjang hampir sama dengan pipi penuh dan dagu melengkung lembut.",
  square: "Bentuk wajah persegi memiliki garis rahang tegas dengan sudut pipi kuat dan dahi yang seimbang.",
};

export function getFaceShapeLabel(shape: string): string {
  const key = shape.toLowerCase();
  return FACE_SHAPE_LABELS[key] || shape;
}

export function getFaceShapeDescription(shape: string): string {
  const key = shape.toLowerCase();
  return (
    FACE_SHAPE_DESCRIPTIONS[key] ||
    "Bentuk wajah unik yang cocok dengan berbagai gaya penataan rambut pilihan."
  );
}

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

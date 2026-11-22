export const DEFAULT_USER_PHOTO = "/assets/user-photo.jpg";

const PHOTO_KEY = "mona:photo";
const INVALID_KEY = "mona:invalid";
const PREDICTION_KEY = "mona:prediction";
const ERROR_KEY = "mona:error";
const PREFS_KEY = "mona:prefs";

export interface PredictionItem {
  label: string;
  score: number;
}

export interface PredictionResult {
  success: boolean;
  face_shape: string;
  confidence: number;
  predictions: PredictionItem[];
  needs_review?: boolean;
  faces_detected?: number;
  model_version?: string;
  calibrated?: boolean;
  quality_warnings?: string[];
  geometry_summary?: {
    height_to_width?: number;
    jaw_to_cheek?: number;
    forehead_to_cheek?: number;
  };
}

export interface StoredPreferences {
  hairLength: "any" | "short" | "medium" | "long";
  hairTexture: "any" | "straight" | "wavy" | "curly";
}

export function storePreferences(prefs: StoredPreferences) {
  try {
    sessionStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function readPreferences(): StoredPreferences {
  try {
    const raw = sessionStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw) as StoredPreferences;
  } catch {
    /* ignore */
  }
  return { hairLength: "any", hairTexture: "any" };
}

export function storePhoto(dataUrl: string) {
  try {
    sessionStorage.setItem(PHOTO_KEY, dataUrl);
  } catch {
    /* ignore quota errors */
  }
}

export function storeInvalidSimulation(value: boolean) {
  try {
    sessionStorage.setItem(INVALID_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function readInvalidSimulation(): boolean {
  try {
    return sessionStorage.getItem(INVALID_KEY) === "1";
  } catch {
    return false;
  }
}

export function storePrediction(prediction: PredictionResult) {
  try {
    sessionStorage.setItem(PREDICTION_KEY, JSON.stringify(prediction));
  } catch {
    /* ignore */
  }
}

export function readPrediction(): PredictionResult | null {
  try {
    const raw = sessionStorage.getItem(PREDICTION_KEY);
    return raw ? (JSON.parse(raw) as PredictionResult) : null;
  } catch {
    return null;
  }
}

export function clearPrediction() {
  try {
    sessionStorage.removeItem(PREDICTION_KEY);
  } catch {
    /* ignore */
  }
}

export function storeError(message: string) {
  try {
    sessionStorage.setItem(ERROR_KEY, message);
  } catch {
    /* ignore */
  }
}

export function readError(): string | null {
  try {
    return sessionStorage.getItem(ERROR_KEY);
  } catch {
    return null;
  }
}

export function clearError() {
  try {
    sessionStorage.removeItem(ERROR_KEY);
  } catch {
    /* ignore */
  }
}

export function readFileAsDataUrl(file: File, onDone: (dataUrl: string) => void) {
  const reader = new FileReader();
  reader.onload = () => onDone(reader.result as string);
  reader.readAsDataURL(file);
}

import {
  FaceShapeType,
  HairLength,
  HairTexture,
  Recommendation,
  RECOMMENDATIONS,
} from "@/data/recommendations";

export interface UserPreferences {
  hairTexture?: HairTexture | "any";
  hairLength?: HairLength | "any";
  impression?: string | "any";
}

export interface ScoredRecommendation extends Recommendation {
  calculatedScore: number;
  matchReasons: string[];
  compatibilityBreakdown: {
    faceShape: number;
    texture: number;
    length: number;
    impression: number;
  };
}

const FACE_SHAPE_BENEFITS: Record<FaceShapeType, Record<string, string>> = {
  Oval: {
    default: "Menjaga proporsi alami wajah oval yang seimbang dan simetris",
  },
  Round: {
    default: "Memberikan ilusi siluet wajah lebih panjang dan tirus",
  },
  Square: {
    default: "Melembutkan garis rahang yang tegas dan bersudut",
  },
  Heart: {
    default: "Menyeimbangkan dahi yang lebar dan dagu yang runcing",
  },
  Oblong: {
    default: "Menambah volume horizontal untuk memecah siluet wajah yang panjang",
  },
};

/**
 * Multi-Criteria Recommendation Engine for Mona Salon
 * Combines Face Shape Compatibility (50%), Hair Texture (25%), Hair Length (15%), and Style Vibe (10%)
 */
export function rankRecommendations(
  detectedFaceShape: string,
  confidence: number = 0.9,
  preferences: UserPreferences = {}
): ScoredRecommendation[] {
  const normFace = (
    detectedFaceShape.charAt(0).toUpperCase() +
    detectedFaceShape.slice(1).toLowerCase()
  ) as FaceShapeType;

  const validFace: FaceShapeType = [
    "Oval",
    "Round",
    "Square",
    "Heart",
    "Oblong",
  ].includes(normFace)
    ? normFace
    : "Oval";

  const W_FACE = 0.50;
  const W_TEXTURE = 0.25;
  const W_LENGTH = 0.15;
  const W_IMPRESSION = 0.10;

  const results: ScoredRecommendation[] = RECOMMENDATIONS.map((style) => {
    const reasons: string[] = [];

    // 1. Face Shape Compatibility (50%)
    const rawFaceCompat = style.faceShapeCompatibility[validFace] ?? 0.75;
    // Scaled with confidence
    const confFactor = confidence > 1 ? confidence / 100 : confidence;
    const faceScore = Math.min(1.0, rawFaceCompat * (0.85 + 0.15 * confFactor));

    if (style.faceShape === validFace) {
      const benefit =
        FACE_SHAPE_BENEFITS[validFace]?.default ||
        `Sangat ideal untuk proporsi wajah ${validFace}`;
      reasons.push(benefit);
    } else if (rawFaceCompat >= 0.85) {
      reasons.push(`Adaptif untuk struktur wajah ${validFace}`);
    }

    // 2. Hair Texture Compatibility (25%)
    let textureScore = 0.85; // Baseline netral jika "any"
    if (preferences.hairTexture && preferences.hairTexture !== "any") {
      if (style.hairTextures.includes(preferences.hairTexture)) {
        textureScore = 1.0;
        const textLabel =
          preferences.hairTexture === "straight"
            ? "rambut lurus"
            : preferences.hairTexture === "wavy"
            ? "rambut bergelombang"
            : "rambut keriting";
        reasons.push(`Cocok dengan tipe ${textLabel}`);
      } else {
        textureScore = 0.45;
      }
    }

    // 3. Hair Length Compatibility (15%)
    let lengthScore = 0.85; // Baseline netral jika "any"
    if (preferences.hairLength && preferences.hairLength !== "any") {
      if (style.hairLength === preferences.hairLength) {
        lengthScore = 1.0;
        const lenLabel =
          preferences.hairLength === "short"
            ? "rambut pendek"
            : preferences.hairLength === "medium"
            ? "rambut sedang (sebahu)"
            : "rambut panjang";
        reasons.push(`Sesuai target panjang ${lenLabel}`);
      } else {
        lengthScore = 0.40;
      }
    }

    // 4. Style Impression / Vibe (10%)
    let impressionScore = 0.90;
    if (preferences.impression && preferences.impression !== "any") {
      const hasImpression = style.impressions.some(
        (imp) => imp.toLowerCase() === preferences.impression?.toLowerCase()
      );
      if (hasImpression) {
        impressionScore = 1.0;
        reasons.push(`Memberikan kesan ${preferences.impression}`);
      } else {
        impressionScore = 0.60;
      }
    }

    // Weighted Score (0 to 100)
    const rawTotal =
      faceScore * W_FACE +
      textureScore * W_TEXTURE +
      lengthScore * W_LENGTH +
      impressionScore * W_IMPRESSION;

    // Normalisasi skala 80 - 98%
    const calculatedScore = Math.min(98, Math.max(70, Math.round(rawTotal * 100)));

    if (reasons.length === 0) {
      reasons.push(style.tagline);
    }

    return {
      ...style,
      calculatedScore,
      matchReasons: reasons,
      compatibilityBreakdown: {
        faceShape: Math.round(faceScore * 100),
        texture: Math.round(textureScore * 100),
        length: Math.round(lengthScore * 100),
        impression: Math.round(impressionScore * 100),
      },
    };
  });

  // Sort descending by calculated score
  return results.sort((a, b) => b.calculatedScore - a.calculatedScore);
}

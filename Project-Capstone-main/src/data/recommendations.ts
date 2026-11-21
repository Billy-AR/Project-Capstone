export const RECOMMENDATION_STYLES = [
  // Oval
  "layer-cut",
  "long-wave",
  "hime-cut",
  // Round
  "round-curtain-layer",
  "round-soft-waves",
  "round-face-framing",
  // Square
  "square-soft-waves",
  "square-feathered-cut",
  "square-side-swept",
  // Heart
  "heart-volume-waves",
  "heart-curtain-layer",
  "heart-chin-framing",
  // Oblong
  "oblong-volume-waves",
  "oblong-curtain-layer",
  "oblong-side-fringe",
] as const;

export type RecommendationStyle = (typeof RECOMMENDATION_STYLES)[number];
export type HairLength = "short" | "medium" | "long";
export type HairTexture = "straight" | "wavy" | "curly";
export type FaceShapeType = "Oval" | "Round" | "Square" | "Heart" | "Oblong";

export interface Recommendation {
  id: string;
  name: string;
  tagline: string;
  faceShape: FaceShapeType;
  hairLength: HairLength;
  hairTextures: HairTexture[];
  impressions: string[];
  faceShapeCompatibility: Record<FaceShapeType, number>;
  mainImpression: string;
  suitableFor: string;
  characteristics: string[];
  stylingTips: string[];
  matchScore: number;
  previewImage: string;
  detailImage: string;
}

export const RECOMMENDATIONS: Recommendation[] = [
  // --- OVAL ---
  {
    id: "layer-cut",
    name: "Layer Cut",
    tagline:
      "Gaya rambut panjang dengan layer bertingkat dan gelombang lembut yang memberikan kesan feminin, elegan, dan natural.",
    faceShape: "Oval",
    hairLength: "long",
    hairTextures: ["straight", "wavy"],
    impressions: ["Feminin", "Elegan", "Modern"],
    faceShapeCompatibility: {
      Oval: 0.98,
      Round: 0.88,
      Square: 0.82,
      Heart: 0.85,
      Oblong: 0.80,
    },
    mainImpression: "Feminin, Elegan, Modern",
    suitableFor: "Rambut Lurus & bergelombang",
    characteristics: [
      "Layer bertingkat yang membingkai wajah",
      "Gelombang lembut dan natural",
      "Memberikan kesan rambut lebih bervolume",
      "Cocok untuk berbagai acara",
      "Mudah ditata dan tetap terlihat rapi",
    ],
    stylingTips: [
      "Gunakan curling iron untuk membuat gelombang lembut",
      "Gunakan hair serum agar rambut tetap berkilau",
      "Sisir dengan tangan untuk hasil yang lebih natural",
      "Gunakan heat protection sebelum styling",
    ],
    matchScore: 95,
    previewImage: "/assets/style-layer-cut.jpg",
    detailImage: "/assets/style-layer-cut.jpg",
  },
  {
    id: "long-wave",
    name: "Long Wave",
    tagline:
      "Gaya rambut panjang dengan gelombang lembut dan natural yang memberikan kesan feminin, elegan, dan anggun.",
    faceShape: "Oval",
    hairLength: "long",
    hairTextures: ["wavy", "curly"],
    impressions: ["Feminin", "Elegan", "Natural"],
    faceShapeCompatibility: {
      Oval: 0.96,
      Round: 0.85,
      Square: 0.88,
      Heart: 0.90,
      Oblong: 0.86,
    },
    mainImpression: "Feminin, Elegan, Natural",
    suitableFor: "Rambut Lurus & bergelombang",
    characteristics: [
      "Gelombang panjang yang lembut dan natural",
      "Memberikan kesan rambut lebih bervolume",
      "Membingkai wajah dengan tampilan yang feminin",
      "Cocok untuk berbagai kesempatan",
      "Memberikan kesan elegan dan effortless",
    ],
    stylingTips: [
      "Gunakan curling iron untuk membuat gelombang lembut",
      "Gunakan hair serum agar rambut tetap berkilau",
      "Sisir dengan jari untuk hasil yang lebih natural",
      "Gunakan heat protection sebelum styling",
      "Gunakan hairspray ringan agar gelombang lebih tahan lama",
    ],
    matchScore: 90,
    previewImage: "/assets/style-long-wave.jpg",
    detailImage: "/assets/style-long-wave.jpg",
  },
  {
    id: "hime-cut",
    name: "Hime Cut",
    tagline:
      "Gaya rambut dengan potongan depan yang tegas di sekitar pipi dan rambut panjang lurus di bagian belakang",
    faceShape: "Oval",
    hairLength: "long",
    hairTextures: ["straight"],
    impressions: ["Manis", "Elegan", "Modern"],
    faceShapeCompatibility: {
      Oval: 0.92,
      Round: 0.80,
      Square: 0.72,
      Heart: 0.82,
      Oblong: 0.84,
    },
    mainImpression: "Manis, Elegan, Modern",
    suitableFor: "Rambut Lurus",
    characteristics: [
      "Potongan depan sebahu atau sepanjang pipi yang tegas",
      "Rambut bagian belakang dibiarkan panjang dan lurus",
      "Membingkai wajah dengan struktur yang jelas",
      "Memberikan kesan unik dan modern",
      "Cocok untuk tampilan kasual maupun formal",
    ],
    stylingTips: [
      "Gunakan catokan untuk mempertahankan bagian rambut tetap lurus",
      "Rapikan bagian depan agar potongan terlihat tegas",
      "Gunakan hair serum untuk menjaga rambut tetap halus dan berkilau",
      "Gunakan heat protection sebelum menggunakan alat styling",
      "Rapikan ujung rambut secara rutin agar bentuk potongan tetap terjaga",
    ],
    matchScore: 85,
    previewImage: "/assets/style-hime-cut.jpg",
    detailImage: "/assets/style-hime-cut.jpg",
  },

  // --- ROUND (BULAT) ---
  {
    id: "round-curtain-layer",
    name: "Curtain Layer",
    tagline:
      "Potongan layer panjang dengan poni tirai yang membingkai samping wajah dan memberi siluet lebih tirus.",
    faceShape: "Round",
    hairLength: "medium",
    hairTextures: ["straight", "wavy"],
    impressions: ["Tirus", "Anggun", "Segar"],
    faceShapeCompatibility: {
      Round: 0.98,
      Oval: 0.90,
      Square: 0.84,
      Heart: 0.86,
      Oblong: 0.75,
    },
    mainImpression: "Tirus, Anggun, Segar",
    suitableFor: "Rambut Lurus & Bergelombang",
    characteristics: [
      "Poni tirai (curtain bangs) yang memanjang ke samping rahang",
      "Layer vertikal yang memberi efek memanjangkan wajah",
      "Menyamarkan kesan pipi penuh dengan tekstur dinamis",
      "Tampilan feminin dan effortless",
    ],
    stylingTips: [
      "Blow dry poni ke arah luar menggunakan sisir bulat",
      "Gunakan sedikit volumizing mousse di akar rambut",
      "Tata layer depan agar jatuh membingkai tulang pipi",
    ],
    matchScore: 94,
    previewImage: "/assets/style-layer-cut.jpg",
    detailImage: "/assets/style-layer-cut.jpg",
  },
  {
    id: "round-soft-waves",
    name: "Soft Beach Wave",
    tagline:
      "Gelombang lembut yang jatuh di bawah dagu untuk menarik pandangan ke bawah dan menyeimbangkan proporsi wajah bulat.",
    faceShape: "Round",
    hairLength: "long",
    hairTextures: ["wavy", "curly"],
    impressions: ["Feminin", "Anggun", "Natural"],
    faceShapeCompatibility: {
      Round: 0.95,
      Oval: 0.92,
      Square: 0.88,
      Heart: 0.85,
      Oblong: 0.78,
    },
    mainImpression: "Feminin, Anggun, Natural",
    suitableFor: "Rambut Bergelombang",
    characteristics: [
      "Gelombang bertekstur dimulai dari bawah telinga",
      "Tidak menambah volume berlebih di area pipi",
      "Membuat siluet leher dan wajah tampak lebih ramping",
    ],
    stylingTips: [
      "Gunakan curling wand diameter besar untuk ombak natural",
      "Hindari gelombang ketat di samping pelipis",
      "Aplikasikan sea salt spray untuk tekstur ringan",
    ],
    matchScore: 91,
    previewImage: "/assets/style-long-wave.jpg",
    detailImage: "/assets/style-long-wave.jpg",
  },
  {
    id: "round-face-framing",
    name: "Framing Cut",
    tagline:
      "Potongan rambut dengan layer bertahap di bawah rahang untuk menciptakan ilusi sudut wajah yang lebih tegas.",
    faceShape: "Round",
    hairLength: "short",
    hairTextures: ["straight"],
    impressions: ["Modern", "Ramping", "Stylish"],
    faceShapeCompatibility: {
      Round: 0.93,
      Oval: 0.88,
      Square: 0.78,
      Heart: 0.80,
      Oblong: 0.70,
    },
    mainImpression: "Modern, Ramping, Stylish",
    suitableFor: "Rambut Lurus",
    characteristics: [
      "Layer presisi membingkai area bawah rahang",
      "Potongan lurus rapi di bagian belakang",
      "Menambah dimensi dan aksen vertikal pada wajah",
    ],
    stylingTips: [
      "Catok lurus dengan sedikit lengkungan ke dalam di ujung rambut",
      "Gunakan serum anti-frizz agar layer tetap rapi",
    ],
    matchScore: 88,
    previewImage: "/assets/style-hime-cut.jpg",
    detailImage: "/assets/style-hime-cut.jpg",
  },

  // --- SQUARE (PERSEGI) ---
  {
    id: "square-soft-waves",
    name: "Soft Layer Wave",
    tagline:
      "Gelombang lembut bertingkat yang melembutkan sudut rahang yang tegas dan memberikan aura feminin yang anggun.",
    faceShape: "Square",
    hairLength: "long",
    hairTextures: ["wavy", "curly"],
    impressions: ["Lembut", "Anggun", "Romantis"],
    faceShapeCompatibility: {
      Square: 0.98,
      Round: 0.86,
      Oval: 0.92,
      Heart: 0.84,
      Oblong: 0.82,
    },
    mainImpression: "Lembut, Anggun, Romantis",
    suitableFor: "Rambut Bergelombang",
    characteristics: [
      "Ombak rambut lembut mengelilingi garis rahang",
      "Layer bertingkat menyamarkan sudut tegas wajah persegi",
      "Memberikan kesan wajah lebih lentur dan manis",
    ],
    stylingTips: [
      "Fokuskan volume gelombang di sekitar leher dan bahu",
      "Sisir gelombang dengan jari agar tidak kaku",
    ],
    matchScore: 95,
    previewImage: "/assets/style-long-wave.jpg",
    detailImage: "/assets/style-long-wave.jpg",
  },
  {
    id: "square-feathered-cut",
    name: "Feathered Layer",
    tagline:
      "Layer bertekstur bulu halus yang memberikan dimensi dan mengalihkan fokus dari ketegasan rahang persegi.",
    faceShape: "Square",
    hairLength: "medium",
    hairTextures: ["straight", "wavy"],
    impressions: ["Dinamis", "Ringan", "Modern"],
    faceShapeCompatibility: {
      Square: 0.94,
      Round: 0.82,
      Oval: 0.90,
      Heart: 0.86,
      Oblong: 0.80,
    },
    mainImpression: "Dinamis, Ringan, Modern",
    suitableFor: "Rambut Lurus & Bergelombang",
    characteristics: [
      "Ujung layer ditipiskan (feathered) secara artistik",
      "Gerakan rambut fleksibel membingkai pipi",
      "Memberikan ilusi bentuk wajah yang lebih oval",
    ],
    stylingTips: [
      "Blow dry ke arah dalam untuk melembutkan sudut rahang",
      "Gunakan hair oil ringan pada ujung rambut",
    ],
    matchScore: 90,
    previewImage: "/assets/style-layer-cut.jpg",
    detailImage: "/assets/style-layer-cut.jpg",
  },
  {
    id: "square-side-swept",
    name: "Side Swept Cut",
    tagline:
      "Potongan dengan belahan samping asimetris yang memecah simetri dahi dan rahang persegi.",
    faceShape: "Square",
    hairLength: "medium",
    hairTextures: ["straight"],
    impressions: ["Elegan", "Berkelas", "Karismatik"],
    faceShapeCompatibility: {
      Square: 0.91,
      Round: 0.80,
      Oval: 0.88,
      Heart: 0.82,
      Oblong: 0.85,
    },
    mainImpression: "Elegan, Berkelas, Karismatik",
    suitableFor: "Rambut Lurus",
    characteristics: [
      "Belahan samping dalam (deep side part)",
      "Layer samping menyamarkan satu sisi garis rahang",
      "Tampilan profesional dan berwibawa",
    ],
    stylingTips: [
      "Tata poni samping menyamping melewati satu mata secara natural",
      "Kunci volume akar dengan light hold hairspray",
    ],
    matchScore: 87,
    previewImage: "/assets/style-hime-cut.jpg",
    detailImage: "/assets/style-hime-cut.jpg",
  },

  // --- HEART (HATI) ---
  {
    id: "heart-volume-waves",
    name: "Lower Wave Cut",
    tagline:
      "Gelombang bervolume yang terkonsentrasi di area bahu untuk menyeimbangkan dagu lancip dan dahi yang lebar.",
    faceShape: "Heart",
    hairLength: "long",
    hairTextures: ["wavy", "curly"],
    impressions: ["Elegan", "Seimbang", "Menawan"],
    faceShapeCompatibility: {
      Heart: 0.98,
      Oval: 0.92,
      Round: 0.80,
      Square: 0.86,
      Oblong: 0.84,
    },
    mainImpression: "Elegan, Seimbang, Menawan",
    suitableFor: "Rambut Bergelombang",
    characteristics: [
      "Volume gelombang difokuskan dari telinga ke bawah",
      "Mengisi ruang kosong di sekitar rahang dan dagu runcing",
      "Membuat proporsi wajah tampak seimbang",
    ],
    stylingTips: [
      "Gunakan curling iron pada bagian tengah hingga ujung rambut",
      "Biarkan bagian atas rambut tetap ramping",
    ],
    matchScore: 94,
    previewImage: "/assets/style-long-wave.jpg",
    detailImage: "/assets/style-long-wave.jpg",
  },
  {
    id: "heart-curtain-layer",
    name: "Wispy Layer Cut",
    tagline:
      "Layer halus dengan poni tirai lembut yang menyamarkan dahi lebar dan menonjolkan tulang pipi yang cantik.",
    faceShape: "Heart",
    hairLength: "long",
    hairTextures: ["straight", "wavy"],
    impressions: ["Trendi", "Feminin", "Manis"],
    faceShapeCompatibility: {
      Heart: 0.95,
      Oval: 0.94,
      Round: 0.85,
      Square: 0.82,
      Oblong: 0.80,
    },
    mainImpression: "Trendi, Feminin, Manis",
    suitableFor: "Rambut Lurus & Bergelombang",
    characteristics: [
      "Poni wispy tirai yang lembut di dahi",
      "Layer ringan di sekitar leher",
      "Menonjolkan mata dan tulang pipi indah",
    ],
    stylingTips: [
      "Catok sedikit poni tirai ke arah luar",
      "Gunakan dry shampoo untuk menjaga poni tetap bervolume",
    ],
    matchScore: 91,
    previewImage: "/assets/style-layer-cut.jpg",
    detailImage: "/assets/style-layer-cut.jpg",
  },
  {
    id: "heart-chin-framing",
    name: "Chin Framing Cut",
    tagline:
      "Potongan dengan layer berujung di sekitar dagu untuk memberi aksen penuh pada rahang bawah.",
    faceShape: "Heart",
    hairLength: "short",
    hairTextures: ["straight"],
    impressions: ["Segar", "Berani", "Modern"],
    faceShapeCompatibility: {
      Heart: 0.92,
      Oval: 0.88,
      Round: 0.78,
      Square: 0.75,
      Oblong: 0.70,
    },
    mainImpression: "Segar, Berani, Modern",
    suitableFor: "Rambut Lurus",
    characteristics: [
      "Layer tepat melengkung di garis dagu",
      "Memberikan siluet visual yang lebih proporsional",
      "Cocok untuk aktivitas sehari-hari",
    ],
    stylingTips: [
      "Rapikan ujung layer agar mengarah ke dalam menuju leher",
      "Gunakan styling cream untuk hasil berkilau",
    ],
    matchScore: 88,
    previewImage: "/assets/style-hime-cut.jpg",
    detailImage: "/assets/style-hime-cut.jpg",
  },

  // --- OBLONG (LONJONG) ---
  {
    id: "oblong-volume-waves",
    name: "Voluminous Wave",
    tagline:
      "Gelombang mekar ke samping yang memberi ilusi lebar horizontal untuk menyeimbangkan wajah yang memanjang.",
    faceShape: "Oblong",
    hairLength: "medium",
    hairTextures: ["wavy", "curly"],
    impressions: ["Bervolume", "Mewah", "Anggun"],
    faceShapeCompatibility: {
      Oblong: 0.98,
      Oval: 0.90,
      Round: 0.75,
      Square: 0.85,
      Heart: 0.82,
    },
    mainImpression: "Bervolume, Mewah, Anggun",
    suitableFor: "Rambut Bergelombang",
    characteristics: [
      "Gelombang mengembang ke arah samping pelipis dan pipi",
      "Memecah kesan wajah yang terlalu panjang",
      "Memberikan tampilan penuh dan mewah",
    ],
    stylingTips: [
      "Gunakan roller rambut ukuran sedang di sisi kepala",
      "Blow dry dengan kepala terbalik untuk volume samping maksimal",
    ],
    matchScore: 95,
    previewImage: "/assets/style-long-wave.jpg",
    detailImage: "/assets/style-long-wave.jpg",
  },
  {
    id: "oblong-curtain-layer",
    name: "Fringe Layer Cut",
    tagline:
      "Layer bertingkat dengan poni depan penuh yang menutupi dahi dan mempersingkat siluet wajah lonjong.",
    faceShape: "Oblong",
    hairLength: "medium",
    hairTextures: ["straight", "wavy"],
    impressions: ["Muda", "Imut", "Chic"],
    faceShapeCompatibility: {
      Oblong: 0.95,
      Oval: 0.92,
      Round: 0.78,
      Square: 0.82,
      Heart: 0.88,
    },
    mainImpression: "Muda, Imut, Chic",
    suitableFor: "Rambut Lurus & Bergelombang",
    characteristics: [
      "Poni depan atau curtain bangs tebal",
      "Layer horizontal yang memberi dimensi menyamping",
      "Secara visual membuat wajah tampak lebih proporsional",
    ],
    stylingTips: [
      "Sisir poni lurus rapi menutupi dahi",
      "Tata layer samping mengembang natural",
    ],
    matchScore: 92,
    previewImage: "/assets/style-layer-cut.jpg",
    detailImage: "/assets/style-layer-cut.jpg",
  },
  {
    id: "oblong-side-fringe",
    name: "Shaggy Framing",
    tagline:
      "Potongan shaggy modern dengan trap samping di level pipi untuk menambah volume di bagian tengah wajah.",
    faceShape: "Oblong",
    hairLength: "short",
    hairTextures: ["straight"],
    impressions: ["Unik", "Berkarakter", "Modern"],
    faceShapeCompatibility: {
      Oblong: 0.91,
      Oval: 0.85,
      Round: 0.72,
      Square: 0.80,
      Heart: 0.80,
    },
    mainImpression: "Unik, Berkarakter, Modern",
    suitableFor: "Rambut Lurus",
    characteristics: [
      "Trap rambut tegas di sekitar pipi dan telinga",
      "Ujung rambut bertekstur menyamping",
      "Sangat efektif menyeimbangkan panjang dagu dan dahi",
    ],
    stylingTips: [
      "Gunakan styling wax untuk menonjolkan tekstur trap samping",
      "Biarkan acak natural untuk gaya kasual",
    ],
    matchScore: 87,
    previewImage: "/assets/style-hime-cut.jpg",
    detailImage: "/assets/style-hime-cut.jpg",
  },
];

export function getRecommendationsForFaceShape(faceShape: string): Recommendation[] {
  const normalized = (faceShape || "Oval").toLowerCase();
  const matched = RECOMMENDATIONS.filter(
    (r) => r.faceShape.toLowerCase() === normalized
  );
  if (matched.length > 0) return matched;
  return RECOMMENDATIONS.filter((r) => r.faceShape.toLowerCase() === "oval");
}

export const getRecommendationById = (id: string): Recommendation | undefined =>
  RECOMMENDATIONS.find((r) => r.id === id);

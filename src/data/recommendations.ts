export const RECOMMENDATION_STYLES = [
  "layer-cut",
  "long-wave",
  "hime-cut",
] as const;

export interface Recommendation {
  id: string;
  name: string;
  tagline: string;
  faceShape: string;
  mainImpression: string;
  suitableFor: string;
  characteristics: string[];
  stylingTips: string[];
  matchScore: number;
  previewImage: string;
  detailImage: string;
}

export const RECOMMENDATIONS: Recommendation[] = [
  {
    id: "layer-cut",
    name: "Layer Cut",
    tagline:
      "Gaya rambut panjang dengan layer bertingkat dan gelombang lembut yang memberikan kesan feminin, elegan, dan natural.",
    faceShape: "Oval",
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
];

export const getRecommendationById = (id: string): Recommendation | undefined =>
  RECOMMENDATIONS.find((r) => r.id === id);

import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond } from "next/font/google";
import { Playfair_Display } from "next/font/google";
import { Poppins } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Mona Salon",
  description: "Temukan gaya rambut terbaik untuk kamu dengan analisis bentuk wajah",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FAF3EC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${cormorant.variable} ${playfair.variable} ${poppins.variable} antialiased`}>
      <body className="min-h-dvh bg-cream font-sans antialiased">
        <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-cream pt-[env(safe-area-inset-top)]">
          {children}
        </div>
      </body>
    </html>
  );
}
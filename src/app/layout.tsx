import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import Shell from "@/components/Shell";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "First to know — Advisor inbox",
  description:
    "Match market and tax news to each family plan, then approve personal outreach at scale.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${sourceSans.variable} antialiased`}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}

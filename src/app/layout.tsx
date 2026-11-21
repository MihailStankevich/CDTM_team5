import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import Shell from "@/components/Shell";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "First to know — Advisor panel",
  description:
    "See what news and life changes mean for each client, and send a message that sounds like you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} antialiased`}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}

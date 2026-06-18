import type { Metadata } from "next";
import { Geist_Mono, Lexend, DM_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

// Headings: Lexend (MAV Systems brand font, variable).
const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
});

// Body: DM Sans (MAV Systems brand font, variable).
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MAV Systems",
  description: "MAV Systems — users & roles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${lexend.variable} ${dmSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-muted/30">
        {children}
        <Toaster richColors />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const fraunces = localFont({
  src: "./fonts/fraunces-560.woff2",
  weight: "560",
  variable: "--font-fraunces",
  display: "swap",
});
const plex = localFont({
  src: [
    { path: "./fonts/plex-400.woff2", weight: "400" },
    { path: "./fonts/plex-600.woff2", weight: "600" },
  ],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://made.class"),
  title: {
    default: "made.class — the school OS parents never install",
    template: "%s · made.class",
  },
  description:
    "India-first school operating system: one-tap attendance, transparent UPI fee collection, and every parent reached on WhatsApp — no app for families to install.",
  keywords: [
    "school management software India",
    "school ERP",
    "WhatsApp school communication",
    "UPI fee collection",
    "attendance app for schools",
    "school OS",
  ],
  openGraph: {
    type: "website",
    siteName: "made.class",
    title: "made.class — the school OS parents never install",
    description:
      "One-tap attendance, transparent UPI fees, and parents reached on WhatsApp. Built for Indian schools.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "made.class — the school OS parents never install",
    description:
      "One-tap attendance, transparent UPI fees, and parents reached on WhatsApp. Built for Indian schools.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${plex.variable}`}>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "made.class — School OS",
  description:
    "India-first School OS: attendance, fees with UPI, and WhatsApp-native parent communication.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-stone-100 text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}

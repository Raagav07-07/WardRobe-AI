import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Tara - Your Wardrobe Assistant",
  description: "Personal wardrobe manager and stylist",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        className={`h-full w-full bg-gray-100 ${inter.className}`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
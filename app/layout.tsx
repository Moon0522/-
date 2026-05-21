import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CanIBuyIt — Pre-Purchase Decision Assistant",
  description: "Before you buy, ask CanIBuyIt. Get a verdict on whether your finances support the purchase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0d0d0d] text-[#e8e4d9] antialiased">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThaiMarket MVP",
  description: "Public prediction board for Thai events."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}

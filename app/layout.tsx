import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Entropy Lab",
  description: "Chat, collect test cases, and compare prompt and model variants.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

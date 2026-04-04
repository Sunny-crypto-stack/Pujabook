import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HeyPuja — Find Trusted Priests in Your City",
  description:
    "Book verified Hindu priests for pujas, weddings, and ceremonies in Hyderabad, Bangalore and Mumbai. Instant booking, transparent pricing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased">{children}</body>
    </html>
  );
}

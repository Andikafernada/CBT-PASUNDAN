import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CBT SMK Pasundan 2 Bandung",
  description: "Sistem Asesmen Berbasis Komputer SMK Pasundan 2 Bandung - Development by Andika Fernanda",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}

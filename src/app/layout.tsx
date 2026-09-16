import type { Metadata } from "next";
import "./globals.css";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";

export const metadata: Metadata = {
  title: "CBT HEBAT SMK PASUNDAN 2 Bandung",
  description: "CBT HEBAT SMK PASUNDAN 2 Bandung - Development by Andika Fernanda",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0284c7" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CBT HEBAT" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen text-slate-900 antialiased bg-slate-50">
        {children}
        <PwaInstallPrompt />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.warn('[SW] Registration note:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

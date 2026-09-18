import type { Metadata } from "next";
import "./globals.css";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";

export const metadata: Metadata = {
  title: "Navin CBT - Digital Assessment Platform",
  description: "Navin CBT - Computer Based Test & Digital Assessment Platform developed by Navins Dev Digital Solutions • Bandung, Indonesia",
  manifest: "/manifest.json",
  icons: {
    icon: "/navin-icon.svg",
    shortcut: "/navin-icon.svg",
    apple: "/navin-icon.svg",
  },
  other: {
    google: "notranslate",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" translate="no" className="notranslate">
      <head>
        <meta name="google" content="notranslate" />
        <meta name="googlebot" content="notranslate" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/svg+xml" href="/navin-icon.svg" />
        <meta name="theme-color" content="#0284c7" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Navin CBT" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen text-slate-900 antialiased bg-slate-50 notranslate" translate="no">
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

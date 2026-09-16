"use client";

import React, { useEffect, useRef, useState } from "react";
import katex from "katex";
import { ImageLightbox } from "./ImageLightbox";

interface MathContentProps {
  content: string;
  className?: string;
}

export function MathContent({ content, className = "" }: MathContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const formatContent = (raw: string) => {
    if (!raw) return "";
    let processed = raw;

    // 1. Process markdown images ![alt](url) to <img src="url" alt="alt" />
    processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

    // 2. Replace display math \[...\] or $$...$$
    processed = processed.replace(/(?:\\\[([\s\S]+?)\\\]|\$\$([\s\S]+?)\$\$)/g, (_, math1, math2) => {
      const math = math1 || math2;
      try {
        return katex.renderToString(math, { displayMode: true, throwOnError: false });
      } catch {
        return math;
      }
    });

    // 3. Replace inline math \(...\) or $...$
    processed = processed.replace(/(?:\\\(([^\n]+?)\\\)|\$([^\$\n]+?)\$)/g, (_, math1, math2) => {
      const math = math1 || math2;
      try {
        return katex.renderToString(math, { displayMode: false, throwOnError: false });
      } catch {
        return math;
      }
    });

    // 4. Auto-detect unwrapped LaTeX commands (tanpa tanda $ $)
    // Memudahkan guru matematika, fisika, elektro agar tidak wajib mengetik tanda $ $
    const latexPattern = /\\(?:frac\s*\{[^{}]*\}\s*\{[^{}]*\}|sqrt(?:\[[^\]]*\])?\s*\{[^{}]*\}|(?:alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|lambda|mu|nu|xi|pi|rho|sigma|tau|phi|chi|psi|omega|Delta|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega|times|div|pm|mp|cdot|le|leq|ge|geq|ne|neq|approx|equiv|degree|infty|angle|parallel|perp|sum|int|iint|iiint|oint|prod|lim)(?:\s*[_^](?:\{[^{}]*\}|[0-9a-zA-Z]))*)/g;

    processed = processed.replace(latexPattern, (match) => {
      try {
        return katex.renderToString(match, { displayMode: false, throwOnError: false });
      } catch {
        return match;
      }
    });

    return processed;
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const formatted = formatContent(content);
    containerRef.current.innerHTML = formatted;

    // Attach click listeners to all rendered images to trigger Lightbox zoom
    const images = containerRef.current.querySelectorAll("img");
    images.forEach((img) => {
      img.style.cursor = "zoom-in";
      img.setAttribute("title", "Klik untuk memperbesar gambar");
      img.onclick = (e) => {
        e.stopPropagation();
        setLightboxSrc(img.src);
      };
    });

    // Arabic direction detection
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    if (arabicRegex.test(content || "")) {
      containerRef.current.setAttribute("dir", "auto");
      containerRef.current.classList.add("font-arabic");
    } else {
      containerRef.current.removeAttribute("dir");
      containerRef.current.classList.remove("font-arabic");
    }
  }, [content]);

  return (
    <>
      <div
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: formatContent(content) }}
        className={`leading-relaxed [&_img]:max-h-80 [&_img]:max-w-full [&_img]:rounded-xl [&_img]:border [&_img]:border-slate-200 [&_img]:my-3 [&_img]:block [&_img]:object-contain [&_img]:shadow-md [&_img]:bg-white [&_img]:p-1 [&_img]:transition-all [&_img]:hover:border-blue-400 [&_img]:hover:shadow-lg ${className}`}
      />

      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </>
  );
}

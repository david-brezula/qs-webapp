import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

// Best-effort load of Plus Jakarta Sans (700) so Latin-Extended diacritics
// (sk/cz/de/fr/sv) render. Falls back to the built-in font if the fetch fails
// (e.g. no network at build/runtime) — never throws.
//
// Memoised at module scope so the font is fetched at most once per server
// process: a build prerenders ~30 OG images (6 routes × 5 locales) and each
// previously re-ran two uncached Google Fonts fetches. A short abort timeout
// stops a slow/unreachable fonts.googleapis.com from stalling the whole build.
let fontPromise: Promise<ArrayBuffer | null> | undefined;

function fetchDisplayFont(): Promise<ArrayBuffer | null> {
  return (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const css = await fetch(
        "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700",
        { headers: { "User-Agent": "Mozilla/5.0" }, signal: controller.signal },
      ).then((r) => r.text());
      const url = css.match(/src:\s*url\((.+?)\)/)?.[1];
      if (!url) return null;
      return await fetch(url, { signal: controller.signal }).then((r) =>
        r.arrayBuffer(),
      );
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  })();
}

function loadDisplayFont(): Promise<ArrayBuffer | null> {
  return (fontPromise ??= fetchDisplayFont());
}

export async function renderOgImage({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  const font = await loadDisplayFont();
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          background: "#0F172A",
          color: "#ffffff",
          padding: 80,
          fontFamily: font ? "Jakarta" : "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="46" height="46" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="14" fill="none" stroke="#2563EB" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="5" fill="#2563EB" />
          </svg>
          <div style={{ fontSize: 30, letterSpacing: 3, color: "#94A3B8" }}>
            QUANTUM SPHERE
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 28, color: "#60A5FA", marginBottom: 18 }}>{eyebrow}</div>
          <div style={{ fontSize: 66, fontWeight: 700, lineHeight: 1.08, maxWidth: 1000 }}>
            {title}
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: font
        ? [{ name: "Jakarta", data: font, weight: 700 as const, style: "normal" as const }]
        : undefined,
    },
  );
}

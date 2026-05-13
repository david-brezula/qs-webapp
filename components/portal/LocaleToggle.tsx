"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function LocaleToggle({ current }: { current: "en" | "sk" }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function switchTo(next: "en" | "sk") {
    if (next === current) return;
    start(async () => {
      document.cookie = `locale=${next}; path=/; max-age=31536000; SameSite=Lax`;
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 text-xs font-semibold tracking-wide">
      {(["en", "sk"] as const).map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          onClick={() => switchTo(l)}
          className={`uppercase px-2 py-1 rounded ${
            l === current
              ? "bg-navy text-bg"
              : "text-slate-ink hover:text-navy"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

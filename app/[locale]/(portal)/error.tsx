"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
      <h2 className="text-xl font-semibold text-navy">{t("title")}</h2>
      <p className="text-sm text-muted max-w-sm">{t("message")}</p>
      <Button variant="primary" onClick={reset}>
        {t("retry")}
      </Button>
    </div>
  );
}

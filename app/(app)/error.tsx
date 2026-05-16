"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
      <h2 className="text-xl font-semibold text-navy">Something went wrong</h2>
      <p className="text-sm text-muted max-w-sm">
        An unexpected error occurred. Please try again or contact support if the problem persists.
      </p>
      <Button variant="primary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}

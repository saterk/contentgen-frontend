"use client";
/* eslint-disable @next/next/no-img-element -- a small static logo; next/image adds nothing here */

import { useState } from "react";

/**
 * Company logo from /public/aia-logo.png (the current wordmark from aia.co.th).
 * Until that file is there, a plain text label is shown instead of a broken image.
 */
export function Logo({ className = "h-8" }: { className?: string }) {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return <span className="text-base font-bold tracking-tight text-red-600">AIA Thailand</span>;
  }
  return <img src="/aia-logo.png" alt="AIA" className={`${className} w-auto`} onError={() => setMissing(true)} />;
}

/** Logo plus app name and department, used in the header and on the login page. */
export function Brand({ size = "md" }: { size?: "md" | "lg" }) {
  const lg = size === "lg";
  return (
    <div className="flex items-center gap-3">
      <Logo className={lg ? "h-11" : "h-8"} />
      <div className="border-l border-zinc-200 pl-3 leading-tight dark:border-zinc-700">
        <div className={`${lg ? "text-xl" : "text-lg"} font-semibold tracking-tight`}>Content Creator</div>
        <div className="text-xs text-zinc-500">Marketing Department · AIA Thailand</div>
      </div>
    </div>
  );
}

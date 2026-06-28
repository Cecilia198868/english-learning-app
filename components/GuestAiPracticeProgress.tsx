"use client";

import { useEffect, useState } from "react";
import {
  FREE_PRACTICE_DAILY_LIMIT,
  getFreePracticeUsage,
  type FreePracticeScope,
} from "@/lib/freePracticeLimit";

type GuestAiPracticeProgressProps = {
  className?: string;
  scope?: FreePracticeScope;
  used?: number;
};

function clampUsage(value: number) {
  return Math.min(Math.max(Math.floor(value), 0), FREE_PRACTICE_DAILY_LIMIT);
}

export default function GuestAiPracticeProgress({
  className = "",
  scope = "guided",
  used,
}: GuestAiPracticeProgressProps) {
  const [localUsed, setLocalUsed] = useState(0);
  const completed = clampUsage(used ?? localUsed);

  useEffect(() => {
    if (typeof used === "number") return;

    const timeoutId = window.setTimeout(() => {
      setLocalUsed(getFreePracticeUsage(scope).count);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [scope, used]);

  return (
    <section
      className={`sf-guest-ai-progress ${className}`.trim()}
      aria-label={`累计免费体验进度 ${completed} / ${FREE_PRACTICE_DAILY_LIMIT}`}
    >
      <div className="sf-guest-ai-progress-top">
        <span>累计免费体验进度</span>
        <strong>FREE</strong>
        <b>
          {completed}
          <i>/ {FREE_PRACTICE_DAILY_LIMIT}</i>
        </b>
      </div>
      <div className="sf-guest-ai-progress-bars" aria-hidden="true">
        {Array.from({ length: FREE_PRACTICE_DAILY_LIMIT }).map((_, index) => (
          <span key={index} className={index < completed ? "is-used" : undefined} />
        ))}
      </div>
    </section>
  );
}

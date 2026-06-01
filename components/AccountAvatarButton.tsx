"use client";

import type { MouseEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SessionResponse = {
  user?: {
    email?: string | null;
    image?: string | null;
    name?: string | null;
  } | null;
};

type AccountAvatarButtonProps = {
  ariaLabel?: string;
  className?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
};

const accountAvatarStoragePrefix = "speakflow-account-avatar";

function getAccountAvatarStorageKey(identifier: string) {
  return `${accountAvatarStoragePrefix}:${identifier || "local-user"}`;
}

export default function AccountAvatarButton({
  ariaLabel = "打开账户",
  className = "",
  onClick,
}: AccountAvatarButtonProps) {
  const router = useRouter();
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountImage, setAccountImage] = useState("");
  const [accountImageFailed, setAccountImageFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAccountSession() {
      try {
        const response = await fetch("/api/auth/session");
        const session = (await response.json()) as SessionResponse;
        if (cancelled) return;

        const nextName = session.user?.name || "";
        const nextEmail = session.user?.email || session.user?.name || "";
        const savedAvatar = window.localStorage.getItem(
          getAccountAvatarStorageKey(nextEmail || nextName)
        );

        setAccountName(nextName);
        setAccountEmail(nextEmail);
        setAccountImage(savedAvatar || session.user?.image || "");
        setAccountImageFailed(false);
      } catch {
        if (!cancelled) {
          setAccountName("");
          setAccountEmail("");
          setAccountImage("");
        }
      }
    }

    void loadAccountSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const accountAvatarLabel = (accountName || accountEmail || "CL")
    .slice(0, 2)
    .toUpperCase();

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (onClick) {
      onClick(event);
      return;
    }

    router.push("/account");
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={handleClick}
      className={`sf-app-avatar-button grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-white/70 bg-[#f7f4ff] text-[0.82rem] font-extrabold text-white shadow-[0_12px_26px_rgba(84,72,146,0.18)] ${className}`}
    >
      {accountImage && !accountImageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={accountImage}
          alt={accountEmail || "user"}
          className="h-full w-full object-cover"
          onError={() => setAccountImageFailed(true)}
        />
      ) : (
        <span className="grid h-full w-full place-items-center rounded-full bg-[linear-gradient(135deg,#ffd84d_0%,#f0b912_52%,#e9a70f_100%)] text-[#fff8dd]">
          {accountAvatarLabel}
        </span>
      )}
    </button>
  );
}

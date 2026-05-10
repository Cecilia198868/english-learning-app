"use client";

import { signIn } from "next-auth/react";

type LoginButtonProps = {
  disabled?: boolean;
};

export default function LoginButton({ disabled = false }: LoginButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) {
          return;
        }

        void signIn("google", { callbackUrl: "/dashboard" });
      }}
      className="w-full rounded-[1.75rem] border border-white/10 bg-white px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-slate-700"
    >
      Sign in with Google
    </button>
  );
}

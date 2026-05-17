"use client";

import Image from "next/image";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

type StartPageClientProps = {
  userEmail: string;
  userImage: string;
};

const startActions = [
  {
    href: "/speak-english",
    icon: "💬",
    label: "我要说英语",
    tone:
      "border-fuchsia-400/70 bg-[linear-gradient(100deg,rgba(95,8,102,0.86),rgba(40,9,76,0.88))] shadow-[0_26px_64px_rgba(168,45,206,0.22)]",
  },
  {
    href: "/dashboard",
    icon: "📘",
    label: "课程学习",
    tone:
      "border-blue-400/70 bg-[linear-gradient(100deg,rgba(8,39,94,0.86),rgba(5,20,59,0.9))] shadow-[0_26px_64px_rgba(37,99,235,0.22)]",
  },
  {
    href: "/vocabulary",
    icon: "🎯",
    label: "单词闯关",
    tone:
      "border-violet-400/70 bg-[linear-gradient(100deg,rgba(47,13,91,0.9),rgba(24,9,61,0.92))] shadow-[0_26px_64px_rgba(124,58,237,0.22)]",
  },
] as const;

export default function StartPageClient({
  userEmail,
  userImage,
}: StartPageClientProps) {
  return (
    <main className="responsive-page-shell relative min-h-[100dvh] overflow-x-hidden bg-[#030611] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_2%,rgba(151,42,179,0.26),transparent_34%),radial-gradient(circle_at_90%_18%,rgba(28,98,214,0.22),transparent_30%),linear-gradient(180deg,#11051e_0%,#050716_44%,#02040b_100%)]" />
      <div className="lux-grid pointer-events-none absolute inset-0 opacity-[0.10]" />
      <div className="aurora-wave pointer-events-none absolute left-[-18%] top-[6%] h-[24rem] w-[40rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,0,153,0.24),transparent_62%)] blur-[104px]" />
      <div className="aurora-wave pointer-events-none absolute right-[-18%] bottom-[-10%] h-[28rem] w-[42rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,116,255,0.22),transparent_62%)] blur-[116px]" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col gap-7 px-3 py-5 sm:px-5 sm:py-6 lg:px-6">
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-[26px] border border-fuchsia-400/34 bg-[#070a1d]/88 px-4 py-4 shadow-[0_18px_56px_rgba(0,0,0,0.34),0_0_26px_rgba(168,85,247,0.12)] backdrop-blur-2xl sm:flex-nowrap sm:px-5">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            {userImage ? (
              <Image
                src={userImage}
                alt={userEmail}
                width={52}
                height={52}
                className="h-12 w-12 shrink-0 rounded-full border border-white/14 object-cover sm:h-14 sm:w-14"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/10 font-[var(--font-sora)] text-lg font-bold sm:h-14 sm:w-14">
                {(userEmail || "U").slice(0, 1).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <p className="text-black-outline truncate font-[var(--font-sora)] text-sm font-extrabold text-white sm:text-base">
                {userEmail}
              </p>
              <p className="text-black-outline mt-1 text-xs font-extrabold text-emerald-300">
                已登录
              </p>
            </div>
          </div>

          <LogoutButton />
        </section>

        <section className="grid gap-5 sm:gap-6">
          {startActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`group flex min-h-[114px] min-w-0 items-center gap-4 rounded-[26px] border px-5 py-6 transition duration-200 hover:-translate-y-0.5 hover:brightness-110 sm:min-h-[122px] sm:gap-5 sm:px-6 ${action.tone}`}
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-white/18 bg-white/8 text-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                {action.icon}
              </span>
              <span className="text-black-outline min-w-0 flex-1 font-[var(--font-sora)] text-2xl font-extrabold tracking-normal text-white sm:text-3xl">
                {action.label}
              </span>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/6 text-3xl leading-none shadow-[0_0_22px_rgba(255,255,255,0.12)] transition group-hover:translate-x-1 group-hover:bg-white/10">
                ›
              </span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}

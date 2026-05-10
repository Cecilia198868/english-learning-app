"use client";

import Link from "next/link";

export default function HomePageClient() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090110] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#120216_0%,#090110_28%,#10031f_58%,#06010d_100%)]" />
      <div className="lux-grid absolute inset-0 opacity-[0.14]" />

      <div className="aurora-wave absolute left-[-10%] top-[-8%] h-[34rem] w-[46rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,0,153,0.34),transparent_58%)] blur-[92px]" />
      <div className="aurora-wave absolute right-[-8%] top-[4%] h-[36rem] w-[44rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,245,255,0.32),transparent_58%)] blur-[100px]" />
      <div className="aurora-wave absolute bottom-[-16%] left-1/2 h-[30rem] w-[56rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(138,43,255,0.26),transparent_60%)] blur-[126px]" />

      <div className="hero-glow absolute left-[10%] top-[24%] h-44 w-44 rounded-full bg-fuchsia-400/18 blur-[90px]" />
      <div className="hero-glow absolute right-[14%] top-[16%] h-56 w-56 rounded-full bg-cyan-300/16 blur-[110px]" />
      <div className="hero-glow absolute bottom-[18%] left-[22%] h-36 w-36 rounded-full bg-lime-300/10 blur-[80px]" />
      <div className="float-slow absolute left-[8%] top-[18%] h-px w-36 bg-gradient-to-r from-transparent via-fuchsia-300/70 to-transparent" />
      <div className="float-slow absolute right-[10%] top-[24%] h-px w-44 bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
      <div className="float-slow absolute left-1/2 top-[72%] h-px w-52 -translate-x-1/2 bg-gradient-to-r from-transparent via-lime-200/55 to-transparent" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10 sm:px-8">
        <section className="relative w-full text-center">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-fuchsia-300/14" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/14" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/6" />

          <div className="relative mx-auto max-w-5xl">
            <h1 className="neon-flicker font-[var(--font-sora)] text-[3rem] font-semibold uppercase leading-[0.9] tracking-[-0.075em] text-white sm:text-[5.2rem] lg:text-[7.2rem]">
              <span className="block text-white [text-shadow:0_0_26px_rgba(255,255,255,0.34)]">
                Speak English
              </span>
              <span className="title-shimmer mt-4 block bg-[linear-gradient(90deg,#ffffff_0%,#ff8dcb_16%,#67f6ff_40%,#b388ff_64%,#ecff8a_82%,#ffffff_100%)] bg-clip-text pb-4 text-transparent [text-shadow:0_0_42px_rgba(255,0,153,0.34)] sm:mt-5">
                Out Loud
              </span>
            </h1>

            <div className="mx-auto mt-6 h-px w-48 bg-gradient-to-r from-transparent via-fuchsia-200/80 to-transparent sm:mt-8" />

            <Link
              href="/languages"
              className="group relative mx-auto mt-12 inline-flex w-full max-w-2xl items-center justify-center overflow-hidden rounded-full px-6 py-4 text-center font-[var(--font-sora)] text-base font-semibold uppercase tracking-[0.26em] text-white transition duration-300 hover:scale-[1.02] hover:tracking-[0.3em] sm:mt-14 sm:text-[1.12rem]"
            >
              <span className="absolute inset-x-[8%] bottom-0 h-px bg-gradient-to-r from-transparent via-fuchsia-300/90 to-cyan-200/90" />
              <span className="absolute left-1/2 top-1/2 h-16 w-[84%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,rgba(255,0,153,0.18),rgba(0,245,255,0.14),rgba(217,255,77,0.12))] opacity-95 blur-xl transition duration-300 group-hover:scale-110 group-hover:opacity-100" />
              <span className="absolute left-1/2 top-1/2 h-14 w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-[rgba(255,255,255,0.03)]" />
              <span className="relative text-white [text-shadow:0_0_18px_rgba(255,255,255,0.28)]">
                Choose Your Base Language
              </span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";

export default function HomePageClient() {
  return (
    <main className="responsive-page-shell sf-home-page relative min-h-[100dvh] w-full overflow-x-hidden">
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="sf-home-stage relative w-full max-w-5xl overflow-hidden px-5 py-12 text-center sm:px-10 sm:py-16">
          <div className="sf-home-orbit sf-home-orbit-lg" />
          <div className="sf-home-orbit sf-home-orbit-sm" />

          <div className="sf-home-logo relative z-10 mx-auto">
            <Image
              src="/brand/speakflow-mark.png"
              alt="SpeakFlow"
              width={499}
              height={272}
              priority
              sizes="(max-width: 760px) 34vw, 150px"
              className="h-auto w-full"
            />
          </div>

          <h1 className="sf-home-title relative z-10 font-[var(--font-sora)] text-[clamp(3.7rem,14vw,8.25rem)] font-semibold uppercase leading-[0.88] tracking-normal">
            SpeakFlow
          </h1>

          <div className="sf-home-hairline relative z-10 mx-auto mt-9 w-44" />

          <p className="sf-home-copy relative z-10 mx-auto mt-8 max-w-[590px] text-base font-medium leading-8 sm:text-xl">
            A calm voice practice space for turning your own language into natural English.
          </p>

          <Link
            href="/languages"
            className="sf-home-button relative z-10 mx-auto mt-12 inline-flex w-full max-w-[475px] cursor-pointer items-center justify-center rounded-[26px] px-5 py-5 text-center font-[var(--font-sora)] text-[0.95rem] font-extrabold uppercase tracking-normal transition duration-200 sm:text-[1.05rem]"
          >
            <span className="relative z-10">Choose Your Base Language</span>
          </Link>
        </section>
      </div>
    </main>
  );
}

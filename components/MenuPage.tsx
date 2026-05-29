"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SessionResponse = {
  user?: {
    avatarUrl?: string | null;
    image?: string | null;
    photoURL?: string | null;
    photoUrl?: string | null;
    picture?: string | null;
  } | null;
};

function getAvatarSrc(user?: SessionResponse["user"]) {
  return (
    user?.avatarUrl ||
    user?.image ||
    user?.photoURL ||
    user?.photoUrl ||
    user?.picture ||
    "/default-avatar.png"
  );
}

export default function MenuPage() {
  const router = useRouter();
  const [avatarSrc, setAvatarSrc] = useState("/default-avatar.png");

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const session = (await response.json()) as SessionResponse;

        if (!cancelled) {
          setAvatarSrc(getAvatarSrc(session.user));
        }
      } catch {
        if (!cancelled) {
          setAvatarSrc("/default-avatar.png");
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="sf-menu-page">
      <div className="sf-menu-page-phone">
        <div className="sf-menu-page-frame">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/Menu-page.png"
            alt=""
            aria-hidden="true"
            className="sf-menu-page-image"
            draggable={false}
          />

          <span aria-hidden="true" className="sf-menu-page-avatar">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarSrc}
              alt=""
              className="sf-menu-page-avatar-image"
              onError={() => setAvatarSrc("/default-avatar.png")}
            />
          </span>

          <button
            type="button"
            aria-label="返回自由学习第一页"
            onClick={() => router.push("/free-study/step-1")}
            className="sf-menu-page-hit sf-menu-page-menu-hit"
          />
          <button
            type="button"
            aria-label="打开账户界面"
            onClick={() => router.push("/speak-english?account=1")}
            className="sf-menu-page-hit sf-menu-page-avatar-hit"
          />
          <button
            type="button"
            aria-label="Open AI guided expression"
            onClick={() => router.push("/ai-guided-expression/step-1")}
            className="sf-menu-page-hit sf-menu-page-ai-hit"
          />
          <button
            type="button"
            aria-label="Open new expressions"
            onClick={() => router.push("/new-expressions")}
            className="sf-menu-page-hit sf-menu-page-new-hit"
          />
          <button
            type="button"
            aria-label="Open classic scenes"
            onClick={() => router.push("/classic-scenes")}
            className="sf-menu-page-hit sf-menu-page-classic-hit"
          />
        </div>
      </div>
    </main>
  );
}

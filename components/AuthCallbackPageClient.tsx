"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import styles from "./PasswordlessLoginPageClient.module.css";

export default function AuthCallbackPageClient() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/start";
  const code = searchParams.get("code");
  const searchError =
    searchParams.get("error_description") || searchParams.get("error");
  const [message, setMessage] = useState("正在完成邮箱登录...");
  const [isFailed, setIsFailed] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function completeEmailLogin() {
      try {
        const supabase = getSupabaseBrowserClient();
        const hashParams = new URLSearchParams(
          window.location.hash.replace(/^#/, "")
        );
        const callbackError =
          searchError ||
          hashParams.get("error_description") ||
          hashParams.get("error");

        console.log("[auth][email.callback.received]", {
          callbackUrl,
          hashParamNames: Array.from(hashParams.keys()),
          hasCode: Boolean(code),
          searchParamNames: Array.from(
            new URLSearchParams(window.location.search).keys()
          ),
        });

        if (callbackError) {
          throw new Error(callbackError);
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          console.log("[auth][email.callback.exchangeCodeForSession]", {
            error,
          });

          if (error) {
            throw error;
          }
        }

        const { data, error } = await supabase.auth.getSession();
        console.log("[auth][email.callback.getSession]", {
          error,
          hasSession: Boolean(data.session),
        });

        if (error) {
          throw error;
        }

        if (!data.session) {
          throw new Error("邮箱登录回调没有获取到会话，请重新发送验证码。");
        }

        if (!isCancelled) {
          setMessage("登录成功，正在进入 SpeakFlow...");
          window.location.assign(callbackUrl);
        }
      } catch (error) {
        console.error("[auth][email.callback.error]", error);
        if (!isCancelled) {
          setIsFailed(true);
          setMessage(
            error instanceof Error ? error.message : "邮箱登录失败，请重新尝试。"
          );
        }
      }
    }

    void completeEmailLogin();

    return () => {
      isCancelled = true;
    };
  }, [callbackUrl, code, searchError]);

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-label="邮箱登录回调">
        <span className={styles.handle} aria-hidden="true" />
        <h1>{isFailed ? "邮箱登录失败" : "邮箱登录"}</h1>
        <div className={styles.message}>{message}</div>
        {isFailed ? (
          <Link href="/login/email" className={styles.linkButton}>
            重新登录
          </Link>
        ) : null}
      </section>
    </main>
  );
}

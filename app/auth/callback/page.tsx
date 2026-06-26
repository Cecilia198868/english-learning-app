import { Suspense } from "react";
import AuthCallbackPageClient from "@/components/AuthCallbackPageClient";
import styles from "@/components/PasswordlessLoginPageClient.module.css";

export const dynamic = "force-dynamic";

function AuthCallbackFallback() {
  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-label="邮箱登录回调">
        <span className={styles.handle} aria-hidden="true" />
        <h1>邮箱登录</h1>
        <div className={styles.message}>正在完成邮箱登录...</div>
      </section>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackPageClient />
    </Suspense>
  );
}

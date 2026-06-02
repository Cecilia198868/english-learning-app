import Image from "next/image";
import Link from "next/link";
import styles from "./GuestMenuPage.module.css";

type MenuTone = "home" | "login" | "pro" | "help" | "about";
type MenuIconName = "home" | "login" | "star" | "help" | "info";

const guestMenuRows: Array<{
  description: string;
  href: string;
  icon: MenuIconName;
  label: string;
  tone: MenuTone;
}> = [
  {
    description: "回到首页，继续你的学习",
    href: "/start",
    icon: "home",
    label: "首页",
    tone: "home",
  },
  {
    description: "登录你的账号，同步学习进度",
    href: "/login",
    icon: "login",
    label: "登录",
    tone: "login",
  },
  {
    description: "解锁全部功能，畅享无限练习",
    href: "/speak-english?pro=1",
    icon: "star",
    label: "升级 Pro",
    tone: "pro",
  },
  {
    description: "常见问题与使用指南",
    href: "/speak-english?account=1&panel=helpCenter",
    icon: "help",
    label: "帮助",
    tone: "help",
  },
  {
    description: "了解 SpeakFlow",
    href: "/speak-english?account=1&panel=aboutSpeakFlow",
    icon: "info",
    label: "关于",
    tone: "about",
  },
];

function CrownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 18.5h16l1.2-10.2-5.2 3.8L12 4.5l-4 7.6-5.2-3.8L4 18.5Zm1 2.2h14v1.8H5v-1.8Z" />
    </svg>
  );
}

function MenuIcon({ name }: { name: MenuIconName }) {
  if (name === "home") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path d="m5.5 15.4 10.5-9 10.5 9v11a2.2 2.2 0 0 1-2.2 2.2h-5.1v-8.3h-7.4v8.3H7.7a2.2 2.2 0 0 1-2.2-2.2v-11Z" />
      </svg>
    );
  }

  if (name === "login") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <circle cx="16" cy="11.5" r="5.3" />
        <path d="M6.5 27c1.8-5.4 5.2-8.2 9.5-8.2s7.7 2.8 9.5 8.2" />
      </svg>
    );
  }

  if (name === "star") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path d="m16 4.4 3.4 7 7.7 1.1-5.6 5.4 1.3 7.7L16 22l-6.8 3.6 1.3-7.7-5.6-5.4 7.7-1.1L16 4.4Z" />
      </svg>
    );
  }

  if (name === "help") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path d="M12.2 11.2a5 5 0 0 1 9.7 1.8c0 3.6-4.1 4.4-4.1 7.5" />
        <path d="M16.8 25.5h.1" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="11.5" />
      <path d="M16 14.5v8M16 9.5h.1" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export default function GuestMenuPage() {
  return (
    <main className={styles.page}>
      <section className={styles.phone} aria-label="SpeakFlow 游客菜单">
        <header className={styles.hero}>
          <div className={styles.brandRow}>
            <Link href="/" className={styles.brand} aria-label="SpeakFlow 首页">
              <span className={styles.brandIcon}>
                <Image
                  alt=""
                  height={64}
                  priority
                  sizes="50px"
                  src="/brand/speakflow-app-icon.png"
                  width={64}
                />
              </span>
              <span className={styles.brandText}>SpeakFlow</span>
            </Link>

            <Link href="/speak-english?pro=1" className={styles.proPill}>
              <CrownIcon />
              <span>Pro</span>
            </Link>
          </div>

          <div className={styles.heroCopy}>
            <h1>流利表达，自信开口</h1>
            <p>AI 陪你练习地道英语口语</p>
          </div>

          <span aria-hidden="true" className={styles.decorDot} />
          <span aria-hidden="true" className={styles.decorDotSmall} />
          <span aria-hidden="true" className={styles.bubbleDots}>
            <span />
            <span />
            <span />
          </span>
        </header>

        <nav className={styles.menuList} aria-label="游客导航">
          {guestMenuRows.map((row) => (
            <Link key={row.label} href={row.href} className={styles.menuRow}>
              <span className={styles.rowIcon} data-tone={row.tone}>
                <MenuIcon name={row.icon} />
              </span>
              <span className={styles.rowCopy}>
                <strong>{row.label}</strong>
                <small>{row.description}</small>
              </span>
              <span className={styles.chevron}>
                <ChevronIcon />
              </span>
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}

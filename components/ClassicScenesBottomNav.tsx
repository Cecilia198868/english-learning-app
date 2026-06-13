"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import styles from "./ClassicScenesBottomNav.module.css";

type ClassicProgressSnapshot = {
  challenge?: {
    completed?: number;
    goal?: number;
    percent?: number;
  };
  dailyGoal?: number;
  streakDays?: number;
  todayCompleted?: number;
  totalCompleted?: number;
};

type ClassicProgressApiPayload = ClassicProgressSnapshot & {
  data?: ClassicProgressSnapshot;
  progress?: ClassicProgressSnapshot;
  snapshot?: ClassicProgressSnapshot;
};

type ClassicScenesBottomNavProps = {
  onHelpOpen?: () => void;
};

function FixedLayerPortal({
  children,
  target,
}: {
  children: ReactNode;
  target: HTMLElement | null;
}) {
  return target ? createPortal(children, target) : null;
}

function normalizeProgressPayload(
  payload: ClassicProgressApiPayload,
): ClassicProgressSnapshot {
  return payload.progress ?? payload.snapshot ?? payload.data ?? payload;
}

function ClassicHomeIcon() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <path d="M4.8 13.4 14 5.8l9.2 7.6v9.4a1.8 1.8 0 0 1-1.8 1.8h-4.8v-6.7h-5.2v6.7H6.6a1.8 1.8 0 0 1-1.8-1.8v-9.4Z" />
    </svg>
  );
}

function ClassicProgressIcon() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <circle cx="14" cy="14" r="10.8" />
      <path d="m12.1 9.9 6.3 4.1-6.3 4.1V9.9Z" />
    </svg>
  );
}

function ClassicHelpIcon() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <circle cx="14" cy="14" r="10.7" />
      <path d="M10.9 11a3.2 3.2 0 0 1 3.2-2.4c2 0 3.6 1.2 3.6 3.1 0 1.4-.8 2.2-2.3 3.1-1 .6-1.4 1.1-1.4 2.3" />
      <path d="M14 20.6h.1" />
    </svg>
  );
}

function ClassicAccountIcon() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <circle cx="14" cy="9.6" r="4.1" />
      <path d="M5.8 24.2c.9-4.4 4-6.8 8.2-6.8s7.3 2.4 8.2 6.8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export default function ClassicScenesBottomNav({
  onHelpOpen,
}: ClassicScenesBottomNavProps = {}) {
  const router = useRouter();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [bottomNavPortalRoot, setBottomNavPortalRoot] =
    useState<HTMLElement | null>(null);
  const [isProgressLoading, setIsProgressLoading] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [progressError, setProgressError] = useState("");
  const [progressSnapshot, setProgressSnapshot] =
    useState<ClassicProgressSnapshot | null>(null);

  const closeModals = () => {
    setIsHelpOpen(false);
    setIsProgressOpen(false);
  };

  useEffect(() => {
    setBottomNavPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!isHelpOpen && !isProgressOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModals();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isHelpOpen, isProgressOpen]);

  useEffect(() => {
    if (!isProgressOpen) return;

    const controller = new AbortController();

    async function loadProgress() {
      setIsProgressLoading(true);
      setProgressError("");

      try {
        const response = await fetch("/api/ai-guided-expression/progress", {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load progress");
        }

        const payload = (await response.json()) as ClassicProgressApiPayload;

        if (!controller.signal.aborted) {
          setProgressSnapshot(normalizeProgressPayload(payload));
        }
      } catch {
        if (!controller.signal.aborted) {
          setProgressError("暂时无法读取后台学习进度，请稍后再试。");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsProgressLoading(false);
        }
      }
    }

    loadProgress();

    return () => controller.abort();
  }, [isProgressOpen]);

  const todayCompleted =
    progressSnapshot?.todayCompleted ?? progressSnapshot?.challenge?.completed ?? 0;
  const dailyGoal =
    progressSnapshot?.dailyGoal ?? progressSnapshot?.challenge?.goal ?? 5;
  const challengePercent =
    progressSnapshot?.challenge?.percent ??
    Math.min(100, Math.round((todayCompleted / Math.max(dailyGoal, 1)) * 100));
  const streakDays = progressSnapshot?.streakDays ?? 0;
  const totalCompleted = progressSnapshot?.totalCompleted ?? todayCompleted;

  return (
    <FixedLayerPortal target={bottomNavPortalRoot}>
      <>
      <nav className={styles.bottomNav} aria-label="经典场景学习导航">
        <button
          className={`${styles.bottomNavButton} ${styles.bottomNavButtonActive}`}
          type="button"
          aria-label="回到学习首页"
          onClick={() => router.push("/start")}
        >
          <ClassicHomeIcon />
        </button>
        <button
          className={styles.bottomNavButton}
          type="button"
          aria-label="查看学习进度"
          onClick={() => setIsProgressOpen(true)}
        >
          <ClassicProgressIcon />
        </button>
        <button
          className={styles.bottomNavButton}
          type="button"
          aria-label="打开使用帮助"
          onClick={() => {
            if (onHelpOpen) {
              onHelpOpen();
              return;
            }

            setIsHelpOpen(true);
          }}
        >
          <ClassicHelpIcon />
        </button>
        <button
          className={styles.bottomNavButton}
          type="button"
          aria-label="打开账户界面"
          onClick={() => router.push("/account")}
        >
          <ClassicAccountIcon />
        </button>
      </nav>

      {isProgressOpen ? (
        <div className={styles.modalBackdrop} onClick={closeModals}>
          <section
            className={styles.modalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="classic-progress-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className={styles.modalClose}
              type="button"
              aria-label="关闭学习进度"
              onClick={closeModals}
            >
              <CloseIcon />
            </button>
            <h2 id="classic-progress-title">学习进度</h2>
            <p>进度会读取后台学习记录，和你的学习数据保持一致。</p>
            {isProgressLoading ? (
              <div className={styles.modalStatus}>正在读取学习进度...</div>
            ) : progressError ? (
              <div className={styles.modalStatus}>{progressError}</div>
            ) : (
              <div className={styles.progressGrid}>
                <span>
                  <strong>{todayCompleted}</strong>
                  <small>今日完成</small>
                </span>
                <span>
                  <strong>{challengePercent}%</strong>
                  <small>今日目标</small>
                </span>
                <span>
                  <strong>{streakDays}</strong>
                  <small>连续天数</small>
                </span>
                <span>
                  <strong>{totalCompleted}</strong>
                  <small>累计练习</small>
                </span>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {isHelpOpen ? (
        <div className={styles.modalBackdrop} onClick={closeModals}>
          <section
            className={styles.modalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="classic-help-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className={styles.modalClose}
              type="button"
              aria-label="关闭使用帮助"
              onClick={closeModals}
            >
              <CloseIcon />
            </button>
            <h2 id="classic-help-title">使用帮助</h2>
            <p>选择一个生活场景分类，进入后按主题练习高频口语表达。</p>
            <ul className={styles.helpList}>
              <li>金融与行政事务已开放课程，其余分类会继续补齐。</li>
              <li>底部首页、进度、帮助、账户入口都可以直接使用。</li>
              <li>如果是游客模式，未开放课程会保持锁定。</li>
            </ul>
          </section>
        </div>
      ) : null}
      </>
    </FixedLayerPortal>
  );
}

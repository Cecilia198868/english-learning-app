"use client";

import { useRef } from "react";
import Link from "next/link";
import type {
  NativeFlowLevel,
  NativeFlowProgressRow,
  NativeFlowSentence,
} from "@/data/nativeFlow/courseData";
import styles from "./NativeFlowPages.module.css";

function BackIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="m15 5-7 7 7 7" />
    </svg>
  );
}

function ChevronIcon({ direction = "right" }: { direction?: "right" | "left" | "up" }) {
  return (
    <svg
      aria-hidden="true"
      className={direction === "left" ? styles.chevronLeft : direction === "up" ? styles.chevronUp : undefined}
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

function MiniIcon({ type }: { type: "wave" | "heart" | "loop" | "calendar" | "book" | "clock" | "chart" | "check" | "fire" }) {
  if (type === "heart") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <path d="M12 20s-7-4.4-9-9.2C1.6 7.3 3.5 4 7 4c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.5 0 5.4 3.3 4 6.8C19 15.6 12 20 12 20Z" />
      </svg>
    );
  }

  if (type === "loop") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <path d="M7 7a7 7 0 0 1 10 0l1 1M17 17a7 7 0 0 1-10 0l-1-1" />
        <path d="M18 4v4h-4M6 20v-4h4" />
      </svg>
    );
  }

  if (type === "calendar") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </svg>
    );
  }

  if (type === "book") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H20v17H8.5A3.5 3.5 0 0 0 5 22V5.5Z" />
        <path d="M5 19a3.5 3.5 0 0 1 3.5-3.5H20" />
      </svg>
    );
  }

  if (type === "clock") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (type === "chart") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <path d="M4 19h16M7 16v-5M12 16V7M17 16v-8" />
      </svg>
    );
  }

  if (type === "check") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <path d="m6 12 4 4 8-9" />
      </svg>
    );
  }

  if (type === "fire") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <path d="M12 21c-4 0-7-2.8-7-6.6 0-2.8 1.8-5.3 4.7-7.5-.2 2 1 3.4 2.3 4.1.4-3.2 2.4-5.6 5.2-7.1-.5 3.2.6 5.1 1.7 6.8.7 1.1 1.1 2.3 1.1 3.7 0 3.8-3 6.6-8 6.6Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M4 12v.01M8 8v8M12 5v14M16 8v8M20 12v.01" />
    </svg>
  );
}

function HeadphonesIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 64 64">
      <path d="M12 37v-7c0-12 8.4-21 20-21s20 9 20 21v7" />
      <path d="M12 37h9v16h-4a5 5 0 0 1-5-5V37ZM52 37h-9v16h4a5 5 0 0 0 5-5V37Z" />
      <path d="M43 53c-2.7 2.5-6.3 3.8-11 3.8" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-8.5Z" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M12 20c4.4 0 8-3.4 8-7.6S16.4 5 12 5s-8 3.4-8 7.4c0 1.8.7 3.4 1.9 4.7L5 21l4.2-1.8c.9.5 1.8.8 2.8.8Z" />
      <path d="M9.8 10a2.4 2.4 0 0 1 4.5 1.2c0 1.8-2.3 1.8-2.3 3.4M12 17.4v.1" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21c1.2-4.2 3.7-6.3 7.5-6.3s6.3 2.1 7.5 6.3" />
    </svg>
  );
}

function LevelArt({ tone }: { tone: NativeFlowLevel["tone"] }) {
  if (tone === "green") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 120 120">
        <rect width="120" height="120" rx="26" fill="#fff" />
        <path d="M60 82V48" stroke="#1e9a7c" strokeLinecap="round" strokeWidth="5" />
        <path d="M58 50C40 31 26 35 22 37c3 17 17 25 36 18Z" fill="#65d6c8" />
        <path d="M63 48c15-22 30-20 35-17-1 17-13 27-35 22Z" fill="#45c4b3" />
        <ellipse cx="60" cy="88" rx="32" ry="9" fill="#24b79b" opacity=".7" />
      </svg>
    );
  }

  if (tone === "blue") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 120 120">
        <rect width="120" height="120" rx="26" fill="#fff" />
        <path d="M61 77V43" stroke="#1e61d6" strokeLinecap="round" strokeWidth="6" />
        <path d="M36 77c5-18 15-26 25-25 12 1 21 12 24 27" fill="#6da5ff" />
        <path d="M31 61c8-16 25-17 31-4 5-15 25-16 31 1 1 7-6 13-17 12-6 0-10-3-14-8-4 8-11 12-20 11-10-1-15-5-11-12Z" fill="#4389f4" />
        <ellipse cx="60" cy="88" rx="36" ry="9" fill="#226adf" opacity=".6" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 120 120">
      <rect width="120" height="120" rx="26" fill="#fff" />
      <path d="M64 30v28" stroke="#6d4df4" strokeLinecap="round" strokeWidth="5" />
      <path d="M64 31h25l-8 8 8 8H64V31Z" fill="#6d4df4" />
      <path d="m20 88 27-42 16 24 10-16 27 34H20Z" fill="#7d5dff" />
      <path d="m20 88 20-31 17 31H20Z" fill="#5f48df" opacity=".72" />
      <ellipse cx="60" cy="91" rx="40" ry="8" fill="#6d4df4" opacity=".2" />
    </svg>
  );
}

function HeroHeadphones() {
  return (
    <svg aria-hidden="true" className={styles.heroHeadphones} focusable="false" viewBox="0 0 360 310">
      <defs>
        <linearGradient id="native-flow-hero-headphones" x1="77" x2="292" y1="31" y2="244">
          <stop stopColor="#486eff" />
          <stop offset=".5" stopColor="#2d62e8" />
          <stop offset="1" stopColor="#6d8cff" />
        </linearGradient>
      </defs>
      <path
        d="M76 170C76 83 130 30 206 42c68 10 114 61 115 142"
        fill="none"
        stroke="url(#native-flow-hero-headphones)"
        strokeLinecap="round"
        strokeWidth="42"
      />
      <rect x="57" y="150" width="75" height="103" rx="35" fill="#3268ec" transform="rotate(-8 94 202)" />
      <rect x="224" y="158" width="80" height="110" rx="37" fill="#3d70f1" transform="rotate(14 264 213)" />
      <ellipse cx="94" cy="202" rx="26" ry="45" fill="#1d3d9d" opacity=".58" transform="rotate(-8 94 202)" />
      <ellipse cx="264" cy="213" rx="27" ry="48" fill="#1f44a9" opacity=".55" transform="rotate(14 264 213)" />
      <path d="M32 185c59-29 109-26 151 8 43 35 87 35 132 0" fill="none" stroke="#8fb7ff" strokeOpacity=".28" strokeWidth="3" />
      <path d="M14 218c77-36 141-33 190 10 37 33 78 38 123 17" fill="none" stroke="#6fa0ff" strokeOpacity=".18" strokeWidth="3" />
      <path d="M80 93v42M65 114h30" stroke="#80a8ff" strokeLinecap="round" strokeWidth="5" />
      <path d="M37 238h.1M323 116h.1M312 256h.1" stroke="#82a8ff" strokeLinecap="round" strokeWidth="16" />
    </svg>
  );
}

function PageShell({
  children,
  className = "",
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <main className={styles.page}>
      <section className={`${styles.phone} ${className}`} aria-label={label}>
        {children}
      </section>
    </main>
  );
}

function MenuBottomNav() {
  return (
    <nav className={styles.menuBottomNav} aria-label="地道语感训练底部导航">
      <Link href="/start" aria-label="返回首页">
        <HomeIcon />
      </Link>
      <Link href="/native-flow/records" aria-label="查看学习记录">
        <MiniIcon type="chart" />
      </Link>
      <Link href="/native-flow" aria-label="查看帮助">
        <HelpIcon />
      </Link>
      <Link href="/account" aria-label="打开账户">
        <UserIcon />
      </Link>
    </nav>
  );
}

export function NativeFlowMenuPage({ levels }: { levels: NativeFlowLevel[] }) {
  return (
    <PageShell className={styles.menuPhone} label="地道语感训练级别选择页">
      <header className={styles.menuHeader}>
        <Link className={styles.roundBack} href="/start" aria-label="返回学习首页">
          <BackIcon />
        </Link>
        <div className={styles.menuBrand}>
          <span>
            <HeadphonesIcon />
          </span>
          <div>
            <h1>地道语感训练</h1>
            <p>让英语像音乐一样流出来</p>
          </div>
        </div>
        <span className={styles.menuHeaderSpacer} aria-hidden="true" />
      </header>

      <section className={styles.menuHero}>
        <div className={styles.heroCopy}>
          <h2>
            从听到说，
            <br />
            培养地道语感
          </h2>
          <ul>
            <li>
              <MiniIcon type="wave" />
              听原声，模仿语流节奏
            </li>
            <li>
              <MiniIcon type="heart" />
              跟读练习，培养自然表达
            </li>
            <li>
              <MiniIcon type="loop" />
              30天 × 20句，稳步提升
            </li>
          </ul>
        </div>
        <HeroHeadphones />
      </section>

      <section className={styles.levelSection} aria-labelledby="native-flow-level-title">
        <h2 id="native-flow-level-title">选择你的训练级别</h2>
        <div className={styles.levelStack}>
          {levels.map((level) => (
            <Link
              className={styles.levelCard}
              data-tone={level.tone}
              href={`/native-flow/${level.id}/learn`}
              key={level.id}
            >
              <span className={styles.levelArt}>
                <LevelArt tone={level.tone} />
              </span>
              <span className={styles.levelCopy}>
                <span className={styles.levelBadge}>{level.badge}</span>
                <strong>
                  {level.title}
                  <span> · {level.englishTitle}</span>
                </strong>
                <small>{level.description}</small>
                <span className={styles.levelMeta}>
                  <i>
                    <MiniIcon type="calendar" />
                    {level.totalDays}天课程
                  </i>
                  <i>
                    <MiniIcon type="book" />
                    共{level.totalSentences}句
                  </i>
                  <i>
                    <MiniIcon type="clock" />
                    每天{level.dailySentences}句
                  </i>
                </span>
              </span>
              <span className={styles.levelChevron}>
                <ChevronIcon />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <aside className={styles.totalCard}>
        <span>
          <HeadphonesIcon />
        </span>
        <div>
          <strong>总计 600+ 真实美语长句</strong>
          <p>坚持练习，英语会更自然地流出来！</p>
        </div>
        <MiniIcon type="chart" />
      </aside>
      <MenuBottomNav />
    </PageShell>
  );
}

function getLevelById(levels: NativeFlowLevel[], levelId: string) {
  return levels.find((level) => level.id === levelId) || levels[0];
}

export function NativeFlowRecordsPage({
  levels,
  progressRows,
}: {
  levels: NativeFlowLevel[];
  progressRows: NativeFlowProgressRow[];
}) {
  const calendarDays = [28, 29, 30, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 1];
  const tealDays = new Set([1, 2, 5, 6, 7, 8, 10, 12, 13, 14, 15, 17, 19, 21, 22, 26]);
  const purpleDays = new Set([3, 4, 9, 16, 20]);

  return (
    <PageShell label="地道语感训练学习记录页">
      <header className={styles.recordHeader}>
        <Link className={styles.roundBack} href="/native-flow" aria-label="返回地道语感训练">
          <BackIcon />
        </Link>
        <div>
          <h1>学习记录</h1>
          <p>你的每一次练习，都是进步的足迹</p>
        </div>
      </header>

      <section className={styles.overviewCard}>
        <div className={styles.overviewLead}>
          <strong>总学习概览</strong>
          <p>
            <span>45</span> 天
          </p>
          <small>累计学习天数</small>
        </div>
        <div className={styles.overviewMetric} data-tone="purple">
          <span>
            <HeadphonesIcon />
          </span>
          <strong>1,320 <small>句</small></strong>
          <p>累计跟读句子</p>
        </div>
        <div className={styles.overviewMetric} data-tone="teal">
          <span>
            <MiniIcon type="check" />
          </span>
          <strong>26.1 <small>小时</small></strong>
          <p>累计学习时长</p>
        </div>
        <div className={styles.overviewMetric} data-tone="gold">
          <span>
            <MiniIcon type="fire" />
          </span>
          <strong>18 <small>天</small></strong>
          <p>最长连续天数</p>
        </div>
      </section>

      <section className={styles.calendarCard}>
        <div className={styles.cardHeader}>
          <h2>学习日历</h2>
          <button type="button">
            <MiniIcon type="calendar" />
            切换月份
          </button>
        </div>
        <div className={styles.calendarContent}>
          <div className={styles.calendarGrid}>
            <div className={styles.monthNav}>
              <ChevronIcon direction="left" />
              <strong>2024年5月</strong>
              <ChevronIcon />
            </div>
            <div className={styles.weekRow}>
              {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className={styles.dayGrid}>
              {calendarDays.map((day, index) => {
                const isOutside = index < 3 || index > 33;
                const isSelected = day === 23 && index === 25;
                const tone = tealDays.has(day) ? "teal" : purpleDays.has(day) ? "purple" : "muted";

                return (
                  <span
                    className={styles.calendarDay}
                    data-outside={isOutside}
                    data-selected={isSelected}
                    data-tone={tone}
                    key={`${day}-${index}`}
                  >
                    {day}
                  </span>
                );
              })}
            </div>
          </div>

          <aside className={styles.selectedDayCard}>
            <strong>23</strong>
            <span>5月23日 周四</span>
            <em>
              <MiniIcon type="check" />
              已完成
            </em>
            <p>今日学习</p>
            <div>
              <MiniIcon type="book" />
              <span>
                <b>20</b> 句
                <small>跟读句子</small>
              </span>
            </div>
            <div>
              <MiniIcon type="clock" />
              <span>
                <b>20</b> 分钟
                <small>学习时长</small>
              </span>
            </div>
            <p className={styles.dayMessage}>坚持的每一天，都是更好的自己。</p>
          </aside>
        </div>
      </section>

      <section className={styles.progressCard}>
        <div className={styles.cardHeader}>
          <h2>各级别学习进度</h2>
          <Link href="/native-flow">查看全部记录 <ChevronIcon /></Link>
        </div>
        <div className={styles.progressRows}>
          {progressRows.map((row) => {
            const level = getLevelById(levels, row.levelId);

            return (
              <Link
                className={styles.progressRow}
                data-tone={level.tone}
                href={`/native-flow/${level.id}/learn`}
                key={level.id}
              >
                <span className={styles.progressArt}>
                  <LevelArt tone={level.tone} />
                </span>
                <span className={styles.progressInfo}>
                  <strong>
                    <i>{level.badge}</i>
                    {level.title} · {level.englishTitle}
                  </strong>
                  <span className={styles.progressLine}>
                    <b style={{ width: `${row.percent}%` }} />
                  </span>
                </span>
                <span className={styles.progressCount}>{row.completed} / {level.totalSentences} 句</span>
                <em>{row.percent}%</em>
                <ChevronIcon />
              </Link>
            );
          })}
        </div>
      </section>

      <section className={styles.streakCard}>
        <div className={styles.streakCopy}>
          <h2>连续学习记录</h2>
          <p>
            <MiniIcon type="fire" />
            <span>18</span> 天
          </p>
          <small>当前连续学习天数</small>
        </div>
        <div className={styles.streakLine}>
          {["5/17", "5/18", "5/19", "5/20", "5/21", "5/22", "今天"].map((day) => (
            <span key={day}>
              <i>
                <MiniIcon type="check" />
              </i>
              {day}
            </span>
          ))}
          <p>太棒了！继续保持这个节奏吧！🎉</p>
        </div>
      </section>
    </PageShell>
  );
}

export function NativeFlowLearningPage({
  level,
  sentence,
}: {
  level: NativeFlowLevel;
  sentence: NativeFlowSentence;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const sentenceId = sentence.id;
  const previousId = Math.max(1, sentenceId - 1);
  const nextId = Math.min(level.totalSentences, sentenceId + 1);
  const progressPercent = Math.max(2, Math.round((sentenceId / level.totalSentences) * 100));
  const playAudio = (playbackRate = 1) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.playbackRate = playbackRate;
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  };

  const repeatAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  };

  return (
    <PageShell className={styles.learnPhone} label="地道语感训练学习界面">
      <header className={styles.learnHeader}>
        <Link className={styles.roundBack} href="/native-flow" aria-label="返回地道语感训练菜单">
          <BackIcon />
        </Link>
        <div className={styles.learnTitle}>
          <span>
            <HeadphonesIcon />
          </span>
          <div>
            <h1>地道语感训练</h1>
            <p>
              <b>{level.badge}</b> · {level.title} ({level.englishTitle})
            </p>
          </div>
        </div>
        <Link className={styles.learnGhostButton} href="/native-flow/records" aria-label="查看进度" />
      </header>

      <section className={styles.learnBluePanel}>
        <div className={styles.learnProgress}>
          <strong>
            第 <span>{sentence.id}</span> / {level.totalSentences} 句
          </strong>
          <Link href="/native-flow/records">
            <MiniIcon type="chart" />
            进度
          </Link>
        </div>
        <span className={styles.learnProgressTrack}>
          <i style={{ width: `${progressPercent}%` }} />
        </span>
      </section>

      <article className={styles.sentenceCard}>
        <span className={styles.dailyCount}>每日 20 句</span>
        <span className={styles.dayPill}>
          Day {sentence.day} · 句子 {sentence.daySentence}
        </span>
        <div className={styles.paperCard}>
          <span className={styles.sentenceTag}>英文句子</span>
          <h2>{sentence.english}</h2>
          {sentence.chinese ? (
            <>
              <hr />
              <span className={styles.translationTag}>中文翻译</span>
              <p>{sentence.chinese}</p>
            </>
          ) : null}
          <i aria-hidden="true" />
        </div>
      </article>

      <audio aria-hidden="true" preload="metadata" ref={audioRef} src={sentence.audioSrc} />

      <section className={styles.audioControls} aria-label="音频控制">
        <button type="button" onClick={() => playAudio()}>
          <span data-tone="purple">
            <MiniIcon type="wave" />
          </span>
          播放
        </button>
        <button type="button" onClick={() => playAudio(0.75)}>
          <span data-tone="blue">
            <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48">
              <path d="M9 27c7 2 14-1 17-8 2 9 8 13 17 11-3 7-9 11-18 11S11 36 9 27Z" />
              <path d="M16 21c0-6 4-10 10-10 5 0 9 4 9 10" />
            </svg>
          </span>
          慢速播放
          <small>0.75x</small>
        </button>
        <button type="button" onClick={repeatAudio}>
          <span data-tone="white">
            <MiniIcon type="loop" />
          </span>
          重复
        </button>
      </section>

      <nav className={styles.learnBottomNav} aria-label="句子导航">
        <Link href={`/native-flow/${level.id}/learn?sentence=${previousId}`}>
          <ChevronIcon direction="left" />
          上一句
        </Link>
        <Link href={`/native-flow/${level.id}/learn?sentence=${Math.min(level.totalSentences, sentence.day * level.dailySentences)}`}>
          跳转
          <small>{sentence.daySentence} / {level.dailySentences}</small>
          <ChevronIcon direction="up" />
        </Link>
        <Link href={`/native-flow/${level.id}/learn?sentence=${nextId}`}>
          下一句
          <ChevronIcon />
        </Link>
      </nav>
    </PageShell>
  );
}

"use client";

type FreeStudyPageTwoProps = {
  accountLabel?: string;
  avatarAlt?: string;
  avatarSrc?: string;
  menuLabel?: string;
  chineseText?: string;
  isRecordingChinese: boolean;
  isTranscribingChinese?: boolean;
  onAccountClick?: () => void;
  onAvatarError?: () => void;
  onMenuClick?: () => void;
  onMicrophoneClick: () => void;
  onGoToThirdStep?: () => void;
  userEnglishText?: string;
};

const pageCopy = {
  accountLabel: "\u6253\u5f00\u8d26\u6237\u9875\u9762",
  avatarAlt: "\u7528\u6237\u5934\u50cf",
  menuLabel: "\u6253\u5f00\u83dc\u5355",
  listeningTitle: "\u6b63\u5728\u542c\u4f60\u8bf4\u8bdd...",
  readyTitle: "\u51c6\u5907\u542c\u4f60\u8bf4\u4e2d\u6587",
  transcribingTitle: "\u6b63\u5728\u6574\u7406\u4f60\u7684\u4e2d\u6587...",
  listeningStatus: "\u70b9\u51fb\u9ea6\u514b\u98ce\u7ed3\u675f\u5f55\u97f3",
  readyStatus: "\u70b9\u51fb\u9ea6\u514b\u98ce\u5f00\u59cb\u5f55\u97f3",
  transcribingStatus: "\u6b63\u5728\u8bc6\u522b\u4f60\u7684\u4e2d\u6587",
  pageLabel: "\u81ea\u7531\u5b66\u4e60\u7b2c\u4e8c\u9875",
  subtitleOne: "\u81ea\u7136\u5730\u8bf4\u4e2d\u6587\uff0cSpeakFlow \u4f1a\u5e2e\u4f60",
  subtitleTwo: "\u8f6c\u6362\u6210\u82f1\u8bed\u7ec3\u4e60\u3002",
  tipLabel: "\u5c0f\u63d0\u793a",
  tipText:
    "\u8bf4\u5f97\u8d8a\u81ea\u7136\uff0cAI \u7ed9\u51fa\u7684\u8868\u8fbe\u5c31\u8d8a\u8d34\u8fd1\u771f\u5b9e\u8bed\u5883\u54e6\uff01",
} as const;

function WaveGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 36 36"
    >
      <path
        d="M7 16v4M12.5 11v14M18 7v22M23.5 11v14M29 16v4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3.4"
      />
    </svg>
  );
}

function MenuGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <path
        d="M8 10h16M8 16h16M8 22h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

function MicGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 40 40">
      <path
        d="M20 6.5a6.2 6.2 0 0 0-6.2 6.2v8.1a6.2 6.2 0 1 0 12.4 0v-8.1A6.2 6.2 0 0 0 20 6.5Z"
        fill="currentColor"
      />
      <path
        d="M10.2 19.5a9.8 9.8 0 0 0 19.6 0M20 29.3v5.2M15.4 34.5h9.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3.1"
      />
    </svg>
  );
}

function SparklesGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 40 40">
      <path
        d="M18.5 6.2 22 15l8.8 3.5L22 22l-3.5 8.8L15 22l-8.8-3.5L15 15l3.5-8.8Z"
        fill="currentColor"
      />
      <path
        d="m29.5 5.8 1.5 3.7 3.7 1.5-3.7 1.5-1.5 3.7-1.5-3.7-3.7-1.5L28 9.5l1.5-3.7Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LockGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <rect
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        width="14"
        x="5"
        y="10"
      />
      <path
        d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10M12 14v2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function AudioRibbon() {
  return (
    <svg
      aria-hidden="true"
      className="sf-free-study-page-two-ribbon-svg"
      preserveAspectRatio="none"
      viewBox="0 0 430 148"
    >
      <path
        className="sf-free-study-page-two-ribbon-fill sf-free-study-page-two-ribbon-fill-back"
        d="M-30 72C28 14 78 123 143 58c57-57 101 68 167 20 59-42 89-10 150-66v145H-30Z"
      />
      <path
        className="sf-free-study-page-two-ribbon-fill sf-free-study-page-two-ribbon-fill-front"
        d="M-30 64C31 112 72 38 136 84c64 47 106 50 161-7 54-57 101 72 163 7v72H-30Z"
      />
      <path
        className="sf-free-study-page-two-ribbon-line"
        d="M-16 76C45 108 78 39 140 77c63 39 105 58 166-4 55-55 96 60 151 11"
      />
      <path
        className="sf-free-study-page-two-ribbon-dotline"
        d="M-22 52C37 90 81 38 137 67c66 34 105 76 165 10 55-61 96 48 148 3"
      />
    </svg>
  );
}

export default function FreeStudyPageTwo({
  accountLabel = pageCopy.accountLabel,
  avatarAlt = pageCopy.avatarAlt,
  avatarSrc = "",
  menuLabel = pageCopy.menuLabel,
  isRecordingChinese,
  isTranscribingChinese = false,
  onAccountClick,
  onAvatarError,
  onMenuClick,
  onMicrophoneClick,
}: FreeStudyPageTwoProps) {
  const titleText = isTranscribingChinese
    ? pageCopy.transcribingTitle
    : isRecordingChinese
      ? pageCopy.listeningTitle
      : pageCopy.readyTitle;
  const statusText = isTranscribingChinese
    ? pageCopy.transcribingStatus
    : isRecordingChinese
      ? pageCopy.listeningStatus
      : pageCopy.readyStatus;

  return (
    <section
      className={`sf-free-study-page-two ${
        isRecordingChinese ? "is-recording" : ""
      } ${isTranscribingChinese ? "is-transcribing" : ""}`}
      aria-label={pageCopy.pageLabel}
    >
      <div className="sf-free-study-page-two-frame">
        <div aria-hidden="true" className="sf-free-study-page-two-orbit">
          <span className="sf-free-study-page-two-orbit-ring sf-free-study-page-two-orbit-ring-one" />
          <span className="sf-free-study-page-two-orbit-ring sf-free-study-page-two-orbit-ring-two" />
          <span className="sf-free-study-page-two-orbit-ring sf-free-study-page-two-orbit-ring-three" />
          <span className="sf-free-study-page-two-orbit-dot sf-free-study-page-two-orbit-dot-one" />
          <span className="sf-free-study-page-two-orbit-dot sf-free-study-page-two-orbit-dot-two" />
          <span className="sf-free-study-page-two-orbit-star sf-free-study-page-two-orbit-star-one" />
          <span className="sf-free-study-page-two-orbit-star sf-free-study-page-two-orbit-star-two" />
        </div>

        <header className="sf-free-study-page-two-header">
          <button
            type="button"
            aria-label={menuLabel}
            onClick={onMenuClick}
            className="sf-free-study-page-two-menu"
          >
            <MenuGlyph />
          </button>

          <div className="sf-free-study-page-two-brand" aria-label="SpeakFlow AI Voice Practice">
            <span className="sf-free-study-page-two-logo" aria-hidden="true">
              <WaveGlyph />
            </span>
            <span className="sf-free-study-page-two-brand-copy">
              <span className="sf-free-study-page-two-brand-title">SpeakFlow</span>
              <span className="sf-free-study-page-two-brand-subtitle">
                AI VOICE PRACTICE
              </span>
            </span>
          </div>

          <button
            type="button"
            aria-label={accountLabel}
            onClick={onAccountClick}
            className="sf-free-study-page-two-avatar-button"
            title={avatarAlt}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarSrc || "/default-avatar.png"}
              alt=""
              className="sf-free-study-page-two-avatar-image"
              onError={onAvatarError}
              draggable={false}
            />
          </button>
        </header>

        <main className="sf-free-study-page-two-content">
          <section className="sf-free-study-page-two-hero" aria-live="polite">
            <WaveGlyph className="sf-free-study-page-two-hero-wave" />
            <h1>{titleText}</h1>
            <p>
              {pageCopy.subtitleOne}
              <span>{pageCopy.subtitleTwo}</span>
            </p>
          </section>

          <div aria-hidden="true" className="sf-free-study-page-two-ribbon">
            <AudioRibbon />
            <span className="sf-free-study-page-two-ribbon-spark sf-free-study-page-two-ribbon-spark-one" />
            <span className="sf-free-study-page-two-ribbon-spark sf-free-study-page-two-ribbon-spark-two" />
            <span className="sf-free-study-page-two-ribbon-spark sf-free-study-page-two-ribbon-spark-three" />
          </div>

          <section className="sf-free-study-page-two-tip" aria-label={pageCopy.tipLabel}>
            <span className="sf-free-study-page-two-tip-icon" aria-hidden="true">
              <SparklesGlyph />
            </span>
            <span className="sf-free-study-page-two-tip-copy">
              <strong>{pageCopy.tipLabel}</strong>
              <span>{pageCopy.tipText}</span>
            </span>
          </section>

          <div className="sf-free-study-page-two-record">
            <button
              type="button"
              aria-label={statusText}
              onClick={onMicrophoneClick}
              disabled={isTranscribingChinese}
              className="sf-free-study-page-two-mic"
            >
              <span className="sf-free-study-page-two-mic-ring" aria-hidden="true" />
              <MicGlyph />
            </button>
            <p className="sf-free-study-page-two-status">
              <span className="sf-free-study-page-two-lock-icon">
                <LockGlyph />
              </span>
              {statusText}
            </p>
          </div>
        </main>
      </div>
    </section>
  );
}

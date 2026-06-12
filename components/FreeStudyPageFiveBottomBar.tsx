"use client";

type FreeStudyPageFiveBottomBarProps = {
  onFollowPractice: () => void;
  onNextChinese: () => void;
  onSlowPlayback: () => void;
};

const COPY = {
  follow: "\u8ddf\u8bfb\u7ec3\u4e60",
  followAria: "\u6309\u5f53\u524d\u53e5\u5b50\u8ddf\u8bfb\u7ec3\u4e60",
  nextAria: "\u8fdb\u5165\u81ea\u7531\u5b66\u4e60\u7b2c\u4e8c\u9875\u5f00\u59cb\u65b0\u4e00\u8f6e",
  slow: "\u500d\u901f",
  slowAria: "\u4ee5 0.75 \u500d\u901f\u64ad\u653e\u5f53\u524d\u53e5\u5b50",
} as const;

function RefreshGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M20 12a8 8 0 0 1-13.7 5.6M4 12a8 8 0 0 1 13.7-5.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M7 18H4v-3M17 6h3v3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function MicGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 44 44">
      <path
        d="M22 6.8a6.9 6.9 0 0 0-6.9 6.9v9A6.9 6.9 0 0 0 22 29.6a6.9 6.9 0 0 0 6.9-6.9v-9A6.9 6.9 0 0 0 22 6.8Z"
        fill="currentColor"
      />
      <path
        d="M11 21.5a11 11 0 0 0 22 0M22 32.6v5.8M17 38.4h10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3.2"
      />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M8.2 5.6v12.8L18 12 8.2 5.6Z" fill="currentColor" />
    </svg>
  );
}

export default function FreeStudyPageFiveBottomBar({
  onFollowPractice,
  onNextChinese,
  onSlowPlayback,
}: FreeStudyPageFiveBottomBarProps) {
  return (
    <nav
      className="sf-free-study-page-five-bottom-bar"
      aria-label="Free study result actions"
    >
      <div className="sf-free-study-page-five-bottom-inner">
        <button
          type="button"
          aria-label={COPY.followAria}
          onClick={onFollowPractice}
          className="sf-free-study-page-five-follow"
        >
          <RefreshGlyph />
          <span>{COPY.follow}</span>
        </button>

        <button
          type="button"
          aria-label={COPY.nextAria}
          onClick={onNextChinese}
          className="sf-free-study-page-five-mic"
        >
          <MicGlyph />
        </button>

        <button
          type="button"
          aria-label={COPY.slowAria}
          onClick={onSlowPlayback}
          className="sf-free-study-page-five-slow"
        >
          <span>
            <PlayGlyph />
            0.75x
          </span>
          <span>{COPY.slow}</span>
        </button>
      </div>
    </nav>
  );
}

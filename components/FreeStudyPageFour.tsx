"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

type FreeStudyPageFourProps = {
  isRecordingEnglish: boolean;
  nativeSpeech: string;
  menuLabel?: string;
  accountLabel?: string;
  avatarSrc?: string;
  avatarAlt?: string;
  onMenuClick: () => void;
  onAccountClick: () => void;
  onAvatarError?: () => void;
};

function getChineseCharacterCount(value: string) {
  return Array.from(value.replace(/\s/g, "")).length;
}

function getLineHeight(fontSizeRem: number) {
  if (fontSizeRem >= 1.78) return 1.18;
  if (fontSizeRem >= 1.52) return 1.22;
  if (fontSizeRem >= 1.28) return 1.28;
  return 1.34;
}

function getFontFitBounds(characterCount: number) {
  if (characterCount <= 18) {
    return { min: 1.32, max: 2.08 };
  }

  if (characterCount <= 30) {
    return { min: 1.2, max: 1.9 };
  }

  if (characterCount <= 48) {
    return { min: 1.08, max: 1.72 };
  }

  if (characterCount <= 70) {
    return { min: 0.98, max: 1.48 };
  }

  return { min: 0.9, max: 1.28 };
}

function applyChineseTextFit(
  textElement: HTMLParagraphElement,
  fontSizeRem: number,
  isScrollable: boolean,
) {
  textElement.style.setProperty(
    "--sf-page-four-font-size",
    `${fontSizeRem.toFixed(3)}rem`,
  );
  textElement.style.setProperty(
    "--sf-page-four-line-height",
    String(getLineHeight(fontSizeRem)),
  );
  textElement.style.overflowY = isScrollable ? "auto" : "hidden";
  textElement.dataset.scrollable = isScrollable ? "true" : "false";
}

export default function FreeStudyPageFour({
  isRecordingEnglish,
  nativeSpeech,
  menuLabel = "打开菜单",
  accountLabel = "打开账户",
  avatarSrc = "",
  avatarAlt = "user",
  onMenuClick,
  onAccountClick,
  onAvatarError,
}: FreeStudyPageFourProps) {
  const chineseTextRef = useRef<HTMLParagraphElement>(null);
  const chineseCharacterCount = getChineseCharacterCount(nativeSpeech);

  const fitChineseText = useCallback(() => {
    const textElement = chineseTextRef.current;
    if (!textElement) return;

    const { min, max } = getFontFitBounds(chineseCharacterCount);

    const canFit = (fontSizeRem: number) => {
      applyChineseTextFit(textElement, fontSizeRem, false);

      return textElement.scrollHeight <= textElement.clientHeight + 1;
    };

    let low = min;
    let high = max;
    let best = min;

    if (!canFit(min)) {
      applyChineseTextFit(textElement, min, true);
      return;
    }

    for (let index = 0; index < 12; index += 1) {
      const midpoint = (low + high) / 2;
      if (canFit(midpoint)) {
        best = midpoint;
        low = midpoint;
      } else {
        high = midpoint;
      }
    }

    applyChineseTextFit(textElement, best, false);
  }, [chineseCharacterCount]);

  useLayoutEffect(() => {
    fitChineseText();
  }, [fitChineseText, nativeSpeech]);

  useEffect(() => {
    const textElement = chineseTextRef.current;
    if (!textElement || typeof ResizeObserver === "undefined") return undefined;

    const resizeObserver = new ResizeObserver(() => {
      fitChineseText();
    });

    resizeObserver.observe(textElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [fitChineseText]);

  return (
    <section className="sf-free-study-page-four" aria-label="Listen and speak English">
      <div className="sf-free-study-page-four-frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/free-study-page-4.png"
          alt=""
          aria-hidden="true"
          className="sf-free-study-page-four-bg"
          draggable={false}
        />
        <button
  type="button"
  aria-label={menuLabel}
  onClick={onMenuClick}
  className="sf-free-study-page-four-menu"
/>

<button
  type="button"
  aria-label={accountLabel}
  onClick={onAccountClick}
  className="sf-free-study-page-four-avatar-button"
>
  <img
    src={avatarSrc || "/default-avatar.png"}
    alt={avatarAlt}
    className="sf-free-study-page-four-avatar-image"
    onError={onAvatarError}
    draggable={false}
  />
</button>
        <div className="sf-free-study-page-four-chinese">
          <p
            ref={chineseTextRef}
            lang="zh-CN"
            className="sf-free-study-page-four-chinese-text"
            data-scrollable="false"
          >
            {nativeSpeech}
          </p>
        </div>

        <div
          aria-hidden="true"
          className={`sf-free-study-page-four-mic ${
            isRecordingEnglish ? "is-recording" : ""
          }`}
        />

        <div className="sf-free-study-page-four-bottom-status" aria-live="polite">
          {isRecordingEnglish
            ? "正在自动听你说英文"
            : "请直接说英文，不用点击麦克风"}
        </div>
      </div>
    </section>
  );
}

"use client";

import type { PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type KeyboardMode = "zh" | "en" | "handwriting" | "symbols";

type SpeechRecognitionAlternativeLike = {
  transcript?: string;
};

type SpeechRecognitionResultLike = {
  0?: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionResultEventLike = Event & {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const letterRows = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["shift", "z", "x", "c", "v", "b", "n", "m", "backspace"],
] as const;

const symbolRows = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  [".", ",", "?", "!", "'", '"', "-", ":", ";"],
  ["@", "#", "$", "&", "(", ")", "/", "+", "backspace"],
] as const;

const modeMeta: Record<KeyboardMode, { label: string; short: string; lang: string }> = {
  zh: { label: "Chinese", short: "中文", lang: "zh-CN" },
  en: { label: "English", short: "EN", lang: "en-US" },
  handwriting: { label: "Handwriting", short: "手写", lang: "zh-CN" },
  symbols: { label: "Symbols", short: "123", lang: "zh-CN" },
};

const pinyinDictionary: Record<string, string[]> = {
  ai: ["爱"],
  bu: ["不"],
  chi: ["吃"],
  dong: ["懂"],
  hao: ["好", "号码"],
  hen: ["很"],
  kan: ["看"],
  la: ["啦"],
  ma: ["吗", "嘛"],
  ni: ["你", "呢"],
  nihao: ["你好", "你好吗"],
  qu: ["去"],
  shuo: ["说"],
  ta: ["他", "她"],
  ting: ["听"],
  wo: ["我"],
  xiang: ["想"],
  xiexie: ["谢谢"],
  xue: ["学"],
  yao: ["要"],
  yingwen: ["英文"],
  yingyu: ["英语"],
  you: ["有"],
  zhe: ["这"],
  zhongwen: ["中文"],
};

const defaultChineseCandidates = ["？", "！", "我", "你", "好", "这", "谢谢"];
const handwritingCandidates = ["我", "你", "好", "吗", "谢", "爱", "说"];
const quickPracticeStarters = [
  "我的肚子好胀啊，很难受",
  "我想预约看医生",
  "请你说慢一点",
  "我听不懂",
] as const;
const emojis = ["😊", "👍", "🙏", "❤️", "😂", "😅"] as const;

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function FlowMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 36 36"
      className={className}
      fill="none"
    >
      <path
        d="M8 20.5c3.1-6.9 7.2-9.9 12.4-9.1 3.1.5 5.7 2.5 7.6 5.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3.2"
      />
      <path
        d="M8 25.2c4.8-2.6 8.8-2.7 12.1-.4 2.4 1.7 4.8 1.9 7.1.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3.2"
      />
      <circle cx="12.2" cy="13.4" r="2.4" fill="currentColor" />
      <circle cx="27.6" cy="22.4" r="2.1" fill="currentColor" />
    </svg>
  );
}

function VoiceGlyph({ active = false }: { active?: boolean }) {
  return (
    <span className="flex items-end gap-0.5">
      {[8, 15, 23, 16].map((height, index) => (
        <span
          key={`${height}-${index}`}
          className={`w-1.5 rounded-full bg-white ${
            active ? "animate-pulse" : ""
          }`}
          style={{ height }}
        />
      ))}
    </span>
  );
}

export default function SpeakEnglishPage() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const speechBufferRef = useRef("");
  const shouldCommitSpeechRef = useRef(false);

  const [message, setMessage] = useState("Hold to speak in your language");
  const [inputText, setInputText] = useState("");
  const [keyboardMode, setKeyboardMode] = useState<KeyboardMode>("zh");
  const [composingPinyin, setComposingPinyin] = useState("");
  const [isShifted, setIsShifted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [hasInk, setHasInk] = useState(false);
  const [showQuickPanel, setShowQuickPanel] = useState(false);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [showPreviewKeyboard, setShowPreviewKeyboard] = useState(true);

  const activeRows = keyboardMode === "symbols" ? symbolRows : letterRows;
  const baseInputValue =
    keyboardMode === "zh" && composingPinyin
      ? `${inputText}${composingPinyin}`
      : inputText;
  const renderedInputValue =
    isListening && liveTranscript.trim()
      ? `${baseInputValue}${baseInputValue ? " " : ""}${liveTranscript}`
      : baseInputValue;
  const canSend =
    Boolean(inputText.trim()) || Boolean(composingPinyin.trim());
  const currentMode = modeMeta[keyboardMode];

  const chineseCandidates = useMemo(() => {
    const pinyin = composingPinyin.toLowerCase();
    if (!pinyin) return defaultChineseCandidates;

    const exact = pinyinDictionary[pinyin] ?? [];
    const prefixMatches = Object.entries(pinyinDictionary)
      .filter(([key]) => key.startsWith(pinyin))
      .flatMap(([, values]) => values);

    return unique([...exact, ...prefixMatches, pinyin]).slice(0, 7);
  }, [composingPinyin]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`;
  }, [renderedInputValue]);

  useEffect(() => {
    return () => {
      shouldCommitSpeechRef.current = false;
      recognitionRef.current?.abort?.();
    };
  }, []);

  function focusInput() {
    textareaRef.current?.focus();
  }

  function appendText(value: string) {
    setInputText((current) => `${current}${value}`);
    if (value.trim()) {
      setMessage("Hold to speak in your language");
    }

    if (typeof window !== "undefined") {
      window.setTimeout(focusInput, 0);
    }
  }

  function deleteLastCharacter() {
    if (keyboardMode === "zh" && composingPinyin) {
      setComposingPinyin((current) => current.slice(0, -1));
      return;
    }

    setInputText((current) => Array.from(current).slice(0, -1).join(""));
  }

  function commitChineseCandidate(candidate?: string) {
    const value = candidate ?? chineseCandidates[0] ?? composingPinyin;
    if (!value) return;

    appendText(value);
    setComposingPinyin("");
  }

  function switchKeyboardMode(mode?: KeyboardMode) {
    setKeyboardMode((current) => {
      if (mode) return mode;
      if (current === "zh") return "en";
      if (current === "en") return "handwriting";
      if (current === "handwriting") return "zh";
      return "zh";
    });
    setComposingPinyin("");
    setShowEmojiPanel(false);
    setShowQuickPanel(false);
    focusInput();
  }

  function getRecognitionConstructor() {
    if (typeof window === "undefined") return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function startRecognition() {
    const RecognitionConstructor = getRecognitionConstructor();

    if (!RecognitionConstructor) {
      setMessage("Speech recognition is not available in this browser");
      return;
    }

    recognitionRef.current?.abort?.();
    speechBufferRef.current = "";
    shouldCommitSpeechRef.current = true;

    const recognition = new RecognitionConstructor();
    recognition.lang = currentMode.lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    setLiveTranscript("");
    setIsListening(true);
    setMessage("Listening... release to add it");

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join("")
        .trim();

      setLiveTranscript(transcript);
      speechBufferRef.current = transcript;
    };

    recognition.onerror = () => {
      shouldCommitSpeechRef.current = false;
      setIsListening(false);
      setLiveTranscript("");
      setMessage("I did not catch that. Try again");
    };

    recognition.onend = () => {
      if (shouldCommitSpeechRef.current && speechBufferRef.current.trim()) {
        appendText(speechBufferRef.current.trim());
      }

      speechBufferRef.current = "";
      shouldCommitSpeechRef.current = false;
      setLiveTranscript("");
      setIsListening(false);
      setMessage("Hold to speak in your language");
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      shouldCommitSpeechRef.current = false;
      setIsListening(false);
      setMessage("Speech recognition could not start");
    }
  }

  function stopRecognition() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }

  function handleMicPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (canSend) return;

    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some embedded browsers skip pointer capture for touch gestures.
    }
    startRecognition();
  }

  function handleMicPointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (canSend) return;

    event.preventDefault();
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Capture may already be released on mobile browsers.
    }
    stopRecognition();
  }

  function handleKeyPress(key: string) {
    if (key === "shift") {
      setIsShifted((current) => !current);
      return;
    }

    if (key === "backspace") {
      deleteLastCharacter();
      return;
    }

    if (keyboardMode === "zh" && /^[a-z]$/.test(key)) {
      setComposingPinyin((current) => `${current}${key}`);
      return;
    }

    appendText(isShifted && /^[a-z]$/.test(key) ? key.toUpperCase() : key);
    if (isShifted) setIsShifted(false);
  }

  function handleSpace() {
    if (keyboardMode === "zh" && composingPinyin) {
      commitChineseCandidate();
      return;
    }

    appendText(" ");
  }

  function sendInput() {
    const committedPinyin =
      keyboardMode === "zh" && composingPinyin ? chineseCandidates[0] : "";
    const finalText = `${inputText}${committedPinyin}`.trim();

    if (!finalText) {
      focusInput();
      return;
    }

    setMessage(finalText);
    setInputText("");
    setComposingPinyin("");
    setLiveTranscript("");
    focusInput();
  }

  function getCanvasContext() {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 5;
    context.strokeStyle = "#91dcff";

    return context;
  }

  function getCanvasPoint(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    const context = getCanvasContext();
    if (!context) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;
    const point = getCanvasPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    setHasInk(true);
  }

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;

    const context = getCanvasContext();
    if (!context) return;

    const point = getCanvasPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function stopDrawing(event: PointerEvent<HTMLCanvasElement>) {
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Capture may already be released.
    }
    isDrawingRef.current = false;
  }

  function clearHandwriting() {
    const canvas = canvasRef.current;
    const context = getCanvasContext();
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  }

  function commitHandwriting(value = "手写") {
    if (!hasInk && value === "手写") {
      setMessage("Write in the handwriting area first");
      return;
    }

    appendText(value);
    clearHandwriting();
    setMessage("Handwriting was added to the practice line");
  }

  return (
    <main className="responsive-page-shell sf-speak-page min-h-[100dvh] overflow-x-hidden text-white">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[520px] items-center justify-center p-2 sm:p-4">
        <section className="sf-speak-phone relative h-[calc(100dvh-16px)] min-h-[calc(100dvh-16px)] w-full max-w-[430px] overflow-hidden rounded-[34px] sm:min-h-[720px]">
          <div className="pointer-events-none absolute left-1/2 top-[19%] z-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full border border-[#91dcff]/10" />
          <div className="pointer-events-none absolute left-1/2 top-[25%] z-0 h-[300px] w-[300px] -translate-x-1/2 rounded-full border border-[#b799ff]/10" />

          <header className="relative z-10 px-5 pt-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label="Practice starters"
                onClick={() => setShowQuickPanel((current) => !current)}
                className="sf-header-button"
              >
                <span className="relative block h-4 w-5 before:absolute before:left-0 before:top-0 before:h-px before:w-4 before:bg-[#efe9ff] after:absolute after:bottom-0 after:left-0 after:h-px after:w-5 after:bg-[#efe9ff]">
                  <span className="absolute left-0 top-1/2 h-px w-5 -translate-y-1/2 bg-[#efe9ff]" />
                </span>
              </button>

              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-[16px] bg-[linear-gradient(135deg,#7b61ff,#5b8cff_58%,#7ee7ff)] text-white shadow-[0_14px_34px_rgba(91,140,255,0.30)]">
                  <FlowMark className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="text-[1.45rem] font-semibold leading-none tracking-[-0.02em] text-white">
                    SpeakFlow
                  </h1>
                  <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#91dcff]/80">
                    voice practice
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Toggle preview keyboard"
                onClick={() => setShowPreviewKeyboard((current) => !current)}
                className="sf-header-button text-[1.25rem] font-semibold text-[#efe9ff]"
              >
                {showPreviewKeyboard ? "⌄" : "⌃"}
              </button>
            </div>
          </header>

          <section className="relative z-10 flex h-full flex-col px-6 pb-[352px] pt-8">
            <div className="mx-auto h-px w-32 bg-[linear-gradient(90deg,transparent,rgba(145,220,255,0.46),transparent)]" />

            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="max-w-[320px] text-[1.6rem] font-semibold leading-9 tracking-[-0.03em] text-[#fffaff]">
                {isListening && liveTranscript ? liveTranscript : message}
              </p>
              <p className="mt-4 max-w-[280px] text-[0.95rem] font-medium leading-6 text-[#c9c0df]">
                Speak naturally first. SpeakFlow turns your thought into English practice.
              </p>

              <div className="mt-7 flex rounded-full border border-white/10 bg-white/[0.06] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                {(["zh", "en", "handwriting"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setShowPreviewKeyboard(true);
                      switchKeyboardMode(mode);
                    }}
                    className={`rounded-full px-4 py-2 text-[0.78rem] font-semibold transition ${
                      keyboardMode === mode
                        ? "bg-[#efe9ff] text-[#12051f] shadow-[0_10px_24px_rgba(123,97,255,0.20)]"
                        : "text-[#d8d0ea]"
                    }`}
                  >
                    {modeMeta[mode].short}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {showQuickPanel ? (
            <div className="sf-floating-panel absolute left-4 right-4 top-[92px] z-30 p-3">
              <div className="mb-2 px-1 text-xs font-semibold text-[#91dcff]">
                Practice starters
              </div>
              <div className="grid gap-2">
                {quickPracticeStarters.map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => {
                      appendText(phrase);
                      setShowQuickPanel(false);
                    }}
                    className="rounded-[18px] border border-white/10 bg-white/[0.07] px-3 py-2 text-left text-sm font-medium text-[#fffaff] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="sf-keyboard-panel absolute inset-x-0 bottom-0 z-20 rounded-t-[32px] px-3 pb-3 pt-3 text-[#fffaff]">
            <div className="sf-composer mb-3 p-2">
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  aria-label="Practice starters"
                  onClick={() => setShowQuickPanel((current) => !current)}
                  className="grid h-12 w-14 shrink-0 place-items-center rounded-[22px] border border-white/10 bg-white/[0.08] text-3xl font-light text-[#efe9ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                >
                  +
                </button>

                <label className="min-w-0 flex-1 rounded-[22px] border border-white/10 bg-[#efe9ff]/[0.10] px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                  <textarea
                    ref={textareaRef}
                    value={renderedInputValue}
                    onChange={(event) => {
                      setInputText(event.target.value);
                      setComposingPinyin("");
                    }}
                    onFocus={() => {
                      if (
                        typeof navigator !== "undefined" &&
                        navigator.maxTouchPoints > 0
                      ) {
                        setShowPreviewKeyboard(false);
                      }
                    }}
                    rows={1}
                    lang={keyboardMode === "en" ? "en-US" : "zh-CN"}
                    autoCapitalize="sentences"
                    autoCorrect="on"
                    spellCheck
                    placeholder="Say what you mean"
                    className="block max-h-24 min-h-[32px] w-full resize-none overflow-hidden bg-transparent text-[1rem] font-medium leading-8 text-[#fffaff] outline-none placeholder:text-[#a9a0c7]"
                  />
                </label>

                <button
                  type="button"
                  aria-label={canSend ? "Send" : "Hold to speak"}
                  onClick={canSend ? sendInput : focusInput}
                  onPointerDown={!canSend ? handleMicPointerDown : undefined}
                  onPointerUp={!canSend ? handleMicPointerUp : undefined}
                  onPointerCancel={!canSend ? stopRecognition : undefined}
                  onContextMenu={(event) => event.preventDefault()}
                  className={`sf-voice-button speakflow-breathe grid h-12 w-14 shrink-0 touch-none place-items-center rounded-[22px] transition ${
                    isListening ? "scale-105 ring-4 ring-[#91dcff]/18" : ""
                  }`}
                >
                  {canSend ? (
                    <span className="text-[2rem] font-semibold leading-none">↑</span>
                  ) : (
                    <VoiceGlyph active={isListening} />
                  )}
                </button>
              </div>
            </div>

            {showPreviewKeyboard ? (
              <>
                {keyboardMode === "zh" ? (
                  <div className="mb-2 flex h-9 items-center gap-4 overflow-hidden px-2 text-[1.25rem] font-semibold text-[#fffaff]">
                    {chineseCandidates.map((candidate) => (
                      <button
                        key={candidate}
                        type="button"
                        onClick={() => {
                          if (candidate === "？" || candidate === "！") {
                            appendText(candidate);
                            return;
                          }
                          commitChineseCandidate(candidate);
                        }}
                        className="shrink-0"
                      >
                        {candidate}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowQuickPanel((current) => !current)}
                      className="ml-auto shrink-0 text-xl text-[#91dcff]"
                    >
                      ⌄
                    </button>
                  </div>
                ) : (
                  <div className="mb-2 flex items-center justify-between px-2">
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#91dcff]">
                      {currentMode.label}
                    </span>
                    <button
                      type="button"
                      aria-label="Hide preview keyboard"
                      onClick={() => setShowPreviewKeyboard(false)}
                      className="text-xl leading-none text-[#c9c0df]"
                    >
                      ⌄
                    </button>
                  </div>
                )}

                {keyboardMode === "handwriting" ? (
                  <div className="px-1">
                    <canvas
                      ref={canvasRef}
                      width={700}
                      height={178}
                      onPointerDown={startDrawing}
                      onPointerMove={draw}
                      onPointerUp={stopDrawing}
                      onPointerCancel={stopDrawing}
                      className="sf-handwriting-canvas h-[112px] w-full touch-none rounded-[24px]"
                    />
                    <div className="mt-2 flex items-center gap-2 overflow-hidden">
                      {handwritingCandidates.map((candidate) => (
                        <button
                          key={candidate}
                          type="button"
                          onClick={() => commitHandwriting(candidate)}
                          className="sf-key h-8 min-w-9 px-2 text-lg font-semibold"
                        >
                          {candidate}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={clearHandwriting}
                        className="sf-key ml-auto h-8 px-3 text-sm font-semibold"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {activeRows.map((row, rowIndex) => (
                      <div
                        key={`row-${rowIndex}`}
                        className={`flex justify-center gap-1.5 ${
                          rowIndex === 1 ? "px-5" : ""
                        }`}
                      >
                        {row.map((key) => {
                          const label =
                            key === "shift"
                              ? "⇧"
                              : key === "backspace"
                                ? "⌫"
                                : isShifted && /^[a-z]$/.test(key)
                                  ? key.toUpperCase()
                                  : key;

                          return (
                            <button
                              type="button"
                              key={key}
                              onClick={() => handleKeyPress(key)}
                              className={`sf-key h-10 text-[18px] font-semibold ${
                                key === "shift" || key === "backspace"
                                  ? "w-11"
                                  : "w-9"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    ))}

                    {showEmojiPanel ? (
                      <div className="grid grid-cols-6 gap-1.5 rounded-[18px] border border-white/10 bg-white/[0.05] p-1.5 backdrop-blur-xl">
                        {emojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => appendText(emoji)}
                            className="sf-key h-8 text-base"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          switchKeyboardMode(
                            keyboardMode === "symbols" ? "zh" : "symbols"
                          )
                        }
                        className="sf-key h-11 w-14 text-sm font-semibold"
                      >
                        {keyboardMode === "symbols" ? "ABC" : "123"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEmojiPanel((current) => !current)}
                        className="sf-key h-11 w-11 text-base"
                      >
                        ☺
                      </button>
                      <button
                        type="button"
                        onClick={handleSpace}
                        className="sf-key h-11 flex-1 text-[13px] font-medium text-[#b7aecf]"
                      >
                        {keyboardMode === "zh" ? "拼" : "space"}
                      </button>
                      <button
                        type="button"
                        onClick={() => appendText("\n")}
                        className="sf-key h-11 w-16 text-2xl font-semibold"
                      >
                        ↵
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : null}

            <div className="flex items-center justify-between px-7 pt-2 text-[#efe9ff]">
              <button
                type="button"
                aria-label="Switch input mode"
                onClick={() => {
                  setShowPreviewKeyboard(true);
                  switchKeyboardMode();
                }}
                className="sf-footer-button text-[1.35rem]"
              >
                ◎
              </button>
              <span className="rounded-full border border-[#91dcff]/20 bg-[#91dcff]/10 px-3 py-1 text-xs font-semibold text-[#91dcff]">
                {currentMode.short}
              </span>
              <button
                type="button"
                aria-label="Switch to handwriting"
                onClick={() => {
                  setShowPreviewKeyboard(true);
                  switchKeyboardMode("handwriting");
                }}
                className="sf-footer-button text-[1rem] font-semibold"
              >
                手写
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

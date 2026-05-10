"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

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

export default function SpeakEnglishPage() {
  const router = useRouter();
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const stepThreeRef = useRef<HTMLDivElement | null>(null);
  const [message, setMessage] = useState("");
  const [chineseText, setChineseText] = useState("");
  const [spokenEnglish, setSpokenEnglish] = useState("");
  const [accurateEnglish, setAccurateEnglish] = useState("");
  const [isListeningChinese, setIsListeningChinese] = useState(false);
  const [isListeningEnglish, setIsListeningEnglish] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showEnglishPractice, setShowEnglishPractice] = useState(false);

  function stopRecognition() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListeningChinese(false);
    setIsListeningEnglish(false);
  }

  function getRecognitionConstructor() {
    if (typeof window === "undefined") return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function startRecognition(lang: "zh-CN" | "en-US") {
    const RecognitionConstructor = getRecognitionConstructor();

    if (!RecognitionConstructor) {
      setMessage("当前浏览器不支持语音识别，请使用 Chrome。");
      return;
    }

    stopRecognition();
    setMessage("正在听...");

    const recognition = new RecognitionConstructor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join("")
        .trim();

      if (lang === "zh-CN") {
        setChineseText(transcript);
        setAccurateEnglish("");
        setIsListeningChinese(false);
      } else {
        setSpokenEnglish(transcript);
        setIsListeningEnglish(false);
      }

      setMessage("");
    };

    recognition.onerror = () => {
      setMessage("语音识别失败，请重试。");
      setIsListeningChinese(false);
      setIsListeningEnglish(false);
    };

    recognition.onend = () => {
      setIsListeningChinese(false);
      setIsListeningEnglish(false);
    };

    recognitionRef.current = recognition;

    if (lang === "zh-CN") {
      setIsListeningChinese(true);
    } else {
      setIsListeningEnglish(true);
    }

    recognition.start();
  }

  function speakEnglish(text: string, rate = 1) {
    if (typeof window === "undefined" || !text.trim()) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  }

  async function handleGenerateAccurateSentence() {
    if (!chineseText.trim()) {
      setMessage("请先说一句中文。");
      return;
    }

    try {
      setIsGenerating(true);
      setMessage("");
      const response = await fetch("/api/accurate-sentence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chinese: chineseText.trim() }),
      });

      const result = (await response.json().catch(() => null)) as
        | { english?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(result?.error || "生成失败");
      }

      setAccurateEnglish(result?.english?.trim() || "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成失败");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDirectViewAccurateSentence() {
    stepThreeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    await handleGenerateAccurateSentence();
  }

  useEffect(() => {
    return () => {
      stopRecognition();
      if (typeof window !== "undefined") {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <main className="app-shell font-[var(--font-sora)] text-white">
      <div className="app-phone-frame min-h-screen px-4 py-4 pb-8">
        <div className="app-glass-card mb-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="neon-button shrink-0 rounded-[20px] border border-fuchsia-300/28 bg-[linear-gradient(180deg,rgba(66,44,122,0.56),rgba(45,26,91,0.40))] px-4 py-3 text-sm shadow-[0_0_0_1px_rgba(188,92,255,0.10),0_0_16px_rgba(139,92,246,0.18)]"
            >
              返回上一页
            </button>
            <div className="min-w-0 flex-1 text-center">
              <div className="text-[1.2rem] font-bold tracking-[-0.03em] text-white [text-shadow:0_0_14px_rgba(255,255,255,0.14)]">
                我要说英语
              </div>
            </div>
            <div className="shrink-0">
              <LogoutButton />
            </div>
          </div>
        </div>

        {message ? (
          <div className="app-glass-card mb-4 rounded-[22px] border-blue-400/20 px-4 py-3 text-sm text-blue-100/95">
            {message}
          </div>
        ) : null}

        <section className="space-y-4">
          <div className="neon-card neon-card-green px-5 py-5">
            <h2 className="text-[1.35rem] font-bold tracking-[-0.03em] text-white [text-shadow:0_0_13px_rgba(101,255,209,0.18)]">
              第 1 步：说一句中文
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/78">
              先说一句你现在最想表达的中文内容。
            </p>
            <button
              onClick={() => startRecognition("zh-CN")}
              className="neon-button mt-4 w-full rounded-[20px] border border-emerald-300/34 bg-[linear-gradient(180deg,rgba(24,179,122,0.88),rgba(10,116,86,0.82))] px-4 py-4 text-base shadow-[0_0_0_1px_rgba(16,255,192,0.12),0_0_20px_rgba(16,255,192,0.20)]"
            >
              {isListeningChinese ? "正在听..." : "点击说中文"}
            </button>
            <div className="dark-input mt-4 min-h-24 px-4 py-4 text-base leading-7 text-white/88">
              {chineseText || "先说一句中文"}
            </div>
            <button
              onClick={() => void handleDirectViewAccurateSentence()}
              className="neon-button mt-4 w-full rounded-[20px] border border-orange-300/34 bg-[linear-gradient(180deg,rgba(248,109,55,0.88),rgba(183,60,30,0.82))] px-4 py-4 text-base text-white/92 shadow-[0_0_0_1px_rgba(255,145,96,0.12),0_0_20px_rgba(255,111,70,0.18)]"
            >
              直接查看标准英文
            </button>
          </div>

          <div className="neon-card neon-card-blue px-5 py-5">
            <h2 className="text-[1.35rem] font-bold tracking-[-0.03em] text-white [text-shadow:0_0_13px_rgba(114,180,255,0.18)]">
              第 2 步：我想自己先试着说英文
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/78">
              这一步是可选的，你可以先自己练习，再去看标准答案。
            </p>
            <button
              onClick={() => setShowEnglishPractice((prev) => !prev)}
              className="neon-button mt-4 w-full rounded-[20px] border border-violet-300/34 bg-[linear-gradient(180deg,rgba(83,112,255,0.82),rgba(84,57,201,0.76))] px-4 py-4 text-base text-white/92 shadow-[0_0_0_1px_rgba(112,151,255,0.12),0_0_20px_rgba(84,112,255,0.18)]"
            >
              {showEnglishPractice ? "收起练习英文" : "展开练习英文"}
            </button>
            {showEnglishPractice ? (
              <>
                <button
                  onClick={() => startRecognition("en-US")}
                  className="neon-button mt-4 w-full rounded-[20px] border border-violet-300/32 bg-[linear-gradient(180deg,rgba(111,87,255,0.80),rgba(69,42,184,0.74))] px-4 py-4 text-base text-white/92 shadow-[0_0_0_1px_rgba(151,110,255,0.12),0_0_18px_rgba(125,92,255,0.18)]"
                >
                  {isListeningEnglish ? "正在听..." : "点击说英文"}
                </button>
                <div className="dark-input mt-4 min-h-24 px-4 py-4 text-base leading-7 text-white/88">
                  {spokenEnglish || "再试着说出英文"}
                </div>
              </>
            ) : null}
          </div>

          <div ref={stepThreeRef} className="neon-card neon-card-orange px-5 py-5">
            <h2 className="text-[1.35rem] font-bold tracking-[-0.03em] text-white [text-shadow:0_0_13px_rgba(255,154,120,0.18)]">
              第 3 步：查看标准英文
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/78">
              生成更自然、更准确的标准英文句子供你对照练习。
            </p>
            <button
              onClick={handleGenerateAccurateSentence}
              disabled={isGenerating}
              className="neon-button mt-4 flex w-full items-center justify-center gap-2 rounded-[20px] border border-orange-300/34 bg-[linear-gradient(180deg,rgba(248,109,55,0.88),rgba(183,60,30,0.82))] px-4 py-4 text-base text-white/92 shadow-[0_0_0_1px_rgba(255,145,96,0.12),0_0_20px_rgba(255,111,70,0.18)]"
            >
              {isGenerating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                  <span>生成中...</span>
                </>
              ) : (
                "查看准确句子"
              )}
            </button>
            <div className="dark-input mt-4 min-h-24 px-4 py-4 text-base leading-7 text-orange-50/92 [text-shadow:0_0_12px_rgba(255,174,102,0.14)]">
              {accurateEnglish || "点击“查看准确句子”获取标准英文参考"}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => speakEnglish(accurateEnglish, 1)}
                disabled={!accurateEnglish.trim()}
                className="neon-button rounded-[18px] border border-fuchsia-300/28 bg-[linear-gradient(180deg,rgba(127,79,255,0.76),rgba(82,44,186,0.70))] px-3 py-3 text-sm text-white/92 shadow-[0_0_0_1px_rgba(178,109,255,0.10),0_0_16px_rgba(150,85,255,0.18)]"
              >
                朗读英文
              </button>
              <button
                onClick={() => speakEnglish(accurateEnglish, 0.5)}
                disabled={!accurateEnglish.trim()}
                className="neon-button rounded-[18px] border border-blue-300/28 bg-[linear-gradient(180deg,rgba(77,117,255,0.76),rgba(54,68,197,0.70))] px-3 py-3 text-sm text-white/92 shadow-[0_0_0_1px_rgba(101,145,255,0.10),0_0_16px_rgba(76,116,255,0.18)]"
              >
                慢速朗读
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

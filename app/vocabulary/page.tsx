"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FALLBACK_MEANINGS,
  PLACEHOLDER_MEANING,
  generateVocabularyDefinition,
  groupVocabularyWords,
  hasUsableMeaning,
  incrementVocabularyGroupMastery,
  incrementVocabularyWordsMasteredCount,
  loadVocabularyGroupMastery,
  loadVocabularyWords,
  recordVocabularyAnswer,
  recordWrongBookReview,
  updateVocabularyWord,
  type VocabularyGroupMastery,
  type VocabularyWord,
} from "@/lib/vocabulary";

type ReviewMode = "normal" | "wrong";

type QuizQuestion = {
  word: VocabularyWord;
  correctMeaning: string;
  options: string[];
};

type QuizResult = {
  score: number;
  total: number;
  perfect: boolean;
  skippedCount: number;
};

function shuffleArray<T>(items: T[]) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }

  return next;
}

function getAudioContext() {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  return AudioContextClass ? new AudioContextClass() : null;
}

function normalizeMeaningForOption(word: VocabularyWord) {
  return hasUsableMeaning(word.meaning) ? word.meaning.trim() : "";
}

function createDistractorPool(words: VocabularyWord[], currentWord: string) {
  const meanings = words
    .filter((item) => item.word !== currentWord)
    .map((item) => normalizeMeaningForOption(item))
    .filter(Boolean);

  const unique = [...new Set(meanings)];

  for (const fallbackMeaning of FALLBACK_MEANINGS) {
    if (!unique.includes(fallbackMeaning)) {
      unique.push(fallbackMeaning);
    }
  }

  return unique;
}

function createQuestion(
  word: VocabularyWord,
  allWords: VocabularyWord[]
): QuizQuestion | null {
  const correctMeaning = normalizeMeaningForOption(word);
  if (!correctMeaning) return null;

  const distractorPool = shuffleArray(
    createDistractorPool(allWords, word.word).filter(
      (meaning) => meaning !== correctMeaning
    )
  );

  const optionSet = new Set<string>([correctMeaning]);

  for (const meaning of distractorPool) {
    if (!hasUsableMeaning(meaning)) continue;
    optionSet.add(meaning);
    if (optionSet.size === 4) break;
  }

  if (optionSet.size < 4) {
    for (const fallbackMeaning of FALLBACK_MEANINGS) {
      optionSet.add(fallbackMeaning);
      if (optionSet.size === 4) break;
    }
  }

  if (optionSet.size < 4) {
    return null;
  }

  return {
    word,
    correctMeaning,
    options: shuffleArray([...optionSet].slice(0, 4)),
  };
}

async function fillMissingDefinitions(words: VocabularyWord[]) {
  const missingWords = words.filter((word) => !hasUsableMeaning(word.meaning));
  let skippedCount = 0;

  for (const word of missingWords) {
    try {
      const definition = await generateVocabularyDefinition(word.word);
      updateVocabularyWord(word.word, definition);
    } catch {
      skippedCount += 1;
    }
  }

  const refreshedWords = loadVocabularyWords();
  return { refreshedWords, skippedCount };
}

export default function VocabularyPage() {
  const [words, setWords] = useState<VocabularyWord[]>(() =>
    loadVocabularyWords()
  );
  const [mastery, setMastery] = useState<VocabularyGroupMastery>(() =>
    loadVocabularyGroupMastery()
  );
  const [reviewMode, setReviewMode] = useState<ReviewMode>("normal");
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(
    null
  );
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState("");
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState(0);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [regeneratingWord, setRegeneratingWord] = useState("");
  const [message, setMessage] = useState("");
  const [isPreparingQuiz, setIsPreparingQuiz] = useState(false);
  const [showWordList, setShowWordList] = useState(false);

  const feedbackTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const groups = useMemo(() => groupVocabularyWords(words), [words]);
  const wrongWords = useMemo(
    () =>
      [...words]
        .filter((item) => item.wrongCount > 0)
        .sort((a, b) => b.wrongCount - a.wrongCount),
    [words]
  );
  const selectedGroupWords =
    reviewMode === "normal" && selectedGroupIndex !== null
      ? groups[selectedGroupIndex] || []
      : wrongWords.slice(0, 30);
  const currentQuestion = questions[currentQuestionIndex] || null;

  function clearFeedbackTimer() {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }

  function ensureAudioContext() {
    if (typeof window === "undefined") return null;
    if (!audioContextRef.current) {
      audioContextRef.current = getAudioContext();
    }
    return audioContextRef.current;
  }

  function playTone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    gainValue: number,
    startAt = 0
  ) {
    const audioContext = ensureAudioContext();
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime + startAt;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  function playNoiseBurst(
    duration: number,
    gainValue: number,
    highpassFrequency: number,
    startAt = 0
  ) {
    const audioContext = ensureAudioContext();
    if (!audioContext) return;

    const bufferSize = Math.max(1, Math.floor(audioContext.sampleRate * duration));
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < bufferSize; index += 1) {
      channel[index] = (Math.random() * 2 - 1) * (1 - index / bufferSize);
    }

    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime + startAt;

    source.buffer = buffer;
    filter.type = "highpass";
    filter.frequency.setValueAtTime(highpassFrequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    source.start(now);
    source.stop(now + duration + 0.03);
  }

  function playCorrectSound() {
    const audio = new Audio("/sounds/success.mp3");
    audio.volume = 0.8;
    audio.currentTime = 0;

    void audio.play().catch((error) => {
      console.error("播放成功音效失败", error);
    });
  }

  function playWrongSound() {
    playTone(95, 0.18, "sawtooth", 0.08);
    playTone(72, 0.28, "triangle", 0.07, 0.03);
    playNoiseBurst(0.16, 0.03, 180, 0.08);
    playTone(58, 0.18, "sine", 0.04, 0.16);
  }

  function playVictorySound() {
    const audio = new Audio("/sounds/Congratulations.mp3");
    audio.volume = 0.9;
    audio.currentTime = 0;

    void audio.play().catch((error) => {
      console.error("播放凯旋音效失败", error);
    });
  }

  function speakWord(word: string) {
    if (typeof window === "undefined" || !word) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  function refreshVocabularyData() {
    setWords(loadVocabularyWords());
    setMastery(loadVocabularyGroupMastery());
  }

  function resetQuizState() {
    clearFeedbackTimer();
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedOption("");
    setFeedback("");
    setScore(0);
    setQuizResult(null);
  }

  async function prepareAndStartQuiz(
    nextReviewMode: ReviewMode,
    sourceWords: VocabularyWord[],
    nextGroupIndex: number | null
  ) {
    if (sourceWords.length === 0) {
      setMessage(
        nextReviewMode === "wrong" ? "错题本里还没有单词。" : "这一组还没有单词。"
      );
      return;
    }

    setIsPreparingQuiz(true);
    setMessage("正在补充单词释义，请稍等……");

    try {
      const { refreshedWords, skippedCount } = await fillMissingDefinitions(
        sourceWords
      );

      setWords(refreshedWords);
      const refreshedGroups = groupVocabularyWords(refreshedWords);
      const refreshedSourceWords =
        nextReviewMode === "wrong"
          ? refreshedWords
              .filter((item) => item.wrongCount > 0)
              .sort((a, b) => b.wrongCount - a.wrongCount)
              .slice(0, 30)
          : nextGroupIndex !== null
            ? refreshedGroups[nextGroupIndex] || []
            : [];

      const nextQuestions = shuffleArray(refreshedSourceWords)
        .map((word) => createQuestion(word, refreshedWords))
        .filter((item): item is QuizQuestion => Boolean(item));

      if (nextQuestions.length === 0) {
        setMessage("这一组单词暂时还没有可用释义，无法开始测试。");
        return;
      }

      setReviewMode(nextReviewMode);
      setSelectedGroupIndex(nextGroupIndex);
      setQuestions(nextQuestions);
      setCurrentQuestionIndex(0);
      setSelectedOption("");
      setFeedback("");
      setScore(0);
      setQuizResult(null);
      setMessage(
        skippedCount > 0
          ? `有 ${skippedCount} 个单词释义未生成，暂时跳过。`
          : ""
      );
    } finally {
      setIsPreparingQuiz(false);
    }
  }

  async function startNormalQuiz(groupIndex: number) {
    const groupWords = groups[groupIndex] || [];
    await prepareAndStartQuiz("normal", groupWords, groupIndex);
  }

  async function startWrongReviewQuiz() {
    await prepareAndStartQuiz("wrong", wrongWords.slice(0, 30), null);
  }

  function handleReturnToList() {
    resetQuizState();
    setSelectedGroupIndex(null);
    setReviewMode("normal");
  }

  function finishQuiz(finalScore: number) {
    const total = questions.length;
    const perfect = total > 0 && finalScore === total;

    if (perfect && reviewMode === "normal" && selectedGroupIndex !== null) {
      setMastery(incrementVocabularyGroupMastery(selectedGroupIndex));
      setWords(incrementVocabularyWordsMasteredCount(selectedGroupWords));
      playVictorySound();
    }

    if (reviewMode === "wrong") {
      refreshVocabularyData();
    }

    const skippedMatch = message.match(/有 (\d+) 个单词释义未生成/);
    const skippedCount = skippedMatch ? Number(skippedMatch[1]) : 0;

    setQuizResult({
      score: finalScore,
      total,
      perfect,
      skippedCount,
    });
  }

  function moveToNextQuestion(isCorrect: boolean) {
    const nextScore = score + (isCorrect ? 1 : 0);
    const isLastQuestion = currentQuestionIndex >= questions.length - 1;

    feedbackTimerRef.current = window.setTimeout(() => {
      if (isLastQuestion) {
        finishQuiz(nextScore);
        return;
      }

      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption("");
      setFeedback("");
      setScore(nextScore);
    }, isCorrect ? 1000 : 1500);
  }

  function handleChooseOption(option: string) {
    if (!currentQuestion || selectedOption) return;

    setSelectedOption(option);
    const isCorrect = option === currentQuestion.correctMeaning;

    if (reviewMode === "wrong") {
      setWords(recordWrongBookReview(currentQuestion.word.word, isCorrect));
    } else {
      setWords(recordVocabularyAnswer(currentQuestion.word.word, isCorrect));
    }

    if (isCorrect) {
      playCorrectSound();
      setFeedback("答对了！");
    } else {
      playWrongSound();
      setFeedback(`答错了，正确答案是：${currentQuestion.correctMeaning}`);
    }

    moveToNextQuestion(isCorrect);
  }

  async function handleRegenerateDefinition(word: string) {
    setRegeneratingWord(word);
    setMessage("");

    try {
      const definition = await generateVocabularyDefinition(word);
      updateVocabularyWord(word, definition);
      refreshVocabularyData();
      setMessage(`已生成释义：${word}`);
    } catch {
      setMessage("释义生成失败，请稍后重试。");
    } finally {
      setRegeneratingWord("");
    }
  }

  useEffect(() => {
    if (!currentQuestion || quizResult) return;
    speakWord(currentQuestion.word.word);
  }, [currentQuestion, quizResult]);

  useEffect(() => {
    return () => {
      clearFeedbackTimer();
      if (typeof window !== "undefined") {
        window.speechSynthesis.cancel();
      }
      void audioContextRef.current?.close();
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div>
            <div className="mb-2 inline-flex rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-300">
              Vocabulary
            </div>
            <h1 className="text-3xl font-bold">我的单词本</h1>
            <p className="mt-2 text-white/65">已保存单词数量：{words.length}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={refreshVocabularyData}
              className="rounded-2xl bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500"
            >
              刷新
            </button>
            <Link
              href="/"
              className="rounded-2xl bg-slate-700 px-4 py-3 font-semibold hover:bg-slate-600"
            >
              返回首页
            </Link>
          </div>
        </div>

        {message ? (
          <div className="mb-4 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-3 text-sm text-blue-200">
            {message}
          </div>
        ) : null}

        {isPreparingQuiz ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-lg text-white/80">
            正在补充单词释义，请稍等……
          </div>
        ) : !questions.length && !quizResult ? (
          <section className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setReviewMode("normal");
                  setSelectedGroupIndex(null);
                  setMessage("");
                }}
                className={`rounded-2xl px-4 py-3 font-semibold ${
                  reviewMode === "normal"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-700 text-white/80 hover:bg-slate-600"
                }`}
              >
                普通背诵
              </button>
              <button
                onClick={() => void startWrongReviewQuiz()}
                className="rounded-2xl bg-orange-600 px-4 py-3 font-semibold hover:bg-orange-500"
              >
                复习错题本
              </button>
            </div>

            {reviewMode === "normal" ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h2 className="mb-4 text-2xl font-bold">分组列表</h2>

                {groups.length === 0 ? (
                  <div className="rounded-2xl bg-black/20 p-5 text-white/60">
                    还没有保存单词
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {groups.map((group, groupIndex) => {
                      const masteryCount = mastery[`group-${groupIndex}`] || 0;
                      return (
                        <button
                          key={`group-${groupIndex}`}
                          onClick={() => void startNormalQuiz(groupIndex)}
                          className="rounded-3xl border border-white/10 bg-black/20 p-5 text-left transition hover:border-blue-400 hover:bg-white/8"
                        >
                          <div className="text-xl font-bold">
                            第 {groupIndex + 1} 组
                          </div>
                          <div className="mt-2 text-white/75">
                            {group.length} 个单词｜凯旋 {masteryCount} 次
                          </div>
                          <div className="mt-3 text-sm text-white/50">
                            每组最多 30 个单词
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-bold">复习错题本</h2>
                  <button
                    onClick={() => void startWrongReviewQuiz()}
                    className="rounded-2xl bg-orange-600 px-4 py-3 font-semibold hover:bg-orange-500"
                  >
                    开始复习错题
                  </button>
                </div>

                {wrongWords.length === 0 ? (
                  <div className="rounded-2xl bg-black/20 p-5 text-white/60">
                    还没有错题。
                  </div>
                ) : (
                  <div className="space-y-3">
                    {wrongWords.map((word) => (
                      <div
                        key={`wrong-${word.word}`}
                        className="rounded-2xl border border-white/10 bg-black/20 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-xl font-bold text-emerald-300">
                              {word.word}
                            </div>
                            <div className="mt-1 text-white/75">
                              {hasUsableMeaning(word.meaning)
                                ? word.meaning
                                : PLACEHOLDER_MEANING}
                            </div>
                          </div>
                          <div className="text-sm text-white/55">
                            wrong {word.wrongCount} | correct {word.correctCount}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold">单词列表</h2>
                <button
                  onClick={() => setShowWordList((prev) => !prev)}
                  className="rounded-2xl bg-slate-700 px-4 py-3 font-semibold hover:bg-slate-600"
                >
                  {showWordList ? "收起单词列表" : "查看全部单词"}
                </button>
              </div>

              {showWordList ? (
                words.length === 0 ? (
                  <div className="mt-4 rounded-2xl bg-black/20 p-5 text-white/60">
                    还没有保存单词
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                  {words.map((word) => {
                    const needsDefinition = !hasUsableMeaning(word.meaning);

                    return (
                      <div
                        key={word.word}
                        className="rounded-3xl border border-white/10 bg-black/20 p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="text-2xl font-bold text-emerald-300">
                              {word.word}
                            </div>
                            <div className="mt-1 text-white/75">
                              {hasUsableMeaning(word.meaning)
                                ? word.meaning
                                : PLACEHOLDER_MEANING}
                              {word.partOfSpeech ? ` · ${word.partOfSpeech}` : ""}
                            </div>
                          </div>

                          {needsDefinition ? (
                            <button
                              onClick={() => void handleRegenerateDefinition(word.word)}
                              disabled={regeneratingWord === word.word}
                              className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
                            >
                              {regeneratingWord === word.word
                                ? "生成中..."
                                : "生成释义"}
                            </button>
                          ) : null}
                        </div>

                        <div className="mt-4 space-y-2 text-sm leading-6 text-white/70">
                          <div>例句：{word.example || "待补充"}</div>
                          <div>翻译：{word.exampleZh || "待补充"}</div>
                          <div>
                            正确次数：{word.correctCount} | 错题次数：{word.wrongCount} | 凯旋：{word.masteredCount}
                          </div>
                          {word.sourceSentence ? (
                            <div>来源句子：{word.sourceSentence}</div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                )
              ) : null}
            </div>
          </section>
        ) : quizResult ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
            <h2 className="text-3xl font-bold">本组测试完成！</h2>
            <p className="mt-4 text-2xl text-emerald-300">
              得分：{quizResult.score} / {quizResult.total}
            </p>

            {quizResult.skippedCount > 0 ? (
              <p className="mt-4 text-sm text-amber-200">
                有 {quizResult.skippedCount} 个单词释义未生成，暂时跳过。
              </p>
            ) : null}

            {quizResult.perfect && reviewMode === "normal" ? (
              <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5 text-emerald-200">
                太棒了！本组获得一次凯旋！
              </div>
            ) : (
              <div className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-500/10 p-5 text-amber-100">
                再来一次？
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => {
                  if (reviewMode === "wrong") {
                    void startWrongReviewQuiz();
                    return;
                  }
                  if (selectedGroupIndex !== null) {
                    void startNormalQuiz(selectedGroupIndex);
                  }
                }}
                className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
              >
                再来一次
              </button>
              <button
                onClick={handleReturnToList}
                className="rounded-2xl bg-slate-700 px-5 py-3 font-semibold hover:bg-slate-600"
              >
                返回单词本
              </button>
            </div>
          </section>
        ) : currentQuestion ? (
          <section className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-white/50">
                    {reviewMode === "wrong"
                      ? "错题复习"
                      : `第 ${(selectedGroupIndex ?? 0) + 1} 组`}
                  </div>
                  <h2 className="text-2xl font-bold">
                    第 {currentQuestionIndex + 1} 题 / 共 {questions.length} 题
                  </h2>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => speakWord(currentQuestion.word.word)}
                    className="rounded-2xl bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500"
                  >
                    重新朗读
                  </button>
                  <button
                    onClick={handleReturnToList}
                    className="rounded-2xl bg-slate-700 px-4 py-3 font-semibold hover:bg-slate-600"
                  >
                    返回单词本
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
              <div className="mb-3 text-sm text-white/50">当前英文单词</div>
              <div className="text-5xl font-bold tracking-wide text-emerald-300">
                {currentQuestion.word.word}
              </div>
              {currentQuestion.word.sourceSentence ? (
                <p className="mx-auto mt-4 max-w-3xl text-sm leading-6 text-white/55">
                  来源句子：{currentQuestion.word.sourceSentence}
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedOption === option;
                const isCorrect = option === currentQuestion.correctMeaning;

                return (
                  <button
                    key={option}
                    onClick={() => handleChooseOption(option)}
                    disabled={Boolean(selectedOption)}
                    className={`rounded-3xl border px-5 py-6 text-left text-xl font-semibold transition ${
                      !selectedOption
                        ? "border-white/10 bg-black/20 hover:border-blue-400 hover:bg-white/8"
                        : isCorrect
                          ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
                          : isSelected
                            ? "border-red-400 bg-red-500/20 text-red-100"
                            : "border-white/10 bg-black/20 text-white/55"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="text-lg font-bold">当前得分：{score}</div>
              {feedback ? (
                <div className="mt-3 rounded-2xl bg-white/5 px-4 py-3 text-lg text-white/85">
                  {feedback}
                </div>
              ) : (
                <div className="mt-3 text-white/50">
                  请选择正确中文意思。页面会自动朗读英文单词。
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

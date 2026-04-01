"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type Lesson = {
  id: string;
  title: string;
  txt_content: string;
  created_at: string;
};

type AudioItem = {
  id: string;
  title: string;
  created_at: string;
};

type AudioDBRecord = {
  id: string;
  title: string;
  created_at: string;
  file: Blob;
};

type LocalLessonData = {
  lessons: Lesson[];
};

const LESSONS_STORAGE_KEY = "english-app-lessons";
const DB_NAME = "english-learning-app-db";
const DB_VERSION = 1;
const AUDIO_STORE_NAME = "audios";
const MAX_AUDIO_SIZE_MB = 100;
const MAX_AUDIO_SIZE = MAX_AUDIO_SIZE_MB * 1024 * 1024;

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getDefaultLessonsData(): LocalLessonData {
  return {
    lessons: [],
  };
}

function loadLessonsData(): LocalLessonData {
  if (typeof window === "undefined") {
    return getDefaultLessonsData();
  }

  try {
    const raw = localStorage.getItem(LESSONS_STORAGE_KEY);
    if (!raw) return getDefaultLessonsData();

    const parsed = JSON.parse(raw);

    return {
      lessons: Array.isArray(parsed.lessons) ? parsed.lessons : [],
    };
  } catch (error) {
    console.error("读取 TXT 数据失败：", error);
    return getDefaultLessonsData();
  }
}

function saveLessonsData(data: LocalLessonData) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(LESSONS_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("保存 TXT 数据失败：", error);
    throw new Error("保存 TXT 失败，浏览器本地存储可能已满。");
  }
}

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("当前浏览器不支持 IndexedDB"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        db.createObjectStore(AUDIO_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error("打开 IndexedDB 失败：", request.error);
      reject(new Error("打开 IndexedDB 失败"));
    };
  });
}

async function getAllAudiosFromDB(): Promise<AudioItem[]> {
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE_NAME, "readonly");
    const store = tx.objectStore(AUDIO_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const result = (request.result || []) as AudioDBRecord[];

      const items: AudioItem[] = result
        .map((item) => ({
          id: item.id,
          title: item.title,
          created_at: item.created_at,
        }))
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

      resolve(items);
    };

    request.onerror = () => {
      console.error("读取音频列表失败：", request.error);
      reject(new Error("读取音频列表失败"));
    };
  });
}

async function saveAudioToDB(record: AudioDBRecord): Promise<void> {
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE_NAME, "readwrite");
    const store = tx.objectStore(AUDIO_STORE_NAME);
    const request = store.put(record);

    request.onsuccess = () => resolve();

    request.onerror = () => {
      console.error("保存音频失败：", request.error);
      reject(new Error("保存音频失败，浏览器空间可能不足。"));
    };
  });
}

async function getAudioBlobById(id: string): Promise<Blob | null> {
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE_NAME, "readonly");
    const store = tx.objectStore(AUDIO_STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const result = request.result as AudioDBRecord | undefined;
      resolve(result?.file || null);
    };

    request.onerror = () => {
      console.error("读取音频文件失败：", request.error);
      reject(new Error("读取音频文件失败"));
    };
  });
}

async function deleteAudioFromDB(id: string): Promise<void> {
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE_NAME, "readwrite");
    const store = tx.objectStore(AUDIO_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();

    request.onerror = () => {
      console.error("删除音频失败：", request.error);
      reject(new Error("删除音频失败"));
    };
  });
}

export default function Home() {
  const [title, setTitle] = useState("");
  const [txtContent, setTxtContent] = useState("");
  const [message, setMessage] = useState("");

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);

  const [audioTitle, setAudioTitle] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioMessage, setAudioMessage] = useState("");
  const [audios, setAudios] = useState<AudioItem[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [selectedAudioUrl, setSelectedAudioUrl] = useState("");
  const [loadingAudio, setLoadingAudio] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentObjectUrlRef = useRef<string | null>(null);

  function loadLessons() {
    const data = loadLessonsData();
    setLessons(data.lessons || []);

    if (data.lessons.length > 0) {
      setExpandedLessonId((prev) => prev ?? data.lessons[0].id);
    } else {
      setExpandedLessonId(null);
    }
  }

  async function loadAudios() {
    try {
      const data = await getAllAudiosFromDB();
      setAudios(data);

      if (data.length > 0) {
        setSelectedAudioId((prev) => prev ?? data[0].id);
      } else {
        setSelectedAudioId(null);
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "读取音频列表失败";
      setAudioMessage(msg);
    }
  }

  function handleSaveLesson() {
    try {
      setMessage("");

      if (!title.trim() || !txtContent.trim()) {
        setMessage("标题和TXT内容都不能为空。");
        return;
      }

      const newLesson: Lesson = {
        id: createId(),
        title: title.trim(),
        txt_content: txtContent.trim(),
        created_at: new Date().toISOString(),
      };

      const current = loadLessonsData();
      const nextLessons = [newLesson, ...(current.lessons || [])];

      saveLessonsData({ lessons: nextLessons });
      setLessons(nextLessons);
      setExpandedLessonId(newLesson.id);

      setTitle("");
      setTxtContent("");
      setMessage("TXT 保存成功！");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "TXT 保存失败。";
      setMessage(msg);
    }
  }

  function handleDeleteLesson(id: string) {
    try {
      const ok = window.confirm("确定要删除这条 TXT 课程吗？");
      if (!ok) return;

      const current = loadLessonsData();
      const nextLessons = current.lessons.filter((item) => item.id !== id);

      saveLessonsData({ lessons: nextLessons });
      setLessons(nextLessons);

      if (expandedLessonId === id) {
        setExpandedLessonId(nextLessons.length > 0 ? nextLessons[0].id : null);
      }

      setMessage("TXT 删除成功！");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "TXT 删除失败。";
      setMessage(msg);
    }
  }

  async function handleUploadAudio() {
    try {
      setAudioMessage("");

      if (!audioTitle.trim()) {
        setAudioMessage("请输入音频标题。");
        return;
      }

      if (!audioFile) {
        setAudioMessage("请先选择一个 MP3 文件。");
        return;
      }

      if (audioFile.size > MAX_AUDIO_SIZE) {
        setAudioMessage(
          `文件太大，请选择小于 ${MAX_AUDIO_SIZE_MB}MB 的音频文件。`
        );
        return;
      }

      const newAudio: AudioDBRecord = {
        id: createId(),
        title: audioTitle.trim(),
        created_at: new Date().toISOString(),
        file: audioFile,
      };

      await saveAudioToDB(newAudio);
      const nextAudios = await getAllAudiosFromDB();

      setAudios(nextAudios);
      setSelectedAudioId(newAudio.id);
      setAudioTitle("");
      setAudioFile(null);
      setAudioMessage("MP3 上传成功！");

      const fileInput = document.getElementById(
        "audio-file-input"
      ) as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "上传失败，浏览器存储空间可能不足。";
      setAudioMessage(msg);
    }
  }

  async function handleDeleteAudio(audio: AudioItem) {
    try {
      const ok = window.confirm("确定要删除这条音频吗？");
      if (!ok) return;

      await deleteAudioFromDB(audio.id);
      const nextAudios = await getAllAudiosFromDB();

      setAudios(nextAudios);

      if (selectedAudioId === audio.id) {
        setSelectedAudioId(nextAudios.length > 0 ? nextAudios[0].id : null);

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      }

      setAudioMessage("音频删除成功！");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "删除音频失败";
      setAudioMessage(msg);
    }
  }

  function toggleLesson(id: string) {
    setExpandedLessonId((prev) => (prev === id ? null : id));
  }

  const selectedAudio = useMemo(() => {
    return audios.find((item) => item.id === selectedAudioId) || null;
  }, [audios, selectedAudioId]);

  function handleStopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }

  function setPlaybackRate(rate: number) {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }

  useEffect(() => {
    loadLessons();
    loadAudios();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSelectedAudioUrl() {
      if (!selectedAudioId) {
        if (currentObjectUrlRef.current) {
          URL.revokeObjectURL(currentObjectUrlRef.current);
          currentObjectUrlRef.current = null;
        }
        setSelectedAudioUrl("");
        return;
      }

      try {
        setLoadingAudio(true);
        const blob = await getAudioBlobById(selectedAudioId);

        if (cancelled) return;

        if (currentObjectUrlRef.current) {
          URL.revokeObjectURL(currentObjectUrlRef.current);
          currentObjectUrlRef.current = null;
        }

        if (!blob) {
          setSelectedAudioUrl("");
          return;
        }

        const objectUrl = URL.createObjectURL(blob);
        currentObjectUrlRef.current = objectUrl;
        setSelectedAudioUrl(objectUrl);
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setSelectedAudioUrl("");
          setAudioMessage("读取选中的音频失败。");
        }
      } finally {
        if (!cancelled) {
          setLoadingAudio(false);
        }
      }
    }

    loadSelectedAudioUrl();

    return () => {
      cancelled = true;
    };
  }, [selectedAudioId]);

  useEffect(() => {
    return () => {
      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div>
            <h1 className="text-3xl font-bold">英语学习网站</h1>
            <p className="mt-2 text-white/65">
              离线版：TXT 保存在浏览器，音频使用 IndexedDB 保存
            </p>
          </div>

          <div className="rounded-2xl bg-emerald-600/20 px-5 py-3 font-semibold text-emerald-300">
            无需登录
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="mb-4 text-xl font-bold">TXT 快捷区</h2>

              <input
                type="text"
                placeholder="输入课程标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mb-3 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 outline-none placeholder:text-white/35"
              />

              <textarea
                placeholder="把 TXT 内容粘贴到这里"
                value={txtContent}
                onChange={(e) => setTxtContent(e.target.value)}
                rows={8}
                className="mb-3 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 outline-none placeholder:text-white/35"
              />

              <button
                onClick={handleSaveLesson}
                className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-500"
              >
                保存 TXT
              </button>

              {message && (
                <div className="mt-3 rounded-2xl bg-blue-500/10 p-3 text-sm text-blue-300">
                  {message}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="mb-4 text-xl font-bold">音频快捷区</h2>

              <input
                type="text"
                placeholder="输入音频标题"
                value={audioTitle}
                onChange={(e) => setAudioTitle(e.target.value)}
                className="mb-3 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 outline-none placeholder:text-white/35"
              />

              <input
                id="audio-file-input"
                type="file"
                accept=".mp3,audio/mpeg,audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setAudioFile(file);
                }}
                className="mb-3 block w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3"
              />

              <button
                onClick={handleUploadAudio}
                className="w-full rounded-2xl bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500"
              >
                上传 MP3
              </button>

              {audioMessage && (
                <div className="mt-3 rounded-2xl bg-emerald-500/10 p-3 text-sm text-emerald-300">
                  {audioMessage}
                </div>
              )}

              <div className="mt-3 text-xs text-white/45">
                单个音频限制：{MAX_AUDIO_SIZE_MB}MB。使用 IndexedDB，
                可存比 localStorage 大得多的音频。
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h2 className="mb-4 text-2xl font-bold">已保存课程</h2>

                {lessons.length === 0 ? (
                  <p className="text-white/60">还没有保存任何课程。</p>
                ) : (
                  <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                    {lessons.map((lesson, index) => {
                      const isExpanded = expandedLessonId === lesson.id;

                      return (
                        <div
                          key={lesson.id}
                          className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"
                        >
                          <div className="flex items-center justify-between gap-3 px-4 py-4">
                            <button
                              onClick={() => toggleLesson(lesson.id)}
                              className="flex-1 text-left hover:text-blue-300"
                            >
                              <div className="text-base font-bold">
                                {index + 1}. {lesson.title}
                              </div>
                              <div className="mt-1 text-xs text-white/50">
                                {isExpanded ? "点击收起" : "点击展开"}
                              </div>
                            </button>

                            <Link
                              href={`/study/${lesson.id}`}
                              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium"
                            >
                              学习
                            </Link>

                            <button
                              onClick={() => handleDeleteLesson(lesson.id)}
                              className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium"
                            >
                              删除
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="border-t border-white/10 px-4 py-4">
                              <p className="whitespace-pre-wrap text-sm text-white/80">
                                {lesson.txt_content}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h2 className="mb-4 text-2xl font-bold">已保存音频</h2>

                {audios.length === 0 ? (
                  <p className="text-white/60">还没有上传任何音频。</p>
                ) : (
                  <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                    {audios.map((audio, index) => (
                      <div
                        key={audio.id}
                        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                          selectedAudioId === audio.id
                            ? "border-blue-400 bg-blue-500/20"
                            : "border-white/10 bg-black/20"
                        }`}
                      >
                        <button
                          onClick={() => setSelectedAudioId(audio.id)}
                          className="flex-1 text-left"
                        >
                          <div className="font-semibold">
                            {index + 1}. {audio.title}
                          </div>
                        </button>

                        <button
                          onClick={() => handleDeleteAudio(audio)}
                          className="rounded-xl bg-red-600 px-3 py-2 text-sm"
                        >
                          删除
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="mb-4 text-2xl font-bold">音频播放器</h2>

              {selectedAudio ? (
                <div className="rounded-2xl bg-black/20 p-5">
                  <h3 className="mb-4 text-xl font-semibold">
                    {selectedAudio.title}
                  </h3>

                  {loadingAudio ? (
                    <div className="rounded-2xl bg-black/20 p-5 text-white/60">
                      正在加载音频...
                    </div>
                  ) : (
                    <audio
                      ref={audioRef}
                      src={selectedAudioUrl}
                      controls
                      className="w-full"
                    />
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={handleStopAudio}
                      className="rounded-xl bg-orange-600 px-4 py-2"
                    >
                      停止
                    </button>

                    <button
                      onClick={() => setPlaybackRate(0.75)}
                      className="rounded-xl bg-slate-700 px-4 py-2"
                    >
                      0.75x
                    </button>

                    <button
                      onClick={() => setPlaybackRate(1)}
                      className="rounded-xl bg-slate-700 px-4 py-2"
                    >
                      1x
                    </button>

                    <button
                      onClick={() => setPlaybackRate(1.25)}
                      className="rounded-xl bg-slate-700 px-4 py-2"
                    >
                      1.25x
                    </button>

                    <button
                      onClick={() => setPlaybackRate(1.5)}
                      className="rounded-xl bg-slate-700 px-4 py-2"
                    >
                      1.5x
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-black/20 p-5 text-white/60">
                  请先在上方音频列表中点击一条音频。
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
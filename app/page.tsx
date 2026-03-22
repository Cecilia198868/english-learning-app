"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type Lesson = {
  id: string;
  title: string;
  txt_content: string;
  created_at: string;
};

type AudioItem = {
  id: string;
  title: string;
  file_path: string;
  created_at: string;
};

export default function Home() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

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

  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUserEmail(user?.email ?? null);
    setUserId(user?.id ?? null);
    setCheckingAuth(false);
  }

  async function loadLessons() {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("读取课程失败：" + error.message);
      return;
    }

    setLessons(data || []);

    if (data && data.length > 0 && !expandedLessonId) {
      setExpandedLessonId(data[0].id);
    }
  }

  async function loadAudios() {
    const { data, error } = await supabase
      .from("audios")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setAudioMessage("读取音频失败：" + error.message);
      return;
    }

    setAudios(data || []);

    if (data && data.length > 0 && !selectedAudioId) {
      setSelectedAudioId(data[0].id);
    }
  }

  async function handleSaveLesson() {
    if (!userId) {
      setMessage("请先登录。");
      return;
    }

    if (!title.trim() || !txtContent.trim()) {
      setMessage("标题和TXT内容都不能为空。");
      return;
    }

    const { data, error } = await supabase
      .from("lessons")
      .insert({
        user_id: userId,
        title,
        txt_content: txtContent,
      })
      .select();

    if (error) {
      setMessage("保存失败：" + error.message);
      return;
    }

    setMessage("TXT 保存成功！");
    setTitle("");
    setTxtContent("");

    await loadLessons();

    if (data && data.length > 0) {
      setExpandedLessonId(data[0].id);
    }
  }

  async function handleDeleteLesson(id: string) {
    const ok = window.confirm("确定要删除这条 TXT 课程吗？");
    if (!ok) return;

    const { error } = await supabase.from("lessons").delete().eq("id", id);

    if (error) {
      setMessage("删除 TXT 失败：" + error.message);
      return;
    }

    if (expandedLessonId === id) {
      setExpandedLessonId(null);
    }

    setMessage("TXT 删除成功！");
    await loadLessons();
  }

  async function handleUploadAudio() {
    if (!userId) {
      setAudioMessage("请先登录。");
      return;
    }

    if (!audioTitle.trim()) {
      setAudioMessage("请输入音频标题。");
      return;
    }

    if (!audioFile) {
      setAudioMessage("请先选择一个 MP3 文件。");
      return;
    }

    const fileExt = audioFile.name.split(".").pop() || "mp3";
    const fileName = `${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("audio")
      .upload(fileName, audioFile, {
        upsert: false,
      });

    if (uploadError) {
      setAudioMessage("上传文件失败：" + uploadError.message);
      return;
    }

    const { error: insertError } = await supabase.from("audios").insert({
      user_id: userId,
      title: audioTitle,
      file_path: fileName,
    });

    if (insertError) {
      setAudioMessage("保存音频记录失败：" + insertError.message);
      return;
    }

    setAudioMessage("MP3 上传成功！");
    setAudioTitle("");
    setAudioFile(null);

    const fileInput = document.getElementById(
      "audio-file-input"
    ) as HTMLInputElement | null;
    if (fileInput) fileInput.value = "";

    await loadAudios();
  }

  async function handleDeleteAudio(audio: AudioItem) {
    const ok = window.confirm("确定要删除这条音频吗？");
    if (!ok) return;

    const { error: dbError } = await supabase
      .from("audios")
      .delete()
      .eq("id", audio.id);

    if (dbError) {
      setAudioMessage("删除音频记录失败：" + dbError.message);
      return;
    }

    const { error: storageError } = await supabase.storage
      .from("audio")
      .remove([audio.file_path]);

    if (storageError) {
      setAudioMessage(
        "数据库记录已删除，但云端音频文件删除失败：" + storageError.message
      );
    } else {
      setAudioMessage("音频删除成功！");
    }

    if (selectedAudioId === audio.id) {
      setSelectedAudioId(null);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }

    await loadAudios();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUserEmail(null);
    setUserId(null);
    setLessons([]);
    setExpandedLessonId(null);
    setAudios([]);
    setSelectedAudioId(null);
    setMessage("");
    setAudioMessage("");
    router.push("/login");
  }

  function toggleLesson(id: string) {
    setExpandedLessonId((prev) => (prev === id ? null : id));
  }

  const selectedAudio = useMemo(() => {
    return audios.find((item) => item.id === selectedAudioId) || null;
  }, [audios, selectedAudioId]);

  const selectedAudioUrl = useMemo(() => {
    if (!selectedAudio) return "";
    const { data } = supabase.storage
      .from("audio")
      .getPublicUrl(selectedAudio.file_path);
    return data.publicUrl;
  }, [selectedAudio]);

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
    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (userId) {
      loadLessons();
      loadAudios();
    }
  }, [userId]);

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-8 py-6 text-lg">
          正在加载中...
        </div>
      </main>
    );
  }

  if (!userEmail) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl text-center">
          <div className="mb-4 inline-flex rounded-full bg-emerald-500/20 px-4 py-1 text-sm text-emerald-300">
            Welcome
          </div>

          <h1 className="mb-4 text-4xl font-bold">英语学习网站</h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-white/70">
            这里可以保存你的 TXT 课程、上传真实 MP3、逐句学习、自动播放、朗读英文，还能记住学习进度。
          </p>

          <div className="flex justify-center">
            <Link
              href="/login"
              className="rounded-2xl bg-emerald-600 px-8 py-4 text-lg font-semibold hover:bg-emerald-500"
            >
              进入登录页
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div>
            <h1 className="text-3xl font-bold">英语学习网站</h1>
            <p className="mt-2 text-white/65">已登录邮箱：{userEmail}</p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-2xl bg-red-600 px-5 py-3 font-semibold hover:bg-red-500"
          >
            退出登录
          </button>
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
                accept=".mp3,audio/mpeg"
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
            </div>
          </aside>

          <section className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h2 className="mb-4 text-2xl font-bold">已保存课程</h2>

                {lessons.length === 0 ? (
                  <p className="text-white/60">还没有保存任何课程。</p>
                ) : (
                  <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
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
                  <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
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

                  <audio
                    ref={audioRef}
                    src={selectedAudioUrl}
                    controls
                    className="w-full"
                  />

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
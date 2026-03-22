"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function checkUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      router.push("/");
    }
  }

  async function handleLogin() {
    if (!email.trim()) {
      setMessage("请输入邮箱。");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: "http://localhost:3000",
      },
    });

    if (error) {
      setMessage("发送登录邮件失败：" + error.message);
    } else {
      setMessage("登录邮件已发送，请去邮箱点击登录链接。");
    }

    setLoading(false);
  }

  useEffect(() => {
    checkUser();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <div className="mb-6 inline-flex rounded-full bg-emerald-500/20 px-4 py-1 text-sm text-emerald-300">
            English Learning App
          </div>

          <h1 className="mb-4 text-4xl font-bold leading-tight">
            你的英语学习网页
          </h1>

          <p className="mb-6 text-lg text-white/70">
            上传 TXT、上传真实 MP3、逐句学习、自动播放、朗读英文、记住进度。
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <h2 className="mb-2 text-lg font-semibold">TXT课程</h2>
              <p className="text-sm text-white/60">保存、展开、删除、进入学习模式</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <h2 className="mb-2 text-lg font-semibold">真实音频</h2>
              <p className="text-sm text-white/60">上传 MP3、播放、停止、变速</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <h2 className="mb-2 text-lg font-semibold">逐句学习</h2>
              <p className="text-sm text-white/60">点击显示英文，机器人朗读</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <h2 className="mb-2 text-lg font-semibold">自动播放</h2>
              <p className="text-sm text-white/60">中文停留 → 英文出现 → 自动朗读</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <h2 className="mb-2 text-3xl font-bold">登录 / 注册</h2>
          <p className="mb-6 text-white/70">
            输入邮箱后，系统会发登录邮件给你。点击邮件中的链接即可进入网站。
          </p>

          <div className="space-y-4">
            <input
              type="email"
              placeholder="请输入邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-4 text-white outline-none placeholder:text-white/35"
            />

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full rounded-2xl bg-emerald-600 px-4 py-4 text-lg font-semibold hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? "发送中..." : "发送登录链接"}
            </button>
          </div>

          {message && (
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-emerald-300">
              {message}
            </div>
          )}

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
            提示：以后别人打开网站时，直接进首页就行；没登录时会自动看到登录入口。
          </div>
        </div>
      </div>
    </main>
  );
}
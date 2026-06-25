import { NextResponse } from "next/server";

type OAuthFailureReason =
  | "csrf"
  | "exception"
  | "missing-provider"
  | "not-configured"
  | "signin";

const providerNames: Record<string, string> = {
  apple: "Apple",
  google: "Google",
};

const reasonMessages: Record<OAuthFailureReason, string> = {
  csrf: "登录安全校验失败，请关闭此页面后回到 SpeakFlow 重试。",
  exception: "登录启动时发生异常，请关闭此页面后回到 SpeakFlow 重试。",
  "missing-provider": "当前登录服务没有返回授权地址，请关闭此页面后回到 SpeakFlow 重试。",
  "not-configured": "当前登录方式暂未配置完成，请关闭此页面后回到 SpeakFlow。",
  signin: "登录启动失败，请关闭此页面后回到 SpeakFlow 重试。",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function createOAuthFailureResponse(
  providerId: string,
  reason: OAuthFailureReason
) {
  const providerName = providerNames[providerId] || providerId;
  const title = `${providerName} 登录暂不可用`;
  const message = reasonMessages[reason];
  const escapedTitle = escapeHtml(title);
  const escapedMessage = escapeHtml(message);

  return new NextResponse(
    `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${escapedTitle}</title>
    <style>
      body {
        min-height: 100vh;
        min-height: 100dvh;
        margin: 0;
        display: grid;
        place-items: center;
        background: linear-gradient(180deg, #f8fbff 0%, #f4f0ff 100%);
        color: #111735;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(calc(100% - 40px), 360px);
        border: 1px solid rgba(219, 225, 244, 0.9);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 22px 54px rgba(42, 54, 92, 0.14);
        padding: 28px 22px;
        text-align: center;
      }
      h1 {
        margin: 0 0 10px;
        font-size: 1.28rem;
        line-height: 1.35;
      }
      p {
        margin: 0 0 18px;
        color: rgba(35, 43, 75, 0.64);
        font-size: 0.92rem;
        font-weight: 700;
        line-height: 1.65;
      }
      button {
        width: 100%;
        min-height: 48px;
        border: 0;
        border-radius: 999px;
        background: #111735;
        color: white;
        font: inherit;
        font-weight: 900;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapedTitle}</h1>
      <p>${escapedMessage}</p>
      <button type="button" onclick="window.close()">关闭页面</button>
    </main>
  </body>
</html>`,
    {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8",
      },
      status: 503,
    }
  );
}

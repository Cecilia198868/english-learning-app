import {
  createPasswordlessCode,
  normalizePasswordlessTarget,
  shouldExposePasswordlessCode,
} from "@/lib/passwordlessCodes";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown };
    const email = normalizePasswordlessTarget(
      "email",
      typeof body.email === "string" ? body.email : ""
    );
    const result = await createPasswordlessCode("email", email);
    const exposeCode = shouldExposePasswordlessCode();

    return NextResponse.json({
      devCode: exposeCode ? result.code : undefined,
      expiresAt: result.expiresAt,
      message: exposeCode
        ? `测试环境验证码：${result.code}`
        : "验证码已发送，请检查邮箱。",
      ok: true,
    });
  } catch {
    return NextResponse.json(
      { error: "请输入有效邮箱地址。", ok: false },
      { status: 400 }
    );
  }
}

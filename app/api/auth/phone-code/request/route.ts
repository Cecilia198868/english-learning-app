import {
  createPasswordlessCode,
  normalizePasswordlessTarget,
  shouldExposePasswordlessCode,
} from "@/lib/passwordlessCodes";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      countryCode?: unknown;
      phone?: unknown;
    };
    const phoneTarget = normalizePasswordlessTarget(
      "phone",
      typeof body.phone === "string" ? body.phone : "",
      typeof body.countryCode === "string" ? body.countryCode : ""
    );
    const result = await createPasswordlessCode("phone", phoneTarget);
    const exposeCode = shouldExposePasswordlessCode();

    return NextResponse.json({
      devCode: exposeCode ? result.code : undefined,
      expiresAt: result.expiresAt,
      message: exposeCode
        ? `测试环境验证码：${result.code}`
        : "验证码已发送，请检查短信。",
      ok: true,
    });
  } catch {
    return NextResponse.json(
      { error: "请输入有效手机号。", ok: false },
      { status: 400 }
    );
  }
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveAuthOrigin } from "@/lib/authOrigin";
import { getSafeInternalCallbackUrl } from "@/lib/loginRedirect";

export const dynamic = "force-dynamic";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let supabaseEmailClient: SupabaseClient | null = null;

function getSupabaseEmailClient() {
  if (supabaseEmailClient) return supabaseEmailClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase 邮箱登录配置缺失，请稍后再试。");
  }

  supabaseEmailClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  return supabaseEmailClient;
}

function getRequestOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0];
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0] || "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

function getEmailRedirectTo(request: Request, callbackUrl: string) {
  const originResolution = resolveAuthOrigin(getRequestOrigin(request));
  const redirectUrl = new URL("/auth/callback", originResolution.origin);
  redirectUrl.searchParams.set("callbackUrl", callbackUrl);

  return {
    emailRedirectTo: redirectUrl.toString(),
    originResolution,
  };
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const body = payload && typeof payload === "object" ? payload : {};
  const email =
    "email" in body && typeof body.email === "string" ? body.email.trim() : "";
  const callbackValue =
    "callbackUrl" in body && typeof body.callbackUrl === "string"
      ? body.callbackUrl
      : undefined;
  const callbackUrl = getSafeInternalCallbackUrl(callbackValue);
  const isValidEmail = emailRegex.test(email);

  console.log("[auth][email.start.request]", {
    callbackUrl,
    email,
    isValidEmail,
  });

  if (!isValidEmail) {
    return Response.json({ error: "请输入有效邮箱地址。" }, { status: 400 });
  }

  try {
    const { emailRedirectTo, originResolution } = getEmailRedirectTo(
      request,
      callbackUrl
    );
    const supabase = getSupabaseEmailClient();
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
      },
    });

    console.log("[auth][email.start.signInWithOtp]", {
      data,
      email,
      emailRedirectTo,
      error,
      originResolution,
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({
      emailRedirectTo,
      ok: true,
    });
  } catch (error) {
    console.error("[auth][email.start.error]", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "邮箱验证码发送失败，请重试。",
      },
      { status: 500 }
    );
  }
}

import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/auth";
import {
  createFreePracticeGuestKey,
  getServerFreePracticeUsage,
  normalizeFreePracticeScope,
  recordServerFreePracticeCompletion,
} from "@/lib/freePracticeUsageServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "speakflow-free-practice-id";

async function getFreePracticeOwner(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (email) {
    return {
      isSignedIn: true,
      userKey: `user:${email}`,
      visitorId: "",
    };
  }

  return {
    isSignedIn: false,
    userKey: createFreePracticeGuestKey(request),
    visitorId: request.cookies.get(VISITOR_COOKIE)?.value || randomUUID(),
  };
}

function withVisitorCookie(response: NextResponse, visitorId: string) {
  if (!visitorId) return response;

  response.cookies.set(VISITOR_COOKIE, visitorId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

function cleanCompletionId(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 200)
    : "";
}

export async function GET(request: NextRequest) {
  const scope = normalizeFreePracticeScope(
    request.nextUrl.searchParams.get("scope")
  );

  if (!scope) {
    return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  }

  const owner = await getFreePracticeOwner(request);
  const usage = await getServerFreePracticeUsage(owner.userKey, scope);
  const response = NextResponse.json({
    authenticated: owner.isSignedIn,
    scope,
    usage,
  });

  return withVisitorCookie(response, owner.visitorId);
}

export async function POST(request: NextRequest) {
  let body: unknown = null;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const scope = normalizeFreePracticeScope(record.scope);
  const completionId = cleanCompletionId(record.completionId);

  if (!scope || !completionId) {
    return NextResponse.json(
      { error: "Invalid scope or completionId" },
      { status: 400 }
    );
  }

  const owner = await getFreePracticeOwner(request);
  const result = await recordServerFreePracticeCompletion(
    owner.userKey,
    scope,
    completionId
  );
  const response = NextResponse.json({
    authenticated: owner.isSignedIn,
    didRecord: result.didRecord,
    scope,
    usage: {
      completedIds: result.completedIds,
      count: result.count,
      date: result.date,
      limit: result.limit,
      limitReached: result.limitReached,
    },
  });

  return withVisitorCookie(response, owner.visitorId);
}

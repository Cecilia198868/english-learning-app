import { randomUUID } from "node:crypto";
import { authOptions } from "@/auth";
import {
  getLearningHomeProgress,
  recordLearningHomeContinueStudy,
} from "@/lib/learningHomeProgress";
import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ANONYMOUS_PROGRESS_COOKIE = "speakflow-ai-guided-progress-id";

type ProgressOwner = {
  anonymousId?: string;
  shouldSetCookie: boolean;
  userKey: string;
};

async function getProgressOwner(request: NextRequest): Promise<ProgressOwner> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (email) {
    return {
      shouldSetCookie: false,
      userKey: `user:${email}`,
    };
  }

  const existingAnonymousId =
    request.cookies.get(ANONYMOUS_PROGRESS_COOKIE)?.value || "";
  const anonymousId = existingAnonymousId || randomUUID();

  return {
    anonymousId,
    shouldSetCookie: !existingAnonymousId,
    userKey: `anonymous:${anonymousId}`,
  };
}

function withAnonymousCookie(response: NextResponse, owner: ProgressOwner) {
  if (!owner.shouldSetCookie || !owner.anonymousId) return response;

  response.cookies.set(ANONYMOUS_PROGRESS_COOKIE, owner.anonymousId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });

  return response;
}

export async function GET(request: NextRequest) {
  const owner = await getProgressOwner(request);
  const progress = await getLearningHomeProgress(owner.userKey);

  return withAnonymousCookie(NextResponse.json(progress), owner);
}

export async function POST(request: NextRequest) {
  const owner = await getProgressOwner(request);
  const body = (await request.json().catch(() => ({}))) as {
    continueStudy?: unknown;
  };

  const progress = await recordLearningHomeContinueStudy(
    owner.userKey,
    body.continueStudy
  );

  return withAnonymousCookie(NextResponse.json(progress), owner);
}

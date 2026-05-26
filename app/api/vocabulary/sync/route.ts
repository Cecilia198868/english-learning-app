import { authOptions } from "@/auth";
import {
  deleteCloudVocabularyWord,
  listCloudVocabularyWords,
  mergeCloudVocabularyWords,
} from "@/lib/cloudVocabulary";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function getCurrentUserEmail() {
  const session = await getServerSession(authOptions);
  return session?.user?.email?.trim().toLowerCase() || "";
}

export async function GET() {
  const email = await getCurrentUserEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const words = await listCloudVocabularyWords(email);
    return NextResponse.json({ words });
  } catch {
    return NextResponse.json(
      { error: "Vocabulary sync is unavailable" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const email = await getCurrentUserEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      words?: unknown;
    };
    const words = await mergeCloudVocabularyWords(email, body.words);
    return NextResponse.json({ words });
  } catch {
    return NextResponse.json(
      { error: "Vocabulary sync is unavailable" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const email = await getCurrentUserEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    await deleteCloudVocabularyWord(email, url.searchParams.get("word") || "");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Vocabulary sync is unavailable" },
      { status: 500 }
    );
  }
}

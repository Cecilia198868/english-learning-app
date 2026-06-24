import {
  getValidatedServerSession,
  sessionInvalidatedJsonResponse,
} from "@/lib/serverSession";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { invalidated, session } = await getValidatedServerSession();

  if (invalidated) {
    return sessionInvalidatedJsonResponse();
  }

  return NextResponse.json({
    authenticated: Boolean(session?.user?.email),
  });
}

import { clearNextAuthSessionCookies } from "@/lib/sessionCookies";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/login?session=replaced", request.url)
  );

  return clearNextAuthSessionCookies(request, response);
}

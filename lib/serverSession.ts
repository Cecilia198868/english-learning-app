import { authOptions } from "@/auth";
import { SESSION_REPLACED_MESSAGE } from "@/lib/singleDeviceSession";
import { getServerSession, type Session } from "next-auth";
import { NextResponse } from "next/server";

export type ValidatedServerSession = {
  invalidated: boolean;
  session: Session | null;
};

export async function getValidatedServerSession(): Promise<ValidatedServerSession> {
  const session = await getServerSession(authOptions);
  const invalidated = Boolean(session?.isInvalidated);

  return {
    invalidated,
    session: invalidated ? null : session,
  };
}

export function sessionInvalidatedJsonResponse() {
  return NextResponse.json(
    {
      error: "SESSION_REPLACED",
      message: SESSION_REPLACED_MESSAGE,
    },
    { status: 409 }
  );
}

export async function requireValidServerSession() {
  const result = await getValidatedServerSession();
  if (result.invalidated) return result;

  return {
    invalidated: false,
    session: result.session?.user ? result.session : null,
  };
}
